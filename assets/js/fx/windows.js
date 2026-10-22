/* Finestre: ogni .win e ogni .panel ha una barra del titolo con il tasto "riduci".
   Dentro una .desk (solo su schermi larghi) le finestre si trascinano dalla barra
   e quella che tocchi passa davanti. */
let zTop = 10;

export function enhance(win) {
  if (win.__win) return;
  win.__win = true;
  const bar = win.querySelector(':scope > .win__bar, :scope > .panel__bar');
  if (!bar) return;
  const body = [...win.children].filter((c) => c !== bar);
  const id = 'w' + Math.random().toString(36).slice(2, 8);
  body.forEach((b, i) => { if (!b.id) b.id = id + i; });
  const ctrl = document.createElement('span');
  ctrl.className = 'win__ctrl';
  const min = document.createElement('button');
  min.type = 'button';
  min.textContent = '–';
  min.setAttribute('aria-expanded', 'true');
  min.setAttribute('aria-controls', body.map((b) => b.id).join(' '));
  min.setAttribute('aria-label', 'Riduci la finestra');
  min.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = win.classList.toggle('is-min');
    min.setAttribute('aria-expanded', String(!on));
    min.setAttribute('aria-label', on ? 'Apri la finestra' : 'Riduci la finestra');
    min.textContent = on ? '+' : '–';
  });
  ctrl.append(min);
  bar.append(ctrl);

  const desk = win.closest('.desk');
  if (!desk) return;
  win.addEventListener('pointerdown', () => { win.style.zIndex = ++zTop; });
  let drag = null;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || !matchMedia('(min-width: 901px)').matches) return;
    const r = win.getBoundingClientRect(), d = desk.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, d };
    bar.setPointerCapture(e.pointerId);
    win.classList.add('is-drag');
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { d } = drag;
    const x = Math.max(-win.offsetWidth * 0.6, Math.min(d.width - win.offsetWidth * 0.4, e.clientX - d.left - drag.dx));
    const y = Math.max(0, Math.min(d.height - 40, e.clientY - d.top - drag.dy));
    win.style.left = x + 'px';
    win.style.top = y + 'px';
    win.style.right = 'auto';
  });
  const end = () => { drag = null; win.classList.remove('is-drag'); };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
}

export function enhanceAll(rootEl = document) {
  rootEl.querySelectorAll('.win, .panel').forEach(enhance);
}
