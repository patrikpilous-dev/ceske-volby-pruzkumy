"""
oprava_metodiky.py — Druhé kolo opravy dat po kontrole metodiky (19. 10. 2026)

1. Kantar: celý graf Infogramu znovu (doplní 2026 březen, duben, květen, srpen),
   vzorek 1 200 (885 v modelu v poznámce), datum vydání None místo konce měsíce.
2. Do karantény (ne smazat) záznamy z prvního commitu 28. 3. 2026, které mají
   jako zdroj jen homepage agentury a jejich existenci texty agentur odporují.
3. NMS po volbách 2025 znovu stáhne opraveným parserem stran.
4. STEM leden a březen 2026: čísla jen z grafu, příznak approx, leden vydán 12. 1.
5. Záznamy po volbách 2025 projdou novou validací (neznámé strany, dvojí čtení,
   meziměsíční skok nad 3 p. b.). Co neprojde, jde do karantény.

Spuštění:  python oprava_metodiky.py [--dry-run]
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from normalizer import load_polls, write_polls, validate_poll, quarantine

FROM = "2025-10-01"

NEDOHLEDATELNE = [
    "ipsos-2025-12-10", "ipsos-2026-01-25",
    "median-2025-12-31", "median-2026-01-31", "median-2026-02-28",
    "nms-2025-11-22", "nms-2026-01-20",
    "stem-2025-11-28",
    "kantar-2025-10-18", "kantar-2025-12-20",
    "cvvm-2025-10-10", "cvvm-2025-12-06",
]
NEDOHLEDATELNE_DUVOD = (
    "nedohledatelný zdroj: záznam z prvního commitu 28. 3. 2026, zdroj je jen "
    "homepage nebo výpis agentury (u STEM listopad 2025 adresa vrací 404), "
    "existenci průzkumu texty agentury odporují"
)

STEM_APPROX = {
    "stem-2026-01-07": {"date_published": "2026-01-12"},
    "stem-2026-03-16": {},
}
STEM_APPROX_NOTE = "Čísla jen z grafu v článku (obrázek), v textu nejsou. Přibližná hodnota."


def log(msg):
    print(msg, flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    polls = load_polls()
    by_id = {p["id"]: p for p in polls}
    changed, to_q = [], []

    # 2) Nedohledatelné záznamy
    for pid in NEDOHLEDATELNE:
        p = by_id.get(pid)
        if not p:
            log(f"  (není v datech) {pid}")
            continue
        polls.remove(p)
        to_q.append((p, [NEDOHLEDATELNE_DUVOD + f" (zdroj {p.get('source_url')})"]))

    # 4) STEM přibližné hodnoty
    for pid, upd in STEM_APPROX.items():
        p = next((q for q in polls if q["id"] == pid), None)
        if p:
            p.update(upd)
            p["approx"] = True
            p["poznamka"] = STEM_APPROX_NOTE
            changed.append((pid, f"approx, {upd or 'datum beze změny'}"))

    # 1) Kantar Infogram, 3) NMS po volbách
    import kantar_infogram_scraper
    import nms_scraper
    fresh = kantar_infogram_scraper.scrape_all()
    fresh += [r for r in nms_scraper.scrape_all(historical=True) if r["date_fieldwork_to"] >= FROM]

    for rec in sorted(fresh, key=lambda r: r["date_fieldwork_to"]):
        old = [p for p in polls if p["agency"] == rec["agency"]
               and (p["id"] == rec["id"] or p.get("source_url") == rec["source_url"]
                    and rec["agency"] != "Kantar")]
        for p in old:
            polls.remove(p)
        polls.append(rec)
        if old:
            diff = {k: (old[0]["parties"].get(k), v) for k, v in rec["parties"].items()
                    if old[0]["parties"].get(k) != v}
            diff.update({k: (v, None) for k, v in old[0]["parties"].items() if k not in rec["parties"]})
            meta = {k: (old[0].get(k), rec.get(k)) for k in ("id", "date_published", "sample_size")
                    if old[0].get(k) != rec.get(k)}
            if diff or meta:
                changed.append((rec["id"], f"strany {diff} {meta}"))
        else:
            changed.append((rec["id"], "nový záznam"))

    # 5) Nová validace záznamů po volbách, od nejstaršího
    polls.sort(key=lambda p: p["date_fieldwork_to"])
    published = []
    for p in polls:
        if p["date_fieldwork_to"] >= FROM:
            others = [q for q in polls if q is not p]
            reasons = validate_poll(p, others, dup_pool=published)
            if reasons:
                to_q.append((p, reasons))
                continue
        published.append(p)

    log(f"\nZměněno nebo přidáno {len(changed)}:")
    for pid, what in changed:
        log(f"  - {pid}: {what}")
    log(f"\nDo karantény {len(to_q)}:")
    for rec, why in to_q:
        log(f"  - {rec['id']}: {'; '.join(why)}")
    log(f"\nZveřejněno {len(published)} záznamů")

    if args.dry_run:
        log("dry-run: nic nezapsáno")
        return
    for rec, why in to_q:
        quarantine(rec, why)
    write_polls(published, new_count=0)
    log("Zapsáno data/polls.json, latest.json, last_update.json, karantena.json")


if __name__ == "__main__":
    main()
