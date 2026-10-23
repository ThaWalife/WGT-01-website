#!/usr/bin/env python3
"""
Costruisce il sito WGT-01 (pagine HTML statiche) in due lingue:
  inglese (predefinito) alla radice  ·  italiano sotto /it/
A partire da:
  src/config.json                   nome, versione, Payhip, analytics…
  src/content/<lingua>/ui.json      testi brevi dell'interfaccia (menu, footer, banner)
  src/content/en/strings.json       catalogo: testo italiano dei modelli → testo inglese
  src/content/<lingua>/docs/*.md    documentazione (stessi nomi di file nelle due lingue)
  src/content/<lingua>/cookie.md    pagina cookie e privacy
  src/templates/                    modelli Jinja2: il testo è scritto in italiano dentro _('…')
Uso:  python3 src/build.py
Le pagine generate vanno nella radice del repository (servite da GitHub Pages).
Se nel catalogo manca una traduzione, la build la segnala (e usa l'italiano).
Richiede: jinja2, markdown.
"""
import json, re, shutil, time
from pathlib import Path

import markdown
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
cfg = json.loads((SRC / "config.json").read_text(encoding="utf-8"))
SITE = cfg["site_url"]
BUILD = time.strftime("%Y%m%d%H%M")
env = Environment(loader=FileSystemLoader(str(SRC / "templates")), autoescape=True,
                  trim_blocks=True, lstrip_blocks=True)

LANGS = ["en", "it"]                      # la prima è la predefinita (alla radice)
PREFIX = {"en": "", "it": "it/"}
LOCALE = {"en": "en_GB", "it": "it_IT"}
PATHS = {                                 # sezioni del sito, per lingua
    "home": {"en": "", "it": ""},
    "try": {"en": "try/", "it": "prova/"},
    "docs": {"en": "docs/", "it": "documentazione/"},
    "download": {"en": "download/", "it": "download/"},
    "cookies": {"en": "cookies/", "it": "cookie/"},
    "bot_terms": {"en": "discord-bot/terms/", "it": "discord-bot/termini/"},
    "bot_privacy": {"en": "discord-bot/privacy/", "it": "discord-bot/privacy/"},
}
# nomi delle pagine di documentazione in inglese (chiave = percorso del file, uguale nelle due lingue)
DOC_SLUG_EN = {
    "index": "", "installazione": "installation", "il-pannello": "the-panel", "pattern": "pattern",
    "type": "type", "stili/index": "styles", "stili/dither": "styles/dither", "stili/halftone": "styles/halftone",
    "stili/ascii": "styles/ascii", "stili/mosaico": "styles/mosaic", "stili/incisione": "styles/engraving",
    "stili/linee-di-flusso": "styles/flow-lines", "stili/curve-di-livello": "styles/contour-lines",
    "stili/mappa-sfumatura": "styles/gradient-map", "stili/glitch": "styles/glitch",
    "stili/pixel-sorting": "styles/pixel-sorting", "esporta-svg": "svg-export",
    "modifica-e-livelli": "edit-and-layers", "dev-option": "dev-option", "faq": "faq",
    "licenza": "license", "novita": "changelog", "crediti": "credits",
}
GROUPS = ["Inizia", "Sezioni", "Stili", "Funzioni", "Aiuto"]
GROUP_EN = {"Inizia": "Get started", "Sezioni": "Tools", "Stili": "Styles", "Funzioni": "Features", "Aiuto": "Help"}

STYLES = [
    ("dither", "Dither", "Dither", False), ("halftone", "Halftone", "Halftone", True), ("ascii", "ASCII", "ASCII", False),
    ("mosaico", "Mosaico", "Mosaic", False), ("incisione", "Incisione", "Engraving", True),
    ("flusso", "Linee di flusso", "Flow lines", True), ("curve", "Curve di livello", "Contour lines", True),
    ("sfumatura", "Mappa sfumatura", "Gradient map", False), ("glitch", "Glitch", "Glitch", False),
    ("pixelsort", "Pixel sorting", "Pixel sorting", False),
]
PHOTOS = [
    ("example-1", ("Logo Celestio in rilievo, scena notturna", "Logo"), ("Celestio logo in relief, night scene", "Logo")),
    ("example-2", ("Stanza con piante e quadri luminosi", "Stanza"), ("Room with plants and glowing frames", "Room")),
    ("example-3", ("Figura in blu su un palco", "Figura"), ("Figure in blue on a stage", "Figure")),
    ("example-4", ("Ingranaggi di un orologio in bianco e nero", "Orologio"), ("Clock gears in black and white", "Clock")),
]

CATALOG = json.loads((SRC / "content" / "en" / "strings.json").read_text(encoding="utf-8"))
MISSING = set()
URLS = []   # (url, {lingua: url}) per la sitemap


def tr(lang):
    """La funzione _() dei modelli: il testo è in italiano; in inglese lo cerca nel catalogo."""
    def _(text, **kw):
        out = text
        if lang == "en":
            out = CATALOG.get(text)
            if out is None:
                MISSING.add(text)
                out = text
        for k, v in kw.items():
            out = out.replace("{" + k + "}", str(v))
        return Markup(out)   # il catalogo è nostro: può contenere <b>, <br> ecc.
    return _


def root_for(path):
    depth = path.count("/")
    return "./" if depth == 0 else "../" * depth


def write(path, html):
    f = OUT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html, encoding="utf-8")


def url(key, lang):
    return PREFIX[lang] + PATHS[key][lang]


def doc_url(key, lang):
    """Indirizzo di una pagina di documentazione: key = percorso del file senza .md (es. 'stili/dither')."""
    if lang == "en":
        slug = DOC_SLUG_EN[key]
    else:
        slug = "" if key == "index" else (key[:-6] if key.endswith("/index") else key)
    return url("docs", lang) + (slug + "/" if slug else "")


def ui_for(lang):
    return json.loads((SRC / "content" / lang / "ui.json").read_text(encoding="utf-8"))


AUTHOR = {"@type": "Person", "name": cfg["author"], "url": cfg["home_url"]}


def seo_title(title, lang):
    if lang == "en":
        return f"{title} — {cfg['name']}, Photoshop plugin" if title else \
            f"{cfg['name']} — Generative Photoshop plugin: pattern, dither, halftone and layout"
    return f"{title} — {cfg['name']}, plugin per Photoshop" if title else \
        f"{cfg['name']} — Plugin generativo per Photoshop: pattern, dither, halftone e impaginazione"


def breadcrumb(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}


def render(template, lang, path, alts, **ctx):
    """alts = {lingua: percorso} della stessa pagina nelle due lingue (per il selettore e hreflang)."""
    t = env.get_template(template)
    if not str(ctx.get("robots", "")).startswith("noindex"):
        URLS.append((path.replace("index.html", ""), {k: v.replace("index.html", "") for k, v in alts.items()}))
    ctx.setdefault("seo_title", seo_title(ctx.get("title", ""), lang))
    other = [l for l in LANGS if l != lang][0]
    base = dict(cfg=cfg, ui=ui_for(lang), lang=lang, locale=LOCALE[lang], build=BUILD,
                path=path.replace("index.html", ""), root=root_for(path), _=tr(lang),
                u={k: url(k, lang) for k in PATHS}, doc=lambda k: doc_url(k, lang),
                alts={k: v.replace("index.html", "") for k, v in alts.items()},
                other=other, other_path=alts[other].replace("index.html", ""),
                styles=[dict(id=i, name=(en if lang == "en" else it), svg=s) for i, it, en, s in STYLES],
                photos=[dict(id=i, label=(e if lang == "en" else it_)[0], short=(e if lang == "en" else it_)[1])
                        for i, it_, e in PHOTOS])
    base.update(ctx)
    write(path, t.render(**base))


def front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    meta = {}
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[m.end():]
    return meta, text


def fill(raw):
    for k, v in {"name": cfg["name"], "version": cfg["version"], "photoshop_min": cfg["photoshop_min"],
                 "min_price": cfg["payhip"]["min_price"], "email": cfg["contact_email"]}.items():
        raw = raw.replace("{{" + k + "}}", v)
    return raw


def link_docs(html, lang, root):
    """Nei .md i link interni si scrivono come /doc/<chiave>/, /try/, /download/, /cookies/, /home/."""
    html = re.sub(r'href="/doc/([^"#]*?)/?(#[^"]*)?"',
                  lambda m: f'href="{root}{doc_url(m.group(1) or "index", lang)}{m.group(2) or ""}"', html)
    for key in ("try", "download", "cookies", "docs"):
        html = html.replace(f'href="/{key}/', f'href="{root}{url(key, lang)}')
    for key in ("bot_terms", "bot_privacy"):
        html = html.replace(f'href="/{key.replace("_", "-")}/', f'href="{root}{url(key, lang)}')
    html = html.replace('href="/home/', f'href="{root}{PREFIX[lang]}')
    return html


def docs(lang):
    base = SRC / "content" / lang / "docs"
    pages = []
    for f in sorted(base.rglob("*.md")):
        meta, body = front_matter(fill(f.read_text(encoding="utf-8")))
        key = str(f.relative_to(base).with_suffix("")).replace("\\", "/")
        u = doc_url(key, lang)
        root = root_for(u + "index.html")
        html = markdown.markdown(body, extensions=["tables", "attr_list", "md_in_html", "sane_lists"])
        html = link_docs(html, lang, root)
        group = meta.get("group", "Aiuto")
        pages.append(dict(key=key, title=meta.get("title", key), nav=meta.get("nav", meta.get("title", key)),
                          description=meta.get("description", ""), group=group,
                          group_name=GROUP_EN.get(group, group) if lang == "en" else group,
                          order=float(meta.get("order", 50)), url=u, html=html))
    pages.sort(key=lambda p: (GROUPS.index(p["group"]), p["order"]))
    nav = [dict(name=(GROUP_EN[g] if lang == "en" else g), pages=[p for p in pages if p["group"] == g]) for g in GROUPS]
    nav = [g for g in nav if g["pages"]]
    docs_name = "Documentation" if lang == "en" else "Documentazione"
    for i, p in enumerate(pages):
        crumbs = [(cfg["name"], PREFIX[lang]), (docs_name, url("docs", lang))]
        if p["key"] != "index":
            crumbs.append((p["title"], p["url"]))
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "TechArticle", "headline": p["title"], "description": p["description"], "inLanguage": lang,
             "url": SITE + p["url"], "author": AUTHOR, "about": {"@type": "SoftwareApplication", "name": cfg["name"]}},
            breadcrumb(crumbs)]}
        render("doc.html", lang, p["url"] + "index.html", {l: doc_url(p["key"], l) + "index.html" for l in LANGS},
               title=p["title"], description=p["description"] or f"{docs_name} {cfg['name']}.", page=p, nav=nav,
               section="docs", jsonld=ld, og_type="article",
               prev=pages[i - 1] if i else None, next=pages[i + 1] if i + 1 < len(pages) else None)
    return len(pages)


def pages(lang):
    _ = tr(lang)
    en = lang == "en"
    home_desc = (f"{cfg['name']}, a generative Photoshop plugin: pattern, ten styles such as dither, halftone and ASCII, "
                 "automatic layout and SVG export, all from the greyscale of your image.") if en else \
        (f"{cfg['name']}, plugin generativo per Photoshop: pattern, dieci stili come dither, halftone e ASCII, "
         "impaginazione automatica ed export SVG dalla scala di grigi.")
    app = {"@type": "SoftwareApplication", "name": cfg["name"], "alternateName": cfg["brand"],
           "applicationCategory": "DesignApplication",
           "applicationSubCategory": "Adobe Photoshop plugin" if en else "Plugin per Adobe Photoshop",
           "operatingSystem": "Windows, macOS", "softwareVersion": cfg["version"], "inLanguage": ["en", "it"],
           "softwareRequirements": f"Adobe Photoshop {cfg['photoshop_min']}" + (" or later" if en else " o successivo"),
           "description": home_desc, "url": SITE + PREFIX[lang], "image": SITE + "assets/img/icon-512.png",
           "screenshot": SITE + "assets/img/og.png", "author": AUTHOR,
           "offers": {"@type": "Offer", "price": "1.00", "priceCurrency": "EUR",
                      "description": (f"Pay what you want, from {cfg['payhip']['min_price']}" if en else
                                      f"Donazione libera, minimo {cfg['payhip']['min_price']}")}}
    site = {"@type": "WebSite", "name": cfg["name"], "url": SITE, "inLanguage": lang, "publisher": AUTHOR,
            "image": SITE + "assets/img/icon-512.png"}
    alts = lambda key: {l: url(key, l) + "index.html" for l in LANGS}
    render("home.html", lang, url("home", lang) + "index.html", alts("home"), title="", section="home",
           description=home_desc, jsonld={"@context": "https://schema.org", "@graph": [site, app]})
    render("prova.html", lang, url("try", lang) + "index.html", alts("try"),
           title="Try the styles in your browser" if en else "Prova gli stili nel browser", section="try",
           description=(f"Try {cfg['name']}’s Dither, Halftone and ASCII on your own photo for free, right in the browser: "
                        "no account and no upload, the image stays on your computer.") if en else
           (f"Prova gratis Dither, Halftone e ASCII di {cfg['name']} sulla tua foto, direttamente nel browser: "
            "nessun account e nessun caricamento, l’immagine resta sul tuo computer."),
           jsonld={"@context": "https://schema.org", "@graph": [breadcrumb([(cfg["name"], PREFIX[lang]), ("Try" if en else "Prova", url("try", lang))])]})
    render("download.html", lang, url("download", lang) + "index.html", alts("download"),
           title="Download the plugin" if en else "Scarica il plugin", section="download",
           description=(f"Download {cfg['name']} for Photoshop {cfg['photoshop_min']} or later, on Windows and macOS, "
                        f"with a pay-what-you-want donation from {cfg['payhip']['min_price']} and a personal licence key.") if en else
           (f"Scarica {cfg['name']} per Photoshop {cfg['photoshop_min']} o successivo, su Windows e macOS, "
            f"con una donazione libera da {cfg['payhip']['min_price']} e un codice seriale personale."),
           jsonld={"@context": "https://schema.org", "@graph": [breadcrumb([(cfg["name"], PREFIX[lang]), ("Download" if en else "Scarica", url("download", lang))]), app]})
    raw = fill((SRC / "content" / lang / "cookie.md").read_text(encoding="utf-8"))
    croot = root_for(url("cookies", lang) + "index.html")
    render("cookie.html", lang, url("cookies", lang) + "index.html", alts("cookies"),
           title="Cookies and privacy" if en else "Cookie e privacy", section="cookies",
           body=link_docs(markdown.markdown(raw, extensions=["tables", "attr_list", "sane_lists"]), lang, croot),
           description=(f"Cookies and privacy on the {cfg['name']} website: no profiling cookies, fonts hosted on the site, "
                        "third-party services only with your consent.") if en else
           (f"Cookie e privacy del sito di {cfg['name']}: nessun cookie di profilazione o statistico, font ospitati sul sito, "
            "servizi di terze parti solo con il tuo consenso."))


def bot_pages(lang):
    """Termini e privacy del bot Discord WGT-01 (richiesti dal Discord Developer Portal)."""
    en = lang == "en"
    alts = lambda key: {l: url(key, l) + "index.html" for l in LANGS}
    meta = {
        "bot_terms": dict(
            md="discord-bot-terms.md", file="discord-bot-terms.psd" if en else "bot-discord-termini.psd",
            title="Discord bot Terms of Service" if en else "Termini di servizio del bot Discord",
            kicker="[discord bot · terms]" if en else "[bot discord · termini]",
            lead=("The rules for using WGT-01, the bot of the plugin’s Discord server." if en else
                  "Le regole per usare WGT-01, il bot del server Discord del plugin."),
            description=(f"Terms of Service of WGT-01, the Discord bot of the {cfg['name']} support and news server: "
                         "free and as is, automatic replies, fair use, Discord’s rules and Italian law.") if en else
            (f"Termini di servizio di WGT-01, il bot Discord del server di supporto e notizie di {cfg['name']}: "
             "gratis e così com’è, risposte automatiche, uso corretto, regole di Discord e legge italiana.")),
        "bot_privacy": dict(
            md="discord-bot-privacy.md", file="discord-bot-privacy.psd" if en else "bot-discord-privacy.psd",
            title="Discord bot Privacy Policy" if en else "Privacy Policy del bot Discord",
            kicker="[discord bot · privacy]" if en else "[bot discord · privacy]",
            lead=("What the bot reads, what it stores and what it never does with your data." if en else
                  "Cosa legge il bot, cosa salva e cosa non fa mai con i tuoi dati."),
            description=(f"Privacy Policy of WGT-01, the Discord bot of the {cfg['name']} server: it reads messages only "
                         "to pick a reply, stores no personal data, no tracking and no cookies.") if en else
            (f"Privacy Policy di WGT-01, il bot Discord del server di {cfg['name']}: legge i messaggi solo per "
             "scegliere una risposta, non salva dati personali, nessun tracciamento né cookie.")),
    }
    for key, m in meta.items():
        path = url(key, lang) + "index.html"
        raw = fill((SRC / "content" / lang / m["md"]).read_text(encoding="utf-8"))
        body = link_docs(markdown.markdown(raw, extensions=["tables", "attr_list", "sane_lists"]), lang, root_for(path))
        render("legal.html", lang, path, alts(key), title=m["title"], section="legal", body=body,
               kicker=m["kicker"], lead=m["lead"], file_name=m["file"], description=m["description"],
               jsonld={"@context": "https://schema.org", "@graph": [breadcrumb([(cfg["name"], PREFIX[lang]), (m["title"], url(key, lang))])]})


def redirects():
    """Vecchi indirizzi italiani alla radice (prima della versione inglese) → nuovi sotto /it/."""
    old = {"prova/": url("try", "it"), "cookie/": url("cookies", "it")}
    base = SRC / "content" / "it" / "docs"
    for f in base.rglob("*.md"):
        key = str(f.relative_to(base).with_suffix("")).replace("\\", "/")
        slug = "" if key == "index" else (key[:-6] if key.endswith("/index") else key)
        old["documentazione/" + (slug + "/" if slug else "")] = doc_url(key, "it")
    for src, dst in old.items():
        target = SITE + dst
        write(src + "index.html", f"""<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Pagina spostata</title><meta name="robots" content="noindex"><link rel="canonical" href="{target}">
<meta http-equiv="refresh" content="0; url={target}"></head>
<body><p>Questa pagina si è spostata: <a href="{target}">{target}</a></p></body></html>
""")
    return len(old)


def main():
    for d in ["documentazione", "prova", "download", "cookie", "it", "try", "docs", "cookies", "discord-bot"]:
        shutil.rmtree(OUT / d, ignore_errors=True)
    n = 0
    for lang in LANGS:
        pages(lang)
        bot_pages(lang)
        n += docs(lang)
    r = redirects()
    t = env.get_template("404.html")
    write("404.html", t.render(cfg=cfg, ui=ui_for("en"), lang="en", locale=LOCALE["en"], build=BUILD, path="404.html",
                               root=SITE, _=tr("en"), u={k: url(k, "en") for k in PATHS}, doc=lambda k: doc_url(k, "en"),
                               alts={"en": "", "it": "it/"}, other="it", other_path="it/",
                               title="Page not found", seo_title=seo_title("Page not found", "en"), robots="noindex, follow",
                               description="This WGT-01 page doesn’t exist or has moved.", styles=[], photos=[]))
    (OUT / ".nojekyll").write_text("")
    today = time.strftime("%Y-%m-%d")
    items = []
    for u, alts in URLS:
        links = "".join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{SITE}{a}"/>' for l, a in alts.items())
        links += f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{alts["en"]}"/>'
        items.append(f"  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod>{links}</url>\n")
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                                     'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "".join(items) + "</urlset>\n", encoding="utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    if cfg.get("custom_domain"):
        (OUT / "CNAME").write_text(cfg["custom_domain"] + "\n", encoding="utf-8")
    print(f"Sito costruito: {len(URLS)} pagine in {len(LANGS)} lingue + 404 + {r} reindirizzamenti (build {BUILD}).")
    if MISSING:
        print(f"ATTENZIONE: {len(MISSING)} testi senza traduzione inglese (restano in italiano):")
        for m in sorted(MISSING):
            print("  -", m[:110])


if __name__ == "__main__":
    main()
