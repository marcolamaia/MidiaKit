/**
 * Donut compacto — usado só para a divisão de gênero, onde há 2 fatias.
 * Deliberadamente pequeno: um gráfico de pizza grande ocuparia espaço nobre
 * sem entregar mais informação do que a legenda ao lado.
 */

import { svg, el, clear } from '../utils/dom.js'
import { formatInteger, formatPercent } from '../utils/format.js'

const SIZE = 132
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const SLICE_COLORS = ['var(--accent)', 'var(--accent-bright)', 'var(--surface-3)']

/**
 * @param {HTMLElement} container
 * @param {Array<{label:string, value:number, share:number|null}>} entries
 * @param {object} [options] { unit }
 */
export function renderDonut(container, entries, options = {}) {
  const { unit = 'seguidores' } = options
  clear(container)
  container.classList.add('donut')

  if (!entries?.length) {
    container.append(el('div', { className: 'state' }, [
      el('p', { className: 'state-title', text: 'Dados não disponíveis' }),
    ]))
    return
  }

  const total = entries.reduce((acc, e) => acc + (e.value || 0), 0) || 1
  const root = svg('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    width: SIZE,
    height: SIZE,
    class: 'donut-svg',
    role: 'img',
    'aria-label': entries.map((e) => `${e.label}: ${formatPercent(e.share ?? 0, 1)}`).join(', '),
  })

  // Trilho de fundo — garante um anel fechado mesmo com arredondamento.
  root.append(svg('circle', {
    cx: SIZE / 2, cy: SIZE / 2, r: RADIUS,
    fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': STROKE,
  }))

  let offset = 0
  entries.forEach((entry, index) => {
    const fraction = (entry.value || 0) / total
    const length = fraction * CIRCUMFERENCE
    root.append(
      svg('circle', {
        cx: SIZE / 2, cy: SIZE / 2, r: RADIUS,
        fill: 'none',
        stroke: SLICE_COLORS[index % SLICE_COLORS.length],
        'stroke-width': STROKE,
        'stroke-dasharray': `${length} ${CIRCUMFERENCE - length}`,
        'stroke-dashoffset': -offset,
        // Começa no topo, sentido horário.
        transform: `rotate(-90 ${SIZE / 2} ${SIZE / 2})`,
        class: 'donut-slice',
        style: `--slice-delay:${index * 120}ms`,
      }, [
        svg('title', {}, [`${entry.label}: ${formatInteger(entry.value)} ${unit}`]),
      ]),
    )
    offset += length
  })

  const legend = el('ul', { className: 'donut-legend' },
    entries.map((entry, index) =>
      el('li', { attrs: { title: `${formatInteger(entry.value)} ${unit}` } }, [
        el('i', { style: { background: SLICE_COLORS[index % SLICE_COLORS.length] } }),
        el('span', { className: 'donut-legend-value num', text: formatPercent(entry.share ?? 0, 1) }),
        el('span', { className: 'donut-legend-label', text: entry.label }),
      ]),
    ),
  )

  container.append(root, legend)
}
