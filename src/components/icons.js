/**
 * Ícones inline (SVG, stroke 1.5, grid 24). Inline em vez de sprite externo:
 * são poucos, evitam uma requisição extra e herdam `currentColor`.
 */

const paths = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.7 7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/>',
  trendUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  bar: '<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7" rx="1"/><rect x="10.5" y="7" width="3.5" height="11" rx="1"/><rect x="16" y="13" width="3.5" height="5" rx="1"/>',
  play: '<path d="M6 4.5v15l13-7.5-13-7.5Z"/>',
  crown: '<path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15L3 8Z"/>',
  people: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  handshake: '<path d="M11 17l-2 2a2 2 0 0 1-3-3l5-5 3 3 5-5 3 3-6 6a2 2 0 0 1-3 0l-2-2Z"/><path d="M3 9l4-4 4 2"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>',
  whatsapp: '<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3L3 21Z"/><path d="M9 9c0 3.3 2.7 6 6 6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/>',
  send: '<path d="M21 3 3 10.5l7 3 3 7L21 3Z"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  minus: '<path d="M5 12h14"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
  alert: '<path d="M12 9v5M12 17.5v.5"/><path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  empty: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M12 12v9M4 7.5l8 4.5 8-4.5"/>',
  camera: '<rect x="2.5" y="6.5" width="19" height="13" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6.5 10 4h4l1.5 2.5"/>',
  ticket: '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a3 3 0 0 0 0 6v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a3 3 0 0 0 0-6V8Z"/>',
  wand: '<path d="m4 20 10-10M14.5 3.5l6 6M17.5 3.5l3 3M3.5 10.5l3 3"/>',
  megaphone: '<path d="M3 11v2a2 2 0 0 0 2 2h1l10 4V5L6 9H5a2 2 0 0 0-2 2Z"/><path d="M19 9a3 3 0 0 1 0 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4.5L6 21V3Z"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M12 3v13M8 7l4-4 4 4"/>',
  comment: '<path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12Z"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
}

/** Ícones dos formatos de parceria (chaves usadas em config.js). */
const formatIcons = {
  reels: 'play',
  stories: 'layers',
  review: 'box',
  unboxing: 'box',
  campaign: 'megaphone',
  ugc: 'camera',
  event: 'ticket',
  custom: 'wand',
}

/**
 * @param {string} name
 * @param {object} [attrs] atributos extras no <svg>
 * @returns {SVGElement}
 */
export function icon(name, attrs = {}) {
  const key = paths[name] ? name : formatIcons[name] || 'dot'
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('fill', 'none')
  node.setAttribute('stroke', 'currentColor')
  node.setAttribute('stroke-width', attrs['stroke-width'] || '1.6')
  node.setAttribute('stroke-linecap', 'round')
  node.setAttribute('stroke-linejoin', 'round')
  node.setAttribute('aria-hidden', 'true')
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  node.innerHTML = paths[key]
  return node
}

export { paths as iconPaths }
