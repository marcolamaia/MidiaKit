/**
 * Cartão de conteúdo — miniatura real da publicação com as métricas por cima.
 * Deve parecer um pedaço do feed, não uma célula de dashboard.
 *
 * As URLs de miniatura do CDN da Meta são assinadas e expiram. Quando a imagem
 * falha, o cartão cai num fundo com o próprio texto do post — continua
 * legível e não mostra ícone de imagem quebrada.
 */

import { el } from '../utils/dom.js'
import { icon } from './icons.js'
import { formatCompact, formatInteger, formatShortDate, hasValue } from '../utils/format.js'

const TYPE_LABELS = { reel: 'Reels', carousel: 'Carrossel', post: 'Post' }

function metricPill(iconName, value, fullLabel) {
  if (!hasValue(value)) return null
  return el('span', {
    className: 'content-metric',
    attrs: { title: `${formatInteger(value)} ${fullLabel}` },
  }, [icon(iconName), el('span', { className: 'num', text: formatCompact(value) })])
}

/** Fallback visual quando não existe miniatura utilizável. */
function fallbackThumb(item) {
  // Hue derivado do id: cada post recebe um tom estável, sem aleatoriedade.
  const hue = [...String(item.id)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 40
  return el('div', {
    className: 'content-thumb-fallback',
    style: { '--hue': String(250 + hue) },
  }, [
    el('span', { className: 'content-thumb-fallback-text', text: item.title || TYPE_LABELS[item.type] || 'Publicação' }),
  ])
}

/**
 * @param {object} item   item normalizado de conteúdo
 * @param {number} rank   posição (1-based) — vira badge TOP 1/2/3
 * @param {object} [options] { variant: 'grid' | 'reel' }
 */
export function contentCard(item, rank, options = {}) {
  const { variant = 'grid' } = options
  const isReelCard = variant === 'reel'

  const media = el('div', { className: 'content-thumb' })
  if (item.thumbnail) {
    const image = el('img', {
      className: 'content-thumb-img',
      attrs: {
        src: item.thumbnail,
        alt: item.title ? `Miniatura: ${item.title}` : 'Miniatura da publicação',
        loading: 'lazy',
        decoding: 'async',
      },
    })
    // URL do CDN expirada → troca pelo fallback sem quebrar o card.
    image.addEventListener('error', () => image.replaceWith(fallbackThumb(item)), { once: true })
    media.append(image)
  } else {
    media.append(fallbackThumb(item))
  }

  media.append(
    el('div', { className: 'content-thumb-overlay' }),
    rank && rank <= 3
      ? el('span', { className: 'badge-rank badge-rank--top', text: `TOP ${rank}` })
      : rank
        ? el('span', { className: 'badge-rank', text: String(rank).padStart(2, '0') })
        : null,
    isReelCard && hasValue(item.views)
      ? el('span', { className: 'content-thumb-views' }, [
          icon('play'),
          el('span', { className: 'num', attrs: { title: `${formatInteger(item.views)} visualizações` }, text: formatCompact(item.views) }),
        ])
      : null,
  )

  const body = isReelCard
    ? null
    : el('div', { className: 'content-body' }, [
        el('p', { className: 'content-title', text: item.title || TYPE_LABELS[item.type] || 'Publicação' }),
        el('div', { className: 'content-meta' }, [
          el('span', { className: 'content-type', text: TYPE_LABELS[item.type] || 'Publicação' }),
          item.publishedAt
            ? el('span', { className: 'content-date', text: formatShortDate(String(item.publishedAt).slice(0, 10)) })
            : null,
        ]),
        el('div', { className: 'content-metrics' }, [
          metricPill('play', item.views, 'visualizações'),
          metricPill('target', item.reach, 'contas alcançadas'),
          metricPill('heart', item.likes, 'curtidas'),
          metricPill('comment', item.comments, 'comentários'),
          metricPill('share', item.shares, 'compartilhamentos'),
          metricPill('bookmark', item.saves, 'salvamentos'),
        ].filter(Boolean)),
      ])

  const inner = [media, body].filter(Boolean)

  if (item.permalink) {
    return el('a', {
      className: `content-card content-card--${variant}`,
      attrs: {
        href: item.permalink,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `Abrir no Instagram: ${item.title || 'publicação'}`,
      },
    }, [...inner, el('span', { className: 'content-open' }, [icon('external')])])
  }

  return el('article', { className: `content-card content-card--${variant}` }, inner)
}

/** Esqueleto com a mesma proporção do cartão real. */
export function contentCardSkeleton(variant = 'grid') {
  return el('div', { className: `content-card content-card--${variant}`, attrs: { 'aria-hidden': 'true' } }, [
    el('div', { className: 'content-thumb skeleton' }),
    variant === 'grid'
      ? el('div', { className: 'content-body' }, [
          el('div', { className: 'skeleton skeleton-line', style: { width: '86%' } }),
          el('div', { className: 'skeleton skeleton-line', style: { width: '54%', marginTop: '10px' } }),
        ])
      : null,
  ])
}
