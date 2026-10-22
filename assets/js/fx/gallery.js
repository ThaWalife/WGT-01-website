/* Galleria dei 10 stili: stessa foto, prima e dopo con un cursore. */
import { STYLES, loadImage, renderStyle } from '../engines.js';
import { fitCanvas, photo, t } from '../core.js';

/* Parametri per una resa leggibile alla dimensione della galleria (in pixel CSS).
   In home si usano ingranditi di HOME_SCALE: celle e tratti più grandi, l'algoritmo si legge meglio. */
export const HOME_SCALE = 1.8;
export const PRESET = {
  dither: { cell: 2.5, method: 'atkinson' },
  halftone: { cell: 8, angle: 45 },
  ascii: { cell: 9, contrast: 0.2 },
  mosaico: { cell: 14 },
  incisione: { cell: 6, wave: 2, wavelength: 140, angle: -12 },
  flusso: { cell: 3.4, width: 3, maxLen: 300, smooth: 6 },
  curve: { res: 2.2, levels: 18, line: 1 },
  sfumatura: { stops: ['#06140d', '#087744', '#35b978', '#f2e9c9'] },
  glitch: { amount: 0.75, rgb: 8 },
  pixelsort: { lo: 0.3, hi: 0.9 },
};

export function presetFor(id, dpr) {
  const p = { ...(PRESET[id] || {}) };
  for (const k of ['cell', 'width', 'line', 'res', 'rgb']) if (p[k]) p[k] *= dpr;
  if (p.wave) p.wave *= dpr;
  if (p.wavelength) p.wavelength *= dpr;
  if (p.maxLen) p.maxLen *= dpr;
  return p;
}

export default async function gallery(el) {
  const list = el.querySelector('[role="tablist"]');
  const frameEl = el.querySelector('.stage__frame');
  const before = el.querySelector('.stage__before');
  const after = el.querySelector('.stage__after');
  const handle = el.querySelector('.stage__handle');
  const note = el.querySelector('[data-note]');
  const nameEl = el.querySelector('[data-style-name]');
  const photoBtns = [...el.querySelectorAll('[data-photo]')];
  const cache = new Map();
  const getImg = (n) => cache.get(n) || (cache.set(n, loadImage(photo(n))), cache.get(n));

  let style = 'dither';
  let photoName = photoBtns.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.photo || 'example-1';
  let token = 0;

  async function render() {
    const my = ++token;
    frameEl.setAttribute('aria-busy', 'true');
    const img = await getImg(photoName);
    if (my !== token) return;
    const b = fitCanvas(before, 1.5);
    const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(b.W / iw, b.H / ih);
    b.ctx.drawImage(img, (b.W - iw * s) / 2, (b.H - ih * s) / 2, iw * s, ih * s);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    if (my !== token) return;
    const a = fitCanvas(after, 1.5);
    renderStyle(style, a.ctx, img, a.W, a.H, { ink: '#000000', paper: '#ffffff', autoLevels: true, ...presetFor(style, a.dpr * HOME_SCALE) });
    frameEl.removeAttribute('aria-busy');
  }

  function select(id, focus) {
    style = id;
    const s = STYLES.find((x) => x.id === id);
    for (const btn of list.querySelectorAll('[role="tab"]')) {
      const on = btn.dataset.style === id;
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      if (on && focus) btn.focus();
    }
    note.textContent = t(s.note, s.noteEn) + (s.svg ? t(' Esportabile in SVG.', ' Exports to SVG.') : '');
    nameEl.textContent = t(s.name, s.nameEn || s.name);
    render();
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('[role="tab"]');
    if (b) select(b.dataset.style);
  });
  list.addEventListener('keydown', (e) => {
    const ids = STYLES.map((s) => s.id);
    const i = ids.indexOf(style);
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); select(ids[(i + d + ids.length) % ids.length], true); }
  });
  photoBtns.forEach((b) =>
    b.addEventListener('click', () => {
      photoName = b.dataset.photo;
      photoBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    })
  );

  /* cursore prima/dopo */
  let split = 50;
  const setSplit = (v) => {
    split = Math.max(0, Math.min(100, v));
    frameEl.style.setProperty('--split', split + '%');
    handle.setAttribute('aria-valuenow', String(Math.round(split)));
  };
  let dragging = false;
  const fromEvent = (e) => {
    const r = frameEl.getBoundingClientRect();
    setSplit(((e.clientX - r.left) / r.width) * 100);
  };
  frameEl.addEventListener('pointerdown', (e) => { dragging = true; frameEl.setPointerCapture(e.pointerId); fromEvent(e); });
  frameEl.addEventListener('pointermove', (e) => dragging && fromEvent(e));
  frameEl.addEventListener('pointerup', () => (dragging = false));
  frameEl.addEventListener('pointercancel', () => (dragging = false));
  handle.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
    if (d !== undefined) { e.preventDefault(); setSplit(split + d); }
  });

  let rt = 0, lastW = frameEl.clientWidth;
  new ResizeObserver(() => {
    if (frameEl.clientWidth === lastW) return;
    lastW = frameEl.clientWidth;
    clearTimeout(rt);
    rt = setTimeout(render, 200);
  }).observe(frameEl);

  setSplit(50);
  select('dither');
}
