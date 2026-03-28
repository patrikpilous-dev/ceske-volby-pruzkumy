"""
stem_scraper.py — Scraper pro STEM (stem.cz)
Publikuje týdně, URL vzor: /volebni-tendence-ceske-verejnosti-MESIC-ROK/
Klient: CNN Prima News
"""

import re
import sys
import time
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import (
    MONTHS_CS, MONTHS_NUM_TO_NAME, PARTY_PATTERNS,
    fetch_with_retry, extract_pub_date, extract_fieldwork_dates,
    extract_parties_from_text, extract_sample_size, month_url_to_date,
)
from normalizer import build_poll_record, save_poll

BASE = "https://www.stem.cz"

# STEM má předvídatelnou URL strukturu
MONTHS_URL = {v: k for k, v in MONTHS_CS.items() if len(k) > 4}  # bez zkrácených tvarů
# Opravíme na primární tvar pro každý měsíc
# ASCII verze měsíců pro URL (bez háčků/čárek)
MONTH_PRIMARY = {
    "01": "leden",    "02": "unor",     "03": "brezen",   "04": "duben",
    "05": "kveten",   "06": "cerven",   "07": "cervenec", "08": "srpen",
    "09": "zari",     "10": "rijen",    "11": "listopad", "12": "prosinec",
}


def get_urls_last_n_months(n=7):
    """Vygeneruje seznam URL pro posledních n měsíců."""
    urls = []
    today = date.today()
    for i in range(n):
        # Odečítáme měsíce přes timedelta na první den
        first = date(today.year, today.month, 1)
        d = first - timedelta(days=i * 31)
        d = date(d.year, d.month, 1)
        month_name = MONTH_PRIMARY.get(f"{d.month:02d}")
        if month_name:
            urls.append(f"{BASE}/volebni-tendence-ceske-verejnosti-{month_name}-{d.year}/")
    return urls


def scrape_article(url):
    soup = fetch_with_retry(url)
    if not soup:
        return None
    print(f"[STEM] {url}")
    text = soup.get_text(" ", strip=True)

    # Kontrola, zda jde o průzkumový článek
    if not any(kw in text.lower() for kw in ["volební", "tendence", "preference", "ano", "ods"]):
        return None

    # Datum sběru dat
    date_from, date_to = extract_fieldwork_dates(text)

    # Fallback: z URL (STEM má spolehlivý URL vzor)
    if not date_to:
        date_from, date_to = month_url_to_date(url)

    if not date_to:
        print(f"[STEM] Nepodařilo se zjistit datum pro {url}")
        return None

    # Strany
    parties = extract_parties_from_text(text)
    if not parties:
        return None

    # Datum publikace — zkusíme více zdrojů
    date_pub = extract_pub_date(soup)
    if not date_pub:
        # Fallback: z URL odhadneme přibližné datum publikace (konec měsíce)
        m = re.search(r"(\d{4})", url)
        df, _ = month_url_to_date(url)
        if df and m:
            # Publikace bývá v průběhu měsíce, odhadneme 15. den
            date_pub = f"{df[:7]}-15"
        else:
            date_pub = date.today().isoformat()

    # Velikost vzorku
    sample = extract_sample_size(text)

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
        sample_size=sample,
        method="CAWI",
        client="CNN Prima News",
        source_url=url,
    )


def run_scraper(historical=False):
    print(f"[STEM] start (historical={historical})")
    # 52 měsíců = ~4.5 roku zpět, pokrývá od počátku 2022
    urls = get_urls_last_n_months(52 if historical else 3)
    new = 0
    for url in urls:
        rec = scrape_article(url)
        if rec and save_poll(rec):
            new += 1
        time.sleep(1.5)
    print(f"[STEM] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
