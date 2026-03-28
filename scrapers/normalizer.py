"""
normalizer.py — Normalizátor volebních průzkumů
Převede surová data z libovolného scraperu na kanonický formát polls.json
"""

import json
import re
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
ALIASES_FILE = BASE_DIR / "data" / "party_aliases.json"
POLLS_FILE   = BASE_DIR / "data" / "polls.json"
LATEST_FILE  = BASE_DIR / "data" / "latest.json"
UPDATE_FILE  = BASE_DIR / "data" / "last_update.json"

# ---------- Načtení aliasů ----------

def load_aliases():
    with open(ALIASES_FILE, encoding="utf-8") as f:
        data = json.load(f)
    alias_map = {}
    for canon_id, info in data["parties"].items():
        for alias in info["aliases"]:
            alias_map[alias.lower().strip()] = canon_id
    for canon_id, info in data["coalitions"].items():
        for alias in info["aliases"]:
            alias_map[alias.lower().strip()] = canon_id
    return alias_map

ALIAS_MAP = load_aliases()

# ---------- Normalizace názvů ----------

def normalize_party_name(raw_name: str) -> str | None:
    key = raw_name.lower().strip()
    if key in ALIAS_MAP:
        return ALIAS_MAP[key]
    cleaned = re.sub(r"[()~]", "", key).strip()
    if cleaned in ALIAS_MAP:
        return ALIAS_MAP[cleaned]
    for alias, canon in ALIAS_MAP.items():
        if alias in key or key in alias:
            return canon
    return None

# ---------- Validace ----------

# Realistické meze: žádná strana/koalice nemá méně než 0,5 % ani více než 45 %
POLL_MIN = 0.5
POLL_MAX = 45.0

def validate_percentage(value) -> float | None:
    try:
        v = float(str(value).replace(",", ".").replace("%", "").strip())
        if POLL_MIN <= v <= POLL_MAX:
            return round(v, 1)
        if v > POLL_MAX:
            print(f"[WARN] Hodnota {v} % překračuje maximum {POLL_MAX} % — přeskočeno")
        return None
    except (ValueError, TypeError):
        return None

# ---------- Načtení / uložení ----------

def load_polls() -> list:
    if POLLS_FILE.exists():
        with open(POLLS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return []

def poll_exists(polls: list, new_poll: dict) -> bool:
    for p in polls:
        if p["id"] == new_poll["id"]:
            return True
        if (p["agency"] == new_poll["agency"] and
                p["date_fieldwork_to"] == new_poll["date_fieldwork_to"] and
                p["type"] == new_poll["type"]):
            return True
    return False

# ---------- Sestavení záznamu ----------

def build_poll_record(
    agency: str,
    date_published: str,
    date_fieldwork_from: str,
    date_fieldwork_to: str,
    raw_parties: dict,
    poll_type: str = "model",
    view: str = "parties",
    sample_size: int = None,
    method: str = None,
    client: str = None,
    source_url: str = None,
    coalition_notes: dict = None,
) -> dict | None:

    parties_normalized = {}
    unknown = []

    for raw_name, raw_value in raw_parties.items():
        canon_id = normalize_party_name(raw_name)
        value = validate_percentage(raw_value)
        if canon_id and value is not None:
            parties_normalized[canon_id] = value
        elif not canon_id and value is not None:
            # Nová/neznámá strana — ulož s původním názvem, aby se neztratila
            # Přidej ji ručně do party_aliases.json až se stabilizuje
            clean = raw_name.strip()
            if 2 <= len(clean) <= 40:
                parties_normalized[clean] = value
                unknown.append(clean)

    if not parties_normalized:
        print(f"[WARN] Žádné strany normalizovány pro {agency} {date_published}")
        return None

    # Sanity check: součet všech stran by neměl přesáhnout 130 % (průzkumy nepočítají 100 %)
    total = sum(parties_normalized.values())
    if total > 130:
        print(f"[WARN] Odmítnut {agency} {date_fieldwork_to}: součet preferencí {total:.1f} % (podezřelé)")
        return None

    if unknown:
        print(f"[WARN] Neznámé strany v {agency} {date_fieldwork_to}: {unknown}")

    safe_agency = agency.lower().replace(" ", "_").replace("/", "_")
    poll_id = f"{safe_agency}-{date_fieldwork_to}"

    return {
        "id": poll_id,
        "agency": agency,
        "date_published": date_published,
        "date_fieldwork_from": date_fieldwork_from,
        "date_fieldwork_to": date_fieldwork_to,
        "type": poll_type,
        "view": view,
        "sample_size": sample_size,
        "method": method,
        "client": client,
        "parties": parties_normalized,
        "coalition_notes": coalition_notes or {},
        "source_url": source_url,
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }

# ---------- Uložení ----------

def save_poll(record: dict) -> bool:
    """Vrátí True pokud byl přidán nový průzkum."""
    polls = load_polls()
    if poll_exists(polls, record):
        print(f"[SKIP] {record['id']} již existuje.")
        return False

    polls.append(record)
    polls.sort(key=lambda x: x["date_fieldwork_to"], reverse=True)

    with open(POLLS_FILE, "w", encoding="utf-8") as f:
        json.dump(polls, f, ensure_ascii=False, indent=2)

    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(polls[:60], f, ensure_ascii=False, indent=2)

    # Aktualizuj last_update.json
    update = {
        "last_run": datetime.utcnow().isoformat() + "Z",
        "new_polls_found": 1,
        "latest_poll": {
            "agency": record["agency"],
            "date_published": record["date_published"],
            "date_fieldwork_to": record["date_fieldwork_to"],
        }
    }
    with open(UPDATE_FILE, "w", encoding="utf-8") as f:
        json.dump(update, f, ensure_ascii=False, indent=2)

    print(f"[OK] Uložen {record['id']}")
    return True
