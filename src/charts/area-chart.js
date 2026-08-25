/**
 * ---------------------------------------------------------------------------
 * GRÁFICO DE ÁREA / LINHA TEMPORAL
 * ---------------------------------------------------------------------------
 * SVG puro, ~6 KB, sem dependência externa. Escolhido no lugar de Chart.js ou
 * ApexCharts porque precisamos de controle fino sobre o traço, o gradiente e o
 * comportamento de toque — e porque cada KB conta na meta de Lighthouse.
 *
 * Recursos: gradiente de área, curva monotônica, buracos quando falta dado,
 * grade discreta, crosshair, tooltip com valor completo, animação de entrada,
 * suporte a toque e a `prefers-reduced-motion`, redesenho no resize.
 * ---------------------------------------------------------------------------
 */

import { svg, el, clear, prefersReducedMotion, raf } from '../utils/dom.js'
import { formatCompact, formatInteger, formatLongDate, formatShortDate } from '../utils/format.js'
import { buildTicks, linearScale, monotonePath, niceCeil, splitSegments } from './scale.js'

const MARGIN = { top: 16, right: 8, bottom: 28, left: 46 }
let gradientSeed = 0

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {Array<{date:string, value:number|null}>} options.points
 * @param {string} [options.label]        nome da métrica (tooltip)
 * @param {'day'|'week'} [options.granularity]
 * @param {number} [options.height]
 */
export function renderAreaChart(container, { points, label = 'Valor', granularity = 'day', height = 300 }) {
  clear(container)
  container.classList.add('chart')

  const valid = points.filter((p) => p.value !== null && p.value !== undefined)
  if (valid.length < 2) {
    container.append(
      el('div', { className: 'state', style: { minHeight: `${height}px` } }, [
        el('p', { className: 'state-title', text: 'Sem dados suficientes' }),
        el('p', { className: 'state-hint', text: 'Este período ainda não tem pontos suficientes para desenhar a evolução.' }),
      ]),
    )
    return () => {}
  }

  const uid = `chart-${++gradientSeed}`
  const tooltip = el('div', { className: 'chart-tooltip', attrs: { role: 'status', 'aria-live': 'polite' } })
  const surface = el('div', { className: 'chart-surface' })
  container.append(surface, tooltip)

  let cleanupHover = () => {}

  function draw() {
    const width = surface.clientWidth || container.clientWidth || 640
    if (width < 40) return

    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    const maxValue = Math.max(...valid.map((p) => p.value))
    const top = niceCeil(maxValue * 1.08)
    const ticks = buildTicks(maxValue * 1.08, 4)

    const x = linearScale(0, points.length - 1, MARGIN.left, MARGIN.left + innerW)
    const y = linearScale(0, top, MARGIN.top + innerH, MARGIN.top)

    const positioned = points.map((point, index) => ({
      ...point,
      x: x(index),
      y: point.value === null || point.value === undefined ? null : y(point.value),
      index,
    }))

    const root = svg('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: 'img',
      'aria-label': `${label} ao longo do período`,
      class: 'chart-svg',
    })

    /* Gradiente da área */
    root.append(
      svg('defs', {}, [
        svg('linearGradient', { id: `${uid}-fill`, x1: '0', y1: '0', x2: '0', y2: '1' }, [
          svg('stop', { offset: '0%', 'stop-color': 'var(--accent)', 'stop-opacity': '0.28' }),
          svg('stop', { offset: '100%', 'stop-color': 'var(--accent)', 'stop-opacity': '0' }),
        ]),
      ]),
    )

    /* Grade + eixo Y */
    const grid = svg('g', { class: 'chart-grid' })
    for (const tick of ticks) {
      const ty = y(tick)
      grid.append(
        svg('line', { x1: MARGIN.left, x2: MARGIN.left + innerW, y1: ty, y2: ty, class: 'chart-gridline' }),
        svg('text', { x: MARGIN.left - 10, y: ty + 4, class: 'chart-axis-label', 'text-anchor': 'end' }, [
          formatCompact(tick),
        ]),
      )
    }
    root.append(grid)

    /* Área + linha, por segmento contínuo */
    const segments = splitSegments(positioned)
    const baseline = MARGIN.top + innerH
    const paths = []

    for (const segment of segments) {
      if (segment.length < 2) {
        // Ponto isolado entre buracos: mostramos só a bolinha.
        root.append(svg('circle', { cx: segment[0].x, cy: segment[0].y, r: 2.5, class: 'chart-orphan' }))
        continue
      }
      const line = monotonePath(segment)
      root.append(
        svg('path', {
          d: `${line} L ${segment.at(-1).x} ${baseline} L ${segment[0].x} ${baseline} Z`,
          fill: `url(#${uid}-fill)`,
          class: 'chart-area',
        }),
      )
      const stroke = svg('path', { d: line, class: 'chart-line' })
      root.append(stroke)
      paths.push(stroke)
    }

    /* Eixo X — quantidade de rótulos adaptada à largura disponível. */
    const maxLabels = Math.max(2, Math.floor(innerW / 78))
    const step = Math.max(1, Math.ceil(points.length / maxLabels))
    for (let i = 0; i < points.length; i += step) {
      root.append(
        svg('text', {
          x: x(i),
          y: height - 8,
          class: 'chart-axis-label',
          'text-anchor': i === 0 ? 'start' : 'middle',
        }, [formatShortDate(points[i].date)]),
      )
    }

    /* Camada de interação */
    const crosshair = svg('line', {
      y1: MARGIN.top, y2: baseline, class: 'chart-crosshair', opacity: '0',
    })
    const marker = svg('circle', { r: 4.5, class: 'chart-marker', opacity: '0' })
    const hitArea = svg('rect', {
      x: MARGIN.left, y: MARGIN.top, width: innerW, height: innerH,
      fill: 'transparent', class: 'chart-hit',
    })
    root.append(crosshair, marker, hitArea)

    clear(surface).append(root)

    /* Animação de entrada: o traço se desenha da esquerda para a direita. */
    if (!prefersReducedMotion()) {
      for (const path of paths) {
        const length = path.getTotalLength()
        path.style.strokeDasharray = String(length)
        path.style.strokeDashoffset = String(length)
        path.getBoundingClientRect() // força reflow para a transição pegar
        path.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)'
        path.style.strokeDashoffset = '0'
      }
    }

    /* ---- Hover / toque ---- */
    const withValue = positioned.filter((p) => p.y !== null)

    function nearest(clientX) {
      const rect = root.getBoundingClientRect()
      const localX = ((clientX - rect.left) / rect.width) * width
      let best = withValue[0]
      let bestDistance = Infinity
      for (const point of withValue) {
        const distance = Math.abs(point.x - localX)
        if (distance < bestDistance) { bestDistance = distance; best = point }
      }
      return best
    }

    function show(point) {
      crosshair.setAttribute('x1', point.x)
      crosshair.setAttribute('x2', point.x)
      crosshair.setAttribute('opacity', '1')
      marker.setAttribute('cx', point.x)
      marker.setAttribute('cy', point.y)
      marker.setAttribute('opacity', '1')

      const dateLabel = granularity === 'week'
        ? `Semana de ${formatLongDate(point.date)}`
        : formatLongDate(point.date)

      clear(tooltip).append(
        el('span', { className: 'chart-tooltip-date', text: dateLabel }),
        el('span', { className: 'chart-tooltip-value' }, [
          el('i', { className: 'chart-tooltip-dot' }),
          el('span', { text: label }),
          el('strong', { className: 'num', text: formatInteger(point.value) }),
        ]),
      )

      // Mantém o tooltip dentro do gráfico nas bordas.
      const ratio = point.x / width
      tooltip.style.left = `${Math.min(Math.max(ratio * 100, 8), 92)}%`
      tooltip.style.top = `${(point.y / height) * 100}%`
      tooltip.dataset.visible = 'true'
    }

    function hide() {
      crosshair.setAttribute('opacity', '0')
      marker.setAttribute('opacity', '0')
      delete tooltip.dataset.visible
    }

    const onMove = raf((clientX) => show(nearest(clientX)))
    const handlePointer = (event) => onMove(event.clientX)
    const handleTouch = (event) => {
      if (event.touches[0]) onMove(event.touches[0].clientX)
    }

    root.addEventListener('pointermove', handlePointer)
    root.addEventListener('pointerleave', hide)
    root.addEventListener('touchmove', handleTouch, { passive: true })
    root.addEventListener('touchend', hide)

    cleanupHover = () => {
      root.removeEventListener('pointermove', handlePointer)
      root.removeEventListener('pointerleave', hide)
      root.removeEventListener('touchmove', handleTouch)
      root.removeEventListener('touchend', hide)
    }
  }

  draw()

  // Redesenha quando o container muda de tamanho (rotação, resize, aba).
  const observer = new ResizeObserver(raf(() => { cleanupHover(); draw() }))
  observer.observe(surface)

  return () => { observer.disconnect(); cleanupHover() }
}
