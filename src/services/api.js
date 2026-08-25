/**
 * ---------------------------------------------------------------------------
 * CLIENTE DE DADOS (NAVEGADOR)
 * ---------------------------------------------------------------------------
 * Duas origens possíveis, nesta ordem:
 *
 *   1. SNAPSHOT EMBUTIDO (`window.__MEDIA_KIT_DATA__`)
 *      Existe na versão de arquivo único. A página pinta na hora, sem rede —
 *      funciona abrindo o HTML com dois cliques, sem servidor nenhum.
 *
 *   2. /api/metrics (ao vivo)
 *      Se o arquivo estiver hospedado ao lado da serverless function, os dados
 *      ao vivo substituem o snapshot assim que chegam.
 *
 * O frontend NUNCA fala com a Windsor.ai diretamente — é assim que a API Key
 * fica protegida no servidor.
 * ---------------------------------------------------------------------------
 */

const ENDPOINT = '/api/metrics'
const TIMEOUT_MS = 15000

export class ApiError extends Error {
  constructor(message, code = 'unknown_error') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const MESSAGES = {
  missing_credentials: 'Integração de métricas ainda não configurada.',
  invalid_credentials: 'A credencial de acesso às métricas expirou.',
  rate_limited: 'Muitas consultas em sequência. Tente de novo em um instante.',
  timeout: 'A consulta às métricas demorou demais.',
  network_error: 'Não foi possível conectar ao serviço de métricas.',
  offline: 'Você parece estar sem conexão.',
}

export function messageFor(code) {
  return MESSAGES[code] || 'Métricas temporariamente indisponíveis.'
}

/** Snapshot assado no HTML pelo `npm run build:html`, se houver. */
export function embeddedSnapshot() {
  const data = globalThis.__MEDIA_KIT_DATA__
  if (!data || typeof data !== 'object' || !data.periods) return null
  return { ...data, meta: { ...data.meta, snapshot: true } }
}

export async function fetchMetrics({ signal } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  signal?.addEventListener('abort', () => controller.abort(), { once: true })

  let response
  try {
    response = await fetch(ENDPOINT, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    const code = !navigator.onLine ? 'offline' : error?.name === 'AbortError' ? 'timeout' : 'network_error'
    throw new ApiError(messageFor(code), code)
  } finally {
    clearTimeout(timer)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    throw new ApiError(messageFor('bad_payload'), 'bad_payload')
  }

  if (!response.ok || payload?.error) {
    const code = payload?.error?.code || 'upstream_error'
    throw new ApiError(payload?.error?.message || messageFor(code), code)
  }
  return payload
}
