#!/usr/bin/env node
/**
 * ---------------------------------------------------------------------------
 * DIAGNÓSTICO DA INTEGRAÇÃO WINDSOR.AI
 * ---------------------------------------------------------------------------
 * Verifica, contra a API real, o que está disponível para esta conta antes de
 * publicar o Media Kit. Rode com:
 *
 *     npm run lint:data
 *
 * Não escreve nada e não altera o cache — só consulta e relata.
 * ---------------------------------------------------------------------------
 */

import { config } from 'dotenv'
import {
  AUDIENCE_QUERIES, DAILY_FIELDS, MEDIA_FIELDS, PROFILE_FIELDS,
  REEL_FIELDS, STORY_FIELDS, queryWindsor,
} from '../src/services/windsor.js'
import { lastCompleteDay, resolveWindow } from '../src/utils/dates.js'

config()

const ok = (t) => `\x1b[32m✓\x1b[0m ${t}`
const warn = (t) => `\x1b[33m!\x1b[0m ${t}`
const fail = (t) => `\x1b[31m✗\x1b[0m ${t}`
const dim = (t) => `\x1b[2m${t}\x1b[0m`

if (String(process.env.DEMO_MODE).toLowerCase() === 'true') {
  console.log(warn('DEMO_MODE=true — este diagnóstico consulta a API real mesmo assim.'))
  console.log(dim('   Lembre de trocar para DEMO_MODE=false antes de publicar.\n'))
}

if (!process.env.WINDSOR_API_KEY) {
  console.log(fail('WINDSOR_API_KEY não definida no .env. Nada a verificar.'))
  process.exit(1)
}

const anchor = lastCompleteDay(new Date(), process.env.TIMEZONE || 'America/Sao_Paulo')
const win30 = resolveWindow('30d', anchor)
const win180 = resolveWindow('180d', anchor)

console.log(dim(`Conector: ${process.env.WINDSOR_CONNECTOR || 'instagram'}`))
console.log(dim(`Último dia fechado: ${anchor}\n`))

const checks = [
  { name: 'Perfil (seguidores, bio, contagem de mídia)', fields: PROFILE_FIELDS, from: anchor, to: anchor },
  { name: 'Série diária — 30 dias', fields: DAILY_FIELDS, from: win30.from, to: win30.to },
  { name: 'Série diária — 180 dias', fields: DAILY_FIELDS, from: win180.from, to: win180.to },
  { name: 'Publicações', fields: MEDIA_FIELDS, from: win30.from, to: win30.to },
  { name: 'Retenção de Reels', fields: REEL_FIELDS, from: win30.from, to: win30.to },
  { name: 'Audiência — faixa etária', fields: AUDIENCE_QUERIES.age, from: anchor, to: anchor },
  { name: 'Audiência — gênero', fields: AUDIENCE_QUERIES.gender, from: anchor, to: anchor },
  { name: 'Audiência — cidades', fields: AUDIENCE_QUERIES.city, from: anchor, to: anchor },
  { name: 'Audiência — países', fields: AUDIENCE_QUERIES.country, from: anchor, to: anchor },
  { name: 'Stories (só existem por 24h — vazio é normal)', fields: STORY_FIELDS, from: anchor, to: anchor, optional: true },
]

let failures = 0

for (const check of checks) {
  try {
    const rows = await queryWindsor({ fields: check.fields, dateFrom: check.from, dateTo: check.to })
    if (rows.length === 0) {
      console.log(check.optional ? warn(`${check.name} — 0 linhas`) : fail(`${check.name} — 0 linhas`))
      if (!check.optional) failures += 1
      continue
    }

    // Quais campos vieram realmente preenchidos ao menos uma vez?
    const preenchidos = new Set()
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (value !== null && value !== undefined && value !== '') preenchidos.add(key)
      }
    }
    const ausentes = check.fields.filter((f) => !preenchidos.has(f))

    console.log(ok(`${check.name} — ${rows.length} linha(s)`))
    if (ausentes.length) {
      console.log(dim(`   sempre vazios: ${ausentes.join(', ')}`))
      console.log(dim('   → a interface oculta esses blocos automaticamente'))
    }
  } catch (error) {
    console.log(fail(`${check.name} — ${error.code || 'erro'}: ${error.message}`))
    failures += 1
  }
}

console.log()
if (failures) {
  console.log(fail(`${failures} verificação(ões) falharam. Corrija antes de publicar com DEMO_MODE=false.`))
  process.exit(1)
}
console.log(ok('Integração pronta. Pode publicar com DEMO_MODE=false.'))
