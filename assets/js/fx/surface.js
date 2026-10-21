/* Pattern: una superficie di elementi che ondeggia. La dimensione segue il tono della foto. */
import { loadImage, getPixels, gray } from '../engines.js';
import { fitCanvas, photo, loop, reduceMotion } from '../main.js';

const SHAPES = {
  punto(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); },
  quadrato(c, x, y, r) { const k = r * 0.89; c.rect(x - k, y - k, k * 2, k * 2); },
  croce(c, x, y, r) { const t = r * 0.42; c.rect(x - r, y - t, r * 2, t * 2); c.rect(x - t, y - r, t * 2, r * 2); },
  triangolo(c, x, y, r) { c.moveTo(x, y - r * 1.15); c.lineTo(x + r, y + r * 0.75); c.lineTo(x - r, y + r * 0.75); c.closePath(); },
  anello(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); c.moveTo(x + r * 0.5, y); c.arc(x, y, r * 0.5, 0, Math.PI * 2, true); },
};

export default async function surface(el) {
  const canvas = el.querySelector('canvas');
  const chips = [...el.querySelectorAll('[data-shape]')];
  const byTone = el.querySelector('[data-bytone]');
  const img = await loadImage(photo(el.dataset.photo || 'caffe'));
  const NX = 70, NZ = 46;
  const g = gray(getPixels(img, NX, NZ), { contrast: 0.55 });
  let shape = 'punto', tone = false, time = 0;

  function frame() {
    const { ctx, W, H } = fitCanvas(canvas, 1.75);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getComputedStyle(el).color;
    const f = W * 1.25, zc = 4, cam = 1.25;
    const paths = { punto: new Path2D(), quadrato: new Path2D(), croce: new Path2D() };
    const single = new Path2D();
    for (let j = NZ - 1; j >= 0; j--) {
      const z = (j / (NZ - 1)) * 3.4;
      for (let i = 0; i < NX; i++) {
        const x = (i / (NX - 1) - 0.5) * 4.4;
        const y = 0.09 * Math.sin(x * 1.7 + time * 0.9) * Math.cos(z * 1.2 - time * 0.6) + 0.04 * Math.sin((x + z) * 3.1 - time * 1.3);
        const p = f / (z + zc);
        const sx = W / 2 + x * p, sy = -H * 0.8 + (cam - y) * p * 3.1;
        const l = g[(NZ - 1 - j) * NX + i];
        const r = (1 - l) * 0.017 * p + 0.0015 * p;
        if (r < 0.5) continue;
        if (tone) {
          const k = l < 0.33 ? 'quadrato' : l < 0.66 ? 'punto' : 'croce';
          SHAPES[k](paths[k], sx, sy, r);
        } else SHAPES[shape](single, sx, sy, r);
      }
    }
    if (tone) Object.values(paths).forEach((p) => ctx.fill(p, 'evenodd'));
    else ctx.fill(single, 'evenodd');
  }

  const anim = loop(canvas, (dt) => { time += dt; frame(); });
  frame();
  anim.kick();
  chips.forEach((b) =>
    b.addEventListener('click', () => {
      shape = b.dataset.shape;
      tone = false;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      if (byTone) byTone.setAttribute('aria-pressed', 'false');
      frame();
    })
  );
  byTone?.addEventListener('click', () => {
    tone = byTone.getAttribute('aria-pressed') !== 'true';
    byTone.setAttribute('aria-pressed', String(tone));
    chips.forEach((c) => c.setAttribute('aria-pressed', String(!tone && c.dataset.shape === shape)));
    frame();
  });
  if (reduceMotion) new ResizeObserver(() => frame()).observe(canvas);
}
