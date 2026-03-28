"""
kantar_scraper.py — Scraper pro Kantar CZ
Publikuje volební model pro Českou televizi (ČT), ~2x měsíčně.
Primární zdroj: kantar.com/czech-republic (press releases)
Záložní zdroj: ct24.cz
"""

import re
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import (
    MONTHS_CS, PARTY_PATTERNS,
    fetch_with_retry, extract_pub_date, extract_fieldwork_dates,
    extract_parties_from_text, extract_parties_from_table, extract_sample_size,
)
from normalizer import build_poll_record, save_poll

KANTAR_BASE    = "https://www.kantar.com"
KANTAR_ARCHIVE = f"{KANTAR_BASE}/czech-republic/inspiration/politics"

CT24_BASE   = "https://ct24.cz"
CT24_SEARCH = f"{CT24_BASE}/tema/volby"


def get_kantar_links(max_pages=5):
    """Stáhne seznam průzkumů z kantar.com/czech-republic."""
    links = []
    seen  = set()
    for page in range(1, max_pages + 1):
        url  = KANTAR_ARCHIVE if page == 1 else f"{KANTAR_ARCHIVE}?page={page}"
        soup = fetch_with_retry(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if any(kw in txt for kw in ["volební", "model", "preference", "volby", "strany", "sněmovn"]):
                full = href if href.startswith("http") else KANTAR_BASE + href
                if full not in seen:
                    seen.add(full)
                    links.append({"url": full, "title": a.get_text().strip()})
                    found += 1
        if found == 0:
            break
        time.sleep(0.8)
    return links


def get_ct24_links(max_pages=5):
    """Záložní zdroj — CT24 články o Kantar průzkumech."""
    links = []
    seen  = set()
    kw_ct = ["kantar", "volební model", "česká televize", "průzkum ct"]
    for page in range(1, max_pages + 1):
        url  = CT24_SEARCH if page == 1 else f"{CT24_SEARCH}?page={page}"
        soup = fetch_with_retry(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if any(kw in txt for kw in kw_ct):
                full = href if href.startswith("http") else CT24_BASE + href
                if full not in seen:
                    seen.add(full)
                    links.append({"url": full, "title": a.get_text().strip()})
                    found += 1
        if found == 0:
            break
        time.sleep(0.8)
    return links


def scrape_article(url, title=""):
    soup = fetch_with_retry(url)
    if not soup:
        return None
    print(f"[Kantar] {url}")
    text = soup.get_text(" ", strip=True)

    if not any(kw in text.lower() for kw in
               ["volební model", "preference", "kantar", "česká televize", "ct24"]):
        return None

    # Datum sběru
    date_from, date_to = extract_fieldwork_dates(text)
    if not date_to and title:
        date_from, date_to = extract_fieldwork_dates(title)
    if not date_to:
        return None

    # Strany: tabulka jako první volba, pak text
    parties = extract_parties_from_table(soup)
    if not parties:
        parties = extract_parties_from_text(text)
    if not parties:
        return None

    # Datum publikace
    date_pub = extract_pub_date(soup) or date.today().isoformat()

    sample    = extract_sample_size(text)
    poll_type = (
        "preference"
        if "preference" in text.lower() and "volební model" not in text.lower()
        else "model"
    )

    return build_poll_record(
        agency="Kantar",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type=poll_type,
        view="coalitions" if "SPOLU" in parties else "parties",
        sample_size=sample,
        method="mixed",
        client="Česká televize",
        source_url=url,
    )


def run_scraper(historical=False):
    print(f"[Kantar] start (historical={historical})")
    max_p = 10 if historical else 2
    links = get_kantar_links(max_pages=max_p)
    if not links:
        print("[Kantar] kantar.com bez výsledků, zkouším CT24...")
        links = get_ct24_links(max_pages=max_p)
    limit = len(links) if historical else 3
    new   = 0
    for lnk in links[:limit]:
        rec = scrape_article(lnk["url"], lnk["title"])
        if rec and save_poll(rec):
            new += 1
        time.sleep(1.5)
    print(f"[Kantar] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
