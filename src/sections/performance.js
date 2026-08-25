/**
 * PERFORMANCE — evolução da conta no período selecionado.
 *
 * Três abas de métrica (alcance, visualizações, interações, novos seguidores)
 * sobre o mesmo eixo temporal, mais um painel lateral com totais do período.
 *
 * Detalhe importante de honestidade: no período de 24 horas o gráfico temporal
 * dá lugar a um comparativo de barras — a API do Instagram/Meta não expõe
 * granularidade horária, e uma linha com um único ponto seria enganosa.
 */

import { el, mount, clear } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { periodSelector } from '../components/period-selector.js'
import { renderAreaChart } from '../charts/area-chart.js'
import { renderBarCompare } from '../charts/bar-compare.js'
import { trendBadge } from '../components/trend.js'
import { skeletonBlock } from '../components/states.js'
import { errorState, emptyState } from '../components/states.js'
import { observeReveals } from '../hooks/reveal.js'
import {
  formatCompact, formatInteger, formatLongDate, formatPercent, formatRange, hasValue,
} from '../utils/format.js'

const METRIC_TABS = [
  { key: 'reach', label: 'Alcance', unit: 'contas alcançadas' },
  { key: 'views', label: 'Visualizações', unit: 'visualizações' },
  { key: 'interactions', label: 'Interações', unit: 'interações' },
  { key: 'newFollowers', label: 'Novos seguidores', unit: 'novos seguidores' },
]

export function renderPerformance() {
  let activeMetric = 'reach'
  let destroyChart = () => {}
  let lastState = null

  const chartSlot = el('div', { className: 'performance-chart' })
  const summarySlot = el('aside', { className: 'performance-summary' })
  const noteSlot = el('p', { className: 'performance-note' })
  const tabsSlot = el('div', { className: 'metric-tabs', attrs: { role: 'tablist', 'aria-label': 'Métrica exibida' } })
  const selector = periodSelector()

  const section = el('section', { className: 'section performance', attrs: { id: 'performance' } }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('chart'), 'Performance']),
          el('h2', { className: 'section-title', text: 'A evolução do conteúdo ao longo do tempo' }),
          el('p', { className: 'section-subtitle', attrs: { id: 'performance-range' } }),
        ]),
        selector.node,
      ]),

      el('div', { className: 'card performance-card', attrs: { 'data-reveal': '' } }, [
        el('div', { className: 'performance-toolbar' }, [tabsSlot]),
        el('div', { className: 'performance-body' }, [
          el('div', { className: 'performance-plot' }, [chartSlot, noteSlot]),
          summarySlot,
        ]),
      ]),
    ]),
  ])

  function buildTabs(period) {
    clear(tabsSlot)
    for (const tab of METRIC_TABS) {
      // Novos seguidores só existem nos últimos 30 dias — fora disso a aba
      // some em vez de mostrar um gráfico vazio.
      const available = tab.key !== 'newFollowers' || period.totals.newFollowersAvailable
      if (!available) continue

      tabsSlot.append(
        el('button', {
          className: `metric-tab${activeMetric === tab.key ? ' is-active' : ''}`,
          type: 'button',
          attrs: { role: 'tab', 'aria-selected': String(activeMetric === tab.key) },
          text: tab.label,
          on: {
            click: () => {
              if (activeMetric === tab.key) return
              activeMetric = tab.key
              update(lastState)
            },
          },
        }),
      )
    }
    // Se a métrica ativa deixou de existir, volta para alcance.
    if (activeMetric === 'newFollowers' && !period.totals.newFollowersAvailable) {
      activeMetric = 'reach'
    }
  }

  function summaryRow(label, value, { delta, metric, format = 'compact', tooltip, hint } = {}) {
    const display = !hasValue(value)
      ? '—'
      : format === 'percent'
        ? formatPercent(value)
        : formatCompact(value)

    return el('div', { className: 'summary-row' }, [
      el('div', { className: 'summary-row-head' }, [
        el('span', { className: 'summary-row-label', text: label }),
        tooltip
          ? el('span', { className: 'info', text: '?', attrs: { 'data-tip': tooltip, tabindex: '0' } })
          : null,
      ]),
      el('div', { className: 'summary-row-value' }, [
        el('strong', {
          className: 'num',
          text: display,
          attrs: hasValue(value) && format !== 'percent' ? { title: formatInteger(value) } : {},
        }),
        delta ? trendBadge(delta, { metric }) : null,
      ]),
      hint ? el('span', { className: 'summary-row-hint', text: hint }) : null,
    ])
  }

  function buildSummary(period) {
    const tab = METRIC_TABS.find((t) => t.key === activeMetric)
    const comparisonLabel = period.range.days === 1
      ? 'vs. dia anterior'
      : `vs. ${period.range.days} dias anteriores`

    const rows = [
      summaryRow(`${tab.label} — total`, period.totals[activeMetric], {
        delta: period.deltas[activeMetric],
        metric: activeMetric,
        hint: period.hasComparison ? comparisonLabel : 'sem base de comparação',
      }),
    ]

    // Num período de um único dia, "média diária" e "pico" repetiriam o total.
    const multiDay = period.range.days > 1

    if (multiDay && (activeMetric === 'reach' || activeMetric === 'views')) {
      const avgKey = activeMetric === 'reach' ? 'avgDailyReach' : 'avgDailyViews'
      rows.push(summaryRow('Média diária', period.totals[avgKey], {
        tooltip: 'Total do período dividido pelos dias com dado disponível.',
      }))
    }

    if (multiDay && period.totals.peakReach) {
      rows.push(summaryRow('Pico de alcance', period.totals.peakReach.value, {
        hint: formatLongDate(period.totals.peakReach.date),
      }))
    }

    if (period.totals.newFollowersAvailable) {
      rows.push(summaryRow('Novos seguidores', period.totals.newFollowers, {
        delta: period.deltas.newFollowers,
        metric: 'newFollowers',
        hint: hasValue(period.totals.followerGrowthRate)
          ? `+${formatPercent(period.totals.followerGrowthRate)} sobre a base inicial`
          : null,
      }))
    }

    if (hasValue(period.totals.postsPublished)) {
      rows.push(summaryRow('Publicações no período', period.totals.postsPublished, {
        format: 'compact',
      }))
    }

    return rows
  }

  function update(state) {
    lastState = state

    if (state.status === 'loading' || state.status === 'idle') {
      destroyChart()
      mount(chartSlot, skeletonBlock({ height: 340 }))
      mount(summarySlot, skeletonBlock({ height: 88 }), skeletonBlock({ height: 88 }), skeletonBlock({ height: 88 }))
      clear(tabsSlot).append(skeletonBlock({ height: 32, className: 'metric-tabs-skeleton' }))
      noteSlot.textContent = ''
      return
    }

    if (state.status === 'error') {
      destroyChart()
      mount(chartSlot, errorState(state.error?.message, { onRetry: state.retry }))
      mount(summarySlot)
      clear(tabsSlot)
      noteSlot.textContent = ''
      return
    }

    const period = state.data.periods[state.period]
    selector.sync(state.period)
    section.querySelector('#performance-range').textContent =
      `${period.label} · ${formatRange(period.range.from, period.range.to)}`

    buildTabs(period)
    const tab = METRIC_TABS.find((t) => t.key === activeMetric)

    destroyChart()

    if (period.granularity === 'day' && period.range.days === 1) {
      // ---- 24 horas: comparativo, não linha temporal ----
      const rows = [
        { label: 'Alcance', key: 'reach' },
        { label: 'Visualizações', key: 'views' },
        { label: 'Interações', key: 'interactions' },
        { label: 'Novos seguidores', key: 'newFollowers' },
      ]
        .filter((row) => row.key !== 'newFollowers' || period.totals.newFollowersAvailable)
        .map((row) => ({
          label: row.label,
          current: period.totals[row.key],
          previous: period.previousTotals?.[row.key] ?? null,
          delta: period.deltas[row.key],
        }))

      const wrapper = el('div')
      renderBarCompare(wrapper, rows, {
        current: formatLongDate(period.range.from),
        previous: formatLongDate(period.previousRange.from),
      })
      mount(chartSlot, wrapper)

      noteSlot.textContent =
        'A API de insights do Instagram/Meta não fornece dados por hora — o menor agregado disponível é o dia. Por isso as últimas 24 horas aparecem como comparação entre o último dia fechado e o anterior.'
    } else {
      const points = period.series[activeMetric] || []
      const hasData = points.some((p) => p.value !== null)

      if (!hasData) {
        mount(chartSlot, emptyState(
          'Métrica indisponível neste período',
          'A integração não retornou esta série para a janela selecionada.',
        ))
        noteSlot.textContent = ''
      } else {
        const wrapper = el('div')
        mount(chartSlot, wrapper)
        destroyChart = renderAreaChart(wrapper, {
          points,
          label: tab.label,
          granularity: period.granularity,
          height: 340,
        })
        noteSlot.textContent = period.granularity === 'week'
          ? 'Em 180 dias os pontos são agregados por semana para manter o gráfico legível, e as semanas incompletas das pontas ficam de fora para não simular quedas que não existem. Os totais e as comparações do período continuam calculados dia a dia, sem descartar nenhuma data.'
          : ''
      }
    }

    mount(summarySlot, ...buildSummary(period))
    observeReveals(section)
  }

  return { node: section, update, destroy: () => destroyChart() }
}
