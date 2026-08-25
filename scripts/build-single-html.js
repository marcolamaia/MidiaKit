#!/usr/bin/env node
/**
 * ---------------------------------------------------------------------------
 * GERADOR DO MEDIA KIT EM ARQUIVO ÚNICO
 * ---------------------------------------------------------------------------
 * Produz `media-kit.html`: um HTML autossuficiente, com CSS, JavaScript,
 * ícones, favicon, foto e os DADOS já embutidos. Abre com dois cliques,
 * funciona offline, sobe em qualquer hospedagem, vai anexado num e-mail.
 *
 *     npm run build:html
 *
 * De onde vêm os números:
 *   • DEMO_MODE=true  → dados fictícios, com faixa de aviso na página
 *   • DEMO_MODE=false → dados REAIS da Windsor.ai, assados no arquivo
 *
 * A API Key NUNCA entra no arquivo: ela é usada aqui, no seu computador, no
 * momento da geração. O HTML sai só com o resultado.
 *
 * Se o arquivo for hospedado ao lado da serverless function `/api/metrics`,
 * ele troca sozinho o snapshot pelos dados ao vivo ao abrir.
 * ---------------------------------------------------------------------------
 */

import { build } from 'esbuild'
import { config } from 'dotenv'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

config()

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'media-kit.html')

const green = (t) => `\x1b[32m${t}\x1b[0m`
const dim = (t) => `\x1b[2m${t}\x1b[0m`
const yellow = (t) => `\x1b[33m${t}\x1b[0m`

/* -------------------------------------------------------------------------- */
/* 1. Dados                                                                   */
/* -------------------------------------------------------------------------- */

async function loadSnapshot() {
  const { assemble, getMetrics, isDemoMode } = await import('../src/services/metrics.js')

  // SNAPSHOT_FROM=<arquivo.json> reconstrói a partir de linhas cruas já
  // capturadas, sem tocar na rede. Serve para regerar o HTML offline e para
  // reproduzir exatamente a mesma saída mais tarde.
  const fixturePath = process.env.SNAPSHOT_FROM
  if (fixturePath) {
    const file = resolve(root, fixturePath)
    console.log(dim(`Reconstruindo a partir de ${fixturePath} (sem chamar a API)…`))
    const raw = JSON.parse(await readFile(file, 'utf8'))
    const anchor = raw.dailyRows
      .map((r) => r.date)
      .filter(Boolean)
      .sort()
      .at(-1)
    if (!anchor) throw new Error(`${fixturePath} não tem linhas diárias com data.`)
    return assemble(raw, { anchor, demo: false })
  }

  const demo = isDemoMode()
  console.log(dim(`Buscando métricas (${demo ? 'MODO DEMONSTRAÇÃO' : 'dados reais'})…`))
  const { payload } = await getMetrics({ force: true })

  if (demo) {
    console.log(yellow('!  DEMO_MODE=true — o arquivo sai com números FICTÍCIOS e faixa de aviso.'))
    console.log(dim('   Para assar os números reais: DEMO_MODE=false + WINDSOR_API_KEY no .env\n'))
  }
  return payload
}

/* -------------------------------------------------------------------------- */
/* 1b. Miniaturas                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Baixa e embute as miniaturas dos conteúdos exibidos.
 *
 * As URLs do CDN da Meta são assinadas e expiram em um ou dois dias. Num
 * arquivo que será enviado por e-mail e aberto na semana seguinte, isso
 * significaria uma página inteira de espaços vazios. Embutindo, o Media Kit
 * continua com as capas reais para sempre.
 *
 * Orçamento em bytes para o arquivo não virar um anexo impossível: ao estourar,
 * as miniaturas restantes ficam com a URL remota (e, se ela expirar, a
 * interface cai no fundo com o texto do post).
 */
async function inlineThumbnails(snapshot, { budgetBytes = 2_600_000, perImage = 260_000 } = {}) {
  // Só o que aparece sem interação: top 6 de cada período + trilho de Reels.
  const wanted = new Map()
  for (const period of Object.values(snapshot.periods ?? {})) {
    for (const item of [...(period.content?.top ?? []).slice(0, 6), ...(period.content?.reels ?? []).slice(0, 8)]) {
      if (item.thumbnail?.startsWith('http')) wanted.set(item.thumbnail, item.id)
    }
  }
  if (!wanted.size) return { embedded: 0, skipped: 0 }

  console.log(dim(`Baixando ${wanted.size} miniatura(s)…`))
  const cache = new Map()
  let used = 0
  let skipped = 0

  await Promise.all([...wanted.keys()].map(async (url) => {
    if (used >= budgetBytes) { skipped += 1; return }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { skipped += 1; return }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > perImage || used + buf.length > budgetBytes) { skipped += 1; return }
      used += buf.length
      const type = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      cache.set(url, `data:${type};base64,${buf.toString('base64')}`)
    } catch {
      skipped += 1 // rede instável não pode derrubar a geração
    }
  }))

  // Reescreve as referências em todos os períodos.
  for (const period of Object.values(snapshot.periods ?? {})) {
    for (const list of [period.content?.top, period.content?.reels]) {
      for (const item of list ?? []) {
        const inlined = cache.get(item.thumbnail)
        if (inlined) item.thumbnail = inlined
      }
    }
  }

  return { embedded: cache.size, skipped, bytes: used }
}

/* -------------------------------------------------------------------------- */
/* 2. Bundle                                                                  */
/* -------------------------------------------------------------------------- */

/** Empacota `src/main.js` num único IIFE, com o CSS extraído à parte. */
async function bundle() {
  const result = await build({
    entryPoints: [join(root, 'src/main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false,
    // O CSS importado pelo main.js sai como um segundo arquivo em `outputFiles`.
    outdir: 'out',
    loader: { '.svg': 'text' },
    legalComments: 'none',
  })

  const js = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? ''
  const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? ''
  if (!js) throw new Error('esbuild não devolveu JavaScript.')
  return { js, css }
}

/* -------------------------------------------------------------------------- */
/* 3. Assets                                                                  */
/* -------------------------------------------------------------------------- */

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif',
}

/** Lê um asset de /public e devolve como data URI. Ausente → null. */
async function dataUri(publicPath, { maxBytes = 3_000_000 } = {}) {
  const file = join(root, 'public', publicPath.replace(/^\//, ''))
  try {
    const info = await stat(file)
    if (info.size > maxBytes) {
      console.log(yellow(`!  ${publicPath} tem ${(info.size / 1e6).toFixed(1)} MB — grande demais para embutir. Pulando.`))
      return null
    }
    const mime = MIME[extname(file).toLowerCase()]
    if (!mime) return null
    const base64 = (await readFile(file)).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    return null // asset opcional
  }
}

/* -------------------------------------------------------------------------- */
/* 4. Escape seguro                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Serializa o JSON para dentro de uma tag <script>.
 *
 * `</script>` dentro de uma string do payload encerraria a tag e quebraria a
 * página (uma legenda do Instagram pode conter qualquer coisa). `U+2028` e
 * `U+2029` são quebras de linha válidas em JSON mas ilegais em JavaScript.
 */
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}


/* -------------------------------------------------------------------------- */
/* 5. Montagem                                                                */
/* -------------------------------------------------------------------------- */

async function main() {
  const [snapshot, { js, css }] = await Promise.all([loadSnapshot(), bundle()])

  const { creatorConfig } = await import('../src/config.js')

  const thumbs = await inlineThumbnails(snapshot)
  if (thumbs.embedded) {
    console.log(green(`✓ ${thumbs.embedded} miniatura(s) embutida(s) — ${(thumbs.bytes / 1024).toFixed(0)} KB`))
  }
  if (thumbs.skipped) {
    console.log(yellow(`!  ${thumbs.skipped} miniatura(s) não embutida(s) — seguem por URL, com fallback visual.`))
  }

  const [photo, ogImage, favicon] = await Promise.all([
    dataUri(creatorConfig.photo),
    dataUri(creatorConfig.ogImage, { maxBytes: 600_000 }),
    dataUri('/favicon.svg'),
  ])

  if (photo) console.log(green(`✓ Foto embutida (${creatorConfig.photo})`))
  else console.log(yellow(`!  Sem foto em public${creatorConfig.photo} — o Hero usa o monograma.`))

  // O HTML de origem já traz SEO, Open Graph e schema. Reaproveitamos o <head>
  // e trocamos só o que precisa virar embutido.
  const source = await readFile(join(root, 'index.html'), 'utf8')

  const head = source
    .slice(source.indexOf('<head>') + 6, source.indexOf('</head>'))
    // A fonte do Google fica opcional: o arquivo precisa funcionar offline.
    .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
    .replace(/\s*<link\s+rel="stylesheet"\s+href="https:\/\/fonts\.googleapis[^>]*>/g, '')
    .replace(/\s*<noscript>[\s\S]*?<\/noscript>/g, '')
    .replace(/\s*<link rel="icon"[^>]*>/g, '')
    .replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '')
    .trim()

  const siteUrl = creatorConfig.siteUrl.replace(/\/$/, '')

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
${head}
${favicon ? `    <link rel="icon" href="${favicon}" type="image/svg+xml" />` : ''}
${ogImage ? `    <meta property="og:image" content="${ogImage}" />` : ''}

    <!-- Fonte carregada de forma opcional: se não houver rede, o navegador
         cai na pilha de fallback e a página continua correta. -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" media="print" onload="this.media='all'"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />

    <style>${css}</style>
</head>
<body>
    <a class="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
    <div id="app"></div>

    <noscript>
      <div style="padding:2rem;text-align:center;color:#9aa1ad;font-family:system-ui,sans-serif">
        Este Media Kit precisa de JavaScript para exibir as métricas.
        Entre em contato pelo Instagram
        <a href="${creatorConfig.instagram}" style="color:#9b82ff">${creatorConfig.username}</a>.
      </div>
    </noscript>

    <!-- Métricas assadas no momento da geração. Sem chamada de rede: a página
         pinta na hora, mesmo offline. Se este arquivo estiver hospedado ao lado
         de /api/metrics, os dados ao vivo substituem este snapshot ao abrir. -->
    <script>window.__MEDIA_KIT_DATA__=${safeJson(snapshot)};${photo ? `window.__MEDIA_KIT_PHOTO__=${safeJson(photo)};` : ''}</script>

    <script>${js}</script>
</body>
</html>
`

  await writeFile(OUT, html, 'utf8')

  const kb = (Buffer.byteLength(html) / 1024).toFixed(0)
  console.log()
  console.log(green(`✓ media-kit.html gerado — ${kb} KB`))
  console.log(dim(`  origem dos dados: ${snapshot.meta.source}`))
  console.log(dim(`  período coberto: até ${snapshot.meta.anchorDate}`))
  console.log(dim(`  abra com dois cliques ou suba em qualquer hospedagem`))
  if (siteUrl) console.log(dim(`  canonical/OG apontando para ${siteUrl}`))
}

main().catch((error) => {
  console.error(`\n\x1b[31m✗\x1b[0m Falha ao gerar: ${error.message}`)
  if (error.code === 'missing_credentials') {
    console.error(dim('  Defina WINDSOR_API_KEY no .env ou use DEMO_MODE=true.'))
  }
  process.exitCode = 1
})
