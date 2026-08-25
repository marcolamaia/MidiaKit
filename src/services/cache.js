/**
 * ---------------------------------------------------------------------------
 * CACHE DE MÉTRICAS (SERVIDOR)
 * ---------------------------------------------------------------------------
 * As métricas do Instagram fecham uma vez por dia, então não faz sentido
 * consultar a Windsor.ai a cada visita. A estratégia é em camadas:
 *
 *   1. Memória do processo — instantâneo enquanto a lambda estiver quente.
 *   2. Disco (opcional, /tmp) — sobrevive entre invocações da mesma instância.
 *   3. CDN — o handler manda `s-maxage` + `stale-while-revalidate`, então a
 *      borda da Vercel serve a maioria dos acessos sem tocar no backend.
 *
 * TTL padrão: 6h. Mesmo com atualização diária, um TTL menor garante que o
 * fechamento do dia apareça no Media Kit poucas horas depois de existir.
 * ---------------------------------------------------------------------------
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 6 * 60 * 60)
const DISK_CACHE_ENABLED = process.env.CACHE_DISK !== 'false'
const CACHE_FILE = join(tmpdir(), 'media-kit-cache', 'metrics.json')

/** @type {Map<string, {expiresAt:number, payload:any}>} */
const memory = new Map()

export function getTtlSeconds() {
  return DEFAULT_TTL_SECONDS
}

async function readDisk(key) {
  if (!DISK_CACHE_ENABLED) return null
  try {
    const raw = await readFile(CACHE_FILE, 'utf8')
    const store = JSON.parse(raw)
    const entry = store?.[key]
    if (!entry || typeof entry.expiresAt !== 'number') return null
    if (entry.expiresAt < Date.now()) return null
    return entry
  } catch {
    return null // cache frio ou corrompido nunca deve derrubar a requisição
  }
}

async function writeDisk(key, entry) {
  if (!DISK_CACHE_ENABLED) return
  try {
    await mkdir(dirname(CACHE_FILE), { recursive: true })
    let store = {}
    try {
      store = JSON.parse(await readFile(CACHE_FILE, 'utf8')) || {}
    } catch {
      store = {}
    }
    store[key] = entry
    await writeFile(CACHE_FILE, JSON.stringify(store), 'utf8')
  } catch {
    // Disco somente-leitura em alguns runtimes — seguimos só com memória.
  }
}

export async function readCache(key) {
  const hit = memory.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return { payload: hit.payload, source: 'memory', storedAt: hit.storedAt }
  }
  memory.delete(key)

  const disk = await readDisk(key)
  if (disk) {
    memory.set(key, disk)
    return { payload: disk.payload, source: 'disk', storedAt: disk.storedAt }
  }
  return null
}

export async function writeCache(key, payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const entry = {
    payload,
    storedAt: new Date().toISOString(),
    expiresAt: Date.now() + ttlSeconds * 1000,
  }
  memory.set(key, entry)
  await writeDisk(key, entry)
  return entry
}

/**
 * Último payload bem-sucedido, mesmo vencido. Serve de rede de segurança:
 * se a Windsor cair, é melhor mostrar o dado real de ontem (rotulado como tal)
 * do que uma tela de erro.
 */
export async function readStale(key) {
  const hit = memory.get(key)
  if (hit) return { payload: hit.payload, storedAt: hit.storedAt, stale: true }
  if (!DISK_CACHE_ENABLED) return null
  try {
    const store = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
    const entry = store?.[key]
    return entry ? { payload: entry.payload, storedAt: entry.storedAt, stale: true } : null
  } catch {
    return null
  }
}

export function clearCache() {
  memory.clear()
}
