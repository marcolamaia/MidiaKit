/**
 * Contagem animada dos números principais.
 * Regras: só roda quando o elemento aparece, respeita `prefers-reduced-motion`
 * e o texto final é EXATAMENTE o que o formatador produz — a animação nunca
 * altera o valor apresentado.
 */

import { prefersReducedMotion } from '../utils/dom.js'

const DURATION = 900
const easeOut = (t) => 1 - (1 - t) ** 3

/**
 * @param {HTMLElement} node
 * @param {number} target
 * @param {(value:number)=>string} format
 */
export function animateCount(node, target, format) {
  const final = format(target)

  if (prefersReducedMotion() || !Number.isFinite(target)) {
    node.textContent = final
    return
  }

  const start = performance.now()
  function frame(now) {
    const progress = Math.min((now - start) / DURATION, 1)
    node.textContent = format(target * easeOut(progress))
    if (progress < 1) requestAnimationFrame(frame)
    else node.textContent = final // garante o valor exato no fim
  }
  requestAnimationFrame(frame)
}

/**
 * Dispara a contagem quando o elemento entra na tela, uma única vez.
 *
 * O nó JÁ nasce com o valor final escrito. A animação apenas o substitui
 * temporariamente enquanto conta. Assim, se o observer nunca disparar
 * (impressão, captura de tela, navegador sem IntersectionObserver, elemento
 * que jamais entra na viewport), a página mostra o número real — e nunca um
 * "0" que seria lido como métrica verdadeira.
 */
export function countOnReveal(node, target, format) {
  if (!Number.isFinite(target)) return
  node.textContent = format(target)

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      animateCount(node, target, format)
      io.disconnect()
    }
  }, { threshold: 0.4 })
  io.observe(node)
}
