"""
run_all.py — Spustí všechny scrapers.
Voláno z GitHub Actions nebo ručně.
"""

import sys
import argparse
from datetime import datetime
from pathlib import Path


def run_all(historical=False):
    print(f"\n{'='*55}")
    print(f"České volby — aktualizace dat")
    print(f"Čas: {datetime.utcnow().isoformat()}Z")
    print(f"Režim: {'historický bootstrap' if historical else 'inkrementální'}")
    print(f"{'='*55}\n")

    total = 0

    # ── Primární scrapers (živá data) ─────────────────────────
    try:
        from stem_scraper import run_scraper as stem_run
        total += stem_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] STEM: {e}")

    try:
        from median_scraper import run_scraper as median_run
        total += median_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] Median: {e}")

    try:
        from kantar_scraper import run_scraper as kantar_run
        total += kantar_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] Kantar: {e}")

    try:
        from ipsos_scraper import run_scraper as ipsos_run
        total += ipsos_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] Ipsos: {e}")

    try:
        from cvvm_scraper import run_scraper as cvvm_run
        total += cvvm_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] CVVM: {e}")

    try:
        from nms_scraper import run_scraper as nms_run
        total += nms_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] NMS: {e}")

    # ── Wikipedia záplata pro historická data ─────────────────
    # Spouštíme vždy (nejen --historical), protože Wiki je zdroj pro mezery
    try:
        from wikipedia_scraper import run_scraper as wiki_run
        total += wiki_run(historical=historical)
    except Exception as e:
        print(f"[ERROR] Wikipedia: {e}")

    # ─────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print(f"Celkem přidáno: {total} nových průzkumů")

    # GitHub Actions output (kompatibilní s novým formátem i starým)
    flag = "true" if total > 0 else "false"
    import os
    gh_output = os.environ.get("GITHUB_OUTPUT", "")
    if gh_output:
        with open(gh_output, "a") as f:
            f.write(f"has_new_polls={flag}\n")
    else:
        # Starý způsob (fallback)
        print(f"::set-output name=has_new_polls::{flag}")

    return total


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true",
                   help="Stáhne posledních 4-5 let (první spuštění)")
    args = p.parse_args()
    sys.exit(0 if run_all(historical=args.historical) >= 0 else 1)
