/**
 * Seletor de período. Trocar de período NÃO recarrega a página nem refaz
 * requisição: os três períodos vêm no mesmo payload e a troca é só recorte.
 */

import { el } from '../utils/dom.js'
import { periods } from '../config.js'
import { getState, setState } from '../hooks/store.js'

export function periodSelector({ id = 'period-selector' } = {}) {
  const buttons = periods.map((period) =>
    el('button', {
      className: 'period-option',
      type: 'button',
      attrs: {
        role: 'tab',
        'data-period': period.id,
        'aria-selected': String(getState().period === period.id),
        'aria-label': period.longLabel,
        title: period.longLabel,
      },
      text: period.label,
      on: { click: () => setState({ period: period.id }) },
    }),
  )

  const group = el('div', {
    className: 'period-selector',
    attrs: { id, role: 'tablist', 'aria-label': 'Período de análise' },
  }, [el('span', { className: 'period-indicator', attrs: { 'aria-hidden': 'true' } }), ...buttons])

  function sync(activeId) {
    const index = periods.findIndex((p) => p.id === activeId)
    for (const button of buttons) {
      button.setAttribute('aria-selected', String(button.dataset.period === activeId))
    }
    // Indicador deslizante: largura de um item, deslocado pela posição.
    group.style.setProperty('--active-index', String(Math.max(index, 0)))
    group.style.setProperty('--option-count', String(periods.length))
  }

  sync(getState().period)

  // Setas do teclado navegam entre os períodos (padrão ARIA de tablist).
  group.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    const current = periods.findIndex((p) => p.id === getState().period)
    const next = event.key === 'ArrowRight'
      ? (current + 1) % periods.length
      : (current - 1 + periods.length) % periods.length
    setState({ period: periods[next].id })
    buttons[next].focus()
    event.preventDefault()
  })

  return { node: group, sync }
}
