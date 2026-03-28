"""
wikipedia_scraper.py — Scraper pro historická data z Wikipedie (CS)
Doplňuje data od roku 2022, která nejsou dostupná přes primární scrapers.

Zdrojová stránka:
  https://cs.wikipedia.org/wiki/Průzkumy_před_volbami_do_Poslanecké_sněmovny_ČR_2025
  (a starší stránky pro roky 2021–2025)

Wiki tabulky mají sloupce: Agentura, Datum, Zveřejnění, ANO, ODS, STAN, Piráti, ...
"""

import re
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import MONTHS_CS, fetch_with_retry
from normalizer import build_poll_record, save_poll, normalize_party_name, validate_percentage

# Kandidátní URL — Wikipedie mění názvy článků, zkusíme více variant
WIKI_URLS = [
    # 2025 volby
    "https://cs.wikipedia.org/wiki/Průzkumy_veřejného_mínění_k_volbám_do_Poslanecké_sněmovny_Parlamentu_ČR_(2025)",
    "https://cs.wikipedia.org/wiki/Průzkumy_před_volbami_do_Poslanecké_sněmovny_2025",
    "https://cs.wikipedia.org/wiki/Volební_průzkumy_do_Poslanecké_sněmovny_2025",
    "https://cs.wikipedia.org/wiki/Průzkumy_volební_preference_do_Sněmovny_ČR_(2021–2025)",
    "https://cs.wikipedia.org/wiki/Průzkumy_volebních_preferencí_do_sněmovny_2021–2025",
    # Obecná stránka o průzkumech
    "https://cs.wikipedia.org/wiki/Průzkumy_volební_preference_do_Sněmovny_ČR",
    "https://cs.wikipedia.org/wiki/Volební_průzkumy_v_Česku",
]

# Mapování názvů agentur z Wikipedie na naše identifikátory
AGENCY_MAP = {
    "stem":     "STEM",
    "median":   "Median",
    "kantar":   "Kantar",
    "ipsos":    "Ipsos",
    "cvvm":     "CVVM",
    "nms":      "NMS",
    "ppm":      "PPM",
    "sanep":    "SANEP",
    "phoenix":  "Phoenix",
    "focus":    "Focus",
    "data":     "Data",
}

# Mapování názvů stran z Wiki sloupců → naše ID
# Wiki používá různé zkratky a plné názvy
WIKI_PARTY_MAP = {
    "ano":          "ANO",
    "ano 2011":     "ANO",
    "ods":          "ODS",
    "stan":         "STAN",
    "starostové":   "STAN",
    "piráti":       "Piráti",
    "česká pirátská strana": "Piráti",
    "pirátská strana": "Piráti",
    "spd":          "SPD",
    "spd4k":        "SPD4K",
    "motoristé":    "Motoristé",
    "motoristé sobě": "Motoristé",
    "top 09":       "TOP09",
    "top09":        "TOP09",
    "kdu-čsl":      "KDUČSL",
    "kdu":          "KDUČSL",
    "kdučsl":       "KDUČSL",
    "ksčm":         "KSČM",
    "stačilo":      "Stačilo",
    "socdem":       "SOCDEM",
    "čssd":         "SOCDEM",
    "přísaha":      "Přísaha",
    "zelení":       "Zelení",
    "spolu":        "SPOLU",
    "svobodní":     "Svobodní",
    "trikolóra":    "Trikolora",
    "trikolora":    "Trikolora",
    "pro":          "PRO",
    "naše česko":   "NašeČesko",
    "piráti a starostové": "PirátéSTAN",
    "piráti+stan":  "PirátéSTAN",
    "koalice spolu": "SPOLU",
}


def find_wiki_page():
    """Zkusí najít funkční Wiki stránku s průzkumy."""
    for url in WIKI_URLS:
        print(f"[Wiki] Zkouším {url}")
        soup = fetch_with_retry(url)
        if soup:
            # Ověř, že stránka má tabulky s daty průzkumů
            tables = soup.find_all("table", class_=re.compile(r"wikitable"))
            if tables:
                print(f"[Wiki] Nalezena stránka s {len(tables)} tabulkami: {url}")
                return soup, url
        time.sleep(1.0)
    return None, None


def parse_date_cell(cell_text):
    """
    Parsuje datum ze Wiki buňky.
    Formáty: "1. – 7. 1. 2022", "leden 2022", "1.1.2022", "2022-01-15"
    Vrátí (date_from, date_to) nebo (None, None).
    """
    t = cell_text.strip()

    # ISO formát: 2022-01-15
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", t)
    if m:
        return t[:10], t[:10]

    # "1.1.2022" nebo "1. 1. 2022"
    m = re.match(r"(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})", t)
    if m:
        d = f"{int(m.group(3))}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
        return d, d

    # "1. – 7. 1. 2022" nebo "1.-7.1.2022"
    m = re.match(r"(\d{1,2})\.\s*[–\-]\s*(\d{1,2})\.\s+(\d{1,2})\.\s*(\d{4})", t)
    if m:
        y, mo = int(m.group(4)), int(m.group(3))
        d1 = f"{y}-{mo:02d}-{int(m.group(1)):02d}"
        d2 = f"{y}-{mo:02d}-{int(m.group(2)):02d}"
        return d1, d2

    # "1. 1. – 7. 1. 2022" (přechod přes měsíce)
    m = re.match(
        r"(\d{1,2})\.\s+(\d{1,2})\.\s*[–\-]\s*(\d{1,2})\.\s+(\d{1,2})\.\s*(\d{4})", t
    )
    if m:
        y = int(m.group(5))
        d1 = f"{y}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
        d2 = f"{y}-{int(m.group(4)):02d}-{int(m.group(3)):02d}"
        return d1, d2

    # Textový formát: "1. – 7. ledna 2022", "3.–10. února 2022"
    m = re.search(
        r"(\d{1,2})\.\s*[–\-]\s*(\d{1,2})\.\s+"
        r"(leden|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince|"
        r"únor|březen|duben|květen|červen|červenec|srpen|říjen|listopad|prosinec|ledna)\s+(\d{4})",
        t, re.I
    )
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        if mon:
            y = int(m.group(4))
            return (f"{y}-{mon}-{int(m.group(1)):02d}",
                    f"{y}-{mon}-{int(m.group(2)):02d}")

    # Jen měsíc a rok: "leden 2022" nebo "1/2022"
    m = re.search(
        r"(leden|únor|březen|duben|květen|červen|červenec|srpen|září|říjen|listopad|prosinec)\s+(\d{4})",
        t, re.I
    )
    if m:
        mon = MONTHS_CS.get(m.group(1).lower())
        if mon:
            y = int(m.group(2))
            return f"{y}-{mon}-01", f"{y}-{mon}-28"

    m = re.match(r"(\d{1,2})/(\d{4})", t)
    if m:
        mo, y = int(m.group(1)), int(m.group(2))
        return f"{y}-{mo:02d}-01", f"{y}-{mo:02d}-28"

    return None, None


def normalize_agency(text):
    """Normalizuje název agentury z Wiki na naše ID."""
    t = text.lower().strip()
    for key, val in AGENCY_MAP.items():
        if key in t:
            return val
    return text.strip()


def parse_wiki_tables(soup, source_url):
    """
    Parsuje všechny wikitable z Wiki stránky.
    Vrátí seznam poll recordů.
    """
    records = []
    tables  = soup.find_all("table", class_=re.compile(r"wikitable"))

    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 3:
            continue

        # Extrahuj hlavičku
        header_row = rows[0]
        headers = [th.get_text(" ", strip=True).lower()
                   for th in header_row.find_all(["th", "td"])]

        # Identifikuj sloupce
        col_agency  = _find_col(headers, ["agentura", "instituce", "společnost"])
        col_date    = _find_col(headers, ["datum", "sběr", "terén", "dotazování"])
        col_pub     = _find_col(headers, ["zveřejn", "publikov", "vydán"])

        if col_date is None:
            continue  # Tabulka nemá sloupec s datem

        # Identifikuj sloupce stran
        party_cols = {}
        for i, h in enumerate(headers):
            if i in (col_agency, col_date, col_pub):
                continue
            # Zkus přiřadit ke straně
            h_clean = h.strip().rstrip("*†‡").strip()
            # Přesná shoda
            canon = WIKI_PARTY_MAP.get(h_clean)
            if canon:
                party_cols[i] = canon
                continue
            # Přes normalize_party_name z normalizeru
            canon = normalize_party_name(h_clean)
            if canon:
                party_cols[i] = canon

        if not party_cols:
            continue

        # Parsuj řádky s daty
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue

            # Některé Wiki tabulky mají rowspan — BeautifulSoup je neřeší nativně
            # Pracujeme s tím co máme
            def cell(i):
                if i is not None and i < len(cells):
                    return cells[i].get_text(" ", strip=True)
                return ""

            # Agentura
            agency_raw = cell(col_agency) if col_agency is not None else ""
            agency     = normalize_agency(agency_raw) if agency_raw else None

            # Datum sběru
            date_raw  = cell(col_date)
            date_from, date_to = parse_date_cell(date_raw)
            if not date_to:
                continue

            # Jen data od 2022-01-01
            if date_to < "2022-01-01":
                continue

            # Datum publikace
            pub_raw  = cell(col_pub) if col_pub is not None else ""
            date_pub, _ = parse_date_cell(pub_raw)
            if not date_pub:
                date_pub = date_to  # Fallback

            # Strany
            parties = {}
            for col_i, party_id in party_cols.items():
                val_text = cell(col_i).replace(",", ".").replace("%", "").strip()
                # Odstraň poznámky (čísla v závorkách, hvězdičky)
                val_text = re.sub(r"[\[\]†‡*].*", "", val_text).strip()
                v = validate_percentage(val_text)
                if v is not None and party_id not in parties:
                    parties[party_id] = v

            if not parties or len(parties) < 3:
                continue

            if not agency:
                continue

            rec = build_poll_record(
                agency=agency,
                date_published=date_pub,
                date_fieldwork_from=date_from or date_to,
                date_fieldwork_to=date_to,
                raw_parties=parties,
                poll_type="model",
                view="coalitions" if "SPOLU" in parties else "parties",
                source_url=source_url,
            )
            if rec:
                records.append(rec)

    return records


def _find_col(headers, keywords):
    """Najde index sloupce, jehož název obsahuje jedno z klíčových slov."""
    for i, h in enumerate(headers):
        if any(kw in h for kw in keywords):
            return i
    return None


def run_scraper(historical=False):
    """
    Stáhne historická data z Wikipedie.
    Vždy běží celé (wiki slouží jako záplata pro historická data).
    """
    print(f"[Wiki] start (historical={historical})")

    soup, url = find_wiki_page()
    if not soup:
        print("[Wiki] Nepodařilo se najít Wiki stránku s průzkumy.")
        return 0

    records = parse_wiki_tables(soup, url)
    print(f"[Wiki] Nalezeno {len(records)} záznamů z tabulek")

    new = 0
    for rec in records:
        if save_poll(rec):
            new += 1

    print(f"[Wiki] hotovo, přidáno {new}")
    return new


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true")
    run_scraper(historical=p.parse_args().historical)
