/* WGT-01 · avvio: bande di dither tra i toni e caricamento pigro degli effetti */
import { BAYER8, hexToRgb } from './engines.js';
import { t } from './core.js';

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

/* Newsletter: nessuno script di MailerLite; l'email parte solo all'invio del modulo. */
function newsletter() {
  for (const form of document.querySelectorAll('form[data-newsletter]')) {
    const msg = form.querySelector('[data-nl-msg]');
    const btn = form.querySelector('button[type="submit"]');
    const say = (txt, ok) => { msg.textContent = txt; msg.dataset.state = ok ? 'ok' : 'err'; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]');
      if (!email.checkValidity()) { say(t('Controlla l’indirizzo email.', 'Please check the email address.'), false); email.focus(); return; }
      btn.disabled = true; say(t('Invio…', 'Sending…'), true);
      const body = new FormData(form);
      let ok = false;
      try {
        const r = await fetch(form.action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        const j = await r.json().catch(() => ({}));
        ok = r.ok && j.success !== false;
      } catch { ok = false; }
      btn.disabled = false;
      if (ok) {
        form.reset();
        say(t('Quasi fatto: controlla la posta e conferma l’iscrizione dal link che ti ho mandato.', 'Almost done: check your inbox and confirm with the link I just sent you.'), true);
      } else {
        say(t('Non è andata: riprova tra poco.', 'That didn’t work: please try again shortly.'), false);
      }
    });
  }
}

makeBands();
lazyInit();
newsletter();
