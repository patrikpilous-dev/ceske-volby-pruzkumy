"""
run_all.py — Spustí všechny scrapers.
Voláno z GitHub Actions nebo ručně.
"""

import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent


def run_all(historical=False):
    print(f"\n{'='*55}")
    print(f"České volby — aktualizace dat")
    print(f"Čas: {datetime.utcnow().isoformat()}Z")
    print(f"Režim: {'historický bootstrap' if historical else 'inkrementální'}")
    print(f"{'='*55}\n")

    total = 0

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

    # Sem přidej další scrapers podle README:
    # from kantar_scraper import run_scraper as kantar_run
    # from ipsos_scraper  import run_scraper as ipsos_run
    # from cvvm_scraper   import run_scraper as cvvm_run
    # from nms_scraper    import run_scraper as nms_run

    print(f"\n{'='*55}")
    print(f"Celkem přidáno: {total} nových průzkumů")

    # GitHub Actions output
    flag = "true" if total > 0 else "false"
    print(f"::set-output name=has_new_polls::{flag}")

    return total


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--historical", action="store_true",
                   help="Stáhne posledních 6-7 měsíců (první spuštění)")
    args = p.parse_args()
    sys.exit(0 if run_all(historical=args.historical) >= 0 else 1)
