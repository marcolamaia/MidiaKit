/**
 * ---------------------------------------------------------------------------
 * FORMATAÇÃO — pt-BR
 * ---------------------------------------------------------------------------
 * Regra do projeto: nunca exibir `12328492`. Exibir `12,3 mi`, `12,4 mil`,
 * `1.200`. O valor completo fica SEMPRE disponível no tooltip (atributo
 * `title`), então nenhuma precisão é perdida.
 * ---------------------------------------------------------------------------
 */

const LOCALE = 'pt-BR'

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Verdadeiro só para números utilizáveis.
 *
 * Cuidado com `Number('')`, que vale 0: sem o teste de string vazia, um campo
 * vazio devolvido pela API apareceria como "0" — e num Media Kit comercial um
 * zero falso é pior do que um traço.
 */
export function hasValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (typeof value === 'boolean') return false
  return Number.isFinite(Number(value))
}

/** Número inteiro com separador de milhar: 1200 → "1.200". */
export function formatInteger(value) {
  if (!hasValue(value)) return '—'
  return integerFormatter.format(Math.round(Number(value)))
}

/**
 * Formato compacto brasileiro.
 *   940        → "940"
 *   12400      → "12,4 mil"
 *   2800000    → "2,8 mi"
 *   1200000000 → "1,2 bi"
 */
export function formatCompact(value) {
  if (!hasValue(value)) return '—'
  const n = Number(value)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''

  if (abs < 1000) return `${sign}${integerFormatter.format(Math.round(abs))}`
  if (abs < 1_000_000) {
    const scaled = abs / 1000
    // Acima de 100 mil o decimal só polui: 738,2 mil vira 738 mil.
    return scaled >= 100
      ? `${sign}${integerFormatter.format(Math.round(scaled))} mil`
      : `${sign}${oneDecimal.format(scaled)} mil`
  }
  if (abs < 1_000_000_000) return `${sign}${oneDecimal.format(abs / 1_000_000)} mi`
  return `${sign}${oneDecimal.format(abs / 1_000_000_000)} bi`
}

/** Percentual: 9.64 → "9,64%". */
export function formatPercent(value, decimals = 2) {
  if (!hasValue(value)) return '—'
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value))}%`
}

/** Variação assinada: 18.7 → "+18,7%"; -4 → "-4,0%". */
export function formatDelta(delta) {
  if (!delta || !hasValue(delta.pct)) return null
  const sign = delta.pct > 0 ? '+' : ''
  const unit = delta.unit === 'pp' ? 'pp' : '%'
  const value = delta.unit === 'pp' ? delta.abs : delta.pct
  if (!hasValue(value)) return null
  return `${sign}${oneDecimal.format(Number(value))}${unit}`
}

/** Variação absoluta compacta: 812345 → "+812 mil". */
export function formatDeltaAbsolute(delta) {
  if (!delta || !hasValue(delta.abs)) return null
  const sign = delta.abs > 0 ? '+' : delta.abs < 0 ? '-' : ''
  return `${sign}${formatCompact(Math.abs(delta.abs))}`
}

/** Milissegundos → "21,9s" ou "1min 12s". */
export function formatDuration(ms) {
  if (!hasValue(ms)) return '—'
  const seconds = Number(ms) / 1000
  if (seconds < 60) return `${oneDecimal.format(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}min ${Math.round(seconds % 60)}s`
}

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' })
const fullDate = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
const longDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' })

function parseISODate(iso) {
  return new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)
}

/** '2026-08-14' → "14 ago". */
export function formatShortDate(iso) {
  if (!iso) return '—'
  // O pt-BR devolve "14 de ago."; montamos a partir das partes para ficar
  // compacto o suficiente para caber num eixo de gráfico.
  const parts = dayMonth.formatToParts(parseISODate(iso))
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const month = (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', '')
  return `${day} ${month}`
}

/** '2026-08-14' → "14 de agosto". */
export function formatLongDate(iso) {
  if (!iso) return '—'
  return longDate.format(parseISODate(iso))
}

/** '2026-08-14' → "14/08/2026". */
export function formatDate(iso) {
  if (!iso) return '—'
  return fullDate.format(parseISODate(iso))
}

/** ISO completo → "25/08/2026 às 09:27" no fuso do criador. */
export function formatDateTime(isoString, timeZone = 'America/Sao_Paulo') {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  const datePart = new Intl.DateTimeFormat(LOCALE, {
    timeZone, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
  const timePart = new Intl.DateTimeFormat(LOCALE, {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
  return `${datePart} às ${timePart}`
}

/** Rótulo do intervalo: "26 jul – 24 ago". */
export function formatRange(from, to) {
  if (!from || !to) return '—'
  if (from === to) return formatLongDate(from)
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}
