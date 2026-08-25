/**
 * Testes do arquivo único gerado (`media-kit.html`).
 *
 * Rode `npm run build:html` antes. Sem o arquivo, os testes são pulados em vez
 * de falhar — assim `npm test` funciona num clone recém-baixado.
 */

import { test, skip } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(root, 'media-kit.html')
const exists = existsSync(FILE)
const html = exists ? readFileSync(FILE, 'utf8') : ''

/** Extrai o snapshot embutido do jeito que o navegador faria. */
function snapshot() {
  const match = html.match(/window\.__MEDIA_KIT_DATA__=(\{[\s\S]*?\});window\.__MEDIA_KIT|window\.__MEDIA_KIT_DATA__=(\{[\s\S]*?\});<\/script>/)
  const raw = match?.[1] ?? match?.[2]
  assert.ok(raw, 'snapshot embutido não encontrado')
  return new Function(`return ${raw}`)()
}

test('media-kit.html existe', { skip: exists ? false : 'rode `npm run build:html` primeiro' }, () => {
  assert.ok(html.length > 10_000)
})

test('é autossuficiente: sem referências a arquivos locais', { skip: !exists }, () => {
  // Qualquer href/src que não seja data:, https: ou âncora quebraria o arquivo
  // ao ser aberto do disco ou enviado por e-mail.
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((v) => !v.startsWith('data:') && !v.startsWith('#') && !/^https?:/.test(v))
  assert.deepEqual(refs, [], `referências locais encontradas: ${refs.join(', ')}`)
})

test('CSS e JavaScript estão embutidos, não linkados', { skip: !exists }, () => {
  assert.match(html, /<style>/, 'CSS deveria estar inline')
  assert.ok(!/<link[^>]+rel="stylesheet"[^>]+href="(?!https:\/\/fonts)/.test(html), 'não deve linkar CSS local')
  assert.ok(!/<script[^>]+src=/.test(html), 'não deve carregar JS externo')
})

test('nenhuma credencial vazou para o arquivo', { skip: !exists }, () => {
  for (const proibido of ['WINDSOR_API_KEY', 'api_key=', 'connectors.windsor.ai', 'REVALIDATE_TOKEN']) {
    assert.ok(!html.includes(proibido), `"${proibido}" não pode aparecer no HTML`)
  }
})

test('o snapshot embutido é JavaScript válido e completo', { skip: !exists }, () => {
  const data = snapshot()
  assert.ok(data.meta, 'meta ausente')
  assert.ok(data.profile, 'profile ausente')
  for (const id of ['24h', '30d', '180d']) {
    assert.ok(data.periods[id], `período ${id} ausente`)
    assert.ok(Array.isArray(data.periods[id].series.reach), `série de ${id} ausente`)
  }
})

test('nenhum NaN, undefined ou [object Object] no snapshot', { skip: !exists }, () => {
  const bad = []
  const walk = (node, path = '$') => {
    if (typeof node === 'number' && !Number.isFinite(node)) bad.push(path)
    if (typeof node === 'string' && ['undefined', 'NaN', '[object Object]'].includes(node)) bad.push(path)
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`))
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`)
  }
  walk(snapshot())
  assert.deepEqual(bad, [])
})

test('legendas com </script> não escapam da tag', { skip: !exists }, () => {
  // O bloco do snapshot precisa terminar onde mandamos, não numa legenda.
  const inicio = html.indexOf('window.__MEDIA_KIT_DATA__=')
  const trecho = html.slice(inicio, html.indexOf('</script>', inicio))
  assert.ok(!trecho.includes('</script'), 'uma legenda fechou a tag antes da hora')
})

test('marcação de origem dos dados é coerente', { skip: !exists }, () => {
  const { meta } = snapshot()
  assert.ok(['windsor', 'demo'].includes(meta.source))
  // Em produção, `demo` verdadeiro obriga a faixa de aviso na página.
  if (meta.demo) assert.equal(meta.source, 'demo')
})
