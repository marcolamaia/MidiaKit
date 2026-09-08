/**
 * Confere se algum slide estoura a área útil (1440 x 810, menos o rodapé).
 * Uso: node apresentacao/_check.mjs
 */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SAFE_BOTTOM = 738; // 810 - padding-bottom do .pad
const SAFE_RIGHT = 1440;

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium']
  .find((p) => existsSync(p));

const html = await readFile(
  new URL('./media-kit-marcos-maia-2026.html', import.meta.url), 'utf8');

const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const rows = await page.evaluate(({ SAFE_BOTTOM, SAFE_RIGHT }) => {
  const out = [];
  document.querySelectorAll('.slide').forEach((slide, i) => {
    const box = slide.getBoundingClientRect();
    let bottom = 0, right = 0, culprit = '';
    slide.querySelectorAll('*').forEach((el) => {
      if (el.closest('.foot') || el.closest('.bleed') || el.classList.contains('bleed')) return;
      if (el.classList.contains('rail') || el.classList.contains('pad')) return;
      if (el.closest('.rail')) return;
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width) return;
      const b = r.bottom - box.top;
      if (b > bottom) { bottom = b; culprit = el.className || el.tagName; }
      right = Math.max(right, r.right - box.left);
    });
    out.push({
      slide: i + 1,
      bottom: Math.round(bottom),
      sobra: Math.round(SAFE_BOTTOM - bottom),
      largura: Math.round(right),
      status: bottom > SAFE_BOTTOM || right > SAFE_RIGHT ? '✗ ESTOURA' : 'ok',
      elemento: String(culprit).slice(0, 34),
    });
  });
  return out;
}, { SAFE_BOTTOM, SAFE_RIGHT });

console.table(rows);
const bad = rows.filter((r) => r.status !== 'ok');
console.log(bad.length ? `\n${bad.length} slide(s) estourando.` : '\nTodos os slides cabem.');
await browser.close();
process.exit(bad.length ? 1 : 0);
