"""
nms_scraper.py — Scraper pro NMS (nms.global)
Volební model pro Novinky.cz, ~měsíčně.
Výpis: nms.global/cz/media-blog?id=posts-cz&ucat=869, historie ze sitemapy.
Termín sběru bere z metodiky článku („Sběr dat probíhal … od 3. 6. do 8. 6. 2026“),
nikdy z data stažení. ID záznamu = konec sběru, takže opakované stažení
téhož článku nevyrobí nový záznam.
"""

import re
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import (
    HEADERS, fetch_with_retry, extract_pub_date, extract_fieldwork_dates,
    extract_parties_nearest, extract_sample_size,
    verify_in_source,
)
from normalizer import build_poll_record, save_poll

NMS_BASE = "https://nms.global"
NMS_LIST = f"{NMS_BASE}/cz/media-blog?id=posts-cz&ucat=869"
NMS_SITEMAP = f"{NMS_BASE}/post-sitemap.xml"
# Jen celostátní měsíční modely: /cz/volebni-model-rijen-2026-…/
# (krajské a pražské modely mají v URL název kraje místo měsíce)
ARTICLE_RE = re.compile(
    r"^https://nms\.global/cz/volebni-model-(?:leden|unor|brezen|duben|kveten|cerven|"
    r"cervenec|srpen|zari|rijen|listopad|prosinec)-\d{4}[a-z0-9\-]*/$"
)


def get_article_urls(historical=False):
    """
    Seznam článků z výpisu blogu (nejnovější) a ze sitemapy (celá historie).
    Stránkování blogu nefiltruje podle kategorie, sitemapa má všechno.
    """
    urls = []
    soup = fetch_with_retry(NMS_LIST)
    if soup:
        for a in soup.find_all("a", href=True):
            href = a["href"].split("#")[0]
            if ARTICLE_RE.match(href) and href not in urls:
                urls.append(href)
    if historical:
        try:
            r = requests.get(NMS_SITEMAP, headers=HEADERS, timeout=20)
            for loc in re.findall(r"<loc>([^<]+)</loc>", r.text):
                if ARTICLE_RE.match(loc) and loc not in urls:
                    urls.append(loc)
        except requests.RequestException as e:
            print(f"[NMS] sitemapa: {e}")
    return urls


def scrape_article(url):
    soup = fetch_with_retry(url)
    if not soup:
        return None
    print(f"[NMS] {url}")
    for tag in soup(["script", "style", "nav", "header", "footer"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)

    # Termín sběru jen z metodiky článku
    m = re.search(r"Sběr dat probíhal.{0,200}", text)
    date_from, date_to = extract_fieldwork_dates(m.group(0) if m else text)
    if not date_to:
        print(f"[NMS] Nenalezen termín sběru v {url}")
        return None

    # Čísla stran: úvod a „Výsledky volebního modelu“, bez intervalů a demografie
    body = re.split(
        r"Výsledky volebního modelu v intervalu|Kde strany berou|Metodologie volebního modelu",
        text,
    )[0]
    parties = extract_parties_nearest(body)
    if len(parties) < 4:
        print(f"[NMS] Málo stran ({len(parties)}) v {url}")
        return None

    date_pub = extract_pub_date(soup)
    if not date_pub:
        print(f"[NMS] Chybí datum vydání v {url}")
        return None

    rec = build_poll_record(
        agency="NMS",
        date_published=date_pub,
        date_fieldwork_from=date_from or date_to,
        date_fieldwork_to=date_to,
        raw_parties=parties,
        poll_type="model",
        view="coalitions" if "SPOLU" in parties else "parties",
        sample_size=extract_sample_size(text),
        method="CAWI",
        client="Novinky.cz",
        source_url=url,
    )
    # Dvojí čtení: číslo musí ve zdroji stát u jména strany, jinak karanténa
    bad = verify_in_source(body, parties)
    if rec and bad:
        rec["neovereno"] = bad
    return rec


def scrape_all(historical=False):
    """Vrátí seznam záznamů bez ukládání (pro opravu dat)."""
    urls = get_article_urls(historical)
    records = []
    for url in urls:
        rec = scrape_article(url)
        if rec:
            records.append(rec)
        time.sleep(1.5)
    return records


def run_scraper(historical=False):
    print(f"[NMS] start (historical={historical})")
    new = 0
    for rec in scrape_all(historical):
        if save_poll(rec):
            new += 1
    print(f"[NMS] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
