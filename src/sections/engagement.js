/**
 * ENGAJAMENTO — como as pessoas reagem ao conteúdo.
 * Distribuição em barras horizontais (não pizza gigante) + totais.
 */

import { el, mount } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { renderRankingBars } from '../charts/ranking-bars.js'
import { metricCard, metricCardSkeleton } from '../components/metric-card.js'
import { emptyState, errorState, skeletonBlock } from '../components/states.js'
import { observeReveals } from '../hooks/reveal.js'
import { formatCompact, formatInteger, hasValue } from '../utils/format.js'

const BREAKDOWN = [
  { key: 'likes', label: 'Curtidas' },
  { key: 'comments', label: 'Comentários' },
  { key: 'shares', label: 'Compartilhamentos' },
  { key: 'saves', label: 'Salvamentos' },
  { key: 'replies', label: 'Respostas' },
]

export function renderEngagement() {
  const distributionSlot = el('ul', { className: 'ranking' })
  const cardsSlot = el('div', { className: 'engagement-cards' })

  const section = el('section', { className: 'section engagement' }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('heart'), 'Engajamento']),
          el('h2', { className: 'section-title', text: 'O que a audiência faz depois de assistir' }),
          el('p', {
            className: 'section-subtitle',
            text: 'Compartilhamento e salvamento são os sinais que mais interessam a uma marca: indicam conteúdo que circula sozinho e que a pessoa guarda para voltar depois.',
          }),
        ]),
      ]),

      el('div', { className: 'engagement-grid' }, [
        el('div', { className: 'card card--padded engagement-distribution', attrs: { 'data-reveal': '' } }, [
          el('h3', { className: 'card-title' }, [
            'Distribuição das interações',
            el('span', {
              className: 'info',
              text: '?',
              attrs: {
                tabindex: '0',
                'data-tip': 'Participação de cada tipo de interação no total do período. Passe o mouse na barra para ver o número absoluto.',
              },
            }),
          ]),
          distributionSlot,
        ]),
        cardsSlot,
      ]),
    ]),
  ])

  function update(state) {
    if (state.status === 'loading' || state.status === 'idle') {
      mount(distributionSlot, skeletonBlock({ height: 190 }))
      mount(cardsSlot, metricCardSkeleton(), metricCardSkeleton())
      return
    }

    if (state.status === 'error') {
      mount(distributionSlot, errorState(state.error?.message, { onRetry: state.retry }))
      mount(cardsSlot)
      return
    }

    const period = state.data.periods[state.period]
    // Sem janela anterior, dizer "vs. N dias anteriores" ao lado de um número
    // sem variação sugere uma comparação que não existe.
    const context = !period.hasComparison
      ? 'sem período anterior para comparar'
      : period.range.days === 1
        ? 'vs. dia anterior'
        : `vs. ${period.range.days} dias anteriores`

    const entries = BREAKDOWN
      .map((item) => ({ label: item.label, value: period.totals[item.key], key: item.key }))
      .filter((item) => hasValue(item.value) && item.value > 0)

    if (entries.length) {
      const total = entries.reduce((acc, e) => acc + e.value, 0)
      renderRankingBars(
        distributionSlot,
        entries
          .map((e) => ({ ...e, share: Math.round((e.value / total) * 1000) / 10 }))
          .sort((a, b) => b.value - a.value),
        { display: 'share', unit: 'no período' },
      )
    } else {
      mount(distributionSlot, emptyState('Sem interações registradas neste período'))
    }

    mount(cardsSlot,
      metricCard({
        label: 'Total de interações',
        iconName: 'spark',
        value: period.totals.interactions,
        delta: period.deltas.interactions,
        metric: 'interactions',
        context,
        tooltip: 'Curtidas + comentários + compartilhamentos + salvamentos no período.',
      }),
      metricCard({
        label: 'Contas engajadas',
        iconName: 'people',
        value: period.totals.engagedAccounts,
        delta: period.deltas.engagedAccounts,
        metric: 'engagedAccounts',
        context,
        tooltip: 'Contas únicas que interagiram com algum conteúdo — pessoas, não ações. Uma conta que curte e comenta conta uma vez.',
      }),
      metricCard({
        label: 'Taxa de engajamento',
        iconName: 'trendUp',
        value: period.totals.engagementRate,
        delta: period.deltas.engagementRate,
        metric: 'engagementRate',
        format: 'percent',
        context,
        tooltip: 'Contas engajadas ÷ alcance. Mede quem reagiu entre quem de fato viu o conteúdo.',
      }),
    )

    // Rodapé com os números absolutos, para quem quiser conferir.
    if (entries.length) {
      distributionSlot.parentElement.querySelector('.engagement-total')?.remove()
      distributionSlot.after(
        el('p', {
          className: 'engagement-total',
          text: `Total no período: ${formatCompact(period.totals.interactions)} interações`,
          attrs: { title: `${formatInteger(period.totals.interactions)} interações` },
        }),
      )
    }

    observeReveals(section)
  }

  return { node: section, update }
}
