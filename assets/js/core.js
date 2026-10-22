/* WGT-01 · funzioni condivise dagli effetti (nessun effetto collaterale: si può importare da ovunque) */
const root = document.documentElement.dataset.root || './';
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

