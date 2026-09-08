/**
 * Gera as duas entregas do Media Kit a partir de `deck.html`:
 *
 *   media-kit-marcos-maia-2026.html   arquivo único, tudo embutido, abre offline
 *   media-kit-marcos-maia-2026.pdf    12 páginas 16:9, pronto para enviar à marca
 *
 * Uso:  node apresentacao/build.mjs
 */

import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { jpegPdf } from './jpeg-pdf.mjs';

/**
 * Alguns ambientes já trazem o Chromium instalado numa versão diferente da que
 * o Playwright espera. Se acharmos um binário pronto, usamos ele em vez de
 * baixar outro.
 */
function chromiumPath() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SLIDE = { width: 1440, height: 810 };
const OUT = 'media-kit-marcos-maia-2026';
const LIGHT_SCALE = 1.35;    // 1440 CSS px -> ~1944 px de largura
const LIGHT_QUALITY = 76;

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

async function dataUri(relPath) {
  const file = resolve(HERE, relPath);
  const ext = relPath.slice(relPath.lastIndexOf('.')).toLowerCase();
  const buf = await readFile(file);
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${buf.toString('base64')}`;
}

/** Troca todo `url(assets/...)` e `src="assets/..."` por data URI. */
async function inlineAssets(text) {
  const refs = new Set();
  for (const m of text.matchAll(/(?:url\(|src=")(assets\/[^)"']+)[)"]/g)) refs.add(m[1]);

  for (const ref of refs) {
    try {
      await stat(resolve(HERE, ref));
    } catch {
      console.warn(`  ! faltando: ${ref} (o slide cai no espaço reservado)`);
      continue;
    }
    const uri = await dataUri(ref);
    text = text.replaceAll(ref, uri);
  }
  return text;
}

async function main() {
  console.log('· lendo deck.html');
  let html = await readFile(join(HERE, 'deck.html'), 'utf8');

  const fonts = await readFile(join(HERE, 'fonts.css'), 'utf8');
  const styles = await inlineAssets(await readFile(join(HERE, 'styles.css'), 'utf8'));

  console.log('· embutindo fontes e imagens');
  html = html
    .replace('<link rel="stylesheet" href="fonts.css">', `<style>${fonts}</style>`)
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${styles}</style>`);
  html = await inlineAssets(html);

  const htmlPath = join(HERE, `${OUT}.html`);
  await writeFile(htmlPath, html);
  const kb = Math.round((await stat(htmlPath)).size / 1024);
  console.log(`✓ ${OUT}.html  (${kb} KB)`);

  await mkdir(join(HERE, 'preview'), { recursive: true });

  const executablePath = chromiumPath();
  console.log(`· abrindo o Chromium${executablePath ? ` (${executablePath})` : ''}`);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({
    viewport: SLIDE,
    deviceScaleFactor: 2,
  });

  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });

  const slides = await page.locator('.slide').count();

  await page.pdf({
    path: join(HERE, `${OUT}.pdf`),
    width: `${SLIDE.width}px`,
    height: `${SLIDE.height}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: false,
  });

  // Uma imagem por slide, para conferir rápido sem abrir o PDF.
  await page.emulateMedia({ media: 'screen' });
  for (let i = 0; i < slides; i++) {
    const n = String(i + 1).padStart(2, '0');
    await page.locator('.slide').nth(i).screenshot({
      path: join(HERE, 'preview', `slide-${n}.jpg`),
      type: 'jpeg',
      quality: 86,
    });
  }
  console.log(`✓ preview/slide-01..${String(slides).padStart(2, '0')}.jpg`);

  // --- versão leve: uma JPEG por página ---------------------------------
  // Leitor de celular decodifica uma foto e pronto; não precisa desenhar
  // degradê, sombra nem máscara. É a cópia que vai por e-mail e WhatsApp.
  const lightPage = await browser.newPage({
    viewport: SLIDE,
    deviceScaleFactor: LIGHT_SCALE,
  });
  await lightPage.setContent(html, { waitUntil: 'load' });
  await lightPage.evaluate(() => document.fonts.ready);
  await lightPage.emulateMedia({ media: 'print' });

  const frames = [];
  for (let i = 0; i < slides; i++) {
    frames.push(await lightPage.locator('.slide').nth(i).screenshot({
      type: 'jpeg',
      quality: LIGHT_QUALITY,
    }));
  }
  await writeFile(join(HERE, `${OUT}-leve.pdf`),
    jpegPdf(frames, { width: SLIDE.width * 0.75, height: SLIDE.height * 0.75 }));

  await browser.close();

  const mb = async (f) => ((await stat(join(HERE, f))).size / 1024 / 1024).toFixed(1);
  console.log(`✓ ${OUT}.pdf       ${await mb(`${OUT}.pdf`)} MB — texto selecionável`);
  console.log(`✓ ${OUT}-leve.pdf  ${await mb(`${OUT}-leve.pdf`)} MB — abre em qualquer aparelho`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
