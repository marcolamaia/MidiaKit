/**
 * ---------------------------------------------------------------------------
 * COMPARATIVO DE BARRAS — usado no período de 24 horas
 * ---------------------------------------------------------------------------
 * Por que existe: a API de insights do Instagram/Meta (via Windsor.ai) NÃO
 * expõe granularidade horária — o menor agregado disponível é o dia. Desenhar
 * uma linha temporal com um único ponto seria enganoso, então no período de
 * 24h comparamos o último dia fechado com o dia anterior. Dado real, leitura
 * honesta.
 * ---------------------------------------------------------------------------
 */

import { el, clear } from '../utils/dom.js'
import { formatCompact, formatInteger, hasValue } from '../utils/format.js'
import { trendBadge } from '../components/trend.js'

/**
 * @param {HTMLElement} container
 * @param {Array<{label:string, current:number|null, previous:number|null, delta:object|null}>} rows
 * @param {object} labels  { current, previous }
 */
export function renderBarCompare(container, rows, labels) {
  clear(container)
  container.classList.add('bar-compare')

  const usable = rows.filter((row) => hasValue(row.current))
  if (!usable.length) {
    container.append(
      el('div', { className: 'state' }, [
        el('p', { className: 'state-title', text: 'Sem dados no período' }),
      ]),
    )
    return
  }

  container.append(
    el('div', { className: 'bar-compare-legend' }, [
      el('span', { className: 'bar-compare-key bar-compare-key--current' }, [
        el('i'), labels.current,
      ]),
      el('span', { className: 'bar-compare-key bar-compare-key--previous' }, [
        el('i'), labels.previous,
      ]),
    ]),
  )

  for (const row of usable) {
    // Cada linha tem escala própria: as métricas têm ordens de grandeza
    // diferentes e uma escala comum achataria as menores.
    const scaleMax = Math.max(row.current || 0, row.previous || 0) || 1

    container.append(
      el('div', { className: 'bar-compare-row' }, [
        el('div', { className: 'bar-compare-head' }, [
          el('span', { className: 'bar-compare-label', text: row.label }),
          row.delta ? trendBadge(row.delta) : null,
        ]),
        el('div', { className: 'bar-compare-bars' }, [
          el('div', { className: 'bar-compare-bar bar-compare-bar--current' }, [
            el('div', {
              className: 'bar-compare-fill',
              style: { '--value': String((row.current || 0) / scaleMax) },
              attrs: { title: `${labels.current}: ${formatInteger(row.current)}` },
            }),
            el('span', { className: 'bar-compare-value num', text: formatCompact(row.current) }),
          ]),
          el('div', { className: 'bar-compare-bar bar-compare-bar--previous' }, [
            el('div', {
              className: 'bar-compare-fill',
              style: { '--value': String((row.previous || 0) / scaleMax) },
              attrs: { title: `${labels.previous}: ${formatInteger(row.previous)}` },
            }),
            el('span', {
              className: 'bar-compare-value num',
              text: hasValue(row.previous) ? formatCompact(row.previous) : '—',
            }),
          ]),
        ]),
      ]),
    )
  }
}
