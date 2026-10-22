/* Immagini ferme: uno stile applicato a una foto, disegnato quando entra nello schermo.
   <canvas data-fx="still" data-style="halftone" data-photo="example-2" data-ink="#fff" data-paper="#000"> */
import { loadImage, renderStyle } from '../engines.js';
import { fitCanvas, photo } from '../core.js';
import { presetFor } from './gallery.js';

export default async function still(canvas) {
  const img = await loadImage(photo(canvas.dataset.photo || 'example-1'));
  const draw = () => {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    const extra = canvas.dataset.opts ? JSON.parse(canvas.dataset.opts) : {};
    const o = { ...presetFor(canvas.dataset.style, dpr), ...extra };
    for (const k of ['cell', 'res', 'width', 'line']) if (extra[k]) o[k] = extra[k] * dpr;
    renderStyle(canvas.dataset.style, ctx, img, W, H, {
      ink: canvas.dataset.ink || '#000000', paper: canvas.dataset.paper || '#ffffff', autoLevels: true, ...o,
    });
  };
  draw();
  let lastW = canvas.clientWidth;
  new ResizeObserver(() => { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; draw(); } }).observe(canvas);
}
