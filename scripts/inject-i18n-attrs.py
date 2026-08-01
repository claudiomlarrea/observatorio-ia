#!/usr/bin/env python3
"""Inject data-i18n attributes into index.html from js/i18n-dict.json (or .js).

Matches leaf / single-text-child elements whose stripped text equals the Spanish
("es") dictionary value exactly. Skips script/style and elements that already
have data-i18n.

Attribute strings (aria-label, placeholder, title) get:
  data-i18n-attr="attrName:dict.key"
(compatible with js/i18n.js) and do NOT get data-i18n (avoids wiping children).

meta description / <title> are skipped (handled in js/i18n.js via dict keys).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
JSON_PATH = ROOT / "js" / "i18n-dict.json"
JS_PATH = ROOT / "js" / "i18n-dict.js"


def load_dict() -> dict[str, dict[str, str]]:
    if JSON_PATH.is_file():
        return json.loads(JSON_PATH.read_text(encoding="utf-8"))
    text = JS_PATH.read_text(encoding="utf-8")
    m = re.search(r"window\.I18N_DICT\s*=\s*(\{.*\})\s*;?\s*\Z", text, re.S)
    if not m:
        raise SystemExit(f"Could not parse I18N_DICT from {JS_PATH}")
    return json.loads(m.group(1))


def norm_ws(s: str) -> str:
    s = s.replace("\xa0", " ").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", s).strip()


def context_prefixes(before: str, tag: str, attrs: str) -> list[str]:
    """Return preferred key prefixes based on surrounding HTML context."""
    window = before[-1200:] if len(before) > 1200 else before
    low = window.lower()
    attrs_l = attrs.lower()
    classes = " ".join(re.findall(r'class=["\']([^"\']+)["\']', attrs_l))
    prefs: list[str] = []

    if "brand-kicker" in classes or "brand-title" in classes or 'class="brand"' in attrs_l:
        prefs.extend(["brand.", "sec.equipo.org.", "sec.contacto."])
    if "site-nav" in low or re.search(r"<nav\b", window[-200:], re.I):
        # inside nav list preferentially
        if "<nav" in low[low.rfind("<nav") :] if "<nav" in low else False:
            prefs.append("nav.")
    if 'id="site-nav"' in low or "site-nav" in attrs_l:
        prefs.insert(0, "nav.")
    # Detect still inside <nav> ... before </nav>
    last_nav = max(low.rfind("<nav"), low.rfind('<nav '))
    last_nav_close = low.rfind("</nav")
    if last_nav > last_nav_close:
        prefs.insert(0, "nav.")

    last_footer = max(low.rfind("<footer"), low.rfind("site-footer"))
    last_footer_close = low.rfind("</footer")
    if last_footer > last_footer_close:
        prefs.insert(0, "footer.")

    if "hero-actions" in low and low.rfind("hero-actions") > low.rfind("</div"):
        prefs.insert(0, "hero.cta.")
    if "hero-lead" in classes or tag == "h1":
        prefs.insert(0, "hero.")
    if "skip-link" in classes:
        prefs.insert(0, "a11y.")
    if "top-banner" in classes:
        prefs.insert(0, "banner.")
    if tag in {"h2", "h3"} or "section-kicker" in classes:
        prefs.insert(0, "sec.")
    if "btn" in classes:
        if not any(p.startswith("hero.cta") for p in prefs):
            prefs.append("sec.")
    if "jornadas" in classes or "jornadas-" in low[-400:]:
        prefs.insert(0, "sec.jornadas.")
    if "encuestas" in classes:
        prefs.insert(0, "sec.encuestas.")
    if "tool-card" in low[-500:]:
        prefs.insert(0, "sec.herramientas.")
    if "pub-" in classes or "pub-index" in low[-500:]:
        prefs.insert(0, "sec.publicaciones.")
    if "acompanamiento" in classes or "acompanamiento" in low[-400:]:
        prefs.insert(0, "sec.acompanamiento.")
    if "visitas" in classes:
        prefs.insert(0, "sec.visitas.")
    if "contact" in classes or 'id="contacto"' in low[-800:]:
        prefs.insert(0, "sec.contacto.")
    if "activity-" in classes:
        prefs.insert(0, "sec.actividades.")
    if "team-card" in low[-400:] or "team-" in classes:
        prefs.insert(0, "sec.equipo.")
    if "news-" in classes or "news-" in low[-400:]:
        prefs.insert(0, "sec.noticias.")
    if "tool-card" in low[-600:]:
        prefs.insert(0, "common.")
        prefs.insert(0, "sec.herramientas.")

    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for p in prefs:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def pick_key(candidates: list[str], prefixes: list[str] | None = None) -> str:
    prefixes = prefixes or []

    # Prefer shared chrome keys when present (exact label reused in many places).
    shared = [k for k in candidates if k.startswith("common.")]
    if shared and any(k.split(".", 1)[-1] in {"instructivoPdf", "disponible", "abrir", "descargar", "consultas"} for k in shared):
        # only force common when that is clearly the generic label set
        if len(candidates) > 1 and shared:
            # still allow context to win unless common is appropriate
            pass

    def rank(key: str) -> tuple:
        # Strong preference for common.* when multiple tool-specific duplicates exist
        if key.startswith("common.") and len(candidates) > 1:
            return (-1, 0, -len(key), key)
        for i, pref in enumerate(prefixes):
            if key.startswith(pref):
                return (0, i, -len(key), key)
        # fallback namespace preference
        fallback = (
            "nav.",
            "hero.cta.",
            "footer.",
            "brand.",
            "banner.",
            "a11y.",
            "sec.",
            "hero.",
            "common.",
            "meta.",
        )
        for i, pref in enumerate(fallback):
            if key.startswith(pref):
                return (1, i, -len(key), key)
        return (2, 99, -len(key), key)

    return sorted(candidates, key=rank)[0]


def build_skip_ranges(html: str) -> list[tuple[int, int]]:
    return [
        (m.start(), m.end())
        for m in re.finditer(
            r"<(script|style|noscript)\b[^>]*>.*?</\1\s*>", html, flags=re.I | re.S
        )
    ]


def in_ranges(pos: int, ranges: list[tuple[int, int]]) -> bool:
    return any(s <= pos < e for s, e in ranges)


def insert_attr(open_tag: str, attr: str, value: str) -> str:
    if re.search(rf"\b{re.escape(attr)}\s*=", open_tag, re.I):
        return open_tag
    if open_tag.endswith("/>"):
        return open_tag[:-2] + f' {attr}="{value}" />'
    if open_tag.endswith(">"):
        return open_tag[:-1] + f' {attr}="{value}">'
    return open_tag


def main() -> int:
    data = load_dict()
    by_es: dict[str, list[str]] = {}
    for key, entry in data.items():
        es = entry.get("es", "")
        if not es or "{n}" in es:
            continue
        # Skip meta.* — applied in JS without DOM tagging
        if key.startswith("meta."):
            continue
        by_es.setdefault(norm_ws(es), []).append(key)

    html = HTML_PATH.read_text(encoding="utf-8")
    skip = build_skip_ranges(html)
    injected = 0
    replacements: list[tuple[int, int, str]] = []
    claimed: list[tuple[int, int]] = []

    def claim(s: int, e: int) -> bool:
        if any(s < ce and e > cs for cs, ce in claimed):
            return False
        claimed.append((s, e))
        return True

    # Leaf elements: <tag attrs>text</tag> with no nested tags
    leaf_re = re.compile(
        r"<(?P<tag>[a-zA-Z][\w:-]*)(?P<attrs>[^>]*)>(?P<body>[^<]*)</(?P=tag)\s*>",
        re.S,
    )
    for m in leaf_re.finditer(html):
        if in_ranges(m.start(), skip):
            continue
        tag = m.group("tag")
        if tag.lower() == "title":
            continue  # handled in js/i18n.js
        attrs = m.group("attrs")
        if re.search(r"\bdata-i18n\s*=", attrs, re.I):
            continue
        t = norm_ws(m.group("body"))
        if t not in by_es:
            continue
        if not claim(m.start(), m.end()):
            continue
        prefixes = context_prefixes(html[: m.start()], tag, attrs)
        key = pick_key(by_es[t], prefixes)
        body = m.group("body")
        new_open = insert_attr(f"<{tag}{attrs}>", "data-i18n", key)
        replacements.append((m.start(), m.end(), f"{new_open}{body}</{tag}>"))
        injected += 1

    # Attribute-only: aria-label, placeholder, title → data-i18n-attr="attr:key"
    for attr in ("aria-label", "placeholder", "title"):
        attr_re = re.compile(
            rf"<(?P<tag>[a-zA-Z][\w:-]*)(?P<attrs>[^>]*\b{attr}\s*=\s*(?P<q>[\"'])(?P<val>.*?)(?P=q)[^>]*)>",
            re.I | re.S,
        )
        for m in attr_re.finditer(html):
            if in_ranges(m.start(), skip):
                continue
            t = norm_ws(m.group("val"))
            if t not in by_es:
                continue
            open_tag = m.group(0)
            if re.search(r"\bdata-i18n-attr\s*=", open_tag, re.I):
                # Append to existing attr map if needed
                continue
            prefixes = context_prefixes(html[: m.start()], m.group("tag"), m.group("attrs"))
            key = pick_key(by_es[t], prefixes)
            pair = f"{attr}:{key}"

            # If we already rewrote this opening tag as part of a leaf element,
            # merge data-i18n-attr into that replacement.
            already = next((i for i, (s, e, _) in enumerate(replacements) if s == m.start()), None)
            if already is not None:
                s, e, frag = replacements[already]
                gt = frag.find(">")
                if gt != -1 and "data-i18n-attr=" not in frag[: gt + 1]:
                    frag = frag[:gt] + f' data-i18n-attr="{pair}"' + frag[gt:]
                    replacements[already] = (s, e, frag)
                    injected += 1
                continue

            if not claim(m.start(), m.end()):
                continue
            new_tag = insert_attr(open_tag, "data-i18n-attr", pair)
            replacements.append((m.start(), m.end(), new_tag))
            injected += 1

    for s, e, frag in sorted(replacements, key=lambda x: x[0], reverse=True):
        html = html[:s] + frag + html[e:]

    HTML_PATH.write_text(html, encoding="utf-8")
    print(f"keys={len(data)}")
    print(f"injected={injected}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
