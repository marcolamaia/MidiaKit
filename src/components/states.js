/** Estados compartilhados: carregando, vazio, erro. Nunca "undefined"/"NaN". */

import { el } from '../utils/dom.js'
import { icon } from './icons.js'

export function skeletonBlock({ height = 200, className = '' } = {}) {
  return el('div', {
    className: `skeleton ${className}`.trim(),
    style: { height: typeof height === 'number' ? `${height}px` : height },
    attrs: { 'aria-hidden': 'true' },
  })
}

export function skeletonLines(count = 3, widths = ['100%', '84%', '62%']) {
  return el('div', { attrs: { 'aria-hidden': 'true' } },
    Array.from({ length: count }, (_, i) =>
      el('div', {
        className: 'skeleton skeleton-line',
        style: { width: widths[i % widths.length] },
      }),
    ),
  )
}

/** Estado "sem dados" — usado quando a API não oferece a métrica. */
export function emptyState(title = 'Dados não disponíveis', hint) {
  return el('div', { className: 'state' }, [
    icon('empty'),
    el('p', { className: 'state-title', text: title }),
    hint ? el('p', { className: 'state-hint', text: hint }) : null,
  ])
}

/** Estado de erro — nunca derruba o restante da página. */
export function errorState(message = 'Métricas temporariamente indisponíveis.', { onRetry, hint } = {}) {
  return el('div', { className: 'state state--error' }, [
    icon('alert'),
    el('p', { className: 'state-title', text: message }),
    hint ? el('p', { className: 'state-hint', text: hint }) : null,
    onRetry
      ? el('button', { className: 'btn btn--secondary btn--sm', type: 'button', on: { click: onRetry } }, [
          icon('refresh'), 'Tentar de novo',
        ])
      : null,
  ])
}
