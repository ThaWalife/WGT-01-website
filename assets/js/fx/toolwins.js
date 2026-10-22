/* Sezione "un pannello, tre strumenti": tre finestre che mostrano davvero cosa fa
   ogni strumento. Pattern posa elementi in base al tono, Stili ridisegna la foto,
   Type impagina lo stesso testo in sei composizioni. */
import { loadImage, getPixels, gray, renderStyle } from '../engines.js';
import { fitCanvas, photo, loop, reduceMotion } from '../main.js';
import { presetFor } from './gallery.js';

const SHAPE = {
  punto(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); },
  quadrato(c, x, y, r) { const k = r * 0.86; c.rect(x - k, y - k, k * 2, k * 2); },
  croce(c, x, y, r) { const t = r * 0.38; c.rect(x - r, y - t, r * 2, t * 2); c.rect(x - t, y - r, t * 2, r * 2); },
  foglia(c, x, y, r) { c.moveTo(x, y - r); c.quadraticCurveTo(x + r, y, x, y + r); c.quadraticCurveTo(x - r, y, x, y - r); },
};

async function patternWin(win) {
  const canvas = win.querySelector('canvas');
  const btns = [...win.querySelectorAll('[data-el]')];
  const count = win.querySelector('[data-count]');
  const img = await loadImage(photo('hopper'));
  let el = 'croce';
  const draw = () => {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    const step = 9 * dpr;
    const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
    const g = gray(getPixels(img, cols, rows), { contrast: 0.35 });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const p = new Path2D();
    let n = 0;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const r = step * 0.62 * (1 - g[y * cols + x]);
        if (r < 0.9 * dpr) continue;
        SHAPE[el](p, x * step + step / 2 + (y & 1 ? step / 2 : 0), y * step + step / 2, r);
        n++;
      }
    ctx.fillStyle = '#000'; ctx.fill(p, 'evenodd');
    if (count) count.textContent = n.toLocaleString('it-IT') + ' elementi';
  };
  draw();
  btns.forEach((b) => b.addEventListener('click', () => {
    el = b.dataset.el;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));
  new ResizeObserver(() => draw()).observe(canvas);
}

async function stiliWin(win) {
  const canvas = win.querySelector('canvas');
  const btns = [...win.querySelectorAll('[data-st]')];
  const svg = win.querySelector('[data-svgstate]');
  const img = await loadImage(photo('fotografo'));
  let id = 'curve';
  const draw = () => {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    renderStyle(id, ctx, img, W, H, { ink: '#000000', paper: '#ffffff', ...presetFor(id, dpr) });
    const b = btns.find((x) => x.dataset.st === id);
    if (svg) svg.textContent = b.dataset.svg === '1' ? 'esportabile in SVG' : 'solo raster';
  };
  draw();
  btns.forEach((b) => b.addEventListener('click', () => {
    id = b.dataset.st;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));
  let lastW = canvas.clientWidth;
  new ResizeObserver(() => { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; draw(); } }).observe(canvas);
}

const ARCH = [
  ['asse', 'Asse centrale'], ['bandiera', 'Bandiera a sinistra'], ['gigante', 'Titolo gigante'],
  ['colonna', 'Colonna laterale'], ['calma', 'Zona calma'], ['striscia', 'Striscia'],
];
function typeWin(win) {
  const poster = win.querySelector('.poster');
  const name = win.querySelector('[data-arch]');
  const playBtn = win.querySelector('[data-play]');
  let i = 0, acc = 0, playing = !reduceMotion;
  const set = () => { poster.dataset.a = ARCH[i][0]; name.textContent = `${i + 1}/6 · ${ARCH[i][1]}`; };
  set();
  poster.addEventListener('click', () => { i = (i + 1) % ARCH.length; set(); acc = 0; });
  playBtn?.addEventListener('click', () => {
    playing = !playing;
    playBtn.setAttribute('aria-pressed', String(!playing));
    playBtn.textContent = playing ? 'Pausa' : 'Riprendi';
  });
  if (playBtn && !playing) { playBtn.setAttribute('aria-pressed', 'true'); playBtn.textContent = 'Riprendi'; }
  loop(poster, (dt) => {
    if (!playing) return;
    acc += dt;
    if (acc > 2.2) { acc = 0; i = (i + 1) % ARCH.length; set(); }
  }).kick();
}

export default function tools(section) {
  const w = (k) => section.querySelector(`[data-tool="${k}"]`);
  patternWin(w('pattern'));
  stiliWin(w('stili'));
  typeWin(w('type'));
}
