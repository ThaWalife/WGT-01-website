/* WGT-01 · avvio: bande di dither tra i toni e caricamento pigro degli effetti */
import { BAYER8, hexToRgb } from './engines.js';

const root = document.documentElement.dataset.root || './';
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Bande: un gradino di grigio che passa al successivo con un dither ordinato 8×8. */
function makeBands() {
  for (const el of document.querySelectorAll('.band[data-from][data-to]')) {
    const a = hexToRgb(el.dataset.from), b = hexToRgb(el.dataset.to);
    const rows = 16, cols = 8;
    const c = document.createElement('canvas');
    c.width = cols; c.height = rows;
    const x = c.getContext('2d');
    const im = x.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
      const t = (y + 0.5) / rows;
      for (let i = 0; i < cols; i++) {
        const th = (BAYER8[(y & 7) * 8 + i] + 0.5) / 64;
        const col = th < t ? b : a;
        const j = (y * cols + i) * 4;
        im.data[j] = col[0]; im.data[j + 1] = col[1]; im.data[j + 2] = col[2]; im.data[j + 3] = 255;
      }
    }
    x.putImageData(im, 0, 0);
    el.style.backgroundImage = `url(${c.toDataURL()})`;
    el.setAttribute('aria-hidden', 'true');
  }
}

/* Canvas alla risoluzione dello schermo (massimo 2×, per restare leggeri). */
export function fitCanvas(canvas, maxDpr = 2) {
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
  const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : maxDpr);
  const r = canvas.getBoundingClientRect();
  const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  return { ctx: canvas.getContext('2d'), W, H, dpr };
}

export const photo = (name) => `${root}assets/img/demo/${name}.jpg`;

/* Un ciclo di animazione che gira solo quando l'elemento è visibile e la scheda è attiva. */
export function loop(el, frame) {
  let visible = false, raf = 0, last = 0;
  const tick = (t) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    frame(dt, t / 1000);
    raf = requestAnimationFrame(tick);
  };
  const go = () => { if (!raf && visible && !document.hidden && !reduceMotion) { last = 0; raf = requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }, { rootMargin: '80px' }).observe(el);
  document.addEventListener('visibilitychange', go);
  return { kick: go };
}

const modules = {
  hero: () => import('./fx/hero.js'),
  surface: () => import('./fx/surface.js'),
  tools: () => import('./fx/toolwins.js'),
  vector: () => import('./fx/vector.js'),
  gallery: () => import('./fx/gallery.js'),
  poster: () => import('./fx/poster.js'),
  still: () => import('./fx/still.js'),
  demo: () => import('./fx/demo.js'),
};

function lazyInit() {
  const els = [...document.querySelectorAll('[data-fx]')];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const load = modules[e.target.dataset.fx];
      if (load) load().then((m) => m.default(e.target)).catch((err) => console.error('[WGT-01]', err));
    }
  }, { rootMargin: '400px 0px' });
  els.forEach((el) => io.observe(el));
}

makeBands();
lazyInit();
