/* "Stili": la parola disegnata da un algoritmo diverso ogni poco. */
import { renderStyle } from '../engines.js';
import { fitCanvas, loop, reduceMotion } from '../main.js';
import { presetFor } from './gallery.js';

const SEQ = [
  ['dither', 'Dither', { cell: 3, method: 'bayer' }],
  ['halftone', 'Halftone', { cell: 7, angle: 30 }],
  ['ascii', 'ASCII', { cell: 8 }],
  ['curve', 'Curve di livello', { res: 2, levels: 9, line: 1.2 }],
  ['incisione', 'Incisione', { cell: 5, wave: 1, crosshatch: false, angle: 0 }],
  ['flusso', 'Linee di flusso', { cell: 3, width: 2.4 }],
  ['glitch', 'Glitch', { amount: 1, rgb: 0 }],
];

export default async function wordfx(el) {
  const canvas = el.querySelector('canvas');
  const nameEl = el.querySelector('[data-wordfx-name]');
  const word = el.dataset.word || 'Stili';
  try { await document.fonts.load('900 200px "Doto"'); } catch {}
  let i = 0, acc = 0;
  let src = null, srcKey = '';

  function source(W, H) {
    const key = W + 'x' + H;
    if (src && srcKey === key) return src;
    src = document.createElement('canvas');
    src.width = W; src.height = H;
    const x = src.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#000';
    x.textBaseline = 'alphabetic';
    let size = H * 1.1;
    x.font = `900 ${size}px Doto, "Martian Mono", monospace`;
    const w = x.measureText(word).width;
    if (w > W * 0.98) { size *= (W * 0.98) / w; x.font = `900 ${size}px Doto, "Martian Mono", monospace`; }
    const tw = x.measureText(word).width;
    // la parola come macchia piena: leggermente sfumata così gli stili hanno toni da leggere
    x.filter = `blur(${Math.max(1, size * 0.012)}px)`;
    x.fillText(word, W - tw, H * 0.86);
    x.filter = 'none';
    src.__wgtId = undefined;
    srcKey = key;
    return src;
  }

  function draw() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    const [id, name, opts] = SEQ[i];
    const o = { ...presetFor(id, dpr) };
    for (const [k, v] of Object.entries(opts)) o[k] = ['cell', 'res', 'width', 'line', 'wave', 'rgb'].includes(k) ? v * dpr : v;
    renderStyle(id, ctx, source(W, H), W, H, { ...o, ink: '#000000', paper: '#0d9e5a' });
    if (nameEl) nameEl.textContent = name;
  }

  draw();
  if (reduceMotion) {
    canvas.addEventListener('click', () => { i = (i + 1) % SEQ.length; draw(); });
    return;
  }
  loop(canvas, (dt) => {
    acc += dt;
    if (acc > 1.8) { acc = 0; i = (i + 1) % SEQ.length; draw(); }
  }).kick();
  let lastW = canvas.clientWidth;
  new ResizeObserver(() => { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; draw(); } }).observe(canvas);
}
