/**
 * Utilitários de data. Todo cálculo de janela usa datas "civis" (YYYY-MM-DD)
 * em UTC para evitar deslocamento de fuso — a API do Instagram entrega
 * agregados diários, não timestamps.
 */

export const DAY_MS = 86_400_000

/** 'YYYY-MM-DD' a partir de um Date. */
export function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

/** Date (meia-noite UTC) a partir de 'YYYY-MM-DD'. */
export function fromISODate(iso) {
  return new Date(`${iso}T00:00:00.000Z`)
}

export function addDays(iso, days) {
  return toISODate(new Date(fromISODate(iso).getTime() + days * DAY_MS))
}

/** Diferença em dias inteiros entre duas datas ISO (b - a). */
export function diffDays(a, b) {
  return Math.round((fromISODate(b) - fromISODate(a)) / DAY_MS)
}

/** Lista contínua de datas ISO de `from` até `to`, inclusive. */
export function dateRange(from, to) {
  const out = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/**
 * O Instagram só fecha os agregados do dia depois que ele termina, então o
 * último dia confiável é ONTEM (em relação ao fuso do criador).
 */
export function lastCompleteDay(now = new Date(), timeZone = 'America/Sao_Paulo') {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // 'YYYY-MM-DD'
  return addDays(local, -1)
}

/**
 * Janela de análise + janela imediatamente anterior (para comparação).
 *
 * @param {'24h'|'30d'|'180d'} periodId
 * @param {string} anchor  último dia completo, 'YYYY-MM-DD'
 */
export function resolveWindow(periodId, anchor) {
  const lengths = { '24h': 1, '30d': 30, '180d': 180 }
  const days = lengths[periodId]
  if (!days) throw new Error(`Período desconhecido: ${periodId}`)

  const to = anchor
  const from = addDays(to, -(days - 1))
  const previousTo = addDays(from, -1)
  const previousFrom = addDays(previousTo, -(days - 1))

  return { days, from, to, previousFrom, previousTo }
}

/** Segunda-feira da semana ISO que contém `iso`. Usado no bucket de 180 dias. */
export function startOfISOWeek(iso) {
  const date = fromISODate(iso)
  const day = date.getUTCDay() || 7 // domingo = 7
  return addDays(iso, -(day - 1))
}
