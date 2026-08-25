/**
 * Revelação suave ao entrar na viewport. Um único IntersectionObserver para a
 * página inteira; elementos entram e saem do registro sozinhos.
 * Com `prefers-reduced-motion`, tudo já nasce visível.
 */

import { prefersReducedMotion, qsa } from '../utils/dom.js'

let observer = null

function ensureObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  )
  return observer
}

/** Registra todos os `[data-reveal]` ainda não revelados dentro de `scope`. */
export function observeReveals(scope = document) {
  const nodes = qsa('[data-reveal]:not(.is-visible)', scope)
  if (prefersReducedMotion()) {
    for (const node of nodes) node.classList.add('is-visible')
    return
  }
  const io = ensureObserver()
  nodes.forEach((node, index) => {
    // Escadinha curta: dá ritmo sem atrasar a leitura.
    if (!node.style.getPropertyValue('--reveal-delay')) {
      node.style.setProperty('--reveal-delay', `${Math.min(index * 55, 280)}ms`)
    }
    io.observe(node)
  })
}
