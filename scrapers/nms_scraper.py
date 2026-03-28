"""
nms_scraper.py — Scraper pro NMS Market Research
Publikuje volební model pro Novinky.cz (Seznam.cz skupina), ~2x měsíčně.
Primární: nms.cz/pruzkumy-verejneho-mineni/
Záložní:  novinky.cz sekce průzkumy
"""

import re
import sys
import time
import requests
from datetime import date
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from normalizer import build_poll_record, save_poll

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ceske-volby.cz/1.0)"}

NMS_BASE    = "https://nms.cz"
NMS_ARCHIVE = f"{NMS_BASE}/pruzkumy-verejneho-mineni/"

# Záložní: Novinky.cz
NOVINKY_SEARCH = "https://www.novinky.cz/tag/pruzkum-nms"

MONTHS_CS = {
    "leden":"01","ledna":"01","únor":"02","února":"02",
    "březen":"03","března":"03","duben":"04","dubna":"04",
    "květen":"05","května":"05","červen":"06","června":"06",
    "červenec":"07","července":"07","srpen":"08","srpna":"08",
    "září":"09","října":"10","říjen":"10","listopad":"11","listopadu":"11",
    "prosinec":"12","prosince":"12",
}

PARTY_PATTERNS = [
    (r"ANO[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",           "ANO"),
    (r"ODS[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",            "ODS"),
    (r"STAN[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",           "STAN"),
    (r"[Ss]tarostov[éě][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%","STAN"),
    (r"[Pp]irát[iů][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",  "Piráti"),
    (r"SPD[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",            "SPD"),
    (r"[Mm]otorist[éě][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%","Motoristé"),
    (r"TOP\s*09[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",       "TOP09"),
    (r"KDU[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",            "KDUČSL"),
    (r"KSČM[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",           "KSČM"),
    (r"[Ss]tačilo[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",     "Stačilo"),
    (r"SOCDEM[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",         "SOCDEM"),
    (r"ČSSD[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",           "SOCDEM"),
    (r"[Pp]řísah[ay][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",  "Přísaha"),
    (r"[Zz]elen[íi][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",   "Zelení"),
    (r"SPOLU[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",          "SPOLU"),
    (r"SPD\s*(?:a\s+spol\.|4K|4k)[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%","SPD4K"),
    (r"Svobodn[íi][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",    "Svobodní"),
    (r"Trikolora[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",      "Trikolora"),
    (r"PRO\b[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",          "PRO"),
]


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        return BeautifulSoup(r.text, "html.parser") if r.status_code == 200 else None
    except Exception as e:
        print(f"[ERROR] NMS fetch {url}: {e}")
        return None


def get_nms_links(max_pages=8):
    links = []
    seen  = set()
    for page in range(1, max_pages + 1):
        url  = NMS_ARCHIVE if page == 1 else f"{NMS_ARCHIVE}page/{page}/"
        soup = fetch(url)
        if not soup:
            break
        found = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            txt  = a.get_text().lower()
            if any(kw in txt for kw in ["volební", "model", "preference", "strany", "politick"]):
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
        soup = fetch(url)
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


def extract_dates(text):
    m = re.search(r"(?:sběr|dotazování|šetření)[^\n]{0,60}(\d+)\.\s*[–-]\s*(\d+)\.\s+(\w+)\s+(\d{4})", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        if mon:
            y = int(m.group(4))
            return f"{y}-{mon}-{int(m.group(1)):02d}", f"{y}-{mon}-{int(m.group(2)):02d}"
    m = re.search(r"od\s+(\d+)\.\s+do\s+(\d+)\.\s+(\w+)(?:\s+(\d{4}))?", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        y   = int(m.group(4)) if m.group(4) else date.today().year
        if mon:
            return f"{y}-{mon}-{int(m.group(1)):02d}", f"{y}-{mon}-{int(m.group(2)):02d}"
    m = re.search(r"(leden|únor|březen|duben|květen|červen|červenec|srpen|září|říjen|listopad|prosinec)\s+(\d{4})", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(1).lower())
        if mon:
            y = int(m.group(2))
            return f"{y}-{mon}-01", f"{y}-{mon}-28"
    return None, None


def scrape_article(url, title=""):
    soup = fetch(url)
    if not soup:
        return None
    print(f"[NMS] {url}")
    text = soup.get_text(" ", strip=True)

    if not any(kw in text.lower() for kw in ["volební model", "preference", "nms", "novinky"]):
        return None

    date_from, date_to = extract_dates(text)
    if not date_to:
        m = re.search(r"(leden|únor|březen|duben|květen|červen|červenec|srpen|září|říjen|listopad|prosinec)\s+(\d{4})", title, re.I)
        if m:
            mon = MONTHS_CS.get(m.group(1).lower())
            if mon:
                y = int(m.group(2))
                date_from = f"{y}-{mon}-01"
                date_to   = f"{y}-{mon}-28"
    if not date_to:
        return None

    parties = {}
    for pattern, pid in PARTY_PATTERNS:
        for val in re.findall(pattern, text):
            try:
                v = float(val.replace(",", "."))
                if 0.5 <= v <= 45.0 and pid not in parties:
                    parties[pid] = v
                    break
            except ValueError:
                pass
    if not parties:
        return None

    date_pub = date.today().isoformat()
    t = soup.find("time")
    if t and t.get("datetime"):
        date_pub = t["datetime"][:10]

    sample = None
    m = re.search(r"(?:N|n)\s*=\s*(\d{3,5})|(\d{3,5})\s+(?:dospělých\s+)?respondent", text)
    if m:
        sample = int(m.group(1) or m.group(2))

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
