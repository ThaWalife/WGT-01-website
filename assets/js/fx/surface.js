/* Pattern: una superficie di elementi che ondeggia su tutto lo sfondo della sezione.
   La dimensione di ogni elemento segue il tono della foto.
   L'elemento si sceglie dal pannello, oppure si carica un PNG/SVG proprio. */
import { loadImage, getPixels, gray } from '../engines.js';
import { fitCanvas, photo, loop, reduceMotion } from '../core.js';

const SHAPES = {
  punto(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); },
  quadrato(c, x, y, r) { const k = r * 0.89; c.rect(x - k, y - k, k * 2, k * 2); },
  croce(c, x, y, r) { const t = r * 0.42; c.rect(x - r, y - t, r * 2, t * 2); c.rect(x - t, y - r, t * 2, r * 2); },
  triangolo(c, x, y, r) { c.moveTo(x, y - r * 1.15); c.lineTo(x + r, y + r * 0.75); c.lineTo(x - r, y + r * 0.75); c.closePath(); },
  anello(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); c.moveTo(x + r * 0.5, y); c.arc(x, y, r * 0.5, 0, Math.PI * 2, true); },
};

export default async function surface(el) {
  const canvas = el.querySelector('canvas.surface');
  const chips = [...el.querySelectorAll('[data-shape]')];
  const fileBtn = el.querySelector('[data-custom]');
  const fileIn = el.querySelector('[data-custom-file]');
  const fileName = el.querySelector('[data-custom-name]');
  const title = el.querySelector('[data-elsh-target]');
  const img = await loadImage(photo(el.dataset.photo || 'astronauta'));
  const NX = 84, NZ = 56;
  const g = gray(getPixels(img, NX, NZ), { contrast: 0.55 });
  let shape = 'punto', custom = null, time = 0;

  /* Gli elementi vengono preparati una volta come piccole immagini (una per misura)
     e poi solo "timbrati": molto più leggero che ridisegnare ogni forma a ogni fotogramma. */
  const BUCKETS = 28, RMAX = 26;
  let sprites = [];
  const rOf = (b) => 0.6 + (RMAX - 0.6) * Math.pow(b / (BUCKETS - 1), 1.6);
  function buildSprites() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    sprites = Array.from({ length: BUCKETS }, (_, b) => {
      const r = rOf(b) * dpr, size = Math.ceil(r * 2.6) + 2;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d');
      const m = size / 2;
      if (custom) x.drawImage(custom, m - r, m - r, r * 2, r * 2);
      else { const p = new Path2D(); SHAPES[shape](p, m, m, r); x.fillStyle = '#000'; x.fill(p, 'evenodd'); }
      return { c, m, r };
    });
  }

  function frame() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.25);
    ctx.clearRect(0, 0, W, H);
    const f = W, zc = 2.2, Z = 4.2, cam = 1;
    const pn = f / zc, pf = f / (zc + Z);
    const k = (1.06 * H) / ((pn - pf) * cam), a = 1.03 * H - k * cam * pn;
    const rMaxPx = RMAX * dpr;
    for (let j = NZ - 1; j >= 0; j--) {
      const z = (j / (NZ - 1)) * Z;
      const p = f / (z + zc);
      for (let i = 0; i < NX; i++) {
        const x = (i / (NX - 1) - 0.5) * 7;
        const sx = W / 2 + x * p;
        if (sx < -40 || sx > W + 40) continue;
        const y = 0.08 * Math.sin(x * 1.5 + time * 0.8) * Math.cos(z * 1.1 - time * 0.55) + 0.035 * Math.sin((x + z) * 3 - time * 1.2);
        const sy = a + (cam - y) * p * k;
        const l = g[(NZ - 1 - j) * NX + i];
        const r = Math.min(rMaxPx, (1 - l) * 0.016 * p + 0.0012 * p);
        if (r < 0.6) continue;
        // misura più vicina tra quelle preparate
        let b = Math.round(Math.pow(Math.max(0, (r / dpr - 0.6) / (RMAX - 0.6)), 1 / 1.6) * (BUCKETS - 1));
        b = Math.max(0, Math.min(BUCKETS - 1, b));
        const sp = sprites[b];
        ctx.drawImage(sp.c, sx - sp.m, sy - sp.m);
      }
    }
  }
  buildSprites();

  let acc = 0;
  const anim = loop(canvas, (dt) => { acc += dt; if (acc < 1 / 30) return; time += acc; acc = 0; frame(); });
  frame();
  anim.kick();

  const press = (b) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    fileBtn?.setAttribute('aria-pressed', String(fileBtn === b));
    if (title && b?.dataset.elsh) title.style.setProperty('--elsh', b.dataset.elsh);
  };
  chips.forEach((b) => b.addEventListener('click', () => { shape = b.dataset.shape; custom = null; buildSprites(); press(b); frame(); }));

  fileBtn?.addEventListener('click', () => fileIn.click());
  fileIn?.addEventListener('change', async () => {
    const file = fileIn.files[0];
    if (!file) return;
    if (!/^image\/(png|svg\+xml|jpeg|webp)$/.test(file.type)) { fileName.textContent = 'Serve un PNG o un SVG.'; return; }
    try {
      const url = URL.createObjectURL(file);
      const im = await loadImage(url);
      // l'elemento viene preparato una volta a 128 px, così il disegno resta veloce
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d');
      const iw = im.naturalWidth || 128, ih = im.naturalHeight || 128, s = 128 / Math.max(iw, ih);
      x.drawImage(im, (128 - iw * s) / 2, (128 - ih * s) / 2, iw * s, ih * s);
      URL.revokeObjectURL(url);
      custom = c;
      buildSprites();
      fileName.textContent = file.name;
      press(fileBtn);
      frame();
    } catch {
      fileName.textContent = 'Questo file non si apre: prova con un altro PNG o SVG.';
    }
  });
  if (reduceMotion) new ResizeObserver(() => frame()).observe(canvas);
}
