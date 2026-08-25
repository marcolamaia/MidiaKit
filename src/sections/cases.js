/**
 * CASES DE CONTEÚDO.
 *
 * Os três slots vivem em `config.js` com `filled: false`. Um slot vazio é
 * exibido como espaço reservado — nunca com resultado falso. Se nenhum estiver
 * preenchido, a seção aparece com o convite para conversar, o que é honesto e
 * ainda assim comercialmente útil.
 */

import { el } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { cases } from '../config.js'
import { formatCompact, formatInteger, hasValue } from '../utils/format.js'

function metric(label, value) {
  if (!hasValue(value)) return null
  return el('div', { className: 'case-metric' }, [
    el('dt', { text: label }),
    el('dd', { className: 'num', text: formatCompact(value), attrs: { title: formatInteger(value) } }),
  ])
}

function filledCase(item) {
  const metrics = [
    metric('Views', item.views),
    metric('Alcance', item.reach),
    metric('Interações', item.interactions),
  ].filter(Boolean)

  return el('article', { className: 'case-card case-card--filled', attrs: { 'data-reveal': '' } }, [
    el('header', { className: 'case-head' }, [
      el('span', { className: 'chip chip--accent', text: item.brand }),
      item.format ? el('span', { className: 'case-format', text: item.format }) : null,
    ]),
    el('h3', { className: 'case-title', text: item.campaign }),
    item.objective ? el('p', { className: 'case-objective', text: item.objective }) : null,
    metrics.length ? el('dl', { className: 'case-metrics' }, metrics) : null,
    item.result ? el('p', { className: 'case-result', text: item.result }) : null,
    item.link
      ? el('a', {
          className: 'case-link',
          attrs: { href: item.link, target: '_blank', rel: 'noopener noreferrer' },
        }, ['Ver publicação', icon('external')])
      : null,
  ])
}

function emptyCase(index) {
  return el('article', { className: 'case-card case-card--empty', attrs: { 'data-reveal': '' } }, [
    el('span', { className: 'case-slot-index num', text: String(index + 1).padStart(2, '0') }),
    el('h3', { className: 'case-title', text: 'Espaço reservado para case' }),
    el('p', {
      className: 'case-objective',
      text: 'Marca, objetivo, formato e resultado de uma campanha entram aqui assim que forem liberados para divulgação.',
    }),
  ])
}

export function renderCases() {
  const anyFilled = cases.some((item) => item.filled)

  return el('section', { className: 'section cases' }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('layers'), 'Cases de conteúdo']),
          el('h2', { className: 'section-title', text: 'Campanhas e resultados' }),
          el('p', {
            className: 'section-subtitle',
            text: anyFilled
              ? 'Campanhas realizadas, com o resultado que cada uma entregou.'
              : 'Os cases entram aqui conforme as marcas liberam os números. Enquanto isso, os dados de performance desta página valem para qualquer formato.',
          }),
        ]),
      ]),

      el('div', { className: 'cases-grid' },
        cases.map((item, index) => (item.filled ? filledCase(item) : emptyCase(index))),
      ),
    ]),
  ])
}
