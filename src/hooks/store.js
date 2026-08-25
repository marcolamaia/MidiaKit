/**
 * Store mínimo (observável). Guarda o payload de métricas, o período ativo e o
 * status de carregamento. Trocar de período NÃO refaz requisição — os três
 * períodos vêm no mesmo payload e a troca é só recorte em memória.
 */

const listeners = new Set()

const state = {
  status: 'idle',   // 'idle' | 'loading' | 'ready' | 'error'
  data: null,
  error: null,
  period: '30d',
}

export function getState() {
  return state
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(changed) {
  for (const listener of listeners) listener(state, changed)
}

export function setState(patch) {
  const changed = []
  for (const [key, value] of Object.entries(patch)) {
    if (state[key] !== value) {
      state[key] = value
      changed.push(key)
    }
  }
  if (changed.length) emit(changed)
}

/** Período ativo já resolvido, ou null enquanto não há dados. */
export function currentPeriod() {
  return state.data?.periods?.[state.period] ?? null
}
