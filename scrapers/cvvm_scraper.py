"""
cvvm_scraper.py — Scraper pro CVVM (Sociologický ústav AV ČR)
Měří stranické PREFERENCE (ne volební model).
Archiv: https://cvvm.soc.cas.cz/cz/zpravy/politicke/volby-a-politicke-strany/
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

BASE    = "https://cvvm.soc.cas.cz"
ARCHIVE = f"{BASE}/cz/zpravy/politicke/volby-a-politicke-strany/"


def get_article_links(max_pages=10):
    links = []
    seen  = set()
    for page in range(1, max_pages + 1):
        url  = ARCHIVE if page == 1 else f"{ARCHIVE}page/{page}/"
        soup = fetch_with_retry(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if any(kw in txt for kw in ["stranick", "preference", "volební", "strany", "politick"]):
                full = href if href.startswith("http") else BASE + href
                if full not in seen and "/zpravy/" in full:
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
    print(f"[CVVM] {url}")
    text = soup.get_text(" ", strip=True)

    if not any(kw in text.lower() for kw in ["stranick", "preference", "ano", "ods"]):
        return None

    # Datum sběru
    date_from, date_to = extract_fieldwork_dates(text)
    if not date_to and title:
        date_from, date_to = extract_fieldwork_dates(title)
    if not date_to:
        return None

    # Strany: nejdřív tabulka (CVVM data jsou typicky v tabulce), pak text
    parties = extract_parties_from_table(soup)
    if not parties:
        parties = extract_parties_from_text(text)
    if not parties:
        return None

    # Datum publikace
    date_pub = extract_pub_date(soup)
    if not date_pub:
        # CVVM nemá vždy <time> — zkus z horní části textu
        m = re.search(r"(\d{1,2})\.\s+(\w+)\s+(\d{4})", text[:800])
        if m:
            mon = MONTHS_CS.get(m.group(2).lower())
            if mon:
                date_pub = f"{int(m.group(3))}-{mon}-{int(m.group(1)):02d}"
    date_pub = date_pub or date.today().isoformat()

    sample = extract_sample_size(text)

    return build_poll_record(
        agency="CVVM",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type="preference",   # CVVM vždy měří preference, ne volební model
        view="coalitions" if "SPOLU" in parties else "parties",
        sample_size=sample,
        method="CAPI",
        client="Sociologický ústav AV ČR",
        source_url=url,
    )


def run_scraper(historical=False):
    print(f"[CVVM] start (historical={historical})")
    links = get_article_links(max_pages=15 if historical else 2)
    limit = len(links) if historical else 3
    new   = 0
    for lnk in links[:limit]:
        rec = scrape_article(lnk["url"], lnk["title"])
        if rec and save_poll(rec):
            new += 1
        time.sleep(1.2)
    print(f"[CVVM] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
