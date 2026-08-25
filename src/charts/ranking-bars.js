/**
 * Ranking horizontal: faixa etária, cidades, estados, países, distribuição de
 * interações. Barra + rótulo + percentual, com o valor absoluto no tooltip.
 */

import { el, clear } from '../utils/dom.js'
import { formatCompact, formatInteger, formatPercent, hasValue } from '../utils/format.js'

/**
 * @param {HTMLElement} container
 * @param {Array<{label:string, sublabel?:string, value:number, share:number|null}>} entries
 * @param {object} [options]
 * @param {'share'|'value'} [options.display='share']  o que aparece à direita
 * @param {string} [options.unit] descrição do valor absoluto no tooltip
 * @param {boolean} [options.compact] layout mais denso (sem barra de fundo)
 */
export function renderRankingBars(container, entries, options = {}) {
  const { display = 'share', unit = 'seguidores', compact = false } = options
  clear(container)
  container.classList.add('ranking')
  if (compact) container.classList.add('ranking--compact')

  if (!entries?.length) {
    container.append(
      el('div', { className: 'state' }, [
        el('p', { className: 'state-title', text: 'Dados não disponíveis' }),
      ]),
    )
    return
  }

  const max = Math.max(...entries.map((e) => e.value || 0)) || 1

  entries.forEach((entry, index) => {
    const ratio = (entry.value || 0) / max
    const right = display === 'share' && hasValue(entry.share)
      ? formatPercent(entry.share, entry.share >= 10 ? 0 : 1)
      : formatCompact(entry.value)

    container.append(
      el('li', { className: 'ranking-row' }, [
        el('div', { className: 'ranking-info' }, [
          el('span', { className: 'ranking-label', text: entry.label }),
          entry.sublabel ? el('span', { className: 'ranking-sublabel', text: entry.sublabel }) : null,
        ]),
        el('div', {
          className: 'meter ranking-meter',
          attrs: { title: `${formatInteger(entry.value)} ${unit}` },
        }, [
          el('span', {
            style: { '--value': String(ratio), '--bar-delay': `${index * 45}ms` },
          }),
        ]),
        el('span', { className: 'ranking-value num', text: right }),
      ]),
    )
  })
}
