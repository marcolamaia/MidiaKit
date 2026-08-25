/**
 * ---------------------------------------------------------------------------
 * GET /api/metrics
 * ---------------------------------------------------------------------------
 * Única porta de entrada do frontend para os dados. A `WINDSOR_API_KEY` é lida
 * aqui, no servidor, e NUNCA chega ao navegador.
 *
 * Query params:
 *   ?refresh=1   ignora o cache (protegido por REVALIDATE_TOKEN quando definido)
 *
 * Respostas:
 *   200 { meta, profile, periods, audience, stories, availability }
 *   429 { error: { code:'rate_limited', ... } }
 *   5xx { error: { code, message } }  → a UI mostra "métricas indisponíveis"
 *        sem quebrar o restante da página.
 * ---------------------------------------------------------------------------
 */

import { getMetrics, isDemoMode } from '../src/services/metrics.js'
import { getTtlSeconds } from '../src/services/cache.js'

/** Rate limit simples por IP — evita que a rota vire proxy aberto. */
const WINDOW_MS = 60_000
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_PER_MINUTE || 60)
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  if (hits.size > 5000) hits.clear() // teto de memória
  return entry.count > MAX_REQUESTS
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function send(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value)
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.end()
  }
  if (req.method !== 'GET') {
    return send(res, 405, { error: { code: 'method_not_allowed', message: 'Use GET.' } }, { Allow: 'GET' })
  }

  const ip = clientIp(req)
  if (rateLimited(ip)) {
    return send(
      res,
      429,
      { error: { code: 'rate_limited', message: 'Muitas requisições. Tente novamente em instantes.' } },
      { 'Retry-After': '60' },
    )
  }

  const url = new URL(req.url || '/', 'http://localhost')
  const wantsRefresh = url.searchParams.get('refresh') === '1'
  const revalidateToken = process.env.REVALIDATE_TOKEN
  // Sem token configurado, `?refresh=1` fica liberado (conveniente em dev).
  // Com token, é preciso passá-lo — evita que alguém fure o cache de propósito.
  const force =
    wantsRefresh && (!revalidateToken || url.searchParams.get('token') === revalidateToken)

  try {
    const { payload, cache, storedAt } = await getMetrics({ force })
    const ttl = getTtlSeconds()

    return send(
      res,
      200,
      { ...payload, meta: { ...payload.meta, cache, cachedAt: storedAt ?? null } },
      {
        // A borda da CDN absorve a maior parte do tráfego; o backend só é
        // acionado quando o cache vence.
        'Cache-Control': `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`,
        'X-Data-Source': payload.meta.demo ? 'demo' : 'windsor',
        'X-Cache': cache,
      },
    )
  } catch (error) {
    const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 502
    const code = error?.code || 'unknown_error'

    // Log fica no servidor; a mensagem devolvida não expõe detalhe interno.
    console.error('[api/metrics]', code, error?.message)

    const publicMessage =
      code === 'missing_credentials' && !isDemoMode()
        ? 'Integração não configurada. Defina WINDSOR_API_KEY ou ative DEMO_MODE.'
        : 'Métricas temporariamente indisponíveis.'

    return send(
      res,
      status,
      { error: { code, message: publicMessage } },
      { 'Cache-Control': 'no-store' },
    )
  }
}
