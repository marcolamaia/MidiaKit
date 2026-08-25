/**
 * CONTEÚDOS — o que performou, com miniatura real e link para o Instagram.
 *
 * Três blocos:
 *  1. Conteúdos que mais performaram (top 6, com "Ver mais")
 *  2. Reels em destaque — capacidade de distribuição, o argumento comercial
 *  3. Performance média por formato (Reels e feed calculados separadamente)
 */

import { el, mount, clear } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { contentCard, contentCardSkeleton } from '../components/content-card.js'
import { emptyState, errorState } from '../components/states.js'
import { observeReveals } from '../hooks/reveal.js'
import { formatCompact, formatDuration, formatInteger, formatPercent, hasValue } from '../utils/format.js'

const INITIAL_VISIBLE = 6

export function renderContent() {
  let expanded = false

  const topGrid = el('div', { className: 'content-grid' })
  const topFooter = el('div', { className: 'content-more' })
  const reelsRail = el('div', { className: 'reels-rail' })
  const averagesSlot = el('div', { className: 'averages-grid' })

  const section = el('section', { className: 'section content', attrs: { id: 'conteudos' } }, [
    el('div', { className: 'container' }, [
      /* ---- Top conteúdos ---- */
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('crown'), 'Conteúdos que mais performaram']),
          el('h2', { className: 'section-title', text: 'Os conteúdos com maior alcance e engajamento' }),
          el('p', { className: 'section-subtitle', attrs: { id: 'content-range' } }),
        ]),
      ]),
      topGrid,
      topFooter,

      /* ---- Reels ---- */
      el('div', { className: 'section-head content-subhead' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('play'), 'Reels em destaque']),
          el('h2', { className: 'section-title', text: 'Capacidade de distribuição em vídeo' }),
          el('p', {
            className: 'section-subtitle',
            text: 'Os Reels com maior número de visualizações no período. Toque em qualquer card para abrir a publicação original.',
          }),
        ]),
      ]),
      reelsRail,

      /* ---- Médias ---- */
      el('div', { className: 'section-head content-subhead' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('bar'), 'Performance média']),
          el('h2', { className: 'section-title', text: 'O que esperar de um conteúdo típico' }),
          el('p', {
            className: 'section-subtitle',
            text: 'Reels e publicações de feed são calculados separadamente — misturar formatos produziria uma média sem significado.',
          }),
        ]),
      ]),
      averagesSlot,
    ]),
  ])

  function renderTop(items) {
    clear(topGrid)
    clear(topFooter)

    if (!items.length) {
      topGrid.append(emptyState(
        'Nenhuma publicação no período',
        'Selecione um período maior para ver os conteúdos.',
      ))
      return
    }

    const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE)
    visible.forEach((item, index) => {
      const card = contentCard(item, index + 1)
      card.setAttribute('data-reveal', '')
      topGrid.append(card)
    })

    if (items.length > INITIAL_VISIBLE) {
      topFooter.append(
        el('button', {
          className: 'btn btn--secondary',
          type: 'button',
          on: {
            click: () => {
              expanded = !expanded
              renderTop(items)
              observeReveals(topGrid)
            },
          },
        }, [
          expanded ? 'Ver menos' : `Ver todos (${items.length})`,
          icon(expanded ? 'arrowUp' : 'arrowDown'),
        ]),
      )
    }
  }

  function averageCard(title, stats, { isReel }) {
    if (!stats) {
      return el('div', { className: 'card card--padded average-card' }, [
        el('h3', { className: 'card-title', text: title }),
        emptyState('Nenhuma publicação deste formato no período'),
      ])
    }

    const metrics = [
      { label: 'Visualizações', value: stats.views },
      { label: 'Alcance', value: stats.reach },
      { label: 'Curtidas', value: stats.likes },
      { label: 'Comentários', value: stats.comments },
      { label: 'Compartilhamentos', value: stats.shares },
      { label: 'Salvamentos', value: stats.saves },
    ]

    return el('div', { className: 'card card--padded average-card', attrs: { 'data-reveal': '' } }, [
      el('div', { className: 'average-head' }, [
        el('h3', { className: 'card-title', text: title }),
        el('span', {
          className: 'chip',
          text: `${stats.count} ${stats.count === 1 ? 'publicação' : 'publicações'}`,
        }),
      ]),

      el('dl', { className: 'average-list' },
        metrics.map((metric) =>
          el('div', { className: 'average-item' }, [
            el('dt', { text: metric.label }),
            el('dd', {
              className: 'num',
              text: hasValue(metric.value) ? formatCompact(Math.round(metric.value)) : '—',
              attrs: hasValue(metric.value) ? { title: `${formatInteger(Math.round(metric.value))} em média` } : {},
            }),
          ]),
        ),
      ),

      // Retenção só existe para Reels — é o dado que mais convence uma marca.
      isReel && (hasValue(stats.avgWatchTimeMs) || hasValue(stats.retentionRate))
        ? el('div', { className: 'average-retention' }, [
            hasValue(stats.avgWatchTimeMs)
              ? el('div', { className: 'average-retention-item' }, [
                  el('span', { text: 'Tempo médio assistido' }),
                  el('strong', { className: 'num', text: formatDuration(stats.avgWatchTimeMs) }),
                ])
              : null,
            hasValue(stats.retentionRate)
              ? el('div', { className: 'average-retention-item' }, [
                  el('span', {}, [
                    'Retenção nos 3s iniciais',
                    el('span', {
                      className: 'info',
                      text: '?',
                      attrs: {
                        tabindex: '0',
                        'data-tip': 'Percentual de visualizações que NÃO pularam o Reel nos primeiros 3 segundos. Calculado a partir da taxa de skip que o Instagram fornece.',
                      },
                    }),
                  ]),
                  el('strong', { className: 'num', text: formatPercent(stats.retentionRate, 1) }),
                ])
              : null,
          ])
        : null,
    ])
  }

  function update(state) {
    if (state.status === 'loading' || state.status === 'idle') {
      mount(topGrid, ...Array.from({ length: 6 }, () => contentCardSkeleton('grid')))
      mount(reelsRail, ...Array.from({ length: 5 }, () => contentCardSkeleton('reel')))
      mount(averagesSlot)
      return
    }

    if (state.status === 'error') {
      mount(topGrid, errorState(state.error?.message, { onRetry: state.retry }))
      mount(reelsRail)
      mount(averagesSlot)
      return
    }

    const period = state.data.periods[state.period]
    section.querySelector('#content-range').textContent =
      `${period.label} · ordenado por visualizações`

    expanded = false
    renderTop(period.content.top)

    clear(reelsRail)
    if (period.content.reels.length) {
      period.content.reels.slice(0, 8).forEach((item, index) => {
        reelsRail.append(contentCard(item, index + 1, { variant: 'reel' }))
      })
    } else {
      reelsRail.append(emptyState('Nenhum Reels publicado no período'))
    }

    mount(averagesSlot,
      averageCard('Média por Reels', period.content.averages?.reels, { isReel: true }),
      averageCard('Média por publicação de feed', period.content.averages?.feed, { isReel: false }),
    )

    observeReveals(section)
  }

  return { node: section, update }
}
