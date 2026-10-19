"""
oprava_dat.py — Jednorázová, opakovatelná oprava data/polls.json (audit 18. 10. 2026)

Co dělá:
1. Opraví mojibake v klíčích i hodnotách (PirĂˇti → Piráti, ÄŚeskĂˇ → Česká).
2. Vyřadí výsledky voleb vedené jako agentura (Evropské volby 2024)
   a median-2025-11-30 (kopie median-2024-11-28).
3. Znovu stáhne články STEM, NMS a Median opravenými scrapery. Nový záznam
   nahradí všechny staré se stejným zdrojovým článkem (tím zmizí denní
   zdvojení NMS a vymyšlené termíny sběru). Když nový záznam neprojde
   validací, zůstane starý a nový jde do karantény.
4. Záznam z Wikipedie, který je duplicitou záznamu přímo od agentury,
   ustoupí záznamu od agentury.
5. Celou datovou řadu projde validací. Co neprojde, přesune do
   data/karantena.json (nesmaže).

Spuštění:  python oprava_dat.py            (stáhne články znovu)
           python oprava_dat.py --cache DIR (použije stem.json, nms.json, median.json z DIR)
           python oprava_dat.py --dry-run   (jen vypíše, nic nezapíše)
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scraper_utils import fix_mojibake_deep
from normalizer import (
    load_polls, write_polls, validate_poll, find_duplicate, quarantine,
)

REMOVE_AGENCIES = ("Evropské volby",)
REMOVE_IDS = {
    "median-2025-11-30": "kopie median-2024-11-28",
    "nms-2026-03-28": "zdroj je výpis blogu, ne článek; SPOLU v březnu 2026 neexistuje; "
                      "správný březnový model je nms-2026-03-10",
}
FRESH_FROM = "2025-10-01"


def log(msg):
    print(msg, flush=True)


def is_wiki(p):
    return "wikipedia.org" in (p.get("source_url") or "")


def fresh_records(cache=None):
    if cache:
        out = []
        for name in ("stem", "nms", "median"):
            f = Path(cache) / f"{name}.json"
            if f.exists():
                out += json.loads(f.read_text(encoding="utf-8"))
        return out
    import stem_scraper, nms_scraper, median_scraper
    out = stem_scraper.scrape_all(historical=True)
    out += nms_scraper.scrape_all(historical=True)
    out += median_scraper.scrape_all(historical=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    polls = fix_mojibake_deep(load_polls())
    log(f"Načteno {len(polls)} záznamů")
    removed = []      # (id, důvod)
    to_quarantine = []  # (záznam, důvody)

    # 2) Volby jako agentura, známé kopie
    keep = []
    for p in polls:
        if p["agency"].startswith(REMOVE_AGENCIES):
            removed.append((p["id"], "výsledek voleb, ne průzkum"))
        elif p["id"] in REMOVE_IDS:
            removed.append((p["id"], REMOVE_IDS[p["id"]]))
        else:
            keep.append(p)
    polls = keep

    # 3) Nové stažení nahradí staré záznamy ze stejného článku
    fresh = fresh_records(args.cache)
    log(f"Znovu staženo {len(fresh)} článků")
    # Parser je ověřený na článcích po volbách 2025. Starší články mají jiný
    # formát (čísla jen v grafech), jejich záznamy necháváme a jen validujeme.
    fresh = [r for r in fresh if r["date_fieldwork_to"] >= FRESH_FROM]
    log(f"Z toho se sběrem od {FRESH_FROM}: {len(fresh)}")
    for rec in sorted(fresh, key=lambda r: r["date_fieldwork_to"]):
        same_src = [p for p in polls if p["agency"] == rec["agency"]
                    and (p.get("source_url") == rec["source_url"] or p["id"] == rec["id"])]
        others = [p for p in polls if p not in same_src]
        reasons = validate_poll(rec, [p for p in others if not is_wiki(p)])
        if reasons:
            if same_src:
                # Starý záznam zůstane (projde validací níže), ze zdvojení jen jeden
                same_src.sort(key=lambda p: p["date_fieldwork_to"])
                for dup in same_src[1:]:
                    polls.remove(dup)
                    removed.append((dup["id"], f"zdvojený záznam článku {rec['source_url']}"))
            to_quarantine.append((rec, ["nové stažení: " + r for r in reasons]))
            continue
        for p in same_src:
            polls.remove(p)
            if p["id"] != rec["id"]:
                removed.append((p["id"], f"nahrazen {rec['id']} (stejný článek)"))
        # Wikipedie ustoupí přímému zdroji
        for p in [p for p in polls if is_wiki(p)]:
            if find_duplicate([p], rec):
                polls.remove(p)
                removed.append((p["id"], f"duplicita z Wikipedie k {rec['id']}"))
        polls.append(rec)

    # 4) Wikipedie proti ostatním přímým záznamům (Kantar, Ipsos, CVVM …)
    #    Jen když záznam od agentury sám projde validací, jinak zůstane Wikipedie.
    for p in [p for p in polls if is_wiki(p)]:
        direct = [q for q in polls if not is_wiki(q)]
        d = find_duplicate(direct, p)
        if d and not validate_poll(d, [q for q in polls if q is not d and q is not p], dup_pool=[]):
            polls.remove(p)
            removed.append((p["id"], f"duplicita z Wikipedie k {d['id']}"))

    # 5) Validace celé řady, od nejstaršího
    polls.sort(key=lambda p: p["date_fieldwork_to"])
    published = []
    for p in polls:
        # Duplicitu hledáme jen mezi už zveřejněnými, ať z páru zůstane starší
        reasons = validate_poll(p, [q for q in polls if q is not p], dup_pool=published)
        if reasons:
            to_quarantine.append((p, reasons))
        else:
            published.append(p)

    log(f"\nVyřazeno {len(removed)}:")
    for pid, why in removed:
        log(f"  - {pid}: {why}")
    log(f"\nDo karantény {len(to_quarantine)}:")
    for rec, why in to_quarantine:
        log(f"  - {rec['id']}: {'; '.join(why)}")
    log(f"\nZveřejněno {len(published)} záznamů")

    if args.dry_run:
        log("dry-run: nic nezapsáno")
        return
    for rec, why in to_quarantine:
        quarantine(rec, why)
    write_polls(published, new_count=0)
    log("Zapsáno data/polls.json, latest.json, last_update.json, karantena.json")


if __name__ == "__main__":
    main()
