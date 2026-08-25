/** Helpers de escala e caminho, compartilhados pelos gráficos. */

/** Interpolação linear de domínio → intervalo de pixels. */
export function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin
  if (!span) return () => (rangeMin + rangeMax) / 2
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

/**
 * "Ticks bonitos": teto arredondado para 1/2/2,5/5 × 10ⁿ, para o eixo Y
 * terminar em 500K em vez de 487.312.
 */
export function niceCeil(value) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** N+1 marcas igualmente espaçadas entre 0 e o teto. */
export function buildTicks(max, count = 4) {
  const top = niceCeil(max)
  return Array.from({ length: count + 1 }, (_, i) => (top / count) * i)
}

/**
 * Curva monotônica cúbica (Fritsch–Carlson). Suaviza a linha sem criar
 * "barrigas" que inventam valores fora do intervalo real — importante num
 * gráfico que representa métricas comerciais.
 */
export function monotonePath(points) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  const n = points.length
  const dx = []
  const dy = []
  const slope = []

  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x
    dy[i] = points[i + 1].y - points[i].y
    slope[i] = dx[i] ? dy[i] / dx[i] : 0
  }

  const tangent = [slope[0]]
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent[i] = 0
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
    }
  }
  tangent[n - 1] = slope[n - 2]

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = points[i].x + dx[i] / 3
    const c1y = points[i].y + (tangent[i] * dx[i]) / 3
    const c2x = points[i + 1].x - dx[i] / 3
    const c2y = points[i + 1].y - (tangent[i + 1] * dx[i]) / 3
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${points[i + 1].x} ${points[i + 1].y}`
  }
  return d
}

/** Divide a série em segmentos contínuos, pulando buracos (valor null). */
export function splitSegments(points) {
  const segments = []
  let current = []
  for (const point of points) {
    if (point.value === null || point.value === undefined) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push(point)
    }
  }
  if (current.length) segments.push(current)
  return segments
}
