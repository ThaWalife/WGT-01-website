/* Prova: Dither, Halftone e ASCII sulla foto del visitatore. Tutto resta nel browser. */
import { loadImage, renderStyle, forgetImage } from '../engines.js';
import { photo } from '../main.js';

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
  const st = { style: 'dither', density: 6, contrast: 10, brightness: 0, colors: 'carta', method: 'atkinson', name: 'astronauta' };
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
      contrast: st.contrast / 100, brightness: st.brightness / 200,
    });
    dl.disabled = false;
  }

  async function use(src, name, isUpload) {
    status.textContent = 'Carico l’immagine…';
    try {
      const next = await loadImage(src);
      if (img) forgetImage(img);
      img = next;
      st.name = name;
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

  use(photo('astronauta'), 'astronauta', false);
}
