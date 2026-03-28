"""
stem_scraper.py — Scraper pro STEM (stem.cz)
Publikuje týdně, URL vzor: /volebni-tendence-ceske-verejnosti-MESIC-ROK/
"""

import re
import sys
import time
import requests
from datetime import date, timedelta
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from normalizer import build_poll_record, save_poll

BASE = "https://www.stem.cz"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ceske-volby.cz/1.0)"}

MONTHS_CS = {
    "leden":"01","únor":"02","březen":"03","duben":"04","květen":"05","červen":"06",
    "červenec":"07","srpen":"08","září":"09","říjen":"10","listopad":"11","prosinec":"12",
}
MONTHS_REV = {v: k for k, v in MONTHS_CS.items()}

PARTY_PATTERNS = [
    (r"(?:hnutí\s+)?ANO[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "ANO"),
    (r"ODS[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "ODS"),
    (r"STAN[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "STAN"),
    (r"[Pp]irát[iů][^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "Piráti"),
    (r"SPD[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "SPD"),
    (r"[Mm]otorist[éů][^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "Motoristé"),
    (r"TOP\s*09[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "TOP09"),
    (r"KDU[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "KDUČSL"),
    (r"KSČM[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "KSČM"),
    (r"[Ss]tačilo[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "Stačilo"),
    (r"SOCDEM[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "SOCDEM"),
    (r"ČSSD[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "SOCDEM"),
    (r"[Pp]řísah[ay][^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "Přísaha"),
    (r"[Zz]elen[íi][^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "Zelení"),
    (r"SPOLU[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "SPOLU"),
    (r"Naš[ei]\s+[Čč]esko[^\d(]{0,15}\(?(\d+[,.]?\d*)\s*%", "NašeČesko"),
]


def get_urls_last_n_months(n=7):
    urls = []
    today = date.today()
    for i in range(n):
        d = date(today.year, today.month, 1) - timedelta(days=i*30)
        month_cs = MONTHS_REV.get(f"{d.month:02d}")
        if month_cs:
            urls.append(f"{BASE}/volebni-tendence-ceske-verejnosti-{month_cs}-{d.year}/")
    return urls


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        return BeautifulSoup(r.text, "html.parser") if r.status_code == 200 else None
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
        return None


def extract_dates(text):
    m = re.search(r"od\s+(\d+)\.\s+do\s+(\d+)\.\s+(\w+)\s+(\d{4})", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        if mon:
            y = int(m.group(4))
            return f"{y}-{mon}-{int(m.group(1)):02d}", f"{y}-{mon}-{int(m.group(2)):02d}"
    return None, None


def extract_parties(text):
    parties = {}
    for pattern, pid in PARTY_PATTERNS:
        for val in re.findall(pattern, text):
            try:
                v = float(val.replace(",", "."))
                if 0 < v < 60 and pid not in parties:
                    parties[pid] = v
                    break
            except ValueError:
                pass
    return parties


def scrape_article(url):
    soup = fetch(url)
    if not soup:
        return None
    print(f"[STEM] {url}")
    text = soup.get_text(" ", strip=True)

    date_from, date_to = extract_dates(text)
    if not date_to:
        mon, year = None, None
        for m_cs, m_num in MONTHS_CS.items():
            if m_cs in url:
                mon = m_num
                yr = re.search(r"(\d{4})", url)
                year = int(yr.group(1)) if yr else date.today().year
                break
        if mon:
            date_from = f"{year}-{mon}-01"
            date_to   = f"{year}-{mon}-28"

    if not date_to:
        return None

    parties = extract_parties(text)
    if not parties:
        return None

    sample = None
    m = re.search(r"N\s*=\s*(\d{3,5})", text)
    if m:
        sample = int(m.group(1))

    poll_type = "preference" if "stranické preference" in text.lower() and "volební model" not in text.lower() else "model"
    view = "coalitions" if "SPOLU" in parties else "parties"

    date_pub = date.today().isoformat()
    t = soup.find("time")
    if t and t.get("datetime"):
        date_pub = t["datetime"][:10]

    return build_poll_record(
        agency="STEM",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type=poll_type,
        view=view,
        sample_size=sample,
        method="CAWI",
        client="CNN Prima News",
        source_url=url,
    )


def run_scraper(historical=False):
    print(f"[STEM] start (historical={historical})")
    urls = get_urls_last_n_months(24 if historical else 2)
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
