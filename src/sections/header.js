/** Header minimalista, sticky, com destaque do link da seção visível. */

import { el, raf } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { creatorConfig, navigation } from '../config.js'

/**
 * Monta o header e o devolve.
 *
 * IMPORTANTE: o header precisa ser filho DIRETO de um container alto (#app).
 * `position: sticky` é limitado à caixa do pai — dentro de um wrapper com a
 * altura do próprio header, ele desliza para fora da tela em vez de grudar.
 */
export function renderHeader() {
  const links = navigation.map((item) =>
    el('a', {
      className: 'nav-link',
      attrs: { href: `#${item.id}`, 'data-nav': item.id },
      text: item.label,
    }),
  )

  const nav = el('nav', { className: 'nav', attrs: { 'aria-label': 'Navegação principal' } }, links)

  const menuButton = el('button', {
    className: 'nav-toggle',
    type: 'button',
    attrs: { 'aria-label': 'Abrir menu', 'aria-expanded': 'false', 'aria-controls': 'mobile-nav' },
  }, [icon('menu')])

  const mobileNav = el('div', { className: 'mobile-nav', attrs: { id: 'mobile-nav', hidden: 'hidden' } }, [
    el('nav', { attrs: { 'aria-label': 'Navegação (celular)' } },
      navigation.map((item) =>
        el('a', { className: 'mobile-nav-link', attrs: { href: `#${item.id}` }, text: item.label }),
      ),
    ),
    el('a', {
      className: 'btn btn--primary',
      attrs: { href: '#contato' },
    }, [ 'Falar sobre parceria', icon('send') ]),
  ])

  const header = el('header', { className: 'site-header', attrs: { id: 'site-header' } }, [
    el('div', { className: 'container site-header-inner' }, [
      el('a', { className: 'brand', attrs: { href: '#topo', 'aria-label': `${creatorConfig.name} — início` } }, [
        el('span', { className: 'brand-name', text: creatorConfig.shortName }),
        el('span', { className: 'brand-mark', attrs: { 'aria-hidden': 'true' } }),
      ]),
      nav,
      el('div', { className: 'site-header-actions' }, [
        el('a', { className: 'btn btn--primary btn--sm header-cta', attrs: { href: '#contato' } }, [
          'Falar sobre parceria', icon('send'),
        ]),
        menuButton,
      ]),
    ]),
    mobileNav,
  ])

  /* ---- Menu do celular ---- */
  let open = false
  const setMenu = (next) => {
    open = next
    mobileNav.hidden = !open
    header.classList.toggle('is-menu-open', open)
    menuButton.setAttribute('aria-expanded', String(open))
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu')
    menuButton.replaceChildren(icon(open ? 'close' : 'menu'))
    document.body.style.overflow = open ? 'hidden' : ''
  }
  menuButton.addEventListener('click', () => setMenu(!open))
  mobileNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false)
  })
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setMenu(false)
  })
  // Voltar ao desktop com o menu aberto deixaria o scroll travado.
  window.matchMedia('(min-width: 981px)').addEventListener('change', (event) => {
    if (event.matches && open) setMenu(false)
  })

  /* ---- Sombra ao rolar ---- */
  const onScroll = raf(() => {
    header.classList.toggle('is-scrolled', window.scrollY > 12)
  })
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  /* ---- Link ativo conforme a seção visível ---- */
  const navLinks = new Map(links.map((link) => [link.dataset.nav, link]))
  const sections = navigation
    .map((item) => document.getElementById(item.id))
    .filter(Boolean)

  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        // A seção "mais visível" no momento vence — evita piscar entre duas.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        for (const link of navLinks.values()) link.classList.remove('is-active')
        navLinks.get(visible.target.id)?.classList.add('is-active')
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.2, 0.5] },
    )
    for (const section of sections) spy.observe(section)
  }

  return header
}

