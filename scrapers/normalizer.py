"""
normalizer.py — Normalizátor volebních průzkumů
Převede surová data z libovolného scraperu na kanonický formát polls.json
"""

import json
import re
from datetime import datetime
from pathlib import Path

from scraper_utils import fix_mojibake

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
    # Kanonická ID samotná (KDUČSL, NašeČesko, TOP09 …) jsou taky platný název
    for canon_id in list(data["parties"]) + list(data["coalitions"]):
        alias_map.setdefault(canon_id.lower(), canon_id)
    return alias_map

ALIAS_MAP = load_aliases()

# Popisky sloupců a řádků, které nejsou strana (nehlásit jako neznámou stranu)
NOT_PARTY = {
    "ostatní", "ostatni", "jiné", "jiná", "jiní", "jine", "ostatní strany",
    "nerozhodnutí", "nerozhodnuti", "neví", "nevím", "nevolil", "nevolí",
    "náskok", "vzorek", "účast", "volební účast", "nevolič", "others", "lead",
}

# ---------- Normalizace názvů ----------

def _alias_key(raw_name: str) -> str:
    key = fix_mojibake(str(raw_name)).replace("\xa0", " ").lower()
    key = re.sub(r"[*†‡~]+", "", key)
    key = re.sub(r"\[\w*\]", "", key)          # poznámky Wikipedie [a]
    return re.sub(r"\s+", " ", key).strip()


def normalize_party_name(raw_name: str) -> str | None:
    """
    Jen přesná shoda s aliasem (po sjednocení mezer, velikosti písmen a
    poznámkových znaků). Žádné hledání podřetězců: „Stačilo! – KSČM“ nesmí
    padnout na KSČM ani „PRO“ na „Přísaha a PROgram“.
    """
    key = _alias_key(raw_name)
    if key in ALIAS_MAP:
        return ALIAS_MAP[key]
    cleaned = re.sub(r"[()]", "", key).strip()
    return ALIAS_MAP.get(cleaned)

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
    """Stejný průzkum už je uložený (opakované stažení téhož článku)."""
    for p in polls:
        if p["id"] == new_poll["id"]:
            return True
        if (p["agency"] == new_poll["agency"] and
                p["date_fieldwork_to"] == new_poll["date_fieldwork_to"] and
                p["type"] == new_poll["type"]):
            return True
    return False

# ---------- Validace před zveřejněním ----------

KARANTENA_FILE = BASE_DIR / "data" / "karantena.json"

SUM_MIN = 70.0          # součet stran pod tím = chybí strany nebo špatné parsování
SUM_MAX = 105.0         # nad tím = zdvojené nebo posunuté hodnoty
MIN_PARTIES = 4
OUTLIER_PP = 8.0        # odchylka od klouzavého průměru v procentních bodech
OUTLIER_DAYS = 45       # okno klouzavého průměru
OUTLIER_MIN_POLLS = 2   # minimum jiných průzkumů v okně, jinak se nekontroluje
DUP_OVERLAP = 0.6       # překryv termínů sběru vůči delšímu z nich


def _d(iso):
    return datetime.strptime(iso, "%Y-%m-%d")


def find_duplicate(polls: list, rec: dict) -> dict | None:
    """
    Jiný záznam téže agentury se stejným termínem sběru (stejný konec,
    nebo překryv aspoň 60 % delšího z obou termínů).
    """
    a_from, a_to = _d(rec["date_fieldwork_from"]), _d(rec["date_fieldwork_to"])
    for p in polls:
        if p["id"] == rec["id"] or p["agency"] != rec["agency"] or p["type"] != rec["type"]:
            continue
        if p["date_fieldwork_to"] == rec["date_fieldwork_to"]:
            return p
        b_from, b_to = _d(p["date_fieldwork_from"]), _d(p["date_fieldwork_to"])
        overlap = (min(a_to, b_to) - max(a_from, b_from)).days + 1
        longer = max((a_to - a_from).days, (b_to - b_from).days) + 1
        if overlap > 0 and overlap / longer >= DUP_OVERLAP:
            return p
    return None


def rolling_average(polls: list, rec: dict) -> dict:
    """Průměr stran z ostatních volebních modelů s koncem sběru do 45 dní kolem záznamu."""
    t = _d(rec["date_fieldwork_to"])
    vals = {}
    for p in polls:
        if p["id"] == rec["id"] or p["type"] != "model" or p["agency"] == rec["agency"]:
            continue
        if abs((_d(p["date_fieldwork_to"]) - t).days) > OUTLIER_DAYS:
            continue
        for pid, v in p["parties"].items():
            vals.setdefault(pid, []).append(v)
    return {pid: sum(v) / len(v) for pid, v in vals.items() if len(v) >= OUTLIER_MIN_POLLS}


def validate_poll(rec: dict, polls: list, dup_pool: list = None) -> list:
    """
    Vrátí seznam důvodů, proč záznam nezveřejnit (prázdný = v pořádku).
    polls = ostatní záznamy pro klouzavý průměr, dup_pool = kde hledat duplicity
    (výchozí totéž co polls).
    """
    errors = []
    parties = rec.get("parties") or {}
    total = sum(parties.values())
    if len(parties) < MIN_PARTIES:
        errors.append(f"jen {len(parties)} strany")
    if not SUM_MIN <= total <= SUM_MAX:
        errors.append(f"součet {total:.1f} % mimo {SUM_MIN:.0f} až {SUM_MAX:.0f} %")
    if rec.get("nezname_strany"):
        errors.append(f"neznámé strany: {', '.join(rec['nezname_strany'])} (doplnit alias)")
    if rec.get("neovereno"):
        errors.append(f"číslo ve zdroji nestojí u jména strany: {', '.join(rec['neovereno'])}")
    try:
        if rec["date_fieldwork_from"] > rec["date_fieldwork_to"]:
            errors.append("začátek sběru po konci sběru")
        # Datum vydání může chybět (Kantar ho v grafu neuvádí), pak se nekontroluje
        pub = rec.get("date_published")
        if pub and rec["date_fieldwork_to"] > pub:
            errors.append(f"konec sběru {rec['date_fieldwork_to']} po vydání {pub}")
        if pub and pub > datetime.utcnow().strftime("%Y-%m-%d"):
            errors.append("datum vydání v budoucnosti")
    except (KeyError, TypeError):
        errors.append("chybí datum")
        return errors
    dup = find_duplicate(polls if dup_pool is None else dup_pool, rec)
    if dup:
        errors.append(f"duplicita s {dup['id']} (stejná agentura a termín sběru)")
    if rec.get("type") == "model":
        avg = rolling_average(polls, rec)
        for pid, v in parties.items():
            if pid in avg and abs(v - avg[pid]) > OUTLIER_PP:
                errors.append(f"{pid} {v} % proti průměru {avg[pid]:.1f} % (odchylka nad {OUTLIER_PP:.0f} p. b.)")
    if rec["id"] not in load_overeno():
        errors += month_jumps(polls, rec)
    return errors


# ---------- Meziměsíční skok ----------

OVERENO_FILE = BASE_DIR / "data" / "overeno.json"
JUMP_PP = 3.0          # skok strany mezi dvěma po sobě jdoucími průzkumy agentury
JUMP_GAP_DAYS = 45     # „po sobě jdoucí“ = konec sběru nejvýš 45 dní před tímto


def load_overeno() -> dict:
    """Ručně ověřené záznamy {id: důvod}, které smí mít skok nad 3 p. b."""
    if OVERENO_FILE.exists():
        with open(OVERENO_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def month_jumps(polls: list, rec: dict) -> list:
    """Skok strany o víc než 3 p. b. proti předchozímu průzkumu téže agentury."""
    t = _d(rec["date_fieldwork_to"])
    prev = [p for p in polls
            if p["agency"] == rec["agency"] and p["type"] == rec["type"] and p["id"] != rec["id"]
            and 0 < (t - _d(p["date_fieldwork_to"])).days <= JUMP_GAP_DAYS]
    if not prev:
        return []
    prev = max(prev, key=lambda p: p["date_fieldwork_to"])
    out = []
    for pid, v in rec["parties"].items():
        old = prev["parties"].get(pid)
        if old is not None and abs(v - old) > JUMP_PP:
            out.append(f"skok {pid} {old} → {v} % proti {prev['id']} (nad {JUMP_PP:.0f} p. b., ruční kontrola)")
    return out


def load_karantena() -> list:
    if KARANTENA_FILE.exists():
        with open(KARANTENA_FILE, encoding="utf-8") as f:
            return json.load(f)
    return []


def quarantine(rec: dict, reasons: list) -> bool:
    """Uloží záznam do data/karantena.json místo zveřejnění. True = nový v karanténě."""
    items = load_karantena()
    if any(i["zaznam"]["id"] == rec["id"] and i["duvody"] == reasons for i in items):
        return False
    items = [i for i in items if i["zaznam"]["id"] != rec["id"]]
    items.append({
        "zaznam": rec,
        "duvody": reasons,
        "datum": datetime.utcnow().isoformat() + "Z",
    })
    items.sort(key=lambda i: i["zaznam"].get("date_fieldwork_to", ""), reverse=True)
    with open(KARANTENA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    # GitHub Actions zobrazí varování v přehledu běhu
    print(f"::warning::Karanténa {rec['id']}: {'; '.join(reasons)}")
    return True

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

    client = fix_mojibake(client)
    agency = fix_mojibake(agency)
    parties_normalized = {}
    unknown = []

    for raw_name, raw_value in raw_parties.items():
        canon_id = normalize_party_name(raw_name)
        value = validate_percentage(raw_value)
        if canon_id and value is not None:
            parties_normalized[canon_id] = value
        elif not canon_id and value is not None:
            # Neznámý název do grafu nepustíme. Záznam s ním půjde do karantény,
            # po doplnění aliasu do party_aliases.json projde při dalším běhu.
            clean = fix_mojibake(str(raw_name)).replace("\xa0", " ").strip()
            if clean and _alias_key(clean) not in NOT_PARTY:
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

    rec = {
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
    if unknown:
        rec["nezname_strany"] = unknown
    return rec

# ---------- Uložení ----------

def write_polls(polls: list, record: dict = None, new_count: int = 1):
    """Zapíše polls.json, latest.json a last_update.json (vždy UTF-8)."""
    polls.sort(key=lambda x: (x["date_fieldwork_to"], x["agency"]), reverse=True)
    record = record or polls[0]

    with open(POLLS_FILE, "w", encoding="utf-8") as f:
        json.dump(polls, f, ensure_ascii=False, indent=2)

    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(polls[:60], f, ensure_ascii=False, indent=2)

    # Aktualizuj last_update.json
    update = {
        "last_run": datetime.utcnow().isoformat() + "Z",
        "new_polls_found": new_count,
        "latest_poll": {
            "agency": record["agency"],
            "date_published": record["date_published"],
            "date_fieldwork_to": record["date_fieldwork_to"],
        }
    }
    with open(UPDATE_FILE, "w", encoding="utf-8") as f:
        json.dump(update, f, ensure_ascii=False, indent=2)


def save_poll(record: dict) -> bool:
    """
    Vrátí True, pokud byl přidán nový průzkum.
    Záznam, který neprojde validací, jde do data/karantena.json, ne do grafu.
    """
    polls = load_polls()
    if poll_exists(polls, record):
        print(f"[SKIP] {record['id']} již existuje.")
        return False

    reasons = validate_poll(record, polls)
    if reasons:
        if quarantine(record, reasons):
            print(f"[KARANTÉNA] {record['id']}: {'; '.join(reasons)}")
        else:
            print(f"[SKIP] {record['id']} už je v karanténě.")
        return False

    polls.append(record)
    write_polls(polls, record)
    print(f"[OK] Uložen {record['id']}")
    return True
