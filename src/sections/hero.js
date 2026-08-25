/**
 * HERO — primeira dobra.
 * Posicionamento à esquerda, retrato à direita (desktop). A profundidade vem
 * de luz ambiente, grid discreto e partículas lentas — tudo em CSS, sem
 * canvas, e tudo desligado sob `prefers-reduced-motion`.
 */

import { el } from '../utils/dom.js'
import { icon } from '../components/icons.js'
import { copy, creatorConfig } from '../config.js'

/** Iniciais para o caso de a foto não estar no projeto ainda. */
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function portrait() {
  const frame = el('div', { className: 'hero-portrait' })

  const fallback = () =>
    el('div', { className: 'hero-portrait-fallback', attrs: { role: 'img', 'aria-label': creatorConfig.photoAlt } }, [
      el('span', { className: 'hero-portrait-initials', text: initials(creatorConfig.name) }),
    ])

  // Na versão de arquivo único a foto vem embutida como data URI; nas demais,
  // pelo caminho normal em /public.
  const embedded = globalThis.__MEDIA_KIT_PHOTO__
  const src = embedded || creatorConfig.photo

  // Aberto do disco sem foto embutida, `/assets/…` aponta para a raiz do
  // sistema de arquivos e nunca resolve. Vamos direto ao monograma em vez de
  // disparar uma requisição condenada e sujar o console.
  const inalcancavel =
    !embedded && globalThis.location?.protocol === 'file:' && creatorConfig.photo.startsWith('/')

  if (inalcancavel) {
    frame.append(
      el('div', { className: 'hero-portrait-glow', attrs: { 'aria-hidden': 'true' } }),
      el('div', { className: 'hero-portrait-ring', attrs: { 'aria-hidden': 'true' } }),
      fallback(),
    )
    return frame
  }

  const image = el('img', {
    className: 'hero-portrait-img',
    attrs: {
      src,
      alt: creatorConfig.photoAlt,
      // A foto do Hero é o maior elemento da primeira dobra (LCP):
      // carrega cedo, sem lazy.
      fetchpriority: 'high',
      decoding: 'async',
      width: '560',
      height: '700',
    },
  })
  // Sem o arquivo em public/assets, cai no monograma — nada aparece quebrado.
  image.addEventListener('error', () => image.replaceWith(fallback()), { once: true })

  frame.append(
    el('div', { className: 'hero-portrait-glow', attrs: { 'aria-hidden': 'true' } }),
    el('div', { className: 'hero-portrait-ring', attrs: { 'aria-hidden': 'true' } }),
    image,
  )
  return frame
}

function ambience() {
  return el('div', { className: 'hero-ambience', attrs: { 'aria-hidden': 'true' } }, [
    el('div', { className: 'hero-grid' }),
    el('div', { className: 'hero-light hero-light--a' }),
    el('div', { className: 'hero-light hero-light--b' }),
    el('div', { className: 'hero-particles' },
      // Posições fixas: partícula aleatória a cada carregamento chamaria
      // atenção para si em vez de dar profundidade.
      [
        { top: '18%', left: '12%', delay: '0s', size: '3px' },
        { top: '62%', left: '7%', delay: '2.4s', size: '2px' },
        { top: '34%', left: '46%', delay: '1.2s', size: '2px' },
        { top: '76%', left: '38%', delay: '3.6s', size: '3px' },
        { top: '12%', left: '68%', delay: '0.8s', size: '2px' },
        { top: '84%', left: '78%', delay: '2.9s', size: '2px' },
      ].map((p) =>
        el('span', {
          className: 'hero-particle',
          style: { top: p.top, left: p.left, animationDelay: p.delay, width: p.size, height: p.size },
        }),
      ),
    ),
  ])
}

export function renderHero() {
  const [before, highlight, after] = copy.hero.headline

  return el('section', { className: 'hero', attrs: { id: 'visao-geral' } }, [
    ambience(),
    el('div', { className: 'container hero-inner' }, [
      el('div', { className: 'hero-content' }, [
        el('span', { className: 'chip chip--accent hero-eyebrow', attrs: { 'data-reveal': '' } }, [
          el('i', { className: 'pulse-dot' }),
          copy.hero.eyebrow,
        ]),

        el('h1', { className: 'hero-title', attrs: { 'data-reveal': '' } }, [
          `${before} `,
          el('span', { className: 'hero-title-accent', text: highlight }),
          ` ${after}`,
        ]),

        el('p', { className: 'hero-description', attrs: { 'data-reveal': '' }, text: copy.hero.description }),

        el('ul', { className: 'hero-tags', attrs: { 'data-reveal': '' } },
          copy.hero.tags.map((tag) => el('li', { className: 'chip', text: tag })),
        ),

        el('div', { className: 'hero-actions', attrs: { 'data-reveal': '' } }, [
          el('a', { className: 'btn btn--primary', attrs: { href: '#performance' } }, [
            copy.hero.primaryCta, icon('chart'),
          ]),
          el('a', { className: 'btn btn--secondary', attrs: { href: '#contato' } }, [
            copy.hero.secondaryCta, icon('send'),
          ]),
        ]),
      ]),

      el('div', { className: 'hero-visual', attrs: { 'data-reveal': '' } }, [portrait()]),
    ]),
  ])
}
