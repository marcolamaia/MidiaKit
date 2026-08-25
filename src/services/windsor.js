/**
 * ---------------------------------------------------------------------------
 * WINDSOR.AI — CLIENTE HTTP (SOMENTE SERVIDOR)
 * ---------------------------------------------------------------------------
 * Este módulo roda EXCLUSIVAMENTE no backend (serverless function / dev
 * middleware). Ele lê `WINDSOR_API_KEY` do ambiente e nunca é importado pelo
 * bundle do navegador.
 *
 * Contrato da API (verificado contra a API real do conector `instagram` da
 * conta @marcolamaia em 25/08/2026):
 *
 *   GET https://connectors.windsor.ai/{connector}
 *       ?api_key=<WINDSOR_API_KEY>
 *       &fields=<lista separada por vírgula>
 *       &date_from=YYYY-MM-DD&date_to=YYYY-MM-DD   (ou &date_preset=last_30d)
 *       &select_accounts=<id da conta>             (opcional)
 *
 *   Resposta: { "data": [ { campo: valor, ... }, ... ] }
 *
 * O parser abaixo aceita `{data:[…]}`, `{result:[…]}` ou um array puro, para
 * não quebrar caso a Windsor mude o envelope.
 *
 * REGRA IMPORTANTE DE MODELAGEM
 * -----------------------------
 * Os campos do conector vivem em TABELAS diferentes (`user_info`,
 * `user_insights_day`, `user_insights_day_total_value`, `media_info`,
 * `media_insights`, `user_insights_lifetime_*`). Misturar tabelas numa mesma
 * consulta agrupada por uma dimensão que não seja `date` faz a Windsor
 * devolver `null` em parte das colunas. Por isso:
 *
 *   1. Cada consulta aqui toca um grupo coeso de campos.
 *   2. Séries temporais SEMPRE são pedidas por `date` (granularidade diária) e
 *      qualquer agregação (semanal, total do período) é feita por nós em
 *      `normalize.js`.
 * ---------------------------------------------------------------------------
 */

const BASE_URL = process.env.WINDSOR_BASE_URL || 'https://connectors.windsor.ai'
const CONNECTOR = process.env.WINDSOR_CONNECTOR || 'instagram'
const TIMEOUT_MS = Number(process.env.WINDSOR_TIMEOUT_MS || 20000)

/** Erro tipado para o handler distinguir credencial, rede e resposta ruim. */
export class WindsorError extends Error {
  constructor(message, { code = 'windsor_error', status = 502, cause } = {}) {
    super(message)
    this.name = 'WindsorError'
    this.code = code
    this.status = status
    if (cause) this.cause = cause
  }
}

function requireApiKey() {
  const key = process.env.WINDSOR_API_KEY
  if (!key || !key.trim()) {
    throw new WindsorError(
      'WINDSOR_API_KEY ausente. Configure o .env ou ative DEMO_MODE=true.',
      { code: 'missing_credentials', status: 500 },
    )
  }
  return key.trim()
}

/** Extrai as linhas independentemente do envelope usado pela API. */
function extractRows(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  if (payload && Array.isArray(payload.result)) return payload.result
  return null
}

/**
 * Executa uma consulta no conector.
 *
 * @param {object}   query
 * @param {string[]} query.fields    IDs de campo válidos do conector.
 * @param {string}  [query.dateFrom] YYYY-MM-DD
 * @param {string}  [query.dateTo]   YYYY-MM-DD
 * @param {string}  [query.datePreset] ex.: 'last_30d'
 * @returns {Promise<object[]>} linhas cruas
 */
export async function queryWindsor({ fields, dateFrom, dateTo, datePreset }) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new WindsorError('Consulta sem campos.', { code: 'bad_query', status: 500 })
  }

  const apiKey = requireApiKey()
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/${CONNECTOR}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('fields', fields.join(','))
  if (datePreset) url.searchParams.set('date_preset', datePreset)
  if (dateFrom) url.searchParams.set('date_from', dateFrom)
  if (dateTo) url.searchParams.set('date_to', dateTo)

  const accountId = process.env.WINDSOR_ACCOUNT_ID
  if (accountId && accountId.trim()) {
    url.searchParams.set('select_accounts', accountId.trim())
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    throw new WindsorError(
      aborted ? 'Windsor.ai não respondeu a tempo.' : 'Falha de rede ao chamar a Windsor.ai.',
      { code: aborted ? 'timeout' : 'network_error', status: 504, cause: error },
    )
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401 || response.status === 403) {
    throw new WindsorError('Credencial da Windsor.ai inválida ou expirada.', {
      code: 'invalid_credentials',
      status: 502,
    })
  }
  if (response.status === 429) {
    throw new WindsorError('Limite de requisições da Windsor.ai atingido.', {
      code: 'rate_limited',
      status: 429,
    })
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new WindsorError(
      `Windsor.ai respondeu ${response.status}. ${body.slice(0, 200)}`.trim(),
      { code: 'upstream_error', status: 502 },
    )
  }

  let payload
  try {
    payload = await response.json()
  } catch (error) {
    throw new WindsorError('Resposta da Windsor.ai não é JSON válido.', {
      code: 'bad_payload',
      status: 502,
      cause: error,
    })
  }

  const rows = extractRows(payload)
  if (!rows) {
    throw new WindsorError('Resposta da Windsor.ai em formato inesperado.', {
      code: 'bad_payload',
      status: 502,
    })
  }
  return rows
}

/* --------------------------------------------------------------------------
 * GRUPOS DE CAMPOS
 * Cada grupo respeita a fronteira de tabela do conector — ver nota no topo.
 * -------------------------------------------------------------------------- */

/** `user_info` — dados de perfil (snapshot de hoje, sem histórico). */
export const PROFILE_FIELDS = [
  'username',
  'name',
  'followers_count',
  'follows_count',
  'media_count',
  'biography',
  'website',
  'user_id',
]

/**
 * Série diária. `reach` vem de `user_insights_day`; o restante de
 * `user_insights_day_total_value`. Agrupar por `date` mantém as duas alinhadas.
 */
export const DAILY_FIELDS = [
  'date',
  'reach',
  'views',
  'total_interactions',
  'accounts_engaged',
  'likes',
  'comments',
  'shares',
  'saves',
  'replies',
  'follower_count',
]

/** `media_info` + `media_insights` — um registro por publicação. */
export const MEDIA_FIELDS = [
  'media_id',
  'media_type',
  'media_product_type',
  'timestamp',
  'media_permalink',
  'media_thumbnail_url',
  'media_url',
  'media_caption',
  'media_views',
  'media_reach',
  'media_like_count',
  'media_comments_count',
  'media_shares',
  'media_saved',
  'media_engagement',
]

/** Métricas exclusivas de Reels (retenção / tempo de visualização). */
export const REEL_FIELDS = [
  'media_id',
  'media_reel_avg_watch_time',
  'media_reel_total_watch_time',
  'media_reel_total_interactions',
  'media_reel_skip_rate',
]

/** Demografia (`user_insights_lifetime_*`) — cada dimensão numa consulta. */
export const AUDIENCE_QUERIES = {
  age: ['audience_age_name', 'audience_age_size'],
  gender: ['audience_gender_name', 'audience_gender_size'],
  city: ['city', 'audience_city_size'],
  country: ['audience_country_name', 'audience_country_size'],
}

/** Stories — só existem por 24h; frequentemente devolve lista vazia. */
export const STORY_FIELDS = [
  'story_id',
  'story_timestamp',
  'story_views',
  'story_reach',
  'story_replies',
  'story_shares',
  'story_interactions',
]
