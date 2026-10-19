"""
median_scraper.py — Scraper pro Median (median.eu)
Publikuje měsíčně, kategorie: median.eu/cs/?cat=6
Klient: Český rozhlas

Článek na webu uvádí jen strany nad 5 % a „průzkum probíhal v září 2026“.
Úplná data a přesný termín sběru jsou v přiloženém PDF
(„Termín dotazování 1. září – 30. září 2026“, graf volebního modelu).
PDF má přednost, text článku je záloha.
"""

import io
import re
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import (
    HEADERS, PARTY_MENTIONS, MONTHS_CS,
    fetch_with_retry, extract_pub_date, extract_fieldwork_dates,
    extract_parties_nearest, extract_sample_size,
)
from normalizer import build_poll_record, save_poll

BASE = "https://www.median.eu"
CAT  = f"{BASE}/cs/?cat=6"

_NAME_RES = [(re.compile(rf"^(?:{pat})$"), pid) for pat, pid in PARTY_MENTIONS]


def get_article_list(max_pages=1):
    articles = []
    seen = set()
    for page in range(1, max_pages + 1):
        url  = CAT if page == 1 else f"{BASE}/cs/?cat=6&paged={page}"
        soup = fetch_with_retry(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if "sněmovní" in txt or "snemovni" in href.lower() or "volební model" in txt:
                full = href if href.startswith("http") else BASE + href
                if full not in seen and BASE in full and "?p=" in full:
                    seen.add(full)
                    articles.append({"url": full, "title": a.get_text().strip()})
                    found += 1
        if found == 0:
            break
        time.sleep(1.0)
    return articles


# ---------- PDF ----------

def _pdf_text_pages(pdf_url):
    try:
        from pypdf import PdfReader
    except ImportError:
        print("[Median] chybí pypdf, PDF přeskočeno")
        return []
    try:
        r = requests.get(pdf_url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return []
        return [pg.extract_text() or "" for pg in PdfReader(io.BytesIO(r.content)).pages]
    except Exception as e:
        print(f"[Median] PDF {pdf_url}: {e}")
        return []


def _party_names_line(line):
    """Řádek popisků grafu → seznam ID stran (nebo None, když to popisky nejsou)."""
    tokens = line.split()
    names, i = [], 0
    while i < len(tokens):
        hit = None
        for n in (3, 2, 1):
            chunk = " ".join(tokens[i:i + n])
            if chunk in ("Jiné", "Ostatní", "Jiná"):
                hit = ("_jine", n)
                break
            for rx, pid in _NAME_RES:
                if rx.match(chunk):
                    hit = (pid, n)
                    break
            if hit:
                break
        if not hit:
            return None
        names.append(hit[0])
        i += hit[1]
    return names if len(names) >= 4 else None


def parse_model_pdf(pages):
    """Z PDF vrátí (strany, termín od, termín do, vzorek, vydáno)."""
    full = "\n".join(pages)
    parties = {}
    for page in pages:
        if "volební model" not in page.lower():
            continue
        lines = page.splitlines()
        for idx, line in enumerate(lines):
            names = _party_names_line(line.strip())
            if not names:
                continue
            vals = []
            for prev in lines[:idx]:
                vals += [float(v.replace(",", ".")) for v in re.findall(r"(\d{1,2},\d)\s*%", prev)]
            if len(vals) == len(names):
                parties = {pid: v for pid, v in zip(names, vals) if pid != "_jine"}
                break
        if parties:
            break

    date_from = date_to = None
    m = re.search(r"Termín dotazování\s+(.{0,60})", full)
    if m:
        date_from, date_to = extract_fieldwork_dates(m.group(1))

    sample = None
    m = re.search(r"Velikost vzorku\s+(\d[\d\s]{2,6})\s*respondent", full)
    if m:
        sample = int(re.sub(r"\s", "", m.group(1)))

    pub = None
    m = re.search(r"zveřejněno\s+(\d{1,2})\.\s+([^\W\d_]+)\s+(\d{4})", full)
    if m and MONTHS_CS.get(m.group(2).lower()):
        pub = f"{m.group(3)}-{MONTHS_CS[m.group(2).lower()]}-{int(m.group(1)):02d}"

    return parties, date_from, date_to, sample, pub


def _wp_post_date(url):
    """Datum vydání přes WordPress REST (?rest_route=/wp/v2/posts/ID), stránka ho nemá."""
    m = re.search(r"[?&]p=(\d+)", url)
    if not m:
        return None
    try:
        r = requests.get(f"{BASE}/cs/?rest_route=/wp/v2/posts/{m.group(1)}",
                         headers=HEADERS, timeout=20)
        if r.status_code == 200:
            return r.json().get("date", "")[:10] or None
    except (requests.RequestException, ValueError):
        pass
    return None


# ---------- Článek ----------

def scrape_article(url, title=""):
    soup = fetch_with_retry(url)
    if not soup:
        return None
    print(f"[Median] {url}")
    text = soup.get_text(" ", strip=True)

    if not any(kw in text.lower() for kw in ["volební model", "preference"]):
        return None

    parties, date_from, date_to, sample, pub_pdf = {}, None, None, None, None
    method, client = "CAPI", "Český rozhlas"
    pdf = next((a["href"] for a in soup.find_all("a", href=True)
                if a["href"].lower().endswith(".pdf")), None)
    if pdf:
        pdf = pdf if pdf.startswith("http") else BASE + pdf
        pages = _pdf_text_pages(pdf)
        parties, date_from, date_to, sample, pub_pdf = parse_model_pdf(pages)
        full = "\n".join(pages)
        # Metodika v PDF: „CAPI … CATI … CAWI“, „Realizátor a zadavatel … bez zadavatele“
        found = [m for m in ("CAPI", "CATI", "CAWI") if m in full]
        if found:
            method = "+".join(found)
        if "bez zadavatele" in full:
            client = None

    # Záloha: text článku
    if len(parties) < 4:
        parties = extract_parties_nearest(text)
    if not date_to:
        date_from, date_to = extract_fieldwork_dates(text)
    if not date_to:
        print(f"[Median] Nenalezen termín sběru v {url}")
        return None
    if len(parties) < 4:
        print(f"[Median] Málo stran ({len(parties)}) v {url}")
        return None

    date_pub = pub_pdf or extract_pub_date(soup) or _wp_post_date(url)
    if not date_pub:
        print(f"[Median] Chybí datum vydání v {url}")
        return None

    return build_poll_record(
        agency="Median",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type="model",
        view="coalitions" if "SPOLU" in parties else "parties",
        sample_size=sample or extract_sample_size(text),
        method=method,
        client=client,
        source_url=url,
    )


def scrape_all(historical=False, urls=None):
    """Vrátí seznam záznamů bez ukládání (pro opravu dat)."""
    articles = [{"url": u, "title": ""} for u in urls] if urls else \
        get_article_list(max_pages=20 if historical else 1)
    if not historical and not urls:
        articles = articles[:3]
    records = []
    for a in articles:
        rec = scrape_article(a["url"], a["title"])
        if rec:
            records.append(rec)
        time.sleep(1.5)
    return records


def run_scraper(historical=False):
    print(f"[Median] start (historical={historical})")
    new = 0
    for rec in scrape_all(historical):
        if save_poll(rec):
            new += 1
    print(f"[Median] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
