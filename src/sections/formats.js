/**
 * FORMATOS DE PARCERIA — converte a atenção em conversa comercial.
 * Sem preço, por decisão: o Media Kit gera contato, não é tabela pública.
 */

import { el } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { partnershipFormats } from '../config.js'

export function renderFormats() {
  return el('section', { className: 'section formats', attrs: { id: 'parcerias' } }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('handshake'), 'Como podemos trabalhar juntos']),
          el('h2', { className: 'section-title', text: 'Formatos de parceria' }),
          el('p', {
            className: 'section-subtitle',
            text: 'Cada formato entrega um resultado diferente. A escolha depende do objetivo da campanha — me conta o seu e eu proponho o caminho.',
          }),
        ]),
        el('a', { className: 'btn btn--secondary btn--sm', attrs: { href: '#contato' } }, [
          'Montar uma proposta', icon('arrowRight'),
        ]),
      ]),

      el('div', { className: 'formats-grid' },
        partnershipFormats.map((format) =>
          el('article', { className: 'format-card', attrs: { 'data-reveal': '' } }, [
            el('span', { className: 'format-icon' }, [icon(format.icon)]),
            el('h3', { className: 'format-title', text: format.title }),
            el('p', { className: 'format-text', text: format.text }),
          ]),
        ),
      ),
    ]),
  ])
}
