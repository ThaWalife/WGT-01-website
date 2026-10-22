#!/usr/bin/env python3
"""
Costruisce il sito WGT-01 (pagine HTML statiche) a partire da:
  src/config.json            nome, versione, Payhip…
  src/content/<lingua>/      testi dell'interfaccia (ui.json) e documentazione (docs/*.md)
  src/templates/             modelli Jinja2
Uso:  python3 src/build.py
Le pagine generate vanno nella radice del repository (servite da GitHub Pages).
Richiede: jinja2, markdown.
"""
import json, re, shutil, time
from pathlib import Path

import markdown
from jinja2 import Environment, FileSystemLoader

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
cfg = json.loads((SRC / "config.json").read_text(encoding="utf-8"))
LANG = cfg["lang"]
ui = json.loads((SRC / "content" / LANG / "ui.json").read_text(encoding="utf-8"))
env = Environment(loader=FileSystemLoader(str(SRC / "templates")), autoescape=True,
                  trim_blocks=True, lstrip_blocks=True)
BUILD = time.strftime("%Y%m%d%H%M")

STYLES = [
    ("dither", "Dither", False), ("halftone", "Halftone", True), ("ascii", "ASCII", False),
    ("mosaico", "Mosaico", False), ("incisione", "Incisione", True), ("flusso", "Linee di flusso", True),
    ("curve", "Curve di livello", True), ("sfumatura", "Mappa sfumatura", False),
    ("glitch", "Glitch", False), ("pixelsort", "Pixel sorting", False),
]
PHOTOS = [
    ("example-1", "Logo Celestio in rilievo, scena notturna", "Logo"),
    ("example-2", "Stanza con piante e quadri luminosi", "Stanza"),
    ("example-3", "Figura in blu su un palco", "Figura"),
    ("example-4", "Ingranaggi di un orologio in bianco e nero", "Orologio"),
]
HOME_DESC = (f"{cfg['name']}, plugin generativo per Photoshop: pattern, dieci stili come dither, halftone e ASCII, "
             "impaginazione automatica ed export SVG dalla scala di grigi.")
GROUPS = ["Inizia", "Sezioni", "Stili", "Funzioni", "Aiuto"]


def root_for(path):
    depth = path.count("/")
    return "./" if depth == 0 else "../" * depth


def write(path, html):
    f = OUT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html, encoding="utf-8")


SITE = cfg["site_url"]
AUTHOR = {"@type": "Person", "name": cfg["author"], "url": cfg["home_url"]}
URLS = []  # per la sitemap


def seo_title(title):
    """Titolo per i motori di ricerca: la pagina, poi il nome del plugin e cosa è."""
    return f"{title} — {cfg['name']}, plugin per Photoshop" if title else \
        f"{cfg['name']} — Plugin generativo per Photoshop: pattern, dither, halftone e impaginazione"


def breadcrumb(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}


def render(template, path, **ctx):
    t = env.get_template(template)
    if ctx.get("robots", "").startswith("noindex") is False and path != "404.html":
        URLS.append(path.replace("index.html", ""))
    ctx.setdefault("seo_title", seo_title(ctx.get("title", "")))
    base = dict(cfg=cfg, ui=ui, build=BUILD, path=path.replace("index.html", ""),
                root=root_for(path), styles=[dict(id=i, name=n, svg=s) for i, n, s in STYLES],
                photos=[dict(id=i, label=l, short=s) for i, l, s in PHOTOS])
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


def docs():
    base = SRC / "content" / LANG / "docs"
    pages = []
    for f in sorted(base.rglob("*.md")):
        raw = f.read_text(encoding="utf-8")
        for k, v in {"name": cfg["name"], "version": cfg["version"], "photoshop_min": cfg["photoshop_min"],
                     "min_price": cfg["payhip"]["min_price"]}.items():
            raw = raw.replace("{{" + k + "}}", v)
        meta, body = front_matter(raw)
        rel = f.relative_to(base).with_suffix("")
        parts = list(rel.parts)
        if parts[-1] == "index":
            parts = parts[:-1]
        url = "documentazione/" + ("/".join(parts) + "/" if parts else "")
        html = markdown.markdown(body, extensions=["tables", "attr_list", "md_in_html", "sane_lists"])
        root = root_for(url + "index.html")
        html = html.replace('href="/', f'href="{root}')
        pages.append(dict(title=meta.get("title", rel.name), nav=meta.get("nav", meta.get("title", rel.name)),
                          description=meta.get("description", ""), group=meta.get("group", "Aiuto"),
                          order=float(meta.get("order", 50)), url=url, html=html))
    pages.sort(key=lambda p: (GROUPS.index(p["group"]), p["order"]))
    nav = [dict(name=g, pages=[p for p in pages if p["group"] == g]) for g in GROUPS]
    nav = [g for g in nav if g["pages"]]
    for i, p in enumerate(pages):
        crumbs = [(cfg["name"], ""), ("Documentazione", "documentazione/")]
        if p["url"] != "documentazione/":
            crumbs.append((p["title"], p["url"]))
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "TechArticle", "headline": p["title"], "description": p["description"], "inLanguage": "it",
             "url": SITE + p["url"], "author": AUTHOR, "about": {"@type": "SoftwareApplication", "name": cfg["name"]}},
            breadcrumb(crumbs)]}
        render("doc.html", p["url"] + "index.html", title=p["title"], description=p["description"] or
               f"Documentazione di {cfg['name']}.", page=p, nav=nav, section="docs", jsonld=ld, og_type="article",
               prev=pages[i - 1] if i else None, next=pages[i + 1] if i + 1 < len(pages) else None)
    return len(pages)


def main():
    for d in ["documentazione", "prova", "download", "cookie"]:
        shutil.rmtree(OUT / d, ignore_errors=True)
    app = {"@type": "SoftwareApplication", "name": cfg["name"], "alternateName": cfg["brand"],
           "applicationCategory": "DesignApplication", "applicationSubCategory": "Plugin per Adobe Photoshop",
           "operatingSystem": "Windows, macOS", "softwareVersion": cfg["version"], "inLanguage": "it",
           "softwareRequirements": f"Adobe Photoshop {cfg['photoshop_min']} o successivo",
           "description": HOME_DESC, "url": SITE, "image": SITE + "assets/img/icon-512.png", "screenshot": SITE + "assets/img/og.png", "author": AUTHOR,
           "offers": {"@type": "Offer", "price": "1.00", "priceCurrency": "EUR",
                      "description": f"Donazione libera, minimo {cfg['payhip']['min_price']}"}}
    site = {"@type": "WebSite", "name": cfg["name"], "url": SITE, "inLanguage": "it", "publisher": AUTHOR,
            "image": SITE + "assets/img/icon-512.png"}
    render("home.html", "index.html", title="", section="home", description=HOME_DESC,
           jsonld={"@context": "https://schema.org", "@graph": [site, app]})
    render("prova.html", "prova/index.html", title="Prova gli stili nel browser", section="prova",
           description=f"Prova gratis Dither, Halftone e ASCII di {cfg['name']} sulla tua foto, direttamente nel browser: "
                       "nessun account e nessun caricamento, l’immagine resta sul tuo computer.",
           jsonld={"@context": "https://schema.org", "@graph": [breadcrumb([(cfg["name"], ""), ("Prova", "prova/")])]})
    render("download.html", "download/index.html", title="Scarica il plugin", section="download",
           description=f"Scarica {cfg['name']} per Photoshop {cfg['photoshop_min']} o successivo, su Windows e macOS, "
                       f"con una donazione libera da {cfg['payhip']['min_price']} e un codice seriale personale.",
           jsonld={"@context": "https://schema.org", "@graph": [breadcrumb([(cfg["name"], ""), ("Scarica", "download/")]), app]})
    raw = (SRC / "content" / LANG / "cookie.md").read_text(encoding="utf-8").replace("{{name}}", cfg["name"]).replace("{{email}}", cfg["contact_email"])
    render("cookie.html", "cookie/index.html", title="Cookie e privacy", section="cookie",
           body=markdown.markdown(raw, extensions=["tables", "attr_list", "sane_lists"]),
           description=f"Cookie e privacy del sito di {cfg['name']}: nessun cookie di profilazione o statistico, font ospitati sul sito, "
                       "servizi di terze parti solo con il tuo consenso.")
    t = env.get_template("404.html")
    write("404.html", t.render(cfg=cfg, ui=ui, build=BUILD, path="404.html", root=cfg["site_url"],
                               title="Pagina non trovata", seo_title=seo_title("Pagina non trovata"), robots="noindex, follow",
                               description="Questa pagina di WGT-01 non esiste o è stata spostata.", styles=[], photos=[]))
    n = docs()
    (OUT / ".nojekyll").write_text("")
    today = time.strftime("%Y-%m-%d")
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n" for u in URLS) + "</urlset>\n", encoding="utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    print(f"Sito costruito: 3 pagine + 404 + {n} pagine di documentazione (build {BUILD}).")


if __name__ == "__main__":
    main()
