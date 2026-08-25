/** Helpers mínimos de DOM — evitam repetir `document.createElement` no projeto. */

/**
 * Cria um elemento.
 * @param {string} tag
 * @param {object} [props]  className, dataset, attrs, text, html, on, style
 * @param {Array<Node|string|null|undefined|false>} [children]
 */
/**
 * Aplica estilos inline. Propriedades customizadas (`--algo`) PRECISAM passar
 * por `setProperty`: `Object.assign(node.style, {'--x': 1})` é silenciosamente
 * ignorado pelo CSSStyleDeclaration, o que deixaria barras e gradientes zerados.
 */
function applyStyle(node, style) {
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined) continue
    if (key.startsWith('--')) node.style.setProperty(key, String(value))
    else node.style[key] = value
  }
}

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag)
  const { className, dataset, attrs, text, html, on, style, ...rest } = props

  if (className) node.className = className
  if (text !== undefined && text !== null) node.textContent = String(text)
  if (html !== undefined && html !== null) node.innerHTML = html

  if (dataset) for (const [k, v] of Object.entries(dataset)) if (v != null) node.dataset[k] = String(v)
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) node.setAttribute(k, String(v))
  if (style) applyStyle(node, style)
  if (on) for (const [event, handler] of Object.entries(on)) node.addEventListener(event, handler)
  Object.assign(node, rest)

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

/** SVG precisa de namespace — `el()` não serve. */
export function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue
    node.setAttribute(key, String(value))
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
  return node
}

export function mount(node, ...children) {
  clear(node)
  for (const child of children.flat()) if (child) node.append(child)
  return node
}

export const qs = (selector, scope = document) => scope.querySelector(selector)
export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)]

/** Usuário pediu menos movimento? Respeitamos em todas as animações. */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** rAF com throttle — usado em scroll e hover de gráfico. */
export function raf(fn) {
  let ticking = false
  let lastArgs
  return (...args) => {
    lastArgs = args
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      ticking = false
      fn(...lastArgs)
    })
  }
}
