"""
nms_scraper.py — Scraper pro NMS Market Research
Publikuje volební model pro Novinky.cz (Seznam.cz skupina), ~2x měsíčně.
Primární: nms.cz/pruzkumy-verejneho-mineni/
Záložní:  novinky.cz sekce průzkumy
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

NMS_BASE    = "https://nms.cz"
NMS_ARCHIVE = f"{NMS_BASE}/pruzkumy-verejneho-mineni/"

NOVINKY_SEARCH = "https://www.novinky.cz/tag/pruzkum-nms"


def get_nms_links(max_pages=8):
    links = []
    seen  = set()
    kw    = ["volební", "model", "preference", "strany", "politick"]
    for page in range(1, max_pages + 1):
        url  = NMS_ARCHIVE if page == 1 else f"{NMS_ARCHIVE}page/{page}/"
        soup = fetch_with_retry(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if any(k in txt for k in kw):
                full = href if href.startswith("http") else NMS_BASE + href
                if full not in seen:
                    seen.add(full)
                    links.append({"url": full, "title": a.get_text().strip()})
                    found += 1
        if found == 0:
            break
        time.sleep(0.8)
    return links


def get_novinky_links(max_pages=5):
    """Záložní zdroj — Novinky.cz."""
    links = []
    seen  = set()
    for page in range(1, max_pages + 1):
        url  = NOVINKY_SEARCH if page == 1 else f"{NOVINKY_SEARCH}?page={page}"
        soup = fetch_with_retry(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if any(kw in txt for kw in ["volební", "model", "preference", "průzkum"]):
                full = href if href.startswith("http") else "https://www.novinky.cz" + href
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
    print(f"[NMS] {url}")
    text = soup.get_text(" ", strip=True)

    if not any(kw in text.lower() for kw in ["volební model", "preference", "nms", "novinky"]):
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

    sample = extract_sample_size(text)

    return build_poll_record(
        agency="NMS",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type="model",
        view="coalitions" if "SPOLU" in parties else "parties",
        sample_size=sample,
        method="CAWI",
        client="Novinky.cz",
        source_url=url,
    )


def run_scraper(historical=False):
    print(f"[NMS] start (historical={historical})")
    max_p = 8 if historical else 2
    links = get_nms_links(max_pages=max_p)
    if not links:
        print("[NMS] nms.cz bez výsledků, zkouším Novinky.cz...")
        links = get_novinky_links(max_pages=max_p)
    limit = len(links) if historical else 3
    new   = 0
    for lnk in links[:limit]:
        rec = scrape_article(lnk["url"], lnk["title"])
        if rec and save_poll(rec):
            new += 1
        time.sleep(1.5)
    print(f"[NMS] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
