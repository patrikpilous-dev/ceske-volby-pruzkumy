# -*- coding: utf-8 -*-
"""Stránka /politici/ (ID 5072): mřížka všech zveřejněných profilů z data/*.json a předsedové stran z web/hlavy/hlavy.json.

  python rozcestnik.py            vyrenderuje vystup/politici.html
  python rozcestnik.py --zapsat   zapíše na web
"""
import html
import importlib.util
import json
import os
import sys

ZDE = os.path.dirname(os.path.abspath(__file__))
FOTO = 'https://patrikpilous-dev.github.io/ceske-volby-pruzkumy/web/'
WEB = os.path.join(ZDE, '..', 'web')
PRIJMENI = lambda d: d['jmeno'].split()[-1]


def e(t):
    return html.escape(t, quote=True)


def karta(foto, jmeno, popis, url, barva, velka=False):
    v = 120 if velka else 96
    jm = f'<a href="{url}" style="color:#2A2E4A;text-decoration:none">{e(jmeno)}</a>' if url else e(jmeno)
    img = (f'<img src="{FOTO}{e(foto)}" alt="{e(jmeno)}" width="{v}" height="{v}" loading="lazy" '
           f'style="width:{v}px;height:{v}px;border-radius:50%;object-fit:cover;border:4px solid {barva};margin:0 auto 10px!important;display:block">')
    if url:
        img = f'<a href="{url}">{img}</a>'
    return (f'<div style="border:1px solid #D8DAEA;padding:16px 12px;text-align:center;background:#fff">{img}'
            f'<div style="font-family:Merriweather,Georgia,serif;font-size:16px;line-height:1.3">{jm}</div>'
            f'<div style="font-size:13px;color:#8890B0;margin-top:4px;line-height:1.4">{e(popis)}</div></div>')


def mrizka(karty, min_sirka):
    return (f'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax({min_sirka}px,1fr));gap:14px;margin:0 0 24px">'
            + ''.join(karty) + '</div>')


def render():
    profily = []
    for f in sorted(os.listdir(os.path.join(ZDE, 'data'))):
        d = json.load(open(os.path.join(ZDE, 'data', f), encoding='utf-8'))
        if d.get('status', 'publish') == 'publish' and d.get('id'):
            profily.append((f[:-5], d))
    profily.sort(key=lambda x: PRIJMENI(x[1]))
    slugy = {d['jmeno']: s for s, d in profily}
    k1 = [karta(d['foto'], d['jmeno'], d['funkce'], f'https://www.ceske-volby.cz/politici/{s}/', d['barva'], True) for s, d in profily]

    hlavy = json.load(open(os.path.join(WEB, 'hlavy', 'hlavy.json'), encoding='utf-8'))
    nazvy = {'ANO': 'ANO', 'STAN': 'STAN', 'ODS': 'ODS', 'SPD': 'SPD', 'Piráti': 'Piráti', 'Motoristé': 'Motoristé sobě',
             'KDUČSL': 'KDU-ČSL', 'KSČM': 'KSČM', 'NašeČesko': 'Naše Česko', 'SOCDEM': 'SOCDEM', 'Zelení': 'Zelení',
             'PRO': 'PRO', 'Přísaha': 'Přísaha', 'Svobodní': 'Svobodní'}
    k2 = []
    for k, h in hlavy.items():
        jm = h['jmeno'].split(' (')[0]
        s = slugy.get(jm)
        k2.append(karta('hlavy/' + h['soubor'], jm, 'předseda, ' + nazvy.get(k, k),
                        f'https://www.ceske-volby.cz/politici/{s}/' if s else '', '#D8DAEA'))
    return ('Profily českých politiků na jednom místě. U každého najdete životopis, kariéru, rodinu, majetek, kauzy, spojence a rivaly, '
            'nejznámější citáty a to, co lidé o politikovi nejčastěji hledají. Každý údaj vychází z ověřených zdrojů.\n\n'
            f'<h2>Profily politiků</h2>\n{mrizka(k1, 190)}\n\n'
            f'<h2>Předsedové politických stran</h2>\n{mrizka(k2, 150)}\n\n'
            'Aktuální síla stran je na stránce <a href="https://www.ceske-volby.cz/preference/">aktuální preference</a> s průměrem průzkumů '
            'a přepočtem na mandáty. Fotografie Wikimedia Commons a Evropský parlament, autoři a licence jsou uvedeni v profilech a u grafů průzkumů.')


def main():
    obsah = render()
    os.makedirs(os.path.join(ZDE, 'vystup'), exist_ok=True)
    open(os.path.join(ZDE, 'vystup', 'politici.html'), 'w', encoding='utf-8').write(obsah)
    print('politici', len(obsah))
    if '--zapsat' in sys.argv:
        spec = importlib.util.spec_from_file_location('wpapi', r'C:\Users\patri\.claude\projects\meta-dashboard\nastroje\wp-api.py')
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        web = m.nacti_weby()['ceske-volby']
        kod, r = m.zavolej(web, '/wp/v2/pages/5072', 'POST', {'content': obsah}, web_id='ceske-volby')
        print('zapis', kod, r.get('link'))


if __name__ == '__main__':
    main()
