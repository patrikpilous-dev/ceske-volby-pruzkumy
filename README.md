# České volby — Volební průzkumy

Interaktivní vizualizace volebních průzkumů pro [ceske-volby.cz](https://ceske-volby.cz).

## Struktura projektu

```
ceske-volby-pruzkumy/
├── .github/
│   └── workflows/
│       └── scrape.yml          # GitHub Actions — 4× denně
├── data/
│   ├── party_aliases.json      # Mapování alias → kanonický ID strany
│   ├── polls.json              # Všechna data (master)
│   ├── latest.json             # Posledních 60 průzkumů (rychlý load)
│   └── last_update.json        # Metadata posledního runu + nejnovější průzkum
├── scrapers/
│   ├── normalizer.py           # Normalizace, deduplikace, uložení
│   ├── stem_scraper.py         # STEM (stem.cz) — týdně
│   ├── median_scraper.py       # Median (median.eu) — měsíčně
│   └── run_all.py              # Spustí všechny scrapers
└── web/
    └── index.html              # Dva interaktivní grafy (Chart.js)
```

## Rychlý start

```bash
# 1. Nainstaluj závislosti
pip install requests beautifulsoup4 lxml

# 2. Bootstrap historických dat (první spuštění)
cd scrapers
python run_all.py --historical

# 3. Inkrementální aktualizace (normálně)
python run_all.py
```

## Nasazení na GitHub Pages

1. Push do GitHub repozitáře
2. Settings → Pages → Source: `/web` nebo root
3. GitHub Actions poběží automaticky dle cron schedule

## GitHub Actions — kdy se spouští

| Čas (CET) | Důvod |
|-----------|-------|
| 09:00 | Před dopoledními zveřejněními |
| 11:00 | Hlavní vlna: Median, CVVM, Ipsos |
| 13:00 | Po OVM v neděli: Kantar |
| 16:00 | Odpolední záloha |

Commit se provede **pouze pokud jsou nová data** (git diff check).

## Přidání nové agentury

1. Vytvoř `scrapers/nazev_scraper.py` dle vzoru `stem_scraper.py`
2. Případné nové aliasy přidej do `data/party_aliases.json`
3. Importuj a zavolej v `scrapers/run_all.py`

## Datový formát — jeden průzkum (polls.json)

```json
{
  "id":                  "stem-2026-01-07",
  "agency":              "STEM",
  "date_published":      "2026-01-15",
  "date_fieldwork_from": "2026-01-02",
  "date_fieldwork_to":   "2026-01-07",
  "type":                "model",
  "view":                "parties",
  "sample_size":         1089,
  "method":              "CAWI",
  "client":              "CNN Prima News",
  "parties": {
    "ANO": 35.0, "ODS": 14.0, "STAN": 12.6
  },
  "coalition_notes": {},
  "source_url": "https://www.stem.cz/...",
  "scraped_at": "2026-01-15T10:00:00Z"
}
```

### Klíčová pole

| Pole | Hodnoty | Popis |
|------|---------|-------|
| `type` | `model` / `preference` / `potential` | Typ měření — **nesmí se míchat v grafu** |
| `view` | `parties` / `coalitions` | Co agentura fakticky měřila |
| `parties` | `{ "kanonický_ID": float }` | Kanonické ID z party_aliases.json |

## Banner nejnovějšího průzkumu

`last_update.json` s `new_polls_found > 0` → frontend zobrazí červený box nad prvním grafem:

> **AKTUÁLNÍ PRŮZKUM PREFERENCÍ** | Median | 7. 3. 2026

## Kontakt pro Claude Code

Projekt je připraven pro pokračování v Claude Code. Otevři repozitář a řekni:

> Pracujeme na grafu volebních průzkumů pro ceske-volby.cz.
> Potřebujeme dopsat scrapers pro Kantar, Ipsos, CVVM a NMS.
> Styl: navy #3D4263, červená #C0272D, Merriweather + Source Sans 3, ostré rohy.
