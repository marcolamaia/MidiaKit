/**
 * Cartão de métrica: valor compacto, comparação com o período anterior,
 * indicador de tendência e tooltip explicando o que a métrica significa.
 * O valor completo (sem abreviação) fica sempre no atributo `title`.
 */

import { el } from '../utils/dom.js'
import { icon } from './icons.js'
import { trendBadge } from './trend.js'
import { formatCompact, formatInteger, formatPercent, hasValue } from '../utils/format.js'
import { skeletonBlock } from './states.js'

/**
 * @param {object} config
 * @param {string} config.label       ex.: 'Visualizações'
 * @param {string} config.iconName
 * @param {number|null} config.value
 * @param {object|null} [config.delta]
 * @param {string} config.metric      chave usada para decidir a cor da variação
 * @param {string} [config.context]   ex.: 'vs. 30 dias anteriores'
 * @param {string} [config.tooltip]   explicação da métrica
 * @param {'compact'|'percent'|'integer'} [config.format]
 * @param {string} [config.suffix]
 */
export function metricCard({
  label,
  iconName = 'dot',
  value,
  delta = null,
  metric,
  context,
  tooltip,
  format = 'compact',
  suffix = '',
  unavailableHint,
}) {
  const available = hasValue(value)

  const display = !available
    ? '—'
    : format === 'percent'
      ? formatPercent(value)
      : format === 'integer'
        ? formatInteger(value)
        : formatCompact(value)

  return el('article', {
    className: `metric-card${available ? '' : ' metric-card--empty'}`,
    dataset: { metric },
  }, [
    el('header', { className: 'metric-card-head' }, [
      el('span', { className: 'metric-card-icon' }, [icon(iconName)]),
      el('span', { className: 'metric-card-label', text: label }),
      tooltip
        ? el('span', {
            className: 'info',
            text: '?',
            attrs: { 'data-tip': tooltip, tabindex: '0', role: 'note', 'aria-label': tooltip },
          })
        : null,
    ]),

    el('p', {
      className: 'metric-card-value metric-value num',
      // Tooltip nativo com o número inteiro — nada de precisão se perde.
      attrs: available ? { title: `${formatInteger(value)}${suffix ? ` ${suffix}` : ''}` } : {},
      text: display,
    }),

    available
      ? el('footer', { className: 'metric-card-foot' }, [
          delta ? trendBadge(delta, { metric, context }) : null,
          context ? el('span', { className: 'metric-card-context', text: context }) : null,
        ])
      : el('footer', { className: 'metric-card-foot' }, [
          el('span', {
            className: 'metric-card-context',
            text: unavailableHint || 'Dados não disponíveis',
          }),
        ]),
  ])
}

/** Esqueleto com a mesma altura do cartão real — sem "pulo" de layout. */
export function metricCardSkeleton() {
  return el('article', { className: 'metric-card', attrs: { 'aria-hidden': 'true' } }, [
    el('header', { className: 'metric-card-head' }, [
      el('span', { className: 'skeleton', style: { width: '28px', height: '28px', borderRadius: '8px' } }),
      el('span', { className: 'skeleton skeleton-line', style: { width: '84px' } }),
    ]),
    skeletonBlock({ height: 34, className: 'metric-card-value-skeleton' }),
    el('span', { className: 'skeleton skeleton-line', style: { width: '110px', marginTop: '10px' } }),
  ])
}
