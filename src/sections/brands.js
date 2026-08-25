/**
 * MARCAS PARCEIRAS.
 *
 * A lista vive em `config.js`. Enquanto estiver vazia, a seção inteira NÃO é
 * renderizada — melhor não ter a seção do que exibir marca inventada ou uma
 * fileira de caixas cinzas vazias num material comercial.
 */

import { el } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { brands } from '../config.js'

export function renderBrands() {
  if (!brands.length) return null

  return el('section', { className: 'section brands' }, [
    el('div', { className: 'container' }, [
      el('div', { className: 'section-head' }, [
        el('div', {}, [
          el('span', { className: 'section-eyebrow' }, [icon('briefcase'), 'Marcas que já fizeram parte']),
          el('h2', { className: 'section-title', text: 'Marcas que já fizeram parte dos conteúdos' }),
        ]),
      ]),

      el('ul', { className: 'brands-grid', attrs: { 'data-reveal': '' } },
        brands.map((brand) => {
          const content = brand.logo
            ? el('img', {
                className: 'brand-logo',
                attrs: { src: brand.logo, alt: brand.name, loading: 'lazy', decoding: 'async' },
              })
            : el('span', { className: 'brand-wordmark', text: brand.name })

          return el('li', { className: 'brand-item' }, [
            brand.url
              ? el('a', {
                  attrs: { href: brand.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': brand.name },
                }, [content])
              : content,
          ])
        }),
      ),
    ]),
  ])
}
