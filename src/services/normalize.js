/**
 * ---------------------------------------------------------------------------
 * NORMALIZAÇÃO
 * ---------------------------------------------------------------------------
 * Converte as linhas cruas da Windsor.ai no view-model consumido pela
 * interface. Nenhum componente visual fala com a API — todos leem daqui.
 *
 * Princípios:
 *  • Nada é inventado. Métrica ausente vira `null`, nunca 0.
 *  • Toda comparação de período é calculada, nunca escrita à mão.
 *  • Séries chegam por dia; agregação semanal (180 dias) acontece aqui.
 * ---------------------------------------------------------------------------
 */

import { addDays, dateRange, diffDays, startOfISOWeek } from '../utils/dates.js'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Converte para número finito; qualquer outra coisa vira null. */
function num(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Soma ignorando null. Devolve null se NENHUM valor for numérico. */
function sum(values) {
  let total = 0
  let seen = false
  for (const value of values) {
    const n = num(value)
    if (n === null) continue
    total += n
    seen = true
  }
  return seen ? total : null
}

/** Variação percentual entre dois períodos. null quando não dá para comparar. */
function delta(current, previous) {
  const a = num(current)
  const b = num(previous)
  if (a === null || b === null || b === 0) return null
  const abs = a - b
  const pct = (abs / b) * 100
  return {
    abs,
    pct: Math.round(pct * 10) / 10,
    direction: abs > 0 ? 'up' : abs < 0 ? 'down' : 'flat',
  }
}

/** Média aritmética ignorando null. */
function mean(values) {
  const nums = values.map(num).filter((v) => v !== null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/* -------------------------------------------------------------------------- */
/* Perfil                                                                     */
/* -------------------------------------------------------------------------- */

export function normalizeProfile(rows, fallbackUsername = '') {
  const row = rows?.[0] || {}
  const username = row.username || row.user_name || fallbackUsername
  return {
    username: username || null,
    name: row.name || null,
    followersCount: num(row.followers_count),
    followsCount: num(row.follows_count),
    mediaCount: num(row.media_count),
    biography: row.biography || null,
    website: row.website || null,
    userId: row.user_id ? String(row.user_id) : null,
    profileUrl: username ? `https://www.instagram.com/${username}/` : null,
  }
}

/* -------------------------------------------------------------------------- */
/* Série diária                                                               */
/* -------------------------------------------------------------------------- */

const DAILY_METRICS = [
  'reach',
  'views',
  'interactions',
  'engagedAccounts',
  'likes',
  'comments',
  'shares',
  'saves',
  'replies',
  'newFollowers',
]

const DAILY_FIELD_MAP = {
  reach: 'reach',
  views: 'views',
  interactions: 'total_interactions',
  engagedAccounts: 'accounts_engaged',
  likes: 'likes',
  comments: 'comments',
  shares: 'shares',
  saves: 'saves',
  replies: 'replies',
  newFollowers: 'follower_count',
}

/**
 * Indexa as linhas diárias por data. A Windsor pode devolver mais de uma linha
 * para a mesma data (tabelas distintas); elas são mescladas campo a campo.
 */
export function indexDailyRows(rows) {
  const byDate = new Map()
  for (const row of rows || []) {
    const date = typeof row.date === 'string' ? row.date.slice(0, 10) : null
    if (!date) continue
    const entry = byDate.get(date) || { date }
    for (const [key, field] of Object.entries(DAILY_FIELD_MAP)) {
      const value = num(row[field])
      if (value !== null) entry[key] = (entry[key] ?? 0) + value
    }
    byDate.set(date, entry)
  }
  return byDate
}

/**
 * Série contínua no intervalo pedido. Dias sem dado ficam com `null` (buraco
 * legítimo no gráfico) em vez de virarem zero.
 */
function buildSeries(byDate, from, to) {
  const series = {}
  for (const metric of DAILY_METRICS) series[metric] = []

  for (const date of dateRange(from, to)) {
    const entry = byDate.get(date)
    for (const metric of DAILY_METRICS) {
      series[metric].push({ date, value: entry ? (entry[metric] ?? null) : null })
    }
  }
  return series
}

/**
 * Agrega uma série diária em buckets semanais (período de 180 dias).
 *
 * As semanas das PONTAS quase sempre estão incompletas — a janela de 180 dias
 * raramente começa numa segunda e termina num domingo. Plotar uma semana de
 * 1 dia ao lado de semanas de 7 produziria um mergulho e um penhasco que não
 * existem nos dados. Por isso os buckets parciais das extremidades são
 * descartados do GRÁFICO. Os totais do período continuam sendo calculados a
 * partir da série diária completa, sem perder nenhum dia.
 *
 * Buckets parciais no MEIO da série são mantidos: ali a queda é real (dias sem
 * dado retornados pela API), e escondê-la seria maquiar o histórico.
 */
function aggregateWeekly(points) {
  const buckets = new Map()
  for (const point of points) {
    const week = startOfISOWeek(point.date)
    const bucket = buckets.get(week) || { date: week, value: null, days: 0, end: point.date }
    if (point.value !== null) {
      bucket.value = (bucket.value ?? 0) + point.value
      bucket.days += 1
    }
    bucket.end = point.date
    buckets.set(week, bucket)
  }

  const ordered = [...buckets.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
  if (ordered.length <= 2) return ordered

  let start = 0
  let end = ordered.length - 1
  if (ordered[start].days > 0 && ordered[start].days < 7) start += 1
  if (end > start && ordered[end].days > 0 && ordered[end].days < 7) end -= 1
  return ordered.slice(start, end + 1)
}

/** Totais do período a partir da série. */
function totalsFromSeries(series) {
  const totals = {}
  for (const metric of DAILY_METRICS) {
    totals[metric] = sum(series[metric].map((p) => p.value))
  }
  return totals
}

/** Totais direto do índice, para a janela de comparação (sem montar série). */
function totalsFromIndex(byDate, from, to) {
  const totals = {}
  for (const metric of DAILY_METRICS) totals[metric] = null

  let hasAny = false
  for (const date of dateRange(from, to)) {
    const entry = byDate.get(date)
    if (!entry) continue
    hasAny = true
    for (const metric of DAILY_METRICS) {
      const value = num(entry[metric])
      if (value === null) continue
      totals[metric] = (totals[metric] ?? 0) + value
    }
  }
  return hasAny ? totals : null
}

/* -------------------------------------------------------------------------- */
/* Conteúdo                                                                   */
/* -------------------------------------------------------------------------- */

const REELS_TYPES = new Set(['REELS', 'REEL', 'VIDEO'])

/** Primeira linha do caption, encurtada — serve de título do card. */
function captionTitle(caption) {
  if (!caption) return null
  const firstLine = String(caption).split('\n').map((s) => s.trim()).find(Boolean)
  if (!firstLine) return null
  return firstLine.length > 96 ? `${firstLine.slice(0, 95)}…` : firstLine
}

export function normalizeMedia(mediaRows, reelRows) {
  const reelsById = new Map()
  for (const row of reelRows || []) {
    if (!row.media_id) continue
    reelsById.set(String(row.media_id), {
      avgWatchTimeMs: num(row.media_reel_avg_watch_time),
      totalWatchTimeMs: num(row.media_reel_total_watch_time),
      reelInteractions: num(row.media_reel_total_interactions),
      skipRate: num(row.media_reel_skip_rate),
    })
  }

  const items = []
  for (const row of mediaRows || []) {
    const id = row.media_id ? String(row.media_id) : null
    if (!id) continue

    const productType = String(row.media_product_type || '').toUpperCase()
    const mediaType = String(row.media_type || '').toUpperCase()
    const isReel = REELS_TYPES.has(productType) || REELS_TYPES.has(mediaType)

    const views = num(row.media_views)
    const reach = num(row.media_reach)
    const likes = num(row.media_like_count)
    const comments = num(row.media_comments_count)
    const shares = num(row.media_shares)
    const saves = num(row.media_saved)
    const engagement = num(row.media_engagement)

    // Miniatura: REELS expõem `media_thumbnail_url`; imagens e carrosséis usam
    // `media_url`. As URLs do CDN da Meta são assinadas e expiram — a
    // interface tem fallback visual quando a imagem falha ao carregar.
    const thumbnail = row.media_thumbnail_url || (mediaType === 'VIDEO' ? null : row.media_url) || null

    items.push({
      id,
      type: isReel ? 'reel' : mediaType === 'CAROUSEL_ALBUM' ? 'carousel' : 'post',
      productType: productType || null,
      publishedAt: row.timestamp || null,
      permalink: row.media_permalink || null,
      thumbnail,
      title: captionTitle(row.media_caption),
      caption: row.media_caption || null,
      views,
      reach,
      likes,
      comments,
      shares,
      saves,
      engagement: engagement ?? sum([likes, comments, shares, saves]),
      engagementRate: reach && engagement ? Math.round((engagement / reach) * 1000) / 10 : null,
      ...(reelsById.get(id) || {}),
    })
  }

  return items
}

/** Ordena por views (fallback: alcance) e devolve os N primeiros. */
function rankBy(items, key, limit) {
  return [...items]
    .filter((item) => num(item[key]) !== null)
    .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
    .slice(0, limit)
}

/**
 * Médias por formato. Reels e feed são calculados separadamente — misturar
 * formatos produziria uma média sem significado.
 */
function contentAverages(items) {
  const build = (subset) => {
    if (!subset.length) return null
    return {
      count: subset.length,
      views: mean(subset.map((i) => i.views)),
      reach: mean(subset.map((i) => i.reach)),
      likes: mean(subset.map((i) => i.likes)),
      comments: mean(subset.map((i) => i.comments)),
      shares: mean(subset.map((i) => i.shares)),
      saves: mean(subset.map((i) => i.saves)),
      avgWatchTimeMs: mean(subset.map((i) => i.avgWatchTimeMs)),
      retentionRate: (() => {
        const rates = subset
          .map((i) => (i.skipRate === null || i.skipRate === undefined ? null : (1 - i.skipRate) * 100))
          .filter((v) => v !== null)
        return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
      })(),
    }
  }

  const reels = items.filter((i) => i.type === 'reel')
  const feed = items.filter((i) => i.type !== 'reel')
  return { reels: build(reels), feed: build(feed) }
}

/* -------------------------------------------------------------------------- */
/* Audiência                                                                  */
/* -------------------------------------------------------------------------- */

/** Agrupa faixas em buckets comerciais. '13-17' e 'U' são tratados à parte. */
const AGE_ORDER = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']

function toShare(entries) {
  const total = entries.reduce((acc, e) => acc + (e.value || 0), 0)
  if (!total) return entries.map((e) => ({ ...e, share: null }))
  return entries.map((e) => ({ ...e, share: Math.round((e.value / total) * 1000) / 10 }))
}

export function normalizeAge(rows) {
  const entries = (rows || [])
    .map((row) => ({ label: row.audience_age_name, value: num(row.audience_age_size) }))
    // 'U' = faixa não informada pelo Instagram; não é uma faixa etária.
    .filter((e) => e.label && e.label !== 'U' && e.value !== null)
    .sort((a, b) => AGE_ORDER.indexOf(a.label) - AGE_ORDER.indexOf(b.label))
  return entries.length ? toShare(entries) : null
}

const GENDER_LABELS = { F: 'Feminino', M: 'Masculino' }

export function normalizeGender(rows) {
  const entries = (rows || [])
    .map((row) => ({ key: row.audience_gender_name, value: num(row.audience_gender_size) }))
    // 'U' = gênero não informado. Excluído para o percentual somar entre
    // quem de fato declarou, sem distorcer a leitura comercial.
    .filter((e) => e.key && e.key !== 'U' && e.value !== null)
    .map((e) => ({ label: GENDER_LABELS[e.key] || e.key, key: e.key, value: e.value }))
  return entries.length ? toShare(entries) : null
}

/**
 * O conector devolve a cidade como "Cidade, Estado" (ex.: "São Paulo, São
 * Paulo (state)"). Separamos os dois para montar também o ranking de estados.
 */
/**
 * Alguns estados voltam com o nome em inglês (o Instagram usa a nomenclatura
 * interna do Facebook). Traduzimos só os que de fato divergem do português.
 */
const STATE_NAMES = {
  'Federal District': 'Distrito Federal',
  Bahia: 'Bahia',
  'Rio Grande do Norte': 'Rio Grande do Norte',
  Amazonas: 'Amazonas',
  Para: 'Pará',
  Ceara: 'Ceará',
  Maranhao: 'Maranhão',
  Piaui: 'Piauí',
  Paraiba: 'Paraíba',
  Goias: 'Goiás',
  Rondonia: 'Rondônia',
  Amapa: 'Amapá',
  Parana: 'Paraná',
  'Espirito Santo': 'Espírito Santo',
  'Sao Paulo': 'São Paulo',
}

function splitCity(raw) {
  const parts = String(raw).split(',').map((s) => s.trim())
  const city = parts[0] || raw
  const rawState = (parts[1] || '').replace(/\s*\(state\)\s*$/i, '').trim()
  const state = rawState ? (STATE_NAMES[rawState] || rawState) : null
  return { city, state }
}

export function normalizeCities(rows, limit = 8) {
  const entries = (rows || [])
    .map((row) => {
      const value = num(row.audience_city_size)
      if (!row.city || value === null) return null
      const { city, state } = splitCity(row.city)
      return { label: city, sublabel: state, value }
    })
    .filter(Boolean)

  if (!entries.length) return null
  const withShare = toShare(entries).sort((a, b) => b.value - a.value)
  return withShare.slice(0, limit)
}

export function normalizeStates(rows, limit = 6) {
  const totals = new Map()
  for (const row of rows || []) {
    const value = num(row.audience_city_size)
    if (!row.city || value === null) continue
    const { state } = splitCity(row.city)
    if (!state) continue
    totals.set(state, (totals.get(state) || 0) + value)
  }
  if (!totals.size) return null
  const entries = [...totals.entries()].map(([label, value]) => ({ label, value }))
  return toShare(entries).sort((a, b) => b.value - a.value).slice(0, limit)
}

const COUNTRY_NAMES = {
  BR: 'Brasil', PT: 'Portugal', US: 'Estados Unidos', AO: 'Angola', MZ: 'Moçambique',
  ES: 'Espanha', GB: 'Reino Unido', JP: 'Japão', DE: 'Alemanha', FR: 'França',
  IT: 'Itália', IE: 'Irlanda', PY: 'Paraguai', CA: 'Canadá', AU: 'Austrália',
  CV: 'Cabo Verde', AR: 'Argentina', CH: 'Suíça', NL: 'Holanda', BE: 'Bélgica',
  UY: 'Uruguai', MX: 'México', CL: 'Chile', CO: 'Colômbia', PE: 'Peru',
  IN: 'Índia', ZA: 'África do Sul', NG: 'Nigéria', AE: 'Emirados Árabes',
  SE: 'Suécia', NO: 'Noruega', DK: 'Dinamarca', AT: 'Áustria', LU: 'Luxemburgo',
  NZ: 'Nova Zelândia', IL: 'Israel', RU: 'Rússia', CN: 'China', GF: 'Guiana Francesa',
  GW: 'Guiné-Bissau', ST: 'São Tomé e Príncipe', MT: 'Malta', BO: 'Bolívia',
  DO: 'Rep. Dominicana', VE: 'Venezuela',
}

export function normalizeCountries(rows, limit = 6) {
  const entries = (rows || [])
    .map((row) => {
      const value = num(row.audience_country_size)
      const code = row.audience_country_name
      if (!code || value === null) return null
      return { label: COUNTRY_NAMES[code] || code, code, value }
    })
    .filter(Boolean)

  if (!entries.length) return null
  return toShare(entries).sort((a, b) => b.value - a.value).slice(0, limit)
}

/* -------------------------------------------------------------------------- */
/* Período                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Monta o objeto completo de um período.
 *
 * @param {object} args
 * @param {string} args.id            '24h' | '30d' | '180d'
 * @param {object} args.window        saída de resolveWindow()
 * @param {Map}    args.dailyIndex    saída de indexDailyRows()
 * @param {Array}  args.media         saída de normalizeMedia()
 * @param {number|null} args.followersCount seguidores atuais (perfil)
 */
export function buildPeriod({ id, label, window: win, dailyIndex, media, followersCount }) {
  const series = buildSeries(dailyIndex, win.from, win.to)
  const totals = totalsFromSeries(series)
  const previousTotals = totalsFromIndex(dailyIndex, win.previousFrom, win.previousTo)

  // Taxa de engajamento = contas engajadas / alcance no período.
  // Escolhemos essa base (e não seguidores) porque mede o conteúdo entregue,
  // que é o que interessa a uma marca avaliando distribuição.
  const engagementRate =
    totals.engagedAccounts !== null && totals.reach
      ? Math.round((totals.engagedAccounts / totals.reach) * 10000) / 100
      : null
  const previousEngagementRate =
    previousTotals?.engagedAccounts !== null && previousTotals?.reach
      ? Math.round((previousTotals.engagedAccounts / previousTotals.reach) * 10000) / 100
      : null

  const deltas = {}
  for (const metric of DAILY_METRICS) {
    deltas[metric] = delta(totals[metric], previousTotals?.[metric])
  }
  deltas.engagementRate =
    engagementRate !== null && previousEngagementRate !== null
      ? {
          abs: Math.round((engagementRate - previousEngagementRate) * 100) / 100,
          pct: previousEngagementRate
            ? Math.round(((engagementRate - previousEngagementRate) / previousEngagementRate) * 1000) / 10
            : null,
          direction:
            engagementRate > previousEngagementRate ? 'up'
            : engagementRate < previousEngagementRate ? 'down'
            : 'flat',
          unit: 'pp',
        }
      : null

  // Pico de alcance no período.
  const reachPoints = series.reach.filter((p) => p.value !== null)
  const peak = reachPoints.length
    ? reachPoints.reduce((best, p) => (p.value > best.value ? p : best))
    : null

  const activeDays = reachPoints.length
  const avgDailyReach = activeDays ? Math.round(totals.reach / activeDays) : null
  const avgDailyViews = series.views.filter((p) => p.value !== null).length
    ? Math.round(totals.views / series.views.filter((p) => p.value !== null).length)
    : null

  // Conteúdo publicado dentro da janela.
  const inWindow = media.filter((item) => {
    if (!item.publishedAt) return false
    const date = String(item.publishedAt).slice(0, 10)
    return date >= win.from && date <= win.to
  })

  // 180 dias em buckets semanais: 180 pontos num gráfico ficam ilegíveis.
  const granularity = id === '180d' ? 'week' : 'day'
  const chartSeries =
    granularity === 'week'
      ? Object.fromEntries(
          Object.entries(series).map(([metric, points]) => [metric, aggregateWeekly(points)]),
        )
      : series

  // Seguidores no início do período = seguidores atuais − novos no período.
  // Só é calculável quando a API entrega `follower_count` na janela inteira
  // (o Instagram limita esse campo aos últimos 30 dias).
  const newFollowersComplete =
    series.newFollowers.filter((p) => p.value !== null).length >= win.days - 1
  const followersStart =
    newFollowersComplete && followersCount !== null && totals.newFollowers !== null
      ? followersCount - totals.newFollowers
      : null
  const followerGrowthRate =
    followersStart && totals.newFollowers !== null
      ? Math.round((totals.newFollowers / followersStart) * 10000) / 100
      : null

  return {
    id,
    label,
    granularity,
    range: { from: win.from, to: win.to, days: win.days },
    previousRange: { from: win.previousFrom, to: win.previousTo },
    hasComparison: previousTotals !== null,
    series: chartSeries,
    dailySeries: series,
    totals: {
      ...totals,
      engagementRate,
      avgDailyReach,
      avgDailyViews,
      peakReach: peak ? { date: peak.date, value: peak.value } : null,
      followersStart,
      followerGrowthRate,
      newFollowersAvailable: newFollowersComplete && totals.newFollowers !== null,
      postsPublished: inWindow.length || null,
    },
    previousTotals: previousTotals
      ? { ...previousTotals, engagementRate: previousEngagementRate }
      : null,
    deltas,
    content: {
      top: rankBy(inWindow, 'views', 12),
      reels: rankBy(inWindow.filter((i) => i.type === 'reel'), 'views', 12),
      averages: contentAverages(inWindow),
    },
  }
}

/**
 * Frases de destaque geradas a partir dos números reais do período.
 * Sem dado suficiente, a frase simplesmente não é gerada.
 */
export function buildHighlights(period) {
  const out = []
  const { totals, deltas } = period

  if (totals.views !== null) {
    out.push({ key: 'views', value: totals.views, delta: deltas.views, label: 'visualizações' })
  }
  if (totals.reach !== null) {
    out.push({ key: 'reach', value: totals.reach, delta: deltas.reach, label: 'contas alcançadas' })
  }
  if (totals.newFollowersAvailable) {
    out.push({ key: 'newFollowers', value: totals.newFollowers, delta: deltas.newFollowers, label: 'novos seguidores' })
  }
  return out
}

export { delta, num, sum, mean, diffDays, addDays }
