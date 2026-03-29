"""
kantar_infogram_scraper.py — Scraper pro Kantar CZ Infogram chart
Zdroj: https://cz.kantar.com/trendyceska/  (Infogram: Model Kantar – Trendy Česka)
Chart ID: 81040855-01fa-4085-9f57-b024ff49e9d3
"""

import re
import sys
import json
import calendar
import requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from normalizer import build_poll_record, save_poll

INFOGRAM_URL = "https://e.infogram.com/81040855-01fa-4085-9f57-b024ff49e9d3"

MONTH_MAP = {
    "leden": "01", "únor": "02", "únorr": "02", "březen": "03",
    "duben": "04", "květen": "05", "červen": "06", "červenec": "07",
    "srpen": "08", "září": "09", "říjen": "10", "listopad": "11", "prosinec": "12",
}

def parse_month_label(label):
    """'Březen\u201924' -> ('2024', '03')"""
    label = label.strip().replace("\u2019", "'").replace("\u00b4", "'").replace("`", "'")
    # Remove spaces before apostrophe: "Únor '26" -> "Únor'26"
    label = re.sub(r"\s+'", "'", label)
    m = re.match(r"([A-Za-záčďéěíňóřšťůúýžÁČĎÉĚÍŇÓŘŠŤŮÚÝŽ]+)'(\d{2})\*?$", label, re.UNICODE)
    if not m:
        return None, None
    month_name = m.group(1).lower()
    year_suffix = m.group(2)
    year = "20" + year_suffix
    month = MONTH_MAP.get(month_name)
    if not month:
        return None, None
    return year, month


def last_day(year, month):
    return calendar.monthrange(int(year), int(month))[1]


def fetch_infogram_data():
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    r = requests.get(INFOGRAM_URL, headers=headers, timeout=20)
    r.raise_for_status()

    m = re.search(r"window\.infographicData\s*=\s*(\{.+)", r.text)
    if not m:
        raise ValueError("window.infographicData not found")

    raw = m.group(1)
    depth, end = 0, 0
    for i, c in enumerate(raw):
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    data = json.loads(raw[:end])

    # Navigate to chartData
    entities = data["elements"]["content"]["content"]["entities"]
    for eid, ent in entities.items():
        if "chartData" in ent.get("props", {}):
            return ent["props"]["chartData"]["data"][0]
    raise ValueError("chartData not found in Infogram JSON")


def parse_value(v):
    if not v and v != 0:
        return None
    s = str(v).strip().replace(",", ".")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def run_scraper():
    print("[KantarInfogram] Fetching Infogram chart...")
    rows = fetch_infogram_data()

    def cell_val(c):
        if isinstance(c, dict):
            return c.get("value", "")
        return str(c) if c is not None else ""

    # Row 0 = column headers
    header = [cell_val(c).strip() for c in rows[0]]
    # header[0] is empty (row label column), rest are party names
    party_cols = header[1:]

    print(f"[KantarInfogram] Parties: {party_cols}")
    print(f"[KantarInfogram] Data rows: {len(rows) - 1}")

    new_count = 0
    for row in rows[1:]:
        label = cell_val(row[0]).strip()
        if not label:
            continue

        # Skip rows marked with * (no survey that month)
        if label.endswith("*"):
            continue

        year, month = parse_month_label(label)
        if not year or not month:
            print(f"  [SKIP] Cannot parse date label: {repr(label)}")
            continue

        # Build parties dict
        raw_parties = {}
        for i, party_name in enumerate(party_cols):
            if not party_name:
                continue
            v = parse_value(cell_val(row[i + 1]) if i + 1 < len(row) else "")
            if v is not None and v > 0:
                raw_parties[party_name] = v

        if len(raw_parties) < 4:
            print(f"  [SKIP] Too few parties for {label}: {raw_parties}")
            continue

        # Date: use last day of fieldwork month
        day = last_day(year, month)
        date_to = f"{year}-{month}-{day:02d}"
        date_from = f"{year}-{month}-01"

        rec = build_poll_record(
            agency="Kantar",
            date_published=date_to,
            date_fieldwork_from=date_from,
            date_fieldwork_to=date_to,
            raw_parties=raw_parties,
            poll_type="model",
            view="parties",   # Infogram always shows individual parties
            sample_size=1000,
            method="mixed",
            client="Česká televize",
            source_url=INFOGRAM_URL,
        )

        if rec and save_poll(rec):
            new_count += 1
            print(f"  [OK] {label} -> {date_to}: {rec['parties']}")
        else:
            print(f"  [SKIP] {label} -> {date_to} already exists or invalid")

    print(f"[KantarInfogram] Hotovo, přidáno {new_count} průzkumů")
    return new_count


if __name__ == "__main__":
    run_scraper()
