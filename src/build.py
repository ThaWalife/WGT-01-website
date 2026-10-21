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
    ("hopper", "Ritratto di Grace Hopper", "Ritratto"),
    ("astronauta", "Ritratto di Eileen Collins, astronauta", "Astronauta"),
    ("fotografo", "Fotografo con la macchina", "Fotografo"),
    ("caffe", "Tazza di caffè", "Caffè"),
    ("gatto", "Gatto", "Gatto"),
    ("razzo", "Lancio di un razzo", "Razzo"),
]
GROUPS = ["Inizia", "Sezioni", "Stili", "Funzioni", "Aiuto"]


def root_for(path):
    depth = path.count("/")
    return "./" if depth == 0 else "../" * depth


def write(path, html):
    f = OUT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html, encoding="utf-8")


def render(template, path, **ctx):
    t = env.get_template(template)
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
        render("doc.html", p["url"] + "index.html", title=p["title"], description=p["description"] or
               f"Documentazione di {cfg['name']}.", page=p, nav=nav, section="docs",
               prev=pages[i - 1] if i else None, next=pages[i + 1] if i + 1 < len(pages) else None)
    return len(pages)


def main():
    for d in ["documentazione", "prova", "download"]:
        shutil.rmtree(OUT / d, ignore_errors=True)
    render("home.html", "index.html", title="", section="home",
           description=f"{cfg['name']}: pattern, stili generativi e impaginazione per Photoshop, dalla scala di grigi della tua immagine.")
    render("prova.html", "prova/index.html", title="Prova", section="prova",
           description=f"Prova gli stili di {cfg['name']} sulla tua foto, direttamente nel browser.")
    render("download.html", "download/index.html", title="Scarica", section="download",
           description=f"Scarica {cfg['name']} per Photoshop con una donazione da {cfg['payhip']['min_price']}.")
    t = env.get_template("404.html")
    write("404.html", t.render(cfg=cfg, ui=ui, build=BUILD, path="404.html", root=cfg["site_url"],
                               title="Pagina non trovata", description="Pagina non trovata.", styles=[], photos=[]))
    n = docs()
    (OUT / ".nojekyll").write_text("")
    print(f"Sito costruito: 3 pagine + 404 + {n} pagine di documentazione (build {BUILD}).")


if __name__ == "__main__":
    main()
