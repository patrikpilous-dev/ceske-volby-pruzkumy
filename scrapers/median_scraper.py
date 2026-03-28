"""
median_scraper.py — Scraper pro Median (median.eu)
Publikuje měsíčně, kategorie: median.eu/cs/?cat=6
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

BASE = "https://www.median.eu"
CAT  = f"{BASE}/cs/?cat=6"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ceske-volby.cz/1.0)"}

MONTHS_CS = {
    "leden":"01","ledna":"01","únor":"02","února":"02","březen":"03","března":"03",
    "duben":"04","dubna":"04","květen":"05","května":"05","červen":"06","června":"06",
    "červenec":"07","července":"07","srpen":"08","srpna":"08","září":"09",
    "říjen":"10","října":"10","listopad":"11","listopadu":"11","prosinec":"12","prosince":"12",
}

PARTY_PATTERNS = [
    (r"ANO[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "ANO"),
    (r"ODS[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "ODS"),
    (r"STAN[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "STAN"),
    (r"Starostov[éé][^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "STAN"),
    (r"[Pp]irát[iů][^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "Piráti"),
    (r"SPOLU[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "SPOLU"),
    (r"SPD[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "SPD"),
    (r"[Mm]otorist[éů][^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "Motoristé"),
    (r"TOP\s*09[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "TOP09"),
    (r"KDU[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "KDUČSL"),
    (r"KSČM[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "KSČM"),
    (r"[Ss]tačilo[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "Stačilo"),
    (r"SOCDEM[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "SOCDEM"),
    (r"ČSSD[^\d(]{0,12}\(?(\d+[,.]?\d*)\s*%", "SOCDEM"),
]


def get_article_list(max_pages=1):
    articles = []
    seen = set()
    for page in range(1, max_pages + 1):
        url = CAT if page == 1 else f"{BASE}/cs/?cat=6&paged={page}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(r.text, "html.parser")
            found = 0
            for a in soup.find_all("a", href=True):
                href = a["href"]
                txt  = a.get_text().lower()
                if any(kw in txt for kw in ["model","preference","volební","sněmovn"]) or "volebni" in href.lower():
                    full = href if href.startswith("http") else BASE + href
                    if full not in seen:
                        seen.add(full)
                        articles.append({"url": full, "title": a.get_text().strip()})
                        found += 1
            if found == 0:
                break  # Žádná další stránka
            time.sleep(1)
        except Exception as e:
            print(f"[ERROR] Median stránka {page}: {e}")
            break
    return articles


def extract_dates(text):
    m = re.search(r"mezi\s+(\d+)\.\s+(\w+)\s+a\s+(\d+)\.\s+(\w+)(?:\s+(\d{4}))?", text, re.I)
    if m:
        mon1 = MONTHS_CS.get(m.group(2).lower())
        mon2 = MONTHS_CS.get(m.group(4).lower())
        year = int(m.group(5)) if m.group(5) else date.today().year
        if mon1 and mon2:
            return f"{year}-{mon1}-{int(m.group(1)):02d}", f"{year}-{mon2}-{int(m.group(3)):02d}"
    m = re.search(r"od\s+(\d+)\.\s+do\s+(\d+)\.\s+(\w+)(?:\s+(\d{4}))?", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        year = int(m.group(4)) if m.group(4) else date.today().year
        if mon:
            return f"{year}-{mon}-{int(m.group(1)):02d}", f"{year}-{mon}-{int(m.group(2)):02d}"
    return None, None


def scrape_article(url, title=""):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
        return None

    print(f"[Median] {url}")
    text = soup.get_text(" ", strip=True)
    if not any(kw in text.lower() for kw in ["volební model","preference","ano"]):
        return None

    date_from, date_to = extract_dates(text)
    if not date_to:
        m = re.search(r"(\w+)\s+(\d{4})", title)
        if m:
            mon = MONTHS_CS.get(m.group(1).lower())
            if mon:
                year = int(m.group(2))
                date_from = f"{year}-{mon}-01"
                date_to   = f"{year}-{mon}-28"
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

    poll_type = "model"
    if "voličské preference" in text.lower() and "volební model" not in text.lower():
        poll_type = "preference"

    view = "coalitions" if "SPOLU" in parties else "parties"

    m2 = re.search(r"(\d{3,5})\s+(?:dospělých\s+)?respondent", text)
    sample = int(m2.group(1)) if m2 else None

    return build_poll_record(
        agency="Median",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type=poll_type,
        view=view,
        sample_size=sample,
        method="CAPI",
        client="Český rozhlas",
        source_url=url,
    )


def run_scraper(historical=False):
    print(f"[Median] start (historical={historical})")
    articles = get_article_list(max_pages=20 if historical else 1)  # 20 stránek pokryje 4+ roky
    limit = len(articles) if historical else 3
    new = 0
    for a in articles[:limit]:
        rec = scrape_article(a["url"], a["title"])
        if rec and save_poll(rec):
            new += 1
        time.sleep(1.5)
    print(f"[Median] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
