/**
 * Testes da camada de normalização, rodando sobre uma amostra REAL de respostas
 * da Windsor.ai (tests/fixtures/windsor-real-sample.json).
 *
 * Rode com:  node --test tests/
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { assemble } from '../src/services/metrics.js'
import {
  normalizeAge, normalizeCities, normalizeCountries, normalizeGender,
  normalizeMedia, normalizeProfile, normalizeStates,
} from '../src/services/normalize.js'
import { formatCompact, formatDelta, formatInteger, formatPercent } from '../src/utils/format.js'
import { resolveWindow, lastCompleteDay } from '../src/utils/dates.js'

const here = dirname(fileURLToPath(import.meta.url))
const raw = JSON.parse(readFileSync(join(here, 'fixtures/windsor-real-sample.json'), 'utf8'))
const ANCHOR = '2026-08-24'

/** Percorre o payload inteiro procurando valores que nunca podem chegar à UI. */
function findBadValues(node, path = '$') {
  const bad = []
  if (typeof node === 'number' && !Number.isFinite(node)) bad.push(`${path} = ${node}`)
  if (typeof node === 'string' && ['undefined', 'NaN', '[object Object]'].includes(node)) {
    bad.push(`${path} = "${node}"`)
  }
  if (Array.isArray(node)) node.forEach((v, i) => bad.push(...findBadValues(v, `${path}[${i}]`)))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) bad.push(...findBadValues(v, `${path}.${k}`))
  }
  return bad
}

test('perfil real é normalizado com os campos esperados', () => {
  const profile = normalizeProfile(raw.profileRows)
  assert.equal(profile.username, 'marcolamaia')
  assert.equal(profile.followersCount, 3037685)
  assert.equal(profile.profileUrl, 'https://www.instagram.com/marcolamaia/')
})

test('faixa etária descarta a fatia "U" e os percentuais somam ~100', () => {
  const age = normalizeAge(raw.ageRows)
  assert.equal(age.length, 7, 'a faixa "U" (não informada) deve sair')
  assert.ok(!age.some((a) => a.label === 'U'))
  const total = age.reduce((acc, a) => acc + a.share, 0)
  assert.ok(Math.abs(total - 100) < 0.5, `soma dos percentuais = ${total}`)
})

test('gênero exclui "não informado" e soma 100', () => {
  const gender = normalizeGender(raw.genderRows)
  assert.equal(gender.length, 2)
  assert.deepEqual(gender.map((g) => g.label).sort(), ['Feminino', 'Masculino'])
  assert.ok(Math.abs(gender.reduce((a, g) => a + g.share, 0) - 100) < 0.5)
})

test('cidades separam "Cidade, Estado (state)" corretamente', () => {
  const cities = normalizeCities(raw.cityRows)
  const sp = cities.find((c) => c.label === 'São Paulo')
  assert.ok(sp, 'São Paulo deve aparecer')
  assert.equal(sp.sublabel, 'São Paulo', 'o sufixo "(state)" deve ser removido')
  // Vem ordenado do maior para o menor
  assert.ok(cities[0].value >= cities[1].value)
})

test('estados são agregados a partir das cidades e traduzidos', () => {
  const states = normalizeStates(raw.cityRows)
  const sp = states.find((s) => s.label === 'São Paulo')
  // São Paulo (257567) + Guarulhos (28530)
  assert.equal(sp.value, 257567 + 28530)
  // Sem recorte de top-N, para checar a tradução de nomes de estado.
  const todos = normalizeStates(raw.cityRows, 50)
  assert.ok(todos.some((s) => s.label === 'Distrito Federal'), 'Federal District → Distrito Federal')
  assert.ok(!todos.some((s) => s.label === 'Federal District'))
})

test('países usam o nome em português', () => {
  const countries = normalizeCountries(raw.countryRows)
  assert.equal(countries[0].label, 'Brasil')
  assert.ok(countries.some((c) => c.label === 'Moçambique'))
})

test('mídia distingue reel, carrossel e associa métricas de retenção', () => {
  const media = normalizeMedia(raw.mediaRows, raw.reelRows)
  const reel = media.find((m) => m.id === '18126306568817502')
  assert.equal(reel.type, 'reel')
  assert.equal(reel.avgWatchTimeMs, 31130)
  assert.equal(reel.skipRate, 0.423)

  const carousel = media.find((m) => m.id === '18092905577640929')
  assert.equal(carousel.type, 'carousel')
  // Sem thumbnail_url, o carrossel cai para media_url
  assert.ok(carousel.thumbnail.includes('carrossel.jpg'))
  // Título vem da primeira linha da legenda
  assert.ok(carousel.title.startsWith('Comente'))
  assert.ok(!carousel.title.includes('\n'))
})

test('payload completo não contém NaN, undefined nem [object Object]', () => {
  const payload = assemble(raw, { anchor: ANCHOR, demo: false })
  const bad = findBadValues(payload)
  assert.deepEqual(bad, [], `valores inválidos encontrados:\n${bad.join('\n')}`)
})

test('período de 24h isola o último dia fechado', () => {
  const payload = assemble(raw, { anchor: ANCHOR, demo: false })
  const day = payload.periods['24h']
  assert.equal(day.range.from, ANCHOR)
  assert.equal(day.range.to, ANCHOR)
  assert.equal(day.totals.reach, 183530, 'alcance do dia 24/08')
  assert.equal(day.previousTotals.reach, 170910, 'alcance do dia 23/08')
  assert.equal(day.deltas.reach.direction, 'up')
})

test('métrica ausente vira null, nunca zero', () => {
  const semDados = { ...raw, dailyRows: [] }
  const payload = assemble(semDados, { anchor: ANCHOR, demo: false })
  const p = payload.periods['30d']
  assert.equal(p.totals.reach, null, 'sem linhas, o total precisa ser null e não 0')
  assert.equal(p.totals.views, null)
  assert.equal(p.totals.engagementRate, null)
  assert.equal(payload.availability.daily, false)
})

test('taxa de engajamento usa contas engajadas sobre alcance', () => {
  const payload = assemble(raw, { anchor: ANCHOR, demo: false })
  const p = payload.periods['30d']
  const esperado = Math.round((p.totals.engagedAccounts / p.totals.reach) * 10000) / 100
  assert.equal(p.totals.engagementRate, esperado)
})

test('novos seguidores ficam indisponíveis quando a janela excede 30 dias', () => {
  const payload = assemble(raw, { anchor: ANCHOR, demo: false })
  // A amostra tem 7 dias; a janela de 180 dias não é coberta.
  assert.equal(payload.periods['180d'].totals.newFollowersAvailable, false)
})

test('série de 180 dias é agregada por semana', () => {
  const payload = assemble(raw, { anchor: ANCHOR, demo: false })
  assert.equal(payload.periods['180d'].granularity, 'week')
  assert.equal(payload.periods['30d'].granularity, 'day')
})

test('stories vazios não quebram e marcam indisponibilidade', () => {
  const payload = assemble(raw, { anchor: ANCHOR, demo: false })
  assert.equal(payload.stories, null)
  assert.equal(payload.availability.stories, false)
})

test('janelas de comparação não se sobrepõem', () => {
  for (const id of ['24h', '30d', '180d']) {
    const w = resolveWindow(id, ANCHOR)
    assert.ok(w.previousTo < w.from, `${id}: janelas sobrepostas`)
    assert.equal(w.to, ANCHOR)
  }
})

test('o último dia completo é sempre ontem', () => {
  const anchor = lastCompleteDay(new Date('2026-08-25T23:59:00Z'), 'America/Sao_Paulo')
  assert.equal(anchor, '2026-08-24')
})

test('formatação em pt-BR nunca devolve número cru nem NaN', () => {
  assert.equal(formatCompact(12328492), '12,3 mi')
  assert.equal(formatCompact(12400), '12,4 mil')
  assert.equal(formatInteger(1200), '1.200')
  assert.equal(formatPercent(9.64), '9,64%')
  assert.equal(formatDelta({ pct: 18.7 }), '+18,7%')
  assert.equal(formatDelta({ abs: 1.23, unit: 'pp', pct: 5 }), '+1,2pp')
  for (const empty of [null, undefined, NaN, '']) {
    assert.equal(formatCompact(empty), '—')
    assert.equal(formatInteger(empty), '—')
    assert.equal(formatPercent(empty), '—')
  }
})
