/**
 * Indicador de variação entre períodos.
 *
 * Regra deliberada: verde/vermelho NÃO são aplicados automaticamente. Só
 * métricas em que "mais é melhor" (alcance, views, seguidores) recebem cor.
 * Para as demais, a variação aparece em tom neutro — queda de frequência de
 * publicação, por exemplo, não é necessariamente ruim.
 */

import { el } from '../utils/dom.js'
import { icon } from './icons.js'
import { formatDelta } from '../utils/format.js'

/** Métricas em que crescer é inequivocamente positivo para uma marca. */
const HIGHER_IS_BETTER = new Set([
  'reach', 'views', 'interactions', 'engagedAccounts', 'likes', 'comments',
  'shares', 'saves', 'newFollowers', 'engagementRate', 'followers',
])

export function trendBadge(delta, { metric, context } = {}) {
  if (!delta) return null
  const text = formatDelta(delta)
  if (!text) return null

  const colored = metric ? HIGHER_IS_BETTER.has(metric) : true
  const tone = !colored ? 'flat' : delta.direction

  const iconName = delta.direction === 'up' ? 'arrowUp' : delta.direction === 'down' ? 'arrowDown' : 'minus'

  return el('span', {
    className: `trend trend--${tone}`,
    attrs: context ? { title: context } : {},
  }, [icon(iconName), text])
}

export { HIGHER_IS_BETTER }
