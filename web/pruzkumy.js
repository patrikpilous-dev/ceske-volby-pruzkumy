// ══ Konfigurace ═══════════════════════════════════════════
const COAL_IDS = new Set(["SPOLU","SPD4K","StačiloKoalice","PirátéZelení"]);

const PC = {
  ANO:             { d:"ANO",              c:"#7B2D8B" },
  ODS:             { d:"ODS",              c:"#034FA0" },
  STAN:            { d:"STAN",             c:"#1A9CD8" },
  "Piráti":        { d:"Piráti",           c:"#1A1A2E" },
  SPD:             { d:"SPD",              c:"#E07000" },
  "Motoristé":     { d:"Motoristé",        c:"#C8102E" },
  TOP09:           { d:"TOP 09",           c:"#CF0080" },
  KDUČSL:          { d:"KDU-ČSL",          c:"#D4A000" },
  KSČM:            { d:"KSČM",             c:"#BE0000" },
  "Stačilo":       { d:"Stačilo!",         c:"#8B0000" },
  SOCDEM:          { d:"SOCDEM",           c:"#E05A00" },
  "Přísaha":       { d:"Přísaha",          c:"#555555" },
  "Zelení":        { d:"Zelení",           c:"#2E8B2E" },
  PRO:             { d:"PRO",              c:"#003399" },
  SPOLU:           { d:"SPOLU",            c:"#034FA0" },
  SPD4K:           { d:"SPD 4K",           c:"#E07000" },
  StačiloKoalice:  { d:"Stačilo! (koa.)",  c:"#BE0000" },
  "PirátéZelení":  { d:"Piráti+Zelení",    c:"#1A1A2E" },
  "NašeČesko":     { d:"Naše Česko",       c:"#0050A0" },
};

const AC = {
  STEM:"#3D4263", Median:"#C0272D", Kantar:"#003087",
  Ipsos:"#1D7A3A", CVVM:"#7B5EA7", NMS:"#E07000",
  "STEM/MARK":"#555", SANEP:"#999",
};

const AGENCY_URLS = {
  STEM:        "https://www.ceske-volby.cz/tag/stem/",
  Median:      "https://www.ceske-volby.cz/tag/median/",
  Kantar:      "https://www.ceske-volby.cz/tag/kantar-cz/",
  Ipsos:       "https://www.ceske-volby.cz/tag/ipsos/",
  CVVM:        "https://www.ceske-volby.cz/tag/cvvm/",
  NMS:         "https://www.ceske-volby.cz/tag/nms/",
  SANEP:       "https://www.ceske-volby.cz/tag/sanep/",
  "STEM/MARK": "https://www.ceske-volby.cz/tag/stem/",
};

const AGENCY_TYPE = { CVVM: "preference" };

const AGENCY_DASH = {
  STEM:        [],
  Median:      [6,3],
  Kantar:      [2,3],
  Ipsos:       [8,3,2,3],
  CVVM:        [10,4],
  NMS:         [4,2],
  SANEP:       [6,2,2,2],
  "STEM/MARK": [],
};

// ══ Data ══════════════════════════════════════════════════
let POLLS = [];

const EMBEDDED = [
  {id:"stem-2026-01-07",agency:"STEM",date_published:"2026-01-15",date_fieldwork_from:"2026-01-02",date_fieldwork_to:"2026-01-07",type:"model",view:"parties",sample_size:1089,method:"CAWI",client:"CNN Prima News",parties:{ANO:35.0,ODS:14.0,STAN:12.6,"Piráti":8.4,SPD:6.8,"Motoristé":4.9,TOP09:4.1,KDUČSL:3.2},coalition_notes:{}},
  {id:"stem-2025-11-28",agency:"STEM",date_published:"2025-12-03",date_fieldwork_from:"2025-11-17",date_fieldwork_to:"2025-11-28",type:"model",view:"parties",sample_size:1095,method:"CAWI",client:"CNN Prima News",parties:{ANO:35.0,ODS:14.0,STAN:12.0,"Piráti":9.0,SPD:7.5,"Motoristé":5.5,TOP09:3.8},coalition_notes:{}},
  {id:"stem-2025-09-28",agency:"STEM",date_published:"2025-10-02",date_fieldwork_from:"2025-09-22",date_fieldwork_to:"2025-09-28",type:"model",view:"coalitions",sample_size:1102,method:"CAWI",client:"CNN Prima News",parties:{ANO:28.0,SPOLU:21.0,SPD4K:13.8,STAN:12.2,"Piráti":9.8,"Motoristé":5.6,"Stačilo":5.5},coalition_notes:{}},
  {id:"median-2026-02-28",agency:"Median",date_published:"2026-03-07",date_fieldwork_from:"2026-02-01",date_fieldwork_to:"2026-02-28",type:"model",view:"parties",sample_size:1010,method:"CAPI",client:"Český rozhlas",parties:{ANO:32.0,ODS:14.0,"Piráti":10.5,SPD:7.0,STAN:6.0,TOP09:5.5,"Motoristé":5.0,KDUČSL:2.5},coalition_notes:{}},
  {id:"median-2026-01-31",agency:"Median",date_published:"2026-02-06",date_fieldwork_from:"2026-01-01",date_fieldwork_to:"2026-01-31",type:"model",view:"parties",sample_size:1008,method:"CAPI",client:"Český rozhlas",parties:{ANO:31.0,ODS:12.5,"Piráti":11.0,SPD:9.5,STAN:9.0,TOP09:5.5,"Motoristé":4.5},coalition_notes:{}},
  {id:"median-2025-12-31",agency:"Median",date_published:"2026-01-17",date_fieldwork_from:"2025-11-21",date_fieldwork_to:"2025-12-31",type:"model",view:"parties",sample_size:1015,method:"CAPI",client:"Český rozhlas",parties:{ANO:33.5,STAN:13.0,ODS:11.5,"Motoristé":7.0,"Piráti":6.0,KSČM:5.0,SPD:4.5},coalition_notes:{}},
  {id:"kantar-2026-02-15",agency:"Kantar",date_published:"2026-02-23",date_fieldwork_from:"2026-01-20",date_fieldwork_to:"2026-02-15",type:"model",view:"parties",sample_size:1120,method:"mixed",client:"Česká televize",parties:{ANO:34.0,ODS:13.5,STAN:11.0,"Piráti":8.0,SPD:6.5,"Motoristé":5.0,TOP09:4.5,KDUČSL:3.0},coalition_notes:{}},
  {id:"kantar-2025-12-20",agency:"Kantar",date_published:"2026-01-12",date_fieldwork_from:"2025-11-25",date_fieldwork_to:"2025-12-20",type:"model",view:"parties",sample_size:1108,method:"mixed",client:"Česká televize",parties:{ANO:34.5,ODS:12.0,STAN:12.5,"Piráti":7.5,SPD:6.0,"Motoristé":5.5,TOP09:4.0},coalition_notes:{}},
  {id:"ipsos-2026-01-25",agency:"Ipsos",date_published:"2026-02-03",date_fieldwork_from:"2026-01-13",date_fieldwork_to:"2026-01-25",type:"model",view:"parties",sample_size:1005,method:"CAWI",client:"—",parties:{ANO:36.0,ODS:13.0,STAN:11.5,"Piráti":8.5,SPD:7.0,"Motoristé":4.5,TOP09:4.0,KDUČSL:2.5},coalition_notes:{}},
  {id:"ipsos-2025-12-10",agency:"Ipsos",date_published:"2025-12-18",date_fieldwork_from:"2025-11-28",date_fieldwork_to:"2025-12-10",type:"model",view:"parties",sample_size:1001,method:"CAWI",client:"—",parties:{ANO:35.5,ODS:12.0,STAN:11.0,"Piráti":7.5,SPD:6.5,"Motoristé":5.5,TOP09:3.5},coalition_notes:{}},
  {id:"cvvm-2025-12-06",agency:"CVVM",date_published:"2025-12-19",date_fieldwork_from:"2025-11-17",date_fieldwork_to:"2025-12-06",type:"preference",view:"parties",sample_size:1021,method:"CAPI",client:"Sociologický ústav AV ČR",parties:{ANO:30.5,ODS:13.0,STAN:10.5,"Piráti":9.0,SPD:8.0,"Motoristé":6.5,TOP09:5.0,KDUČSL:4.5,SOCDEM:3.5},coalition_notes:{}},
  {id:"cvvm-2025-10-10",agency:"CVVM",date_published:"2025-10-23",date_fieldwork_from:"2025-09-15",date_fieldwork_to:"2025-10-10",type:"preference",view:"parties",sample_size:1018,method:"CAPI",client:"Sociologický ústav AV ČR",parties:{ANO:31.0,ODS:12.5,STAN:11.5,"Piráti":8.5,SPD:7.5,"Motoristé":5.5,TOP09:5.0,KDUČSL:4.0},coalition_notes:{}},
  {id:"nms-2026-01-20",agency:"NMS",date_published:"2026-01-28",date_fieldwork_from:"2026-01-08",date_fieldwork_to:"2026-01-20",type:"model",view:"parties",sample_size:1003,method:"CAWI",client:"Novinky.cz",parties:{ANO:34.5,ODS:13.5,STAN:12.0,"Piráti":8.0,SPD:7.5,"Motoristé":5.0,TOP09:4.0},coalition_notes:{}},
  {id:"nms-2025-11-22",agency:"NMS",date_published:"2025-11-28",date_fieldwork_from:"2025-11-10",date_fieldwork_to:"2025-11-22",type:"model",view:"parties",sample_size:1002,method:"CAWI",client:"Novinky.cz",parties:{ANO:33.0,ODS:12.5,STAN:11.5,"Piráti":8.0,SPD:7.0,"Motoristé":6.0,TOP09:4.5},coalition_notes:{}},
];

async function loadPolls() {
  const sources = [
    "../data/polls.json",
    "https://patrikpilous-dev.github.io/ceske-volby-pruzkumy/data/polls.json",
  ];
  POLLS = EMBEDDED;
  for (const url of sources) {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) continue;
      POLLS = await r.json();
      break;
    } catch { /* další zdroj */ }
  }
  init();
}

// ══ Aktuální průzkumy a průměr ════════════════════════════
// Aktuální = konec sběru nejvýš 60 dní před dneškem. Starší průzkum agentury
// do grafu ani průměru nepatří (jinak se míchá září s prosincem a eurovolbami).
const CURRENT_DAYS = 60;
let CURRENT = [];   // nejnovější aktuální průzkum každé agentury

function daysAgo(iso) {
  return (Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000;
}

function pickCurrentPolls() {
  let pool = POLLS.filter(p => daysAgo(p.date_fieldwork_to) <= CURRENT_DAYS);
  if (!pool.length && POLLS.length) {
    // Žádný průzkum za 60 dní: vezmi 60 dní před nejnovějším, ať graf není prázdný
    const newest = POLLS.reduce((m, p) => p.date_fieldwork_to > m ? p.date_fieldwork_to : m, "");
    const limit = daysAgo(newest) + CURRENT_DAYS;
    pool = POLLS.filter(p => daysAgo(p.date_fieldwork_to) <= limit);
  }
  const map = {};
  pool.forEach(p => {
    if (!map[p.agency] || p.date_fieldwork_to > map[p.agency].date_fieldwork_to)
      map[p.agency] = p;
  });
  return Object.values(map).sort((a,b) => a.agency.localeCompare(b.agency));
}

// Průměr počítáme jen z volebních modelů. Preference (CVVM) mají jiný základ.
// Strana, kterou agentura neměřila, se do průměru nepočítá, nic se nedosazuje.
function isModel(p) {
  return (p.type || "model") === "model" && AGENCY_TYPE[p.agency] !== "preference";
}

function averageOf(polls, pid) {
  const vals = polls.filter(isModel).map(p => p.parties[pid]).filter(v => v != null);
  if (!vals.length) return null;
  return { avg: vals.reduce((s,v) => s+v, 0) / vals.length, n: vals.length };
}

function fmtDay(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
}

// ══ Stav ══════════════════════════════════════════════════
const S1  = { view:"parties", chart:null };
const S1b = { chart:null };
const S2  = { view:"parties", showAvg:true, ag:new Set(), hide:new Set(), chart:null };

// ══ Init ══════════════════════════════════════════════════
function init() {
  POLLS = POLLS.filter(p =>
    !String(p.agency).startsWith("Evropsk") &&
    Object.values(p.parties).every(v => v <= 45)
  );
  CURRENT = pickCurrentPolls();

  // Nadpis nese datum nejnovějšího průzkumu, ne dnešní datum
  const newest = CURRENT.reduce((m, p) => {
    const d = p.date_published || p.date_fieldwork_to;
    return d > m ? d : m;
  }, "");
  const ds = newest ? `, stav k ${fmtDay(newest)}` : "";
  const t1  = document.getElementById("title1");
  const t1b = document.getElementById("title1b");
  if (t1)  t1.textContent  = `Aktuální volební průzkumy${ds}`;
  if (t1b) t1b.textContent = `Průměr volebních modelů${ds}`;

  // S2.ag starts empty — výchozí je jen Průměr
  buildChips2();
  showBanner();
  render1();
  render2();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    reportHeight();
    setTimeout(reportHeight, 800);
  }));
}

// ══ Banner ════════════════════════════════════════════════
function showBanner() {
  const latest = CURRENT.slice()
    .sort((a,b) => b.date_fieldwork_to.localeCompare(a.date_fieldwork_to))
    .slice(0, 6);
  if (!latest.length) return;
  document.getElementById("lboxItems").innerHTML = latest.map(p => {
    const url = AGENCY_URLS[p.agency] || "#";
    return `<div class="lbox-item">
      <a href="${url}" target="_blank">${p.agency}</a>
      <span class="dt">${fmt(p.date_published || p.date_fieldwork_to)}</span>
    </div>`;
  }).join("");
  document.getElementById("lbox").classList.add("on");
}

// ══ Seznam stran/koalic ═══════════════════════════════════
function getParties(polls, view) {
  const scores = {}, count = {};
  polls.forEach(p => {
    Object.entries(p.parties).forEach(([pid, val]) => {
      if (!PC[pid]) return;
      if (view === "parties"    &&  COAL_IDS.has(pid)) return;
      if (view === "coalitions" && !COAL_IDS.has(pid)) return;
      scores[pid] = (scores[pid] || 0) + val;
      count[pid]  = (count[pid]  || 0) + 1;
    });
  });
  return Object.keys(scores).sort((a,b) =>
    (scores[b]/count[b]) - (scores[a]/count[a])
  );
}

// ══ Strany z průzkumů bez filtru koalic (pro graf 2) ══════
function getPartiesRaw(polls) {
  const scores = {}, count = {};
  polls.forEach(p => {
    Object.entries(p.parties).forEach(([pid, val]) => {
      if (!PC[pid]) return;
      scores[pid] = (scores[pid] || 0) + val;
      count[pid]  = (count[pid]  || 0) + 1;
    });
  });
  return Object.keys(scores).sort((a,b) =>
    (scores[b]/count[b]) - (scores[a]/count[a])
  );
}

// ══ Plugin: čísla nad sloupci ═════════════════════════════
const barLabelsPlugin = {
  id: "barLabels",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.type !== "bar") return;
      meta.data.forEach((bar, j) => {
        const val = ds.data[j];
        if (val == null || val < 3) return;
        ctx.save();
        ctx.fillStyle = "#4A5070";
        ctx.font = "500 8.5px 'Source Sans 3', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(val.toFixed(1), bar.x, bar.y - 2);
        ctx.restore();
      });
    });
  }
};

// ══ Plugin: hranice pro vstup do Sněmovny ═════════════════
// Strany 5 %, koalice dvou stran 8 %, koalice tří a více stran 11 %.
const THRESHOLDS = {
  parties:    [{ v:5,  t:"5 % hranice pro stranu" }],
  coalitions: [{ v:5,  t:"5 % strana" },
               { v:8,  t:"8 % koalice 2 stran" },
               { v:11, t:"11 % koalice 3 a více stran" }],
};

const censusLinePlugin = {
  id: "censusLine",
  afterDraw(chart, args, opts) {
    const { ctx, scales: { y } } = chart;
    if (!y) return;
    const lines = THRESHOLDS[opts.view] || THRESHOLDS.parties;
    const left  = chart.chartArea.left;
    const right = chart.chartArea.right;
    lines.forEach(({ v, t }) => {
      const yPos = y.getPixelForValue(v);
      ctx.save();
      ctx.strokeStyle = "#C0272D";
      ctx.globalAlpha = v === 5 ? 1 : 0.7;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(v === 5 ? [5, 4] : [2, 3]);
      ctx.beginPath();
      ctx.moveTo(left, yPos);
      ctx.lineTo(right, yPos);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#C0272D";
      ctx.font = "600 10px 'Source Sans 3', sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(t, right - 4, yPos - 3);
      ctx.restore();
    });
  }
};

// ══ GRAF 1 — grouped bar ══════════════════════════════════
function render1() {
  const latestPolls = CURRENT;
  const parties     = getParties(latestPolls, S1.view);

  if (!parties.length) {
    const ctx = document.getElementById("c1").getContext("2d");
    if (S1.chart) { S1.chart.destroy(); S1.chart = null; }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById("avgRow").innerHTML = "";
    document.getElementById("leg1").innerHTML = "";
    document.getElementById("meta1").innerHTML = "";
    render1b([], []);
    return;
  }

  // Strana, kterou agentura neměřila, nemá sloupec (žádná dosazená hodnota)
  const datasets = latestPolls.map(poll => {
    const col = AC[poll.agency] || "#888";
    return {
      label: poll.agency,
      data:            parties.map(pid => poll.parties[pid] ?? null),
      backgroundColor: col + "CC",
      borderColor:     col,
      borderWidth: 1.5,
      pubDates:        parties.map(() => poll.date_published),
    };
  });

  const ctx = document.getElementById("c1").getContext("2d");
  if (S1.chart) S1.chart.destroy();
  S1.chart = new Chart(ctx, {
    type: "bar",
    data: { labels: parties.map(pid => PC[pid]?.d || pid), datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:"index", intersect:false },
      plugins: { legend:{display:false}, tooltip:tooltipOpts(), censusLine:{ view:S1.view } },
      scales: {
        x: { grid:{display:false}, ticks:ticksOpts() },
        y: { min:0, max:45,
             grid:{ color:"#E8EAF0" },
             ticks:{ ...ticksOpts(), callback: v => v+" %" } },
      },
    },
    plugins: [barLabelsPlugin, censusLinePlugin],
  });

  // Štítky průměru = stejná čísla jako graf průměru pod tím
  let avgHtml = ``;
  parties.forEach(pid => {
    const a = averageOf(latestPolls, pid);
    if (!a) return;
    const cfg = PC[pid];
    avgHtml += `<div class="avg-chip">
      <div class="dot" style="background:${cfg.c}"></div>
      <span>${cfg.d}</span>
      <strong>${a.avg.toFixed(1)} %</strong>
    </div>`;
  });
  document.getElementById("avgRow").innerHTML = avgHtml;

  document.getElementById("leg1").innerHTML = latestPolls.map(poll => {
    const isP = !isModel(poll);
    return `<div class="li nodim">
      <div class="ld" style="background:${AC[poll.agency]||'#888'}"></div>
      <span>${poll.agency}${isP ? ' <span class="pref-badge">pref</span>' : ''}, sběr do ${fmt(poll.date_fieldwork_to)}</span>
    </div>`;
  }).join("");

  const agLinks = latestPolls.map(p =>
    `<a href="${AGENCY_URLS[p.agency]||'#'}" target="_blank">${p.agency}</a>`
  ).join(", ");
  const hasPref = latestPolls.some(p => !isModel(p));
  document.getElementById("meta1").innerHTML = `
    <span>Agentury: <b>${agLinks}</b></span>
    <span>Zobrazeno: <b>${S1.view === "parties" ? "Strany" : "Koalice"}</b></span>
    <span>Průzkumy se sběrem za posledních ${CURRENT_DAYS} dní${hasPref ? ", preference CVVM nejsou v průměru" : ""}</span>`;

  render1b(latestPolls, parties);
}

// ══ GRAF 1b — Průměr přes agentury ════════════════════════
function render1b(latestPolls, parties) {
  const partyData = parties
    .map(pid => ({ pid, a: averageOf(latestPolls, pid) }))
    .filter(d => d.a)
    .sort((x, y) => y.a.avg - x.a.avg);

  if (!partyData.length) {
    if (S1b.chart) { S1b.chart.destroy(); S1b.chart = null; }
    return;
  }

  const ctx = document.getElementById("c1b").getContext("2d");
  if (S1b.chart) S1b.chart.destroy();
  S1b.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: partyData.map(d => PC[d.pid]?.d || d.pid),
      datasets: [{
        label: "Průměr",
        data:  partyData.map(d => +d.a.avg.toFixed(1)),
        counts: partyData.map(d => d.a.n),
        backgroundColor: partyData.map(d => (PC[d.pid]?.c || "#888") + "CC"),
        borderColor:     partyData.map(d => PC[d.pid]?.c || "#888"),
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        censusLine: { view: S1.view },
        tooltip: {
          backgroundColor: "#2A2E4A",
          titleFont: { family:"'Source Sans 3',sans-serif", size:11, weight:"600" },
          bodyFont:  { family:"'Source Sans 3',sans-serif", size:12 },
          padding: 9,
          callbacks: {
            label: c => {
              const n = c.dataset.counts[c.dataIndex];
              return ` Průměr: ${c.parsed.y} % (${n} ${n === 1 ? "průzkum" : n < 5 ? "průzkumy" : "průzkumů"})`;
            }
          },
        },
      },
      scales: {
        x: { grid:{ display:false }, ticks: ticksOpts() },
        y: { min:0, max:45, grid:{ color:"#E8EAF0" },
             ticks:{ ...ticksOpts(), callback: v => v+" %" } },
      },
    },
    plugins: [barLabelsPlugin, censusLinePlugin],
  });
}

// ══ Pomocné: všechny měsíce od 2022-01 do dnes ═══════════
function getAllMonths() {
  const months = [];
  let d = new Date(2022, 0, 1);
  const now = new Date();
  while (d <= now) {
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function fmtMonth(ym) {
  const cs = ['led','úno','bře','dub','kvě','čvn','čvc','srp','zář','říj','lis','pro'];
  const [y, m] = ym.split('-');
  return `${cs[parseInt(m)-1]} ${y.slice(2)}`;
}

// ══ GRAF 2 — spojnicový (Průměr + agentury) ═══════════════
// Měsíc bez průzkumu zůstane prázdný, nic se nedopočítává.
function render2() {
  // Průzkumy pro aktuální pohled (strany / koalice)
  const viewPolls = POLLS
    .filter(p => p.view === S2.view)
    .sort((a,b) => a.date_fieldwork_to.localeCompare(b.date_fieldwork_to));

  const agPolls   = viewPolls.filter(p => S2.ag.has(p.agency));

  if (!S2.showAvg && !agPolls.length) {
    if (S2.chart) { S2.chart.destroy(); S2.chart = null; }
    return;
  }

  // Strany bez filtru COAL_IDS — vše co je v daných průzkumech
  const allParties = getPartiesRaw(viewPolls);
  const parties    = allParties.filter(p => !S2.hide.has(p));
  const agencies   = [...new Set(agPolls.map(p => p.agency))].sort();

  // Mapa: měsíc → agentura → nejnovější průzkum toho měsíce
  const mpm = {};
  viewPolls.forEach(p => {
    const mo = p.date_fieldwork_to.substring(0,7);
    if (!mpm[mo]) mpm[mo] = {};
    const prev = mpm[mo][p.agency];
    if (!prev || p.date_fieldwork_to > prev.date_fieldwork_to)
      mpm[mo][p.agency] = p;
  });

  const allMonths   = getAllMonths();
  const monthLabels = allMonths.map(fmtMonth);
  const datasets    = [];

  // ── Průměr volebních modelů ─────────────────────────────
  if (S2.showAvg) {
    parties.forEach(pid => {
      const cfg = PC[pid] || { d:pid, c:"#888" };
      const data = allMonths.map(mo => {
        const a = averageOf(Object.values(mpm[mo] || {}), pid);
        return a ? +a.avg.toFixed(1) : null;
      });
      if (!data.some(v => v !== null)) return;
      datasets.push({
        label: `${cfg.d} \xb7 Průměr`,
        isAvg: true,
        data,
        borderColor: cfg.c,
        backgroundColor: "transparent",
        borderWidth: 3.5,
        borderDash: [],
        pointRadius: 4, pointHoverRadius: 6,
        pointBackgroundColor: cfg.c,
        pointBorderColor: "#fff", pointBorderWidth: 1.5,
        tension: 0.2, spanGaps: false,
      });
    });
  }

  // ── Jednotlivé agentury ──────────────────────────────────
  parties.forEach(pid => {
    const cfg = PC[pid] || { d:pid, c:"#888" };
    agencies.forEach(ag => {
      const hasAny = allMonths.some(m => mpm[m]?.[ag]?.parties[pid] != null);
      if (!hasAny) return;
      const data = allMonths.map(m => {
        const p = mpm[m]?.[ag];
        return (p && p.parties[pid] != null) ? p.parties[pid] : null;
      });
      datasets.push({
        label: `${cfg.d} \xb7 ${ag}`,
        isAvg: false,
        data,
        borderColor: cfg.c + "99",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: AGENCY_DASH[ag] || [],
        pointRadius: 2.5, pointHoverRadius: 4,
        pointBackgroundColor: cfg.c + "99",
        pointBorderColor: "#fff", pointBorderWidth: 1,
        tension: 0.2, spanGaps: false,
      });
    });
  });

  const ctx = document.getElementById("c2").getContext("2d");
  if (S2.chart) S2.chart.destroy();
  S2.chart = new Chart(ctx, {
    type: "line",
    data: { labels: monthLabels, datasets },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:"index", axis:"x", intersect:false },
      plugins:{ legend:{display:false}, tooltip:{
        backgroundColor:"#2A2E4A",
        titleFont:{ family:"'Source Sans 3',sans-serif", size:11, weight:"600" },
        bodyFont: { family:"'Source Sans 3',sans-serif", size:12 },
        padding:9,
        callbacks:{
          label: c => {
            const val = c.parsed.y;
            if (val == null) return null;
            return ` ${c.dataset.label}: ${val.toFixed(1)} %`;
          }
        }
      }, censusLine:{ view:S2.view } },
      scales: {
        x: { grid:{color:"#E8EAF0"},
             ticks:{ ...ticksOpts(), maxRotation:0, maxTicksLimit:18,
               font:{ family:"'Source Sans 3',sans-serif", size:10 } } },
        y: { min:0, max:45, grid:{color:"#E8EAF0"},
             ticks:{ ...ticksOpts(), callback:v => v+" %" } },
      },
    },
    plugins: [censusLinePlugin],
  });

  // ── Legenda stran ────────────────────────────────────────
  let legHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px 12px;width:100%">`;
  allParties.forEach(pid => {
    const cfg = PC[pid]; if (!cfg) return;
    const hidden = S2.hide.has(pid);
    legHtml += `<div class="li ${hidden?"off":""}" onclick="toggleParty2('${pid}')">
      <div style="width:14px;height:14px;flex-shrink:0;background:${hidden?"#D8DAEA":cfg.c};display:flex;align-items:center;justify-content:center;border:1px solid ${cfg.c}">
        ${hidden?"":"<span style=\"color:#fff;font-size:9px;line-height:1;font-weight:700\">✓</span>"}
      </div>
      <span>${cfg.d}</span>
    </div>`;
  });
  legHtml += `</div><div class="leg-div"></div>`;

  // ── Legenda agentur ──────────────────────────────────────
  legHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px 16px;width:100%">`;
  if (S2.showAvg) {
    legHtml += `<div class="li nodim">
      <svg width="24" height="12" style="flex-shrink:0">
        <line x1="0" y1="6" x2="24" y2="6" stroke="#3D4263" stroke-width="3.5"/>
      </svg>
      <span><b>Průměr volebních modelů</b></span>
    </div>`;
  }
  agencies.forEach(ag => {
    const dash = AGENCY_DASH[ag] || [];
    const isP  = AGENCY_TYPE[ag] === "preference";
    legHtml += `<div class="li nodim">
      <svg width="24" height="12" style="flex-shrink:0">
        <line x1="0" y1="6" x2="24" y2="6"
          stroke="${AC[ag]||'#888'}" stroke-width="2"
          stroke-dasharray="${dash.join(' ')}" opacity="0.6"/>
      </svg>
      <span>${ag}${isP ? ' <span class="pref-badge">pref</span>' : ''}</span>
    </div>`;
  });
  legHtml += `</div>`;
  document.getElementById("leg2").innerHTML = legHtml;

  // Jsou-li zaškrtnuty konkrétní agentury, počet odpovídá jim; jinak všem (Průměr)
  const metaPolls = S2.ag.size > 0 ? agPolls : viewPolls;
  const allDates  = metaPolls.map(p => p.date_fieldwork_to).sort();
  const agLinks   = [...new Set(metaPolls.map(p => p.agency))].sort().map(ag =>
    `<a href="${AGENCY_URLS[ag]||'#'}" target="_blank">${ag}</a>`
  ).join(", ");
  document.getElementById("meta2").innerHTML = `
    <span>Agentury: <b>${agLinks}</b></span>
    <span>Průzkumů: <b>${metaPolls.length}</b></span>
    <span>Období: <b>${fmt(allDates[0])} až ${fmt(allDates[allDates.length-1])}</b></span>`;
}

function toggleParty2(pid) {
  S2.hide.has(pid) ? S2.hide.delete(pid) : S2.hide.add(pid);
  render2();
}

// ══ Agency chips ══════════════════════════════════════════
function buildChips2() {
  const avgCol = "#3D4263";
  const avgChip = `<div class="ac on" id="af2-avg" data-color="${avgCol}"
    style="background:${avgCol};border-color:${avgCol};color:#fff;font-weight:600"
    onclick="toggleAvg2()">✓ Průměr</div>`;

  const agencies = [...new Set(POLLS.map(p => p.agency))];
  const agHtml = agencies.map(a => {
    const col = AC[a] || '#888';
    return `<div class="ac" id="af2-${a}"
      data-color="${col}"
      style="border-color:${col};color:${col}"
      onclick="toggleAg2('${a}')">${a}</div>`;
  }).join("");
  document.getElementById("af2").innerHTML = avgChip + agHtml;
}

function toggleAvg2() {
  const chip = document.getElementById('af2-avg');
  const col  = chip.dataset.color;
  S2.showAvg = !S2.showAvg;
  if (S2.showAvg) {
    chip.classList.add("on");
    chip.style.background  = col;
    chip.style.color       = '#fff';
    chip.textContent       = '✓ Průměr';
  } else {
    chip.classList.remove("on");
    chip.style.background  = '';
    chip.style.color       = col;
    chip.textContent       = 'Průměr';
  }
  render2();
}

function toggleAg2(agency) {
  const chip = document.getElementById(`af2-${agency}`);
  const col = chip.dataset.color;
  if (S2.ag.has(agency)) {
    if (S2.ag.size <= 1) return;
    S2.ag.delete(agency);
    chip.classList.remove("on");
    chip.style.background = '';
    chip.style.borderColor = col;
    chip.style.color = col;
    chip.textContent = agency;
  } else {
    S2.ag.add(agency);
    chip.classList.add("on");
    chip.style.background = col;
    chip.style.borderColor = col;
    chip.style.color = '#fff';
    chip.textContent = '✓ ' + agency;
  }
  render2();
}

// ══ Přepínače ═════════════════════════════════════════════
function g1setView(v) {
  S1.view = v;
  document.getElementById("g1vP").classList.toggle("on", v === "parties");
  document.getElementById("g1vC").classList.toggle("on", v === "coalitions");
  render1();
}
function g2setView(v) {
  S2.view = v;
  document.getElementById("g2vP").classList.toggle("on", v === "parties");
  document.getElementById("g2vC").classList.toggle("on", v === "coalitions");
  render2();
}

// ══ Helpers ═══════════════════════════════════════════════
function fmt(iso) {
  if (!iso) return "";
  return new Date(iso+"T00:00:00").toLocaleDateString("cs-CZ",
    { day:"numeric", month:"short", year:"numeric" });
}
function ticksOpts() {
  return { font:{ family:"'Source Sans 3',sans-serif", size:11 }, color:"#8890B0" };
}
function tooltipOpts() {
  return {
    backgroundColor:"#2A2E4A",
    titleFont:{ family:"'Source Sans 3',sans-serif", size:11, weight:"600" },
    bodyFont:{ family:"'Source Sans 3',sans-serif", size:12 },
    padding:9,
    callbacks:{
      label: c => {
        const val = c.parsed.y;
        if (val == null) return null;
        const pub = c.dataset.pubDates?.[c.dataIndex];
        const dateStr = pub ? `  (vydáno ${fmt(pub)})` : "";
        return ` ${c.dataset.label}: ${val} %${dateStr}`;
      }
    },
  };
}

// ══ Hlášení výšky ═════════════════════════════════════════
function reportHeight() {
  const h = document.body.offsetHeight;
  if (h > 400) {
    window.parent.postMessage({ type: 'pruzkumyHeight', height: h }, '*');
  }
}
window._reportHeight = reportHeight;
window.addEventListener('resize', reportHeight);

loadPolls();
