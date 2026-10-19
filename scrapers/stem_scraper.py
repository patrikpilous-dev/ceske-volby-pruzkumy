"""
stem_scraper.py — Scraper pro STEM (stem.cz)
Články „Volební tendence české veřejnosti“ hledá ve výpisu kategorie
stranicke-preference. URL se nedá odhadnout (…-cerven-2026/, …-zacatek-rijna-2026/).
Klient: CNN Prima News
"""

import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import (
    fetch_with_retry, extract_pub_date, extract_fieldwork_dates,
    extract_parties_nearest, extract_sample_size, month_url_to_date,
)
from normalizer import build_poll_record, save_poll

BASE = "https://www.stem.cz"
CATEGORY = f"{BASE}/category/stranicke-preference/"
ARTICLE_RE = re.compile(r"^https://www\.stem\.cz/volebni-tendence-ceske-verejnosti[a-z0-9\-]*/$")


def get_article_urls(max_pages=1):
    """Odkazy na články volebního modelu z výpisu kategorie, nejnovější první."""
    urls = []
    for page in range(1, max_pages + 1):
        url = CATEGORY if page == 1 else f"{CATEGORY}page/{page}/"
        soup = fetch_with_retry(url)
        if not soup:
            break
        for a in soup.find_all("a", href=True):
            href = a["href"].split("#")[0]
            if ARTICLE_RE.match(href) and href not in urls:
                urls.append(href)
        time.sleep(1.0)
    return urls


def scrape_article(url):
    soup = fetch_with_retry(url)
    if not soup:
        return None
    print(f"[STEM] {url}")
    art = soup.find("article") or soup
    text = art.get_text(" ", strip=True)

    if "volební model" not in text.lower() and "volby" not in text.lower():
        return None

    # Termín sběru: „dotázaných v době od 16. do 21. června 2026“
    date_from, date_to = extract_fieldwork_dates(text)
    if not date_to:
        date_from, date_to = month_url_to_date(url)
    if not date_to:
        print(f"[STEM] Nepodařilo se zjistit termín sběru pro {url}")
        return None

    # Čísla stran jsou v úvodních odstavcích, metodika a shrnutí je za nimi
    body = re.split(r"Výběr dotazovaných|Dotazování probíhalo|SHRNUTÍ", text)[0]
    parties = extract_parties_nearest(body)
    if len(parties) < 4:
        print(f"[STEM] Málo stran ({len(parties)}) v {url}")
        return None

    date_pub = extract_pub_date(soup)
    if not date_pub:
        print(f"[STEM] Chybí datum vydání pro {url}")
        return None

    poll_type = (
        "preference"
        if "stranické preference" in text.lower() and "volební model" not in text.lower()
        else "model"
    )

    return build_poll_record(
        agency="STEM",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type=poll_type,
        view="coalitions" if "SPOLU" in parties else "parties",
        sample_size=extract_sample_size(text),
        method="CAWI",
        client="CNN Prima News",
        source_url=url,
    )


def scrape_all(historical=False):
    """Vrátí seznam záznamů bez ukládání (pro opravu dat)."""
    urls = get_article_urls(max_pages=5 if historical else 1)
    records = []
    for url in urls:
        rec = scrape_article(url)
        if rec:
            records.append(rec)
        time.sleep(1.5)
    return records


def run_scraper(historical=False):
    print(f"[STEM] start (historical={historical})")
    new = 0
    for rec in scrape_all(historical):
        if save_poll(rec):
            new += 1
    print(f"[STEM] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
