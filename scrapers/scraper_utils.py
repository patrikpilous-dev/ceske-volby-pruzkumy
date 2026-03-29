"""
scraper_utils.py — Sdílené utility pro všechny scrapers
Retry logika, extrakce dat a stran ze stránek
"""

import re
import json
import time
import requests
from datetime import date
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ceske-volby.cz/1.0; +https://ceske-volby.cz)",
    "Accept-Language": "cs,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

MONTHS_CS = {
    "leden":"01","ledna":"01","únor":"02","února":"02",
    "březen":"03","března":"03","duben":"04","dubna":"04",
    "květen":"05","května":"05","červen":"06","června":"06",
    "červenec":"07","července":"07","srpen":"08","srpna":"08",
    "září":"09","října":"10","říjen":"10","listopad":"11","listopadu":"11",
    "prosinec":"12","prosince":"12",
}

MONTHS_NUM_TO_NAME = {
    "01":"leden","02":"únor","03":"březen","04":"duben","05":"květen","06":"červen",
    "07":"červenec","08":"srpen","09":"září","10":"říjen","11":"listopad","12":"prosinec",
}

# Kompletní vzory stran — seřazeno od specifičtějších k obecnějším
# SPD4K musí být před SPD!
PARTY_PATTERNS = [
    (r"(?:hnutí\s+)?ANO\b[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",    "ANO"),
    (r"ODS[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                    "ODS"),
    (r"STAN[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                   "STAN"),
    (r"[Ss]tarostov[éěů][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",      "STAN"),
    (r"[Pp]irát[iůé][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",          "Piráti"),
    # SPD4K PŘED SPD
    (r"SPD\s*(?:a\s+spol\.|4K|4k)[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%", "SPD4K"),
    (r"SPD[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                    "SPD"),
    (r"[Mm]otorist[éěů][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",       "Motoristé"),
    (r"TOP\s*09[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",               "TOP09"),
    (r"KDU[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                    "KDUČSL"),
    (r"KSČM[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                   "KSČM"),
    (r"[Ss]tačilo[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",             "Stačilo"),
    (r"SOCDEM[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                 "SOCDEM"),
    (r"ČSSD[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                   "SOCDEM"),
    (r"[Pp]řísah[ay][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",          "Přísaha"),
    (r"[Zz]elen[íi][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",           "Zelení"),
    (r"SPOLU[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                  "SPOLU"),
    (r"Svobodn[íi][^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",            "Svobodní"),
    (r"Trikolora[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",              "Trikolora"),
    (r"PRO\b[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",                  "PRO"),
    (r"Naš[ei]\s*[Čč]esko[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",    "NašeČesko"),
    (r"[Pp]řísaha[^\d(]{0,20}\(?(\d+[,.]?\d*)\s*%",             "Přísaha"),
]


# ---------- Fetch s retry ----------

def fetch_with_retry(url, max_retries=3, backoff=2.0, session=None):
    """
    Stáhne URL s retry logikou a exponenciálním backoffem.
    Vrátí BeautifulSoup nebo None při neúspěchu.
    """
    req = session or requests
    for attempt in range(max_retries):
        try:
            r = req.get(url, headers=HEADERS, timeout=20)
            if r.status_code == 200:
                return BeautifulSoup(r.text, "html.parser")
            elif r.status_code in (429, 503, 504):
                wait = backoff * (2 ** attempt)
                print(f"[WARN] {url} → HTTP {r.status_code}, čekám {wait:.0f}s (pokus {attempt+1}/{max_retries})")
                time.sleep(wait)
            elif r.status_code in (404, 410):
                return None  # Stránka neexistuje, nemá smysl opakovat
            else:
                print(f"[WARN] {url} → HTTP {r.status_code}")
                return None
        except requests.exceptions.Timeout:
            wait = backoff * (2 ** attempt)
            print(f"[WARN] Timeout {url}, pokus {attempt+1}/{max_retries}, čekám {wait:.0f}s")
            time.sleep(wait)
        except requests.exceptions.ConnectionError as e:
            wait = backoff * (2 ** attempt)
            print(f"[WARN] ConnectionError {url}: {e}, pokus {attempt+1}/{max_retries}, čekám {wait:.0f}s")
            time.sleep(wait)
        except Exception as e:
            print(f"[ERROR] fetch {url}: {e}")
            return None
    print(f"[ERROR] Všechny pokusy selhaly pro {url}")
    return None


# ---------- Extrakce data publikace ----------

def extract_pub_date(soup):
    """
    Pokouší se najít datum publikace z metadat HTML stránky.
    Kontroluje: meta tagy, <time>, JSON-LD, URL.
    Vrátí 'YYYY-MM-DD' nebo None.
    """
    # 1) OG a article meta tagy
    for prop in ("article:published_time", "og:article:published_time",
                 "datePublished", "date", "DC.date.issued", "pubdate"):
        tag = (soup.find("meta", property=prop) or
               soup.find("meta", attrs={"name": prop}) or
               soup.find("meta", attrs={"itemprop": prop}))
        if tag and tag.get("content"):
            d = tag["content"][:10]
            if re.match(r"\d{4}-\d{2}-\d{2}", d):
                return d

    # 2) <time datetime="...">
    for t in soup.find_all("time"):
        dt = t.get("datetime", "")
        if re.match(r"\d{4}-\d{2}-\d{2}", dt):
            return dt[:10]

    # 3) JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            objs = data if isinstance(data, list) else [data]
            for obj in objs:
                for key in ("datePublished", "dateCreated", "dateModified"):
                    val = obj.get(key, "")
                    if val and re.match(r"\d{4}-\d{2}-\d{2}", str(val)):
                        return str(val)[:10]
        except Exception:
            pass

    # 4) Zkus najít datum v prvních 600 znacích textu stránky
    text_start = soup.get_text(" ", strip=True)[:600]
    m = re.search(r"(\d{1,2})\.\s+(\w+)\s+(\d{4})", text_start)
    if m:
        mon = MONTHS_CS.get(m.group(2).lower())
        if mon:
            try:
                return f"{int(m.group(3))}-{mon}-{int(m.group(1)):02d}"
            except Exception:
                pass

    return None


# ---------- Extrakce dat sběru ----------

def extract_fieldwork_dates(text):
    """
    Extrahuje datum sběru dat z textu článku.
    Vrátí (date_from, date_to) jako 'YYYY-MM-DD' nebo (None, None).
    Podporuje různé formáty + přechod přes měsíce.
    """
    # "od X. do Y. měsíce RRRR"
    m = re.search(r"od\s+(\d+)\.\s+do\s+(\d+)\.\s+(\w+)(?:\s+(\d{4}))?", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        y = int(m.group(4)) if m.group(4) else date.today().year
        if mon:
            return f"{y}-{mon}-{int(m.group(1)):02d}", f"{y}-{mon}-{int(m.group(2)):02d}"

    # Po klíčových slovech: "sběr dat / dotazování / šetření X. – Y. měsíce RRRR"
    m = re.search(
        r"(?:sběr(?:\s+dat)?|dotazování|šetření|terén)[^\n]{0,100}"
        r"(\d+)\.\s*[–\-]\s*(\d+)\.\s+(\w+)\s+(\d{4})",
        text, re.I
    )
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        if mon:
            y = int(m.group(4))
            return f"{y}-{mon}-{int(m.group(1)):02d}", f"{y}-{mon}-{int(m.group(2)):02d}"

    # "X. – Y. měsíce RRRR"
    m = re.search(r"(\d+)\.\s*[–\-]\s*(\d+)\.\s+(\w+)\s+(\d{4})", text, re.I)
    if m:
        mon = MONTHS_CS.get(m.group(3).lower())
        if mon:
            y = int(m.group(4))
            return f"{y}-{mon}-{int(m.group(1)):02d}", f"{y}-{mon}-{int(m.group(2)):02d}"

    # Přechod přes měsíce: "X. měsíce1 – Y. měsíce2 RRRR"
    m = re.search(
        r"(\d+)\.\s+(\w+)\s*[–\-]\s*(\d+)\.\s+(\w+)\s+(\d{4})",
        text, re.I
    )
    if m:
        mon1 = MONTHS_CS.get(m.group(2).lower())
        mon2 = MONTHS_CS.get(m.group(4).lower())
        y = int(m.group(5))
        if mon1 and mon2:
            return f"{y}-{mon1}-{int(m.group(1)):02d}", f"{y}-{mon2}-{int(m.group(3)):02d}"

    # Přechod přes měsíce: "mezi X. měsíce1 a Y. měsíce2 RRRR"
    m = re.search(
        r"mezi\s+(\d+)\.\s+(\w+)\s+a\s+(\d+)\.\s+(\w+)(?:\s+(\d{4}))?",
        text, re.I
    )
    if m:
        mon1 = MONTHS_CS.get(m.group(2).lower())
        mon2 = MONTHS_CS.get(m.group(4).lower())
        y = int(m.group(5)) if m.group(5) else date.today().year
        if mon1 and mon2:
            return f"{y}-{mon1}-{int(m.group(1)):02d}", f"{y}-{mon2}-{int(m.group(3)):02d}"

    # Fallback: jen "měsíc RRRR"
    m = re.search(
        r"\b(leden|únor|březen|duben|květen|červen|červenec|srpen|září|říjen|listopad|prosinec)\s+(\d{4})\b",
        text, re.I
    )
    if m:
        mon = MONTHS_CS.get(m.group(1).lower())
        if mon:
            y = int(m.group(2))
            return f"{y}-{mon}-01", f"{y}-{mon}-28"

    return None, None


# ---------- Extrakce stran z textu ----------

def extract_parties_from_text(text, patterns=None):
    """
    Extrahuje stranické výsledky z textu pomocí regex vzorů.
    Předzpracování odstraní fráze 'o X %' (změny preferencí) aby nebyla
    zachycena změna místo skutečné preference (např. 'STAN předstihlo ODS o 1,5 %').
    """
    if patterns is None:
        patterns = PARTY_PATTERNS
    # Odstraň fráze "o X,X %" a "ze X,X %" (změny preferencí, nikoli samotné preference)
    # Např. "STAN předstihlo ODS o 1,5 %" → "STAN předstihlo ODS "
    cleaned = re.sub(r'\bo\s+\d+[,.]?\d*\s*%', '', text)
    cleaned = re.sub(r'\bze?\s+\d+[,.]?\d*\s*%', '', cleaned)
    parties = {}
    for pattern, pid in patterns:
        for val in re.findall(pattern, cleaned):
            try:
                v = float(str(val).replace(",", "."))
                if 0.5 <= v <= 45.0 and pid not in parties:
                    parties[pid] = v
                    break
            except ValueError:
                pass
    return parties


# ---------- Extrakce stran z tabulky ----------

def extract_parties_from_table(soup, min_parties=3):
    """
    Pokusí se extrahovat stranické výsledky z HTML tabulky.
    Vrátí slovník {jméno_strany: procento} nebo {}.
    """
    best = {}
    for table in soup.find_all("table"):
        parties = _parse_table(table)
        if len(parties) >= min_parties and len(parties) > len(best):
            best = parties
            if len(best) >= 5:
                break  # Dostatečně dobrá tabulka
    return best


def _parse_table(table):
    """Interní: parsování jedné HTML tabulky."""
    parties = {}
    rows = table.find_all("tr")
    if len(rows) < 2:
        return {}

    headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]

    # Najdi sloupec s procenty
    pct_col = None
    for i, h in enumerate(headers):
        if "%" in h or "podíl" in h or "volilo" in h or "procent" in h:
            pct_col = i
            break

    # Pokud není explicitní %, zkus druhý sloupec, kde jsou čísla
    if pct_col is None:
        for test_col in [1, 2]:
            numeric_count = 0
            for row in rows[1:5]:
                cells = row.find_all(["td", "th"])
                if len(cells) > test_col:
                    val = cells[test_col].get_text(strip=True).replace(",", ".").replace("%", "")
                    try:
                        v = float(val)
                        if 0.5 <= v <= 45.0:
                            numeric_count += 1
                    except ValueError:
                        pass
            if numeric_count >= 2:
                pct_col = test_col
                break

    if pct_col is None:
        return {}

    for row in rows[1:]:
        cells = row.find_all(["td", "th"])
        if len(cells) <= pct_col:
            continue
        name = cells[0].get_text(strip=True)
        if not name or len(name) > 60:
            continue
        val_text = cells[pct_col].get_text(strip=True).replace(",", ".").replace("%", "").strip()
        try:
            v = float(val_text)
            if 0.5 <= v <= 45.0:
                parties[name] = v
        except ValueError:
            pass

    return parties


# ---------- Extrakce velikosti vzorku ----------

def extract_sample_size(text):
    """Extrahuje velikost vzorku respondentů z textu."""
    # "N = 1234" nebo "n=1000"
    m = re.search(r"\bn\s*=\s*(\d{3,5})\b", text, re.I)
    if m:
        return int(m.group(1))
    # "1234 respondentů"
    m = re.search(r"(\d{3,5})\s+(?:dospělých\s+)?respondent", text, re.I)
    if m:
        return int(m.group(1))
    # "1234 náhodně vybraných" / "1234 oslovených"
    m = re.search(r"(\d{3,5})\s+(?:náhodně\s+vybraných|oslovených|dotázaných)", text, re.I)
    if m:
        return int(m.group(1))
    # "vzorek: 1234"
    m = re.search(r"vzorek[:\s]+(\d{3,5})", text, re.I)
    if m:
        return int(m.group(1))
    return None


# ---------- Pomocné ----------

def month_url_to_date(url):
    """
    Z URL tvaru /volebni-tendence-ceske-verejnosti-leden-2025/
    vrátí (date_from, date_to) nebo (None, None).
    """
    for cs_month, num in MONTHS_CS.items():
        if cs_month in url.lower():
            yr = re.search(r"(\d{4})", url)
            if yr:
                y = int(yr.group(1))
                return f"{y}-{num}-01", f"{y}-{num}-28"
    return None, None
