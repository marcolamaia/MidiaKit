/**
 * ---------------------------------------------------------------------------
 * ORQUESTRADOR DE MÉTRICAS (SERVIDOR)
 * ---------------------------------------------------------------------------
 * Junta cliente Windsor + normalização + cache num único payload. É o único
 * módulo que a serverless function precisa conhecer.
 *
 * Fluxo: cache → Windsor.ai (ou mocks em DEMO_MODE) → normalização → cache.
 * ---------------------------------------------------------------------------
 */

import {
  AUDIENCE_QUERIES,
  DAILY_FIELDS,
  FOLLOWER_FIELDS,
  FOLLOWER_MAX_DAYS,
  MEDIA_FIELDS,
  PROFILE_FIELDS,
  REEL_FIELDS,
  STORY_FIELDS,
  WindsorError,
  queryWindsor,
} from './windsor.js'

import {
  buildHighlights,
  buildPeriod,
  indexDailyRows,
  normalizeAge,
  normalizeCities,
  normalizeCountries,
  normalizeGender,
  normalizeMedia,
  normalizeProfile,
  normalizeStates,
} from './normalize.js'

import {
  demoAudience,
  demoDailyRows,
  demoMediaRows,
  demoProfileRows,
  demoReelRows,
  demoStoryRows,
} from './demo-data.js'

import { addDays, lastCompleteDay, resolveWindow } from '../utils/dates.js'
import { getTtlSeconds, readCache, readStale, writeCache } from './cache.js'

const PERIOD_IDS = ['24h', '30d', '180d']
const PERIOD_LABELS = {
  '24h': 'Últimas 24 horas',
  '30d': 'Últimos 30 dias',
  '180d': 'Últimos 180 dias',
}

export function isDemoMode() {
  return String(process.env.DEMO_MODE).toLowerCase() === 'true'
}

function timeZone() {
  return process.env.TIMEZONE || 'America/Sao_Paulo'
}

/**
 * Uma única consulta cobre a maior janela necessária (180 dias + 180 dias de
 * comparação) e todos os períodos são recortados dela em memória. Isso troca
 * ~7 requisições por 1 — mais rápido e mais leve para o rate limit.
 */
function fullWindow(anchor) {
  const widest = resolveWindow('180d', anchor)
  return { from: widest.previousFrom, to: widest.to }
}

async function fetchReal(anchor) {
  const span = fullWindow(anchor)
  // A janela de mídia é menor: cards de conteúdo olham no máximo 180 dias.
  const mediaFrom = resolveWindow('180d', anchor).from

  // `follower_count` sai numa consulta própria e curta: pedido junto com a
  // série longa, a Windsor rejeita TUDO com erro (ver nota em DAILY_FIELDS).
  const followerFrom = addDays(anchor, -(FOLLOWER_MAX_DAYS - 1))

  const [
    profileRows, dailyRows, followerRows, mediaRows, reelRows,
    ageRows, genderRows, cityRows, countryRows,
  ] = await Promise.all([
    queryWindsor({ fields: PROFILE_FIELDS, dateFrom: anchor, dateTo: anchor }),
    queryWindsor({ fields: DAILY_FIELDS, dateFrom: span.from, dateTo: span.to }),
    // Falhar aqui não pode derrubar o resto: sem esta série, a interface
    // apenas marca "novos seguidores" como indisponível.
    queryWindsor({ fields: FOLLOWER_FIELDS, dateFrom: followerFrom, dateTo: anchor })
      .catch(() => []),
    queryWindsor({ fields: MEDIA_FIELDS, dateFrom: mediaFrom, dateTo: anchor }),
    queryWindsor({ fields: REEL_FIELDS, dateFrom: mediaFrom, dateTo: anchor }),
    queryWindsor({ fields: AUDIENCE_QUERIES.age, dateFrom: anchor, dateTo: anchor }),
    queryWindsor({ fields: AUDIENCE_QUERIES.gender, dateFrom: anchor, dateTo: anchor }),
    queryWindsor({ fields: AUDIENCE_QUERIES.city, dateFrom: anchor, dateTo: anchor }),
    queryWindsor({ fields: AUDIENCE_QUERIES.country, dateFrom: anchor, dateTo: anchor }),
  ])

  // Stories só existem por 24h e costumam vir vazios. A falha aqui NÃO pode
  // derrubar o Media Kit inteiro.
  let storyRows = []
  try {
    storyRows = await queryWindsor({
      fields: STORY_FIELDS,
      dateFrom: addDays(anchor, -1),
      dateTo: anchor,
    })
  } catch {
    storyRows = []
  }

  return {
    profileRows,
    // indexDailyRows mescla por data, então as duas séries podem ser concatenadas.
    dailyRows: [...dailyRows, ...followerRows],
    mediaRows, reelRows, ageRows, genderRows, cityRows, countryRows, storyRows,
  }
}

function fetchDemo(anchor) {
  const span = fullWindow(anchor)
  const mediaFrom = resolveWindow('180d', anchor).from
  const mediaRows = demoMediaRows(mediaFrom, anchor)

  return {
    profileRows: demoProfileRows(),
    dailyRows: demoDailyRows(span.from, span.to),
    mediaRows,
    reelRows: demoReelRows(mediaRows),
    ageRows: demoAudience.age,
    genderRows: demoAudience.gender,
    cityRows: demoAudience.city,
    countryRows: demoAudience.country,
    storyRows: demoStoryRows(),
  }
}

function normalizeStories(rows) {
  if (!rows?.length) return null
  const numeric = (key) =>
    rows.reduce((acc, row) => {
      const value = Number(row[key])
      return Number.isFinite(value) ? acc + value : acc
    }, 0)
  return {
    count: rows.length,
    views: numeric('story_views'),
    reach: numeric('story_reach'),
    replies: numeric('story_replies'),
    shares: numeric('story_shares'),
    interactions: numeric('story_interactions'),
  }
}

/** Monta o payload completo a partir das linhas cruas. */
export function assemble(raw, { anchor, demo }) {
  const profile = normalizeProfile(raw.profileRows)
  const dailyIndex = indexDailyRows(raw.dailyRows)
  const media = normalizeMedia(raw.mediaRows, raw.reelRows)

  const periods = {}
  for (const id of PERIOD_IDS) {
    periods[id] = buildPeriod({
      id,
      label: PERIOD_LABELS[id],
      window: resolveWindow(id, anchor),
      dailyIndex,
      media,
      followersCount: profile.followersCount,
    })
    periods[id].highlights = buildHighlights(periods[id])
  }

  const audience = {
    age: normalizeAge(raw.ageRows),
    gender: normalizeGender(raw.genderRows),
    cities: normalizeCities(raw.cityRows),
    states: normalizeStates(raw.cityRows),
    countries: normalizeCountries(raw.countryRows),
  }

  const stories = normalizeStories(raw.storyRows)

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      anchorDate: anchor,
      timeZone: timeZone(),
      demo,
      source: demo ? 'demo' : 'windsor',
      connector: 'instagram',
      provider: 'Windsor.ai · Instagram/Meta',
      // Granularidade horária não é oferecida pela API de insights do
      // Instagram/Meta via Windsor.ai — o menor agregado é o dia.
      hourlyGranularity: false,
    },
    profile,
    periods,
    audience,
    stories,
    availability: {
      profile: profile.followersCount !== null,
      daily: dailyIndex.size > 0,
      media: media.length > 0,
      audienceAge: Boolean(audience.age),
      audienceGender: Boolean(audience.gender),
      audienceCities: Boolean(audience.cities),
      audienceCountries: Boolean(audience.countries),
      stories: Boolean(stories),
    },
  }
}

/**
 * Ponto de entrada usado pela serverless function.
 *
 * @param {object}  options
 * @param {boolean} [options.force] ignora o cache e busca de novo
 * @returns {Promise<{payload:object, cache:'hit'|'miss'|'stale', storedAt?:string}>}
 */
export async function getMetrics({ force = false } = {}) {
  const demo = isDemoMode()
  const anchor = lastCompleteDay(new Date(), timeZone())
  const cacheKey = `metrics:${demo ? 'demo' : 'live'}:${anchor}`

  if (!force) {
    const cached = await readCache(cacheKey)
    if (cached) {
      return { payload: cached.payload, cache: 'hit', storedAt: cached.storedAt }
    }
  }

  try {
    const raw = demo ? fetchDemo(anchor) : await fetchReal(anchor)
    const payload = assemble(raw, { anchor, demo })
    const entry = await writeCache(cacheKey, payload, getTtlSeconds())
    return { payload, cache: 'miss', storedAt: entry.storedAt }
  } catch (error) {
    // Windsor fora do ar: melhor entregar o último dado REAL conhecido,
    // rotulado como desatualizado, do que uma tela de erro.
    const stale = await readStale(cacheKey)
    if (stale) {
      return {
        payload: { ...stale.payload, meta: { ...stale.payload.meta, stale: true } },
        cache: 'stale',
        storedAt: stale.storedAt,
      }
    }
    throw error
  }
}

export { WindsorError, PERIOD_IDS, PERIOD_LABELS }
