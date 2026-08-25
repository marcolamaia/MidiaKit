/** POSICIONAMENTO — argumentos concretos, sem frase de efeito genérica. */

import { el } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { copy } from '../config.js'

export function renderWhy() {
  return el('section', { className: 'section why' }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('spark'), 'Posicionamento']),
          el('h2', { className: 'section-title', text: copy.why.title }),
          el('p', { className: 'section-subtitle', text: copy.why.subtitle }),
        ]),
      ]),

      el('div', { className: 'why-grid' },
        copy.why.pillars.map((pillar, index) =>
          el('article', { className: 'why-item', attrs: { 'data-reveal': '' } }, [
            el('span', { className: 'why-index num', text: String(index + 1).padStart(2, '0') }),
            el('div', {}, [
              el('h3', { className: 'why-title', text: pillar.title }),
              el('p', { className: 'why-text', text: pillar.text }),
            ]),
          ]),
        ),
      ),
    ]),
  ])
}
