/** Rodapé: identidade, links e o lembrete de que os dados são atualizados. */

import { el } from '../utils/dom.js'
import { creatorConfig } from '../config.js'

export function renderFooter() {
  // Ano sempre atual — nada de "2026" fixo no código.
  const year = new Date().getFullYear()

  return el('footer', { className: 'site-footer' }, [
    el('div', { className: 'container site-footer-inner' }, [
      el('div', { className: 'site-footer-brand' }, [
        el('span', { className: 'brand-name', text: creatorConfig.shortName }),
        el('span', { className: 'site-footer-tag', text: `Media Kit ${year}` }),
      ]),

      el('nav', { className: 'site-footer-links', attrs: { 'aria-label': 'Links do rodapé' } }, [
        el('a', {
          attrs: { href: creatorConfig.instagram, target: '_blank', rel: 'noopener noreferrer' },
          text: 'Instagram',
        }),
        el('a', { attrs: { href: '#contato' }, text: 'Contato' }),
        el('a', { attrs: { href: '#performance' }, text: 'Performance' }),
      ]),

      el('p', { className: 'site-footer-note', text: 'Dados de performance atualizados diariamente.' }),
      el('p', { className: 'site-footer-copy', text: `© ${year} ${creatorConfig.name}. Todos os direitos reservados.` }),
    ]),
  ])
}
