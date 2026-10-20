// Grafy průzkumů na HP ceske-volby.cz (návrh A, 19. 10. 2026).
// Metodika stejná jako stránka /preference/ (preference-stranka/stranka.py):
// průměr = poslední volební model každé agentury se sběrem do 60 dní, CVVM (preference) mimo,
// neměřená strana se nedosazuje, mandáty krajskou kvótou a druhým skrutiniem podle voleb 2025.

const STRANY = {
  ANO:{d:"ANO",c:"#7B2D8B",r:34.51}, STAN:{d:"STAN",c:"#1A9CD8",r:11.23}, ODS:{d:"ODS",c:"#034FA0"},
  SPD:{d:"SPD",c:"#E07000",r:7.78}, "Piráti":{d:"Piráti",c:"#1A1A2E",r:8.97}, "Motoristé":{d:"Motoristé",c:"#C8102E",r:6.77},
  TOP09:{d:"TOP 09",c:"#CF0080"}, "KDUČSL":{d:"KDU-ČSL",c:"#D4A000"}, "KSČM":{d:"KSČM",c:"#BE0000"},
  "NašeČesko":{d:"Naše Česko",c:"#0050A0"}, "Stačilo":{d:"Stačilo!",c:"#8B0000"}, SOCDEM:{d:"SOCDEM",c:"#E05A00"},
  "Zelení":{d:"Zelení",c:"#2E8B2E"}, PRO:{d:"PRO",c:"#003399"}, "Přísaha":{d:"Přísaha",c:"#555555"},
  "Svobodní":{d:"Svobodní",c:"#2D9B3A"},
  SPOLU:{d:"SPOLU",c:"#034FA0"}, SPD4K:{d:"SPD a koalice",c:"#E07000"}, "StačiloKoalice":{d:"Stačilo! (koalice)",c:"#BE0000"},
  "PirátéZelení":{d:"Piráti a Zelení",c:"#1A1A2E"}, "PirSTAN":{d:"Piráti a STAN",c:"#1A6C98"},
};
const AG = {
  STEM:{c:"#3D4263",u:"stem",dash:[]}, Median:{c:"#C0272D",u:"median",dash:[6,3]}, NMS:{c:"#E07000",u:"nms",dash:[4,2]},
  Kantar:{c:"#003087",u:"kantar-cz",dash:[2,3]}, Ipsos:{c:"#1D7A3A",u:"ipsos",dash:[8,3,2,3]}, CVVM:{c:"#7B5EA7",u:"cvvm",dash:[10,4]},
};
const VLADA = ["ANO","SPD","Motoristé"];
// Mandáty ve volbách 2025 (ČSÚ, SPOLU rozdělené podle navrhující strany).
const M2025 = {ANO:80, ODS:27, "KDUČSL":16, TOP09:9, STAN:22, "Piráti":18, SPD:15, "Motoristé":13};
const OKNO = 60, VOLBY = "2025-10-04";
// Uzavírací klauzule: strana 5 %, koalice dvou stran 8 %, tří a více 11 %.
const HRANICE = {SPOLU: 11, SPD4K: 11, "StačiloKoalice": 11, "PirátéZelení": 8, PirSTAN: 8};
const hranice = k => HRANICE[k] || 5;
const BASE = {ANO:"ANO",STAN:"STAN",ODS:"SPOLU",TOP09:"SPOLU","KDUČSL":"SPOLU",SPD:"SPD","Piráti":"Piráti","Motoristé":"Motoristé","KSČM":"Stačilo"};
const MES = ["led","úno","bře","dub","kvě","čvn","čvc","srp","zář","říj","lis","pro"];

let POLLS = [], KRAJE = null, CUR = [], AVG = {}, SEATS = {}, N = {}, HLAVY = {}, POSLANCI = {};
// Politici s vlastní stránkou na ceske-volby.cz/politici/<slug>/
const PROFILY = new Set(["andrej-babis", "petr-macinka", "tomio-okamura", "petr-fiala", "alena-schillerova", "vit-rakusan", "martin-kupka", "filip-turek"]);
const S = {m1:"avg", v2:"parties", per:"volby", showAvg:true, ag:new Set(), hide:new Set(), sel:new Set(VLADA), c1:null, c2:null};

const $ = id => document.getElementById(id);
const cz = v => v.toFixed(1).replace(".", ",");
const fd = iso => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`; };
const ago = iso => (Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000;
const nm = k => (STRANY[k] || {d:k}).d;
const col = k => (STRANY[k] || {c:"#888"}).c;
const isModel = p => (p.type || "model") === "model";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

async function load() {
  const zdroje = ["../data/polls.json", "https://patrikpilous-dev.github.io/ceske-volby-pruzkumy/data/polls.json"];
  for (const u of zdroje) {
    try { const r = await fetch(u, {cache:"no-cache"}); if (r.ok) { POLLS = await r.json(); break; } } catch (e) {}
  }
  try { const r = await fetch("kraje-2025.json"); if (r.ok) KRAJE = await r.json(); } catch (e) {}
  try { const r = await fetch("hlavy/hlavy.json", {cache: "no-cache"}); if (r.ok) HLAVY = await r.json(); } catch (e) {}
  try { const r = await fetch("poslanci/poslanci.json", {cache: "no-cache"}); if (r.ok) POSLANCI = await r.json(); } catch (e) {}
  if (window.PRUZKUMY_JINY_POHLED) {  // oblouk.html: jen výpočet, vykreslení si dělá sám
    if (POLLS.length) { CUR = current(); AVG = average(CUR); SEATS = seats(AVG); }
    window.PRUZKUMY_JINY_POHLED(); return;
  }
  if (!POLLS.length) { $("app").innerHTML = '<div class="err">Data průzkumů se nepodařilo načíst. Zkuste stránku obnovit.</div>'; report(); return; }
  init();
}

// Poslední volební model (strany) každé agentury se sběrem do 60 dní.
function current() {
  const ms = POLLS.filter(p => isModel(p) && p.view === "parties");
  let pool = ms.filter(p => ago(p.date_fieldwork_to) <= OKNO);
  if (!pool.length) {
    const nej = ms.reduce((m, p) => p.date_fieldwork_to > m ? p.date_fieldwork_to : m, "");
    pool = ms.filter(p => ago(p.date_fieldwork_to) <= ago(nej) + OKNO);
  }
  const m = {};
  pool.forEach(p => { if (!m[p.agency] || p.date_fieldwork_to > m[p.agency].date_fieldwork_to) m[p.agency] = p; });
  return Object.values(m).sort((a, b) => a.agency.localeCompare(b.agency));
}

function average(polls) {
  const s = {}, n = {};
  polls.forEach(p => Object.entries(p.parties).forEach(([k, v]) => {
    if (!STRANY[k]) return; s[k] = (s[k] || 0) + v; n[k] = (n[k] || 0) + 1;
  }));
  // Strana, kterou uvedla jen jedna agentura (ostatní ji schovaly pod 2 %), by vycházela nadsazeně.
  const min = polls.length >= 2 ? 2 : 1;
  N = n;
  return Object.fromEntries(Object.keys(s).filter(k => n[k] >= min).map(k => [k, s[k] / n[k]]).sort((a, b) => b[1] - a[1]));
}

// Přepočet na mandáty: krajská Imperialiho kvóta, zbytky celostátně (Hagenbach-Bischoff, největší zbytek).
function seats(poll) {
  if (!KRAJE) return {};
  const passed = Object.keys(poll).filter(k => poll[k] >= hranice(k));
  const seat = {}, rem = {}; passed.forEach(p => { seat[p] = 0; rem[p] = 0; });
  let used = 0;
  KRAJE.kraje.forEach(k => {
    const v = {};
    passed.forEach(p => {
      const b = BASE[p];
      const sh = b && KRAJE.nat[b] ? (k.s[b] || 0) * poll[p] / KRAJE.nat[b] : poll[p];
      v[p] = k.v * sh / 100;
    });
    const V = passed.reduce((a, p) => a + v[p], 0), q = V / (k.m + 2);
    const got = {}; passed.forEach(p => got[p] = Math.floor(v[p] / q));
    while (passed.reduce((a, p) => a + got[p], 0) > k.m) {
      const p = passed.filter(x => got[x]).sort((a, b) => (v[a] - got[a]*q) - (v[b] - got[b]*q))[0]; got[p]--;
    }
    passed.forEach(p => { seat[p] += got[p]; rem[p] += v[p] - got[p]*q; used += got[p]; });
  });
  const left = 200 - used, RV = passed.reduce((a, p) => a + rem[p], 0), q2 = RV / (left + 1);
  const g2 = {}; passed.forEach(p => g2[p] = Math.floor(rem[p] / q2));
  const sum = () => passed.reduce((a, p) => a + g2[p], 0);
  while (sum() < left) { const p = passed.slice().sort((a, b) => (rem[b] - g2[b]*q2) - (rem[a] - g2[a]*q2))[0]; g2[p]++; }
  while (sum() > left) { const p = passed.filter(x => g2[x]).sort((a, b) => (rem[a] - g2[a]*q2) - (rem[b] - g2[b]*q2))[0]; g2[p]--; }
  return Object.fromEntries(passed.sort((a, b) => poll[b] - poll[a]).map(p => [p, seat[p] + g2[p]]));
}

function init() {
  CUR = current(); AVG = average(CUR); SEATS = seats(AVG);
  header(); banner(); render1(); renderSeats(); chips2(); render2(); meta();
  $("m1a").onclick = () => { S.m1 = "avg"; render1(); };
  $("m1b").onclick = () => { S.m1 = "ag"; render1(); };
  $("sn1").onclick = () => { S.snem = "model"; renderSeats(); };
  $("sn2").onclick = () => { S.snem = "2025"; renderSeats(); };
  $("sl1").onclick = () => { S.lidi = false; renderSeats(); };
  $("sl2").onclick = () => { S.lidi = true; renderSeats(); };
  $("v2p").onclick = () => { S.v2 = "parties"; S.hide.clear(); render2(); };
  $("v2c").onclick = () => { S.v2 = "coalitions"; S.hide.clear(); if (S.per !== "vse") S.per = "vse"; render2(); };
  document.querySelectorAll("#per button").forEach(b => b.onclick = () => { S.per = b.dataset.p; render2(); });
  report(); setTimeout(report, 800);
}

function header() {
  const od = CUR.reduce((m, p) => { const x = p.date_fieldwork_from || p.date_fieldwork_to; return !m || x < m ? x : m; }, "");
  const doo = CUR.reduce((m, p) => p.date_fieldwork_to > m ? p.date_fieldwork_to : m, "");
  $("kick").textContent = `Průměr průzkumů · ${CUR.map(p => p.agency).join(", ")} · sběr ${fd(od)} až ${fd(doo)}`;
  const ks = Object.keys(SEATS);
  if (!ks.length) { $("head").textContent = "Aktuální volební průzkumy"; return; }
  const vl = VLADA.reduce((a, k) => a + (SEATS[k] || 0), 0);
  const druha = Object.keys(AVG)[1];
  $("head").textContent = `Kdyby byly volby teď, ${nm(ks[0])} by získalo ${SEATS[ks[0]]} mandátů`;
  const blizko = Object.keys(AVG).filter(k => Math.abs(AVG[k] - hranice(k)) < 0.5);
  let pozn = "";
  blizko.forEach(k => { const alt = {...AVG}; alt[k] = AVG[k] >= hranice(k) ? hranice(k) - 0.01 : hranice(k);
    const s2 = seats(alt); const nad = AVG[k] >= hranice(k);
    pozn += ` Těsně ${nad ? "nad" : "pod"} hranicí ${hranice(k)} % je strana ${nm(k)} s ${cz(AVG[k])} %. ${nad ? "Kdyby pod ni spadla" : "Kdyby ji překročila"}, ${nm(ks[0])} by mělo ${s2[ks[0]] || 0} mandátů.`; });
  $("lead").textContent = `Vládní koalice ANO, SPD a Motoristů by měla ${vl} křesel${vl >= 101 ? " a udržela by většinu" : " a o většinu by přišla"}. Druhé je ${nm(druha)} s ${cz(AVG[druha])} %.${pozn}`;
}

// Nejnovější průzkum každé agentury, i starší než okno průměru (zešedlý).
function banner() {
  const m = {};
  POLLS.filter(p => p.view === "parties" && AG[p.agency]).forEach(p => {
    if (!m[p.agency] || p.date_fieldwork_to > m[p.agency].date_fieldwork_to) m[p.agency] = p;
  });
  const l = Object.values(m).sort((a, b) => b.date_fieldwork_to.localeCompare(a.date_fieldwork_to));
  $("ban").innerHTML = '<span class="bl">Nejnovější průzkumy</span>' + l.map(p => {
    const old = ago(p.date_fieldwork_to) > OKNO;
    return `<a target="_top" href="https://www.ceske-volby.cz/tag/${AG[p.agency].u}/" class="${old ? "old" : ""}" title="${old ? "Starší než 60 dní, mimo průměr" : "V průměru"}">${esc(p.agency)}${p.type === "preference" ? '<span class="pref">pref</span>' : ""} <span class="dt">${fd(p.date_fieldwork_to)}</span></a>`;
  }).join("");
}

function render1() {
  $("m1a").classList.toggle("on", S.m1 === "avg"); $("m1b").classList.toggle("on", S.m1 === "ag");
  const avgMode = S.m1 === "avg";
  $("avg").style.display = avgMode ? "" : "none";
  $("agw").style.display = avgMode ? "none" : ""; $("leg1").style.display = avgMode ? "none" : "";
  $("t1").textContent = avgMode ? "Volební model, průměr v %" : "Poslední průzkum každé agentury, %";
  if (avgMode) {
    const mx = Math.max(32, ...Object.values(AVG)) + 2;
    $("avg").innerHTML = Object.entries(AVG).filter(([, v]) => v >= 2).map(([k, v]) => {
      const r = STRANY[k].r; let dl = "";
      if (r != null) { const d = Math.abs(v - r) < 0.05 ? 0 : v - r; dl = ` <span class="dl" style="color:${d >= 0 ? "#1D7A3A" : "#C0272D"}">${d > 0 ? "+" : ""}${cz(d)}</span>`; }
      const nn = N[k] < CUR.length ? ` <span class="dl" title="Uvedlo ${N[k]} z ${CUR.length} agentur" style="color:#8890B0">${N[k]}/${CUR.length}</span>` : "";
      return `<div class="r"><div class="nm">${hlava(k)}${esc(nm(k))}${nn}</div><div class="t"><div class="f" style="width:${v/mx*100}%;background:${col(k)}"></div><div class="c5" style="left:${5/mx*100}%"></div></div><div class="v">${cz(v)} %${dl}</div></div>`;
    }).join("");
    $("n1").textContent = `Červená čárkovaná čára je hranice 5 %. Malé číslo je změna proti volbám 2025, zlomek u strany znamená, kolik agentur ji uvedlo. Průměr ${CUR.length} agentur se sběrem za posledních ${OKNO} dní, preference CVVM nejsou v průměru.`;
    return;
  }
  // Podle agentur: poslední průzkum každé agentury v okně + CVVM preference, pokud je v okně.
  const pool = POLLS.filter(p => p.view === "parties" && ago(p.date_fieldwork_to) <= OKNO);
  const m = {}; pool.forEach(p => { if (!m[p.agency] || p.date_fieldwork_to > m[p.agency].date_fieldwork_to) m[p.agency] = p; });
  const ps = Object.values(m).sort((a, b) => a.agency.localeCompare(b.agency));
  const parties = Object.keys(AVG).filter(k => AVG[k] >= 2);
  if (S.c1) S.c1.destroy();
  S.c1 = new Chart($("c1"), {
    type: "bar",
    data: { labels: parties.map(nm), datasets: ps.map(p => ({
      label: p.agency, data: parties.map(k => p.parties[k] ?? null),
      backgroundColor: (AG[p.agency] || {c:"#888"}).c + "D0", borderWidth: 0, barPercentage: .9, categoryPercentage: .8 })) },
    options: { responsive: true, maintainAspectRatio: false, interaction: {mode: "index", intersect: false},
      plugins: { legend: {display: false}, tooltip: tt(c => c.parsed.y == null ? `${c.dataset.label}: neměřeno` : `${c.dataset.label}: ${cz(c.parsed.y)} %`) },
      scales: { x: {grid: {display: false}, ticks: tk()}, y: {min: 0, suggestedMax: 35, grid: {color: "#EEF0F6"}, ticks: {...tk(), callback: v => v + " %"}} } },
    plugins: [line5]
  });
  $("leg1").innerHTML = ps.map(p => `<span class="li nd"><span class="sq" style="background:${(AG[p.agency]||{c:"#888"}).c}"></span>${esc(p.agency)}${p.type === "preference" ? '<span class="pref">pref</span>' : ""}, sběr do ${fd(p.date_fieldwork_to)}${p.sample_size ? `, ${p.sample_size} lidí` : ""}</span>`).join("");
  $("n1").textContent = "Prázdné místo znamená, že agentura stranu samostatně neměřila. Červená čárkovaná čára je hranice 5 %.";
}

// Malý kulatý portrét předsedy strany za názvem (Wikimedia Commons, autor a licence v popisku).
function hlava(k) {
  const h = HLAVY[k]; if (!h) return Object.keys(HLAVY).length ? `<span class="hl hl0"></span>` : "";
  return `<img class="hl" src="hlavy/${h.soubor}" alt="${esc(h.jmeno)}" title="${esc(h.jmeno)}, předseda. Foto ${esc(h.autor)}, ${esc(h.licence)}" loading="lazy" width="34" height="34">`;
}

function renderSeats() {
  // Přepínač: model podle průměru průzkumů, nebo současné rozložení podle voleb 2025.
  const model = S.snem !== "2025";
  $("sn1").classList.toggle("on", model); $("sn2").classList.toggle("on", !model);
  const SV = model ? SEATS : Object.fromEntries(Object.entries(M2025).sort((a, b) => b[1] - a[1]));
  const SR = model ? M2025 : SEATS;  // s čím porovnat
  const ks = Object.keys(SV);
  const lidi = S.lidi && Object.keys(POSLANCI).length;
  $("sl1").classList.toggle("on", !lidi); $("sl2").classList.toggle("on", !!lidi);
  $("sn").classList.toggle("lidi", !!lidi);
  $("sn").innerHTML = ks.map(k => {
    const os = lidi ? (POSLANCI[k] || []).slice(0, SV[k]) : [];
    return os.map(p => {
      const url = PROFILY.has(p.slug) ? `https://www.ceske-volby.cz/politici/${p.slug}/` : (p.psp || "");
      const tit = `${p.jmeno}, ${nm(k)}${p.funkce ? ", " + p.funkce : ""}`;
      const img = `<img src="poslanci/${p.soubor}" alt="${esc(p.jmeno)}" loading="lazy">`;
      return url ? `<a class="os" target="_top" href="${esc(url)}" title="${esc(tit)}" style="border-color:${col(k)}">${img}</a>` : `<span class="os" title="${esc(tit)}" style="border-color:${col(k)}">${img}</span>`;
    }).join("") + `<div title="${esc(nm(k))}" style="background:${col(k)}"></div>`.repeat(SV[k] - os.length);
  }).join("");
  $("sl").innerHTML = ks.map(k => `<span><span class="sq" style="background:${col(k)}"></span>${esc(nm(k))} ${SV[k]}</span>`).join("");
  $("snp").textContent = model ? `Kdyby byly volby teď, podle průměru průzkumů.` : `Současná Sněmovna podle výsledku voleb 2025, SPOLU rozdělené podle navrhující strany.`;
  const draw = () => {
    let n = 0;
    $("chips").innerHTML = ks.map(k => { const on = S.sel.has(k); if (on) n += SV[k];
      return `<span class="ch${on ? " on" : ""}" data-k="${k}" style="${on ? `background:${col(k)};border-color:${col(k)}` : ""}">${esc(nm(k))} ${SV[k]}</span>`; }).join("");
    $("fl").style.width = n / 2 + "%";
    const sel = [...S.sel].filter(k => ks.includes(k));
    const r = sel.reduce((a, k) => a + (SR[k] || 0), 0);
    const stav = n >= 120 ? '<b style="color:#1D7A3A">ústavní většina</b>' : n >= 101 ? `<b style="color:#1D7A3A">většina</b>, do ústavní chybí ${120 - n}` : `<b style="color:#C0272D">do většiny chybí ${101 - n}</b>`;
    const srov = model ? `Ve volbách 2025 měly tyto strany ${r} mandátů (${n - r > 0 ? "+" : ""}${n - r}).` : `Podle průměru průzkumů by teď měly ${r} mandátů (${r - n > 0 ? "+" : ""}${r - n}).`;
    $("res").innerHTML = `<b class="ser" style="font-size:18px">${n}</b> mandátů, ${stav}` + (sel.length ? `<div style="font-size:13px;color:#4A5070;margin-top:2px">${srov}</div>` : "");
    $("chips").querySelectorAll(".ch").forEach(e => e.onclick = () => { const k = e.dataset.k; S.sel.has(k) ? S.sel.delete(k) : S.sel.add(k); draw(); });
  };
  draw();
}

// ── Vývoj v čase ─────────────────────────────────────────
function months(from) {
  const out = [], d = new Date(from + "T00:00:00"); d.setDate(1);
  const now = new Date();
  while (d <= now) { out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`); d.setMonth(d.getMonth() + 1); }
  return out;
}

function chips2() {
  const ags = Object.keys(AG).filter(a => POLLS.some(p => p.agency === a));
  const paint = () => {
    $("af").innerHTML = `<span class="ac" id="af-avg" style="${S.showAvg ? "background:#3D4263;color:#fff;border-color:#3D4263" : "color:#3D4263;border-color:#3D4263"}">Průměr</span>` +
      ags.map(a => { const on = S.ag.has(a), c = AG[a].c;
        return `<span class="ac" data-a="${a}" style="${on ? `background:${c};color:#fff;border-color:${c}` : `color:${c};border-color:${c}`}">${a}</span>`; }).join("");
    $("af-avg").onclick = () => { if (S.showAvg && !S.ag.size) return; S.showAvg = !S.showAvg; paint(); render2(); };
    $("af").querySelectorAll("[data-a]").forEach(e => e.onclick = () => {
      const a = e.dataset.a; S.ag.has(a) ? S.ag.delete(a) : S.ag.add(a);
      if (!S.ag.size) S.showAvg = true; paint(); render2(); });
  };
  paint();
}

function render2() {
  $("v2p").classList.toggle("on", S.v2 === "parties"); $("v2c").classList.toggle("on", S.v2 === "coalitions");
  document.querySelectorAll("#per button").forEach(b => b.classList.toggle("on", b.dataset.p === S.per));
  const from = S.per === "12" ? new Date(Date.now() - 365*86400000).toISOString().slice(0, 10) : S.per === "volby" ? VOLBY : "2022-01-01";
  const vp = POLLS.filter(p => p.view === S.v2 && p.date_fieldwork_to >= from && AG[p.agency]);
  const ms = months(from);
  // měsíc -> agentura -> poslední průzkum toho měsíce
  const mpm = {};
  vp.forEach(p => { const mo = p.date_fieldwork_to.slice(0, 7); (mpm[mo] ||= {});
    if (!mpm[mo][p.agency] || p.date_fieldwork_to > mpm[mo][p.agency].date_fieldwork_to) mpm[mo][p.agency] = p; });
  const sc = {}, cn = {};
  vp.forEach(p => Object.entries(p.parties).forEach(([k, v]) => { if (!STRANY[k]) return; sc[k] = (sc[k] || 0) + v; cn[k] = (cn[k] || 0) + 1; }));
  const all = Object.keys(sc).filter(k => sc[k] / cn[k] >= 1.5).sort((a, b) => sc[b]/cn[b] - sc[a]/cn[a]);
  const parties = all.filter(k => !S.hide.has(k));
  const ds = [];
  // Průměr ke konci každého měsíce stejně jako v nadpisu: poslední model každé agentury za 60 dní.
  const okna = ms.map(mo => { const [y, m] = mo.split("-").map(Number); const konec = new Date(y, m, 0);
    const kon = new Date(Math.min(konec, new Date())).toISOString().slice(0, 10);
    const od = new Date(new Date(kon).getTime() - OKNO * 86400000).toISOString().slice(0, 10);
    const mm = {}; vp.concat(POLLS.filter(p => p.view === S.v2 && p.date_fieldwork_to < from && p.date_fieldwork_to > od)).forEach(p => {
      if (!isModel(p) || p.date_fieldwork_to > kon || p.date_fieldwork_to <= od) return;
      if (!mm[p.agency] || p.date_fieldwork_to > mm[p.agency].date_fieldwork_to) mm[p.agency] = p; });
    return Object.values(mm); });
  if (S.showAvg) parties.forEach(k => {
    const data = okna.map(ps => { const v = ps.map(p => p.parties[k]).filter(x => x != null);
      return v.length >= Math.min(2, ps.length) && v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null; });
    if (data.some(x => x != null)) ds.push({label: `${nm(k)}, průměr`, data, borderColor: col(k), backgroundColor: col(k), borderWidth: 3,
      pointRadius: 3, pointHoverRadius: 5, tension: .25, spanGaps: true});
  });
  [...S.ag].forEach(a => parties.forEach(k => {
    const data = ms.map(mo => { const p = mpm[mo]?.[a]; return p && p.parties[k] != null ? p.parties[k] : null; });
    if (data.some(x => x != null)) ds.push({label: `${nm(k)}, ${a}`, data, borderColor: col(k) + "99", backgroundColor: col(k) + "99",
      borderWidth: 1.5, borderDash: AG[a].dash, pointRadius: 2, tension: .25, spanGaps: true});
  }));
  if (S.c2) S.c2.destroy();
  S.c2 = new Chart($("c2"), {
    type: "line", data: {labels: ms.map(m => `${MES[+m.slice(5) - 1]} ${m.slice(2, 4)}`), datasets: ds},
    options: { responsive: true, maintainAspectRatio: false, interaction: {mode: "index", intersect: false},
      plugins: { legend: {display: false}, tooltip: tt(c => c.parsed.y == null ? null : `${c.dataset.label}: ${cz(c.parsed.y)} %`) },
      scales: { x: {grid: {display: false}, ticks: {...tk(), maxRotation: 0, autoSkip: true, maxTicksLimit: 12}},
        y: {min: 0, suggestedMax: 40, grid: {color: "#EEF0F6"}, ticks: {...tk(), callback: v => v + " %"}} } },
    plugins: [line5]
  });
  $("leg2").innerHTML = all.map(k => `<span class="li${S.hide.has(k) ? " off" : ""}" data-k="${k}"><span class="sq" style="background:${col(k)}"></span>${esc(nm(k))}</span>`).join("")
    + [...S.ag].map(a => `<span class="li nd"><svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="${AG[a].c}" stroke-width="2" stroke-dasharray="${AG[a].dash.join(" ")}"/></svg>${a}</span>`).join("");
  $("leg2").querySelectorAll("[data-k]").forEach(e => e.onclick = () => { const k = e.dataset.k; S.hide.has(k) ? S.hide.delete(k) : S.hide.add(k); render2(); });
  const n = vp.filter(p => S.ag.size ? S.ag.has(p.agency) || S.showAvg : true).length;
  $("n2").textContent = (S.v2 === "coalitions" ? "Koalice měřily agentury hlavně před volbami 2025. " : "")
    + `Tlustá čára je průměr ke konci měsíce, počítaný stejně jako nahoře z posledního průzkumu každé agentury za 60 dní. Preference CVVM nejsou v průměru. Kliknutím na stranu ji skryjete. Průzkumů v období: ${n}.`;
  report();
}

function meta() {
  const n = POLLS.length, od = POLLS.reduce((m, p) => !m || p.date_fieldwork_to < m ? p.date_fieldwork_to : m, "");
  $("meta").innerHTML = `<span>Průzkumů v databázi: <b>${n}</b> od ${fd(od)}</span><span>Statistická chyba zhruba ±1 až 3 p. b.</span>`
    + `<a target="_top" href="https://www.ceske-volby.cz/preference/">Metodika a tabulka všech průzkumů</a>`
    + (Object.keys(HLAVY).length ? `<details style="width:100%"><summary style="cursor:pointer">Fotografie předsedů stran</summary>` + Object.values(HLAVY).map(h =>
      `${esc(h.jmeno)}, foto <a target="_blank" rel="noopener" href="${esc(h.zdroj)}" style="color:inherit;font-weight:400">${esc(h.autor)}</a>, <a target="_blank" rel="noopener" href="${esc(h.licence_url || h.zdroj)}" style="color:inherit;font-weight:400">${esc(h.licence)}</a>`).join("; ") + `, Wikimedia Commons, oříznuto.</details>` : "")
    + (Object.keys(POSLANCI).length ? `<details style="width:100%"><summary style="cursor:pointer">Fotografie poslanců</summary>` + Object.values(POSLANCI).flat().map(h =>
      `${esc(h.jmeno)}, foto <a target="_blank" rel="noopener" href="${esc(h.zdroj)}" style="color:inherit;font-weight:400">${esc(h.autor)}</a>, <a target="_blank" rel="noopener" href="${esc(h.licence_url || h.zdroj)}" style="color:inherit;font-weight:400">${esc(h.licence)}</a>`).join("; ") + `, Wikimedia Commons, oříznuto.</details>` : "");
}

const tk = () => ({font: {family: "'Source Sans 3',sans-serif", size: 11}, color: "#8890B0"});
const tt = label => ({backgroundColor: "#2A2E4A", titleFont: {family: "'Source Sans 3',sans-serif", size: 11}, bodyFont: {family: "'Source Sans 3',sans-serif", size: 12}, padding: 9, callbacks: {label}});
const line5 = { id: "line5", afterDraw(ch) { const y = ch.scales.y; if (!y) return; const p = y.getPixelForValue(5), c = ch.ctx;
  c.save(); c.strokeStyle = "#C0272D"; c.lineWidth = 1.2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(ch.chartArea.left, p); c.lineTo(ch.chartArea.right, p); c.stroke();
  c.setLineDash([]); c.fillStyle = "#C0272D"; c.font = "600 10px 'Source Sans 3',sans-serif"; c.textAlign = "right"; c.fillText("5 %", ch.chartArea.right - 2, p - 3); c.restore(); } };

function report() {
  const h = document.body.offsetHeight;
  if (h > 300) window.parent.postMessage({type: "pruzkumyHeight", height: h}, "*");
}
window.addEventListener("resize", () => { clearTimeout(window._rh); window._rh = setTimeout(report, 150); });

load();
