/* Prova: Dither, Halftone e ASCII sulla foto del visitatore. Tutto resta nel browser. */
import { loadImage, renderStyle, forgetImage } from '../engines.js';
import { photo } from '../core.js';

const MAX = 1200;
const COLORS = {
  carta: { ink: '#000000', paper: '#ffffff' },
  notte: { ink: '#ffffff', paper: '#000000' },
  verde: { ink: '#087744', paper: '#f4f1e8' },
};

export default async function demo(el) {
  const out = el.querySelector('canvas[data-out]');
  const input = el.querySelector('input[type="file"]');
  const drop = el.querySelector('.drop');
  const status = el.querySelector('[data-status]');
  const dl = el.querySelector('[data-download]');
  const methodField = el.querySelector('[data-method-field]');
  const st = { style: 'dither', density: 6, contrast: 10, brightness: 0, colors: 'carta', method: 'atkinson', name: 'example-1' };
  let img = null, objectUrl = null, raf = 0;

  const bind = (sel, key, num) => {
    const elx = el.querySelector(sel);
    const outv = el.querySelector(`[data-value="${key}"]`);
    elx.addEventListener('input', () => {
      st[key] = num ? Number(elx.value) : elx.value;
      if (outv) outv.textContent = elx.value;
      schedule();
    });
  };
  bind('#d-density', 'density', true);
  bind('#d-contrast', 'contrast', true);
  bind('#d-brightness', 'brightness', true);

  for (const group of el.querySelectorAll('[data-group]')) {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      st[group.dataset.group] = b.dataset.v;
      group.querySelectorAll('button[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      methodField.hidden = st.style !== 'dither';
      schedule();
    });
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }

  function draw() {
    if (!img) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = MAX / Math.max(iw, ih);
    const W = Math.round(iw * s), H = Math.round(ih * s);
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    const d = st.density; // 1 = grossa, 10 = fine
    const k = (a, b) => a + ((b - a) * (d - 1)) / 9;
    const cell = st.style === 'dither' ? k(9, 1.5) : st.style === 'halftone' ? k(30, 6) : k(26, 7);
    renderStyle(st.style, ctx, img, W, H, {
      ...COLORS[st.colors], cell, method: st.method, angle: 45,
      contrast: st.contrast / 100, brightness: st.brightness / 200, autoLevels: !!st.sample,
    });
    watermark(ctx, W, H);
    dl.disabled = false;
  }

  /* Filigrana: resta anche nel PNG scaricato. La versione pulita è nel plugin. */
  function watermark(ctx, W, H) {
    const u = Math.max(W, H) / 1200;
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; // metà della visibilità di prima (richiesta di Wally)
    ctx.font = `800 ${Math.round(46 * u)}px "Handjet", "Martian Mono", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 7);
    const text = 'WGT-01 · ANTEPRIMA · ';
    const tw = ctx.measureText(text).width;
    const R = Math.hypot(W, H);
    for (let y = -R / 2, k = 0; y < R / 2; y += 120 * u, k++)
      for (let x = -R / 2 - (k % 2) * tw / 2; x < R / 2; x += tw) ctx.fillText(text, x, y);
    ctx.restore();
    // targhetta piena in basso, sempre leggibile
    const pad = 14 * u, fs = Math.round(17 * u);
    ctx.save();
    ctx.font = `600 ${fs}px "Martian Mono", monospace`;
    const label = 'Anteprima di WGT-01 — la versione pulita è nel plugin';
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = '#0d9e5a';
    ctx.fillRect(0, H - fs - pad * 2, lw + pad * 2, fs + pad * 2);
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad, H - pad - fs / 2);
    ctx.restore();
  }

  async function use(src, name, isUpload) {
    status.textContent = 'Carico l’immagine…';
    try {
      const next = await loadImage(src);
      if (img) forgetImage(img);
      img = next;
      st.name = name;
      st.sample = !isUpload; // le foto di esempio sono render scuri: livelli automatici
      status.textContent = isUpload ? `Stai usando la tua foto: ${name}` : 'Stai usando una foto di esempio.';
      draw();
    } catch {
      status.textContent = 'Questo file non si apre come immagine. Prova con un JPG, PNG o WebP.';
    }
  }

  function takeFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { status.textContent = 'Serve un’immagine: JPG, PNG o WebP.'; return; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    use(objectUrl, file.name, true);
  }

  input.addEventListener('change', () => takeFile(input.files[0]));
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); takeFile(e.dataTransfer.files[0]); });
  window.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) takeFile(f);
  });

  el.querySelectorAll('[data-sample]').forEach((b) =>
    b.addEventListener('click', () => use(photo(b.dataset.sample), b.dataset.sample, false))
  );

  dl.addEventListener('click', () => {
    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const base = st.name.replace(/\.[a-z0-9]+$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'immagine';
      const a = Object.assign(document.createElement('a'), { href: url, download: `wgt-01-${st.style}-${base}.png` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  });

  try { await Promise.all([document.fonts.load('800 40px "Handjet"'), document.fonts.load('600 16px "Martian Mono"')]); } catch {}
  use(photo('example-1'), 'example-1', false);
}
