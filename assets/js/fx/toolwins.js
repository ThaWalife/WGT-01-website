/* "Un pannello, tre strumenti": tre schede che presentano gli strumenti.
   Non si provano qui: le immagini cambiano da sole per mostrare cosa fa ognuno. */
import { loadImage, getPixels, gray, renderStyle } from '../engines.js';
import { fitCanvas, photo, loop, reduceMotion, t } from '../core.js';
import { presetFor, HOME_SCALE } from './gallery.js';
import { applyPalette } from './palette.js';

const STILI = [['curve', t('Curve di livello', 'Contour lines')], ['flusso', t('Linee di flusso', 'Flow lines')], ['halftone', 'Halftone'], ['incisione', t('Incisione', 'Engraving')], ['dither', 'Dither']];
const ARCH = [['asse', t('Asse centrale', 'Centre axis')], ['bandiera', t('Bandiera a sinistra', 'Flush left')], ['gigante', t('Titolo gigante', 'Giant title')], ['colonna', t('Colonna laterale', 'Side column')], ['calma', t('Zona calma', 'Quiet zone')], ['striscia', t('Striscia', 'Band')]];

export default async function tools(section) {
  const pat = section.querySelector('[data-show="pattern"]');
  const sti = section.querySelector('[data-show="stili"]');
  const typ = section.querySelector('[data-show="type"]');
  const [clock, figure] = await Promise.all([loadImage(photo('example-4')), loadImage(photo('example-3'))]);

  function drawPattern() {
    const canvas = pat.querySelector('canvas');
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    const step = 17 * dpr;
    const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
    const g = gray(getPixels(clock, cols, rows, W / H), { contrast: 0.35, autoLevels: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const p = new Path2D();
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const r = step * 0.6 * (1 - g[y * cols + x]);
        if (r < dpr) continue;
        const cx = x * step + step / 2 + (y & 1 ? step / 2 : 0), cy = y * step + step / 2, t = r * 0.36;
        p.rect(cx - r, cy - t, r * 2, t * 2); p.rect(cx - t, cy - r, t * 2, r * 2);
      }
    ctx.fillStyle = '#000'; ctx.fill(p, 'nonzero');
  }

  let si = 0, ai = 0;
  function drawStili() {
    const canvas = sti.querySelector('canvas');
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    const [id, name] = STILI[si];
    renderStyle(id, ctx, figure, W, H, { ink: '#000000', paper: '#ffffff', autoLevels: true, ...presetFor(id, dpr * HOME_SCALE) });
    sti.querySelector('[data-now]').textContent = name;
  }
  function setArch() {
    typ.querySelector('.poster').dataset.a = ARCH[ai][0];
    typ.querySelector('[data-now]').textContent = ARCH[ai][1];
  }

  applyPalette(typ.querySelector('.poster'));
  drawPattern(); drawStili(); setArch();
  if (!reduceMotion) {
    let acc = 0;
    loop(section, (dt) => {
      acc += dt;
      if (acc < 2.4) return;
      acc = 0;
      si = (si + 1) % STILI.length; ai = (ai + 1) % ARCH.length;
      drawStili(); setArch();
    }).kick();
  }
  let lastW = 0;
  new ResizeObserver(() => {
    const w = pat.clientWidth;
    if (w && w !== lastW) { lastW = w; drawPattern(); drawStili(); }
  }).observe(pat);
}
