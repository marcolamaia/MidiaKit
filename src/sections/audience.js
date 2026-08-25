/**
 * AUDIÊNCIA — quem acompanha Marcos Maia.
 *
 * Todos os números vêm das tabelas `user_insights_lifetime_*` do conector.
 * Dimensão sem retorno da API não é preenchida com estimativa: o bloco mostra
 * "Dados não disponíveis".
 *
 * Nota metodológica exposta ao usuário: o Instagram devolve uma fatia
 * "não informado" em gênero e idade. Ela é excluída do percentual para que a
 * leitura seja "entre quem declarou", e isso está escrito na interface.
 */

import { el, mount } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { renderRankingBars } from '../charts/ranking-bars.js'
import { renderDonut } from '../charts/donut.js'
import { emptyState, errorState, skeletonBlock } from '../components/states.js'
import { observeReveals } from '../hooks/reveal.js'
import { formatCompact, formatInteger } from '../utils/format.js'

function panel(title, body, { tooltip, footnote, className = '' } = {}) {
  return el('div', { className: `card card--padded audience-panel ${className}`.trim(), attrs: { 'data-reveal': '' } }, [
    el('h3', { className: 'card-title' }, [
      title,
      tooltip ? el('span', { className: 'info', text: '?', attrs: { tabindex: '0', 'data-tip': tooltip } }) : null,
    ]),
    body,
    footnote ? el('p', { className: 'audience-footnote', text: footnote }) : null,
  ])
}

export function renderAudience() {
  const grid = el('div', { className: 'audience-grid' })
  const summarySlot = el('div', { className: 'audience-summary-slot' })

  const section = el('section', { className: 'section audience', attrs: { id: 'audiencia' } }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('people'), 'Quem me acompanha']),
          el('h2', { className: 'section-title', text: 'Quem acompanha Marcos Maia' }),
          el('p', {
            className: 'section-subtitle',
            text: 'Perfil demográfico dos seguidores, direto da API do Instagram. Nenhum valor é estimado.',
          }),
        ]),
      ]),
      summarySlot,
      grid,
    ]),
  ])

  function update(state) {
    if (state.status === 'loading' || state.status === 'idle') {
      mount(grid,
        skeletonBlock({ height: 300 }),
        skeletonBlock({ height: 300 }),
        skeletonBlock({ height: 300 }),
        skeletonBlock({ height: 300 }),
      )
      return
    }

    if (state.status === 'error') {
      mount(grid, errorState(state.error?.message, { onRetry: state.retry }))
      return
    }

    const { audience, profile } = state.data
    const panels = []

    /* ---- Faixa etária ---- */
    const ageBody = el('ul')
    if (audience.age) {
      renderRankingBars(ageBody, audience.age, { display: 'share', unit: 'seguidores' })
    } else {
      mount(ageBody, emptyState())
    }
    panels.push(panel('Faixa etária', ageBody, {
      tooltip: 'Distribuição etária dos seguidores. Passe o mouse na barra para ver o número absoluto.',
      footnote: audience.age ? 'Percentual entre seguidores com faixa etária informada ao Instagram.' : null,
      className: 'audience-panel--age',
    }))

    /* ---- Gênero ---- */
    const genderBody = el('div', { className: 'audience-gender' })
    if (audience.gender) {
      renderDonut(genderBody, audience.gender, { unit: 'seguidores' })
    } else {
      mount(genderBody, emptyState())
    }
    panels.push(panel('Gênero', genderBody, {
      tooltip: 'O Instagram devolve uma parcela "não informado", que fica de fora do cálculo para que os percentuais representem quem declarou.',
      footnote: audience.gender ? 'Percentual entre seguidores com gênero informado.' : null,
      className: 'audience-panel--gender',
    }))

    /* ---- Cidades ---- */
    const cityBody = el('ul')
    if (audience.cities) {
      renderRankingBars(cityBody, audience.cities, { display: 'share', unit: 'seguidores' })
    } else {
      mount(cityBody, emptyState())
    }
    panels.push(panel('Principais cidades', cityBody, {
      tooltip: 'Cidades com mais seguidores. O percentual é sobre o total de seguidores com cidade identificada.',
      className: 'audience-panel--cities',
    }))

    /* ---- Estados ---- */
    if (audience.states) {
      const stateBody = el('ul')
      renderRankingBars(stateBody, audience.states, { display: 'share', unit: 'seguidores' })
      panels.push(panel('Principais estados', stateBody, {
        tooltip: 'Agregado a partir das cidades retornadas pela API — o Instagram não expõe o estado como dimensão própria.',
        className: 'audience-panel--states',
      }))
    }

    /* ---- Países ---- */
    const countryBody = el('ul')
    if (audience.countries) {
      renderRankingBars(countryBody, audience.countries, { display: 'share', unit: 'seguidores' })
    } else {
      mount(countryBody, emptyState())
    }
    panels.push(panel('Principais países', countryBody, {
      tooltip: 'Distribuição geográfica dos seguidores por país.',
      className: 'audience-panel--countries',
    }))

    mount(grid, ...panels)

    /* ---- Resumo em texto, gerado a partir dos dados ---- */
    if (audience.age && audience.gender && audience.countries) {
      const topAge = [...audience.age].sort((a, b) => b.value - a.value)[0]
      const topGender = [...audience.gender].sort((a, b) => b.value - a.value)[0]
      const topCountry = audience.countries[0]

      mount(summarySlot,
        el('p', { className: 'audience-summary', attrs: { 'data-reveal': '' } }, [
          'Base de ',
          el('strong', {
            className: 'num',
            text: formatCompact(profile.followersCount),
            attrs: { title: `${formatInteger(profile.followersCount)} seguidores` },
          }),
          ' seguidores, concentrada em ',
          el('strong', { text: topCountry.label }),
          ', predominantemente ',
          el('strong', { text: topGender.label.toLowerCase() }),
          ' e na faixa de ',
          el('strong', { text: `${topAge.label} anos` }),
          '.',
        ]),
      )
    } else {
      mount(summarySlot)
    }

    observeReveals(section)
  }

  return { node: section, update }
}
