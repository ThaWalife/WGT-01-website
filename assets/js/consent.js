/* WGT-01 · consenso ai cookie (linee guida del Garante Privacy, 10 giugno 2021).
   Il sito di per sé non usa cookie: questo script decide solo se caricare i servizi
   facoltativi di terze parti (per ora: il pulsante di pagamento Payhip, quando sarà attivo).
   - La scelta si salva SOLO in questo browser (localStorage, strumento tecnico).
   - "Rifiuta" e la X valgono uguale: nessun servizio facoltativo.
   - La domanda torna dopo 6 mesi, o se cambiano i servizi (VERSION).
   Gli script facoltativi si scrivono così: <script type="text/plain" data-consent="terzi" data-src="…"></script> */
(() => {
  const KEY = 'wgt01-consenso';
  const VERSION = 1;
  const SIX_MONTHS = 1000 * 60 * 60 * 24 * 182;

  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!v || v.v !== VERSION || Date.now() - v.t > SIX_MONTHS) return null;
      return v;
    } catch { return null; }
  };
  const write = (terzi) => {
    const v = { v: VERSION, t: Date.now(), terzi: !!terzi };
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* archiviazione bloccata: la scelta vale per questa visita */ }
    return v;
  };

  function loadOptional(choice) {
    if (!choice || !choice.terzi) return;
    for (const el of document.querySelectorAll('script[type="text/plain"][data-consent="terzi"]')) {
      const s = document.createElement('script');
      s.src = el.dataset.src;
      s.defer = true;
      el.replaceWith(s);
    }
  }

  function syncForms(choice) {
    for (const box of document.querySelectorAll('[data-consent-toggle="terzi"]')) box.checked = !!(choice && choice.terzi);
    for (const out of document.querySelectorAll('[data-consent-state]')) {
      out.textContent = !choice ? 'Non hai ancora scelto.' : choice.terzi
        ? `Hai accettato i servizi di terze parti il ${new Date(choice.t).toLocaleDateString('it-IT')}.`
        : `Hai rifiutato i servizi di terze parti il ${new Date(choice.t).toLocaleDateString('it-IT')}.`;
    }
  }

  function init() {
    const banner = document.querySelector('[data-consent-banner]');
    let choice = read();
    const decide = (terzi) => {
      const had = choice && choice.terzi;
      choice = write(terzi);
      if (banner) banner.hidden = true;
      syncForms(choice);
      if (terzi) loadOptional(choice);
      else if (had) location.reload(); // revoca: si ricarica senza i servizi già avviati
    };

    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-consent]');
      if (!b || b.tagName === 'SCRIPT') return;
      const a = b.dataset.consent;
      if (a === 'accetta') decide(true);
      else if (a === 'rifiuta') decide(false);
      else if (a === 'salva') decide(!!document.querySelector('[data-consent-toggle="terzi"]')?.checked);
      else if (a === 'apri' && banner) { banner.hidden = false; banner.querySelector('button')?.focus(); }
    });

    syncForms(choice);
    if (choice) loadOptional(choice);
    else if (banner) banner.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
