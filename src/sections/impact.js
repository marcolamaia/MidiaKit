/**
 * RESUMO DE IMPACTO — os números que uma marca precisa ver em 10 segundos.
 *
 * Duas camadas:
 *  1. Headlines geradas programaticamente a partir dos dados reais do período.
 *  2. Grade de métricas com comparação contra o período anterior.
 *
 * Nada aqui é escrito à mão. Sem dado, o cartão mostra "—" e o motivo.
 */

import { el, mount } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { metricCard, metricCardSkeleton } from '../components/metric-card.js'
import { emptyState, errorState } from '../components/states.js'
import { countOnReveal } from '../hooks/counter.js'
import { observeReveals } from '../hooks/reveal.js'
import { formatCompact, formatDateTime, formatInteger, formatRange } from '../utils/format.js'
import { periods as periodConfig } from '../config.js'

const HEADLINE_COPY = {
  views: 'visualizações',
  reach: 'contas alcançadas',
  newFollowers: 'novos seguidores',
}

/** Frases de destaque montadas com os números reais do período ativo. */
function highlightStrip(period) {
  if (!period?.highlights?.length) return null

  return el('ul', { className: 'impact-highlights', attrs: { 'data-reveal': '' } },
    period.highlights.slice(0, 3).map((highlight) => {
      // Nasce com o valor real; countOnReveal só anima por cima quando o
      // elemento aparece. Nada de "0" preso na tela se a animação não rodar.
      const valueNode = el('strong', {
        className: 'impact-highlight-value num',
        text: formatCompact(highlight.value),
        attrs: { title: formatInteger(highlight.value) },
      })
      countOnReveal(valueNode, highlight.value, formatCompact)
      return el('li', { className: 'impact-highlight' }, [
        valueNode,
        el('span', { className: 'impact-highlight-label', text: HEADLINE_COPY[highlight.key] || highlight.label }),
      ])
    }),
  )
}

/** Selos de credibilidade: origem, cadência e última sincronização. */
function freshnessBar(meta) {
  const updatedAt = meta?.generatedAt ? formatDateTime(meta.generatedAt, meta.timeZone) : null

  return el('div', { className: 'freshness', attrs: { 'data-reveal': '' } }, [
    el('span', { className: 'freshness-item' }, [
      icon('shield'),
      el('span', { text: meta?.demo ? 'Dados de demonstração' : 'Dados via Instagram / Meta' }),
    ]),
    el('span', { className: 'freshness-sep', attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'freshness-item' }, [
      icon('refresh'),
      el('span', {
        text: meta?.snapshot
          ? 'Métricas atualizadas a cada geração'
          : 'Métricas atualizadas diariamente',
      }),
    ]),
    updatedAt
      ? el('span', { className: 'freshness-sep', attrs: { 'aria-hidden': 'true' } })
      : null,
    updatedAt
      ? el('span', { className: 'freshness-item freshness-item--sync' }, [
          icon('clock'),
          el('span', {
            // Num arquivo único não existe "sincronização contínua": o dado
            // foi capturado uma vez. Dizer "última sincronização" ali seria
            // impreciso, então o rótulo muda conforme a origem.
            text: meta?.snapshot
              ? `Dados capturados em ${updatedAt}`
              : `Última sincronização: ${updatedAt}`,
          }),
          el('i', {
            className: `freshness-dot${meta?.stale ? ' freshness-dot--stale' : ''}`,
            attrs: {
              title: meta?.stale
                ? 'Exibindo a última leitura bem-sucedida — a integração não respondeu na última tentativa.'
                : meta?.snapshot
                  ? 'Snapshot embutido neste arquivo. Rode `npm run build:html` para gerar de novo com os números do dia.'
                  : 'Sincronização em dia.',
            },
          }),
        ])
      : null,
  ])
}

const CARD_DEFINITIONS = [
  {
    key: 'followers',
    label: 'Seguidores',
    iconName: 'users',
    tooltip: 'Total de contas que seguem o perfil hoje. O Instagram não fornece histórico deste número — por isso ele não muda com o período selecionado.',
    fromProfile: true,
  },
  {
    key: 'reach',
    label: 'Contas alcançadas',
    iconName: 'target',
    tooltip: 'Contas únicas que viram pelo menos um conteúdo do perfil no período. É a medida de distribuição real.',
  },
  {
    key: 'views',
    label: 'Visualizações',
    iconName: 'eye',
    tooltip: 'Quantas vezes o conteúdo foi exibido ou reproduzido — inclui Reels, posts e Stories. Uma mesma pessoa pode gerar várias visualizações.',
  },
  {
    key: 'interactions',
    label: 'Interações',
    iconName: 'heart',
    tooltip: 'Soma de curtidas, comentários, compartilhamentos e salvamentos no período.',
  },
  {
    key: 'engagementRate',
    label: 'Engajamento',
    iconName: 'spark',
    format: 'percent',
    tooltip: 'Contas engajadas dividido pelo alcance do período. Mede a reação de quem realmente viu o conteúdo — base mais honesta do que dividir por seguidores.',
  },
  {
    key: 'newFollowers',
    label: 'Novos seguidores',
    iconName: 'trendUp',
    tooltip: 'Seguidores ganhos no período. O Instagram só disponibiliza este dado para os últimos 30 dias.',
    unavailableHint: 'Indisponível para este período',
  },
]

function renderCards(period, profile) {
  const context = period.hasComparison
    ? `vs. ${period.range.days === 1 ? 'dia anterior' : `${period.range.days} dias anteriores`}`
    : 'sem período anterior para comparar'

  return CARD_DEFINITIONS.map((definition) => {
    if (definition.fromProfile) {
      return metricCard({
        label: definition.label,
        iconName: definition.iconName,
        value: profile?.followersCount ?? null,
        metric: 'followers',
        context: 'total no perfil hoje',
        tooltip: definition.tooltip,
      })
    }

    // `newFollowers` só é confiável quando a API cobriu a janela inteira.
    const unavailable =
      definition.key === 'newFollowers' && !period.totals.newFollowersAvailable

    return metricCard({
      label: definition.label,
      iconName: definition.iconName,
      value: unavailable ? null : period.totals[definition.key],
      delta: unavailable ? null : period.deltas[definition.key],
      metric: definition.key,
      context: unavailable ? null : context,
      tooltip: definition.tooltip,
      format: definition.format,
      unavailableHint: definition.unavailableHint,
    })
  })
}

export function renderImpact() {
  const grid = el('div', { className: 'impact-grid' })
  const head = el('div', { className: 'impact-head' })
  const highlights = el('div', { className: 'impact-highlights-slot' })

  const section = el('section', { className: 'section impact' }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('bar'), 'Impacto em números']),
          el('h2', { className: 'section-title', text: 'A dimensão da audiência, em dados verificáveis' }),
          el('p', { className: 'section-subtitle', attrs: { id: 'impact-range' } }),
        ]),
        head,
      ]),
      highlights,
      grid,
    ]),
  ])

  /** Atualiza a seção conforme o estado (loading / ready / error). */
  function update(state) {
    if (state.status === 'loading' || state.status === 'idle') {
      mount(grid, ...Array.from({ length: 6 }, metricCardSkeleton))
      mount(head, el('div', { className: 'skeleton skeleton-line', style: { width: '260px', height: '14px' } }))
      return
    }

    if (state.status === 'error') {
      mount(grid, errorState(state.error?.message, {
        hint: 'O restante do Media Kit continua disponível.',
        onRetry: state.retry,
      }))
      mount(head)
      return
    }

    const period = state.data.periods[state.period]
    const rangeLabel = section.querySelector('#impact-range')

    const periodLabel = periodConfig.find((p) => p.id === state.period)?.longLabel ?? period.label
    rangeLabel.textContent = `${periodLabel} · ${formatRange(period.range.from, period.range.to)}`

    mount(head, freshnessBar(state.data.meta))
    mount(highlights, highlightStrip(period))
    mount(grid, ...renderCards(period, state.data.profile))

    // `append`, não `mount`: os cartões continuam visíveis (degradam para "—")
    // e o aviso entra como faixa explicativa abaixo deles.
    if (!state.data.availability.daily) {
      const notice = emptyState(
        'Sem métricas diárias nesta janela',
        'A integração respondeu, mas não retornou dados para o período selecionado. Assim que houver dados, os números aparecem aqui automaticamente.',
      )
      notice.classList.add('impact-empty')
      grid.append(notice)
    }

    observeReveals(section)
  }

  return { node: section, update }
}
