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
  try {
    const r = await fetch("https://patrikpilous-dev.github.io/ceske-volby-pruzkumy/data/polls.json");
    if (!r.ok) throw new Error();
    POLLS = await r.json();
  } catch {
    POLLS = EMBEDDED;
  }
  init();
}

// ══ Stav ══════════════════════════════════════════════════
const S1  = { view:"parties", chart:null };
const S1b = { chart:null };
const S2  = { view:"parties", ag:new Set(), hide:new Set(), chart:null };

// ══ Init ══════════════════════════════════════════════════
function init() {
  POLLS = POLLS.filter(p => Object.values(p.parties).every(v => v <= 45));
  [...new Set(POLLS.map(p => p.agency))].forEach(a => S2.ag.add(a));
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
  const latest = [...POLLS]
    .sort((a,b) => b.date_fieldwork_to.localeCompare(a.date_fieldwork_to))
    .slice(0, 5);
  if (!latest.length) return;
  document.getElementById("lboxItems").innerHTML = latest.map(p => {
    const url = AGENCY_URLS[p.agency] || "#";
    return `<div class="lbox-item">
      <a href="${url}" target="_blank">${p.agency}</a>
      <span class="dt">${fmt(p.date_fieldwork_to)}</span>
    </div>`;
  }).join("");
  document.getElementById("lbox").classList.add("on");
}

// ══ Nejnovější průzkum od každé agentury ══════════════════
function getLatestPerAgency() {
  const map = {};
  POLLS.forEach(p => {
    if (!map[p.agency] || p.date_fieldwork_to > map[p.agency].date_fieldwork_to)
      map[p.agency] = p;
  });
  return Object.values(map).sort((a,b) => a.agency.localeCompare(b.agency));
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

// ══ Plugin: červená čára volebního cenzu (5 %) ════════════
const censusLinePlugin = {
  id: "censusLine",
  afterDraw(chart) {
    const { ctx, scales: { y } } = chart;
    if (!y) return;
    const yPos = y.getPixelForValue(5);
    const left  = chart.chartArea.left;
    const right = chart.chartArea.right;
    ctx.save();
    ctx.strokeStyle = "#C0272D";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(left, yPos);
    ctx.lineTo(right, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#C0272D";
    ctx.font = "600 10px 'Source Sans 3', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("5 % — volebni cenzus", right - 4, yPos - 3);
    ctx.restore();
  }
};

// ══ GRAF 1 — grouped bar ══════════════════════════════════
function render1() {
  const latestPolls = getLatestPerAgency();
  const parties     = getParties(latestPolls, S1.view);

  if (!parties.length) {
    const ctx = document.getElementById("c1").getContext("2d");
    if (S1.chart) { S1.chart.destroy(); S1.chart = null; }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById("avgRow").innerHTML = "";
    document.getElementById("leg1").innerHTML = "";
    document.getElementById("meta1").innerHTML = "";
    return;
  }

  const datasets = latestPolls.map(poll => {
    const col = AC[poll.agency] || "#888";
    return {
      label: poll.agency,
      data: parties.map(pid => poll.parties[pid] ?? null),
      backgroundColor: col + "CC",
      borderColor: col,
      borderWidth: 1.5,
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
      plugins: { legend:{display:false}, tooltip:tooltipOpts() },
      scales: {
        x: { grid:{display:false}, ticks:ticksOpts() },
        y: { min:0, max:45,
             grid:{ color:"#E8EAF0" },
             ticks:{ ...ticksOpts(), callback: v => v+" %" } },
      },
    },
    plugins: [barLabelsPlugin, censusLinePlugin],
  });

  let avgHtml = `<div class="avg-row-label">Aktu\u00e1ln\u00ed pr\u016fm\u011br volebn\u00edch preferenc\u00ed v\u0161ech agentur</div>`;
  parties.forEach(pid => {
    const vals = latestPolls.map(p => p.parties[pid]).filter(v => v != null);
    if (!vals.length) return;
    const avg = vals.reduce((s,v) => s+v, 0) / vals.length;
    const cfg = PC[pid];
    avgHtml += `<div class="avg-chip">
      <div class="dot" style="background:${cfg.c}"></div>
      <span>${cfg.d}</span>
      <strong>${avg.toFixed(1)} %</strong>
    </div>`;
  });
  document.getElementById("avgRow").innerHTML = avgHtml;

  document.getElementById("leg1").innerHTML = latestPolls.map(poll => {
    const isP = AGENCY_TYPE[poll.agency] === "preference";
    return `<div class="li nodim">
      <div class="ld" style="background:${AC[poll.agency]||'#888'}"></div>
      <span>${poll.agency}${isP ? ' <span class="pref-badge">pref</span>' : ''} &mdash; ${fmt(poll.date_fieldwork_to)}</span>
    </div>`;
  }).join("");

  const agLinks = latestPolls.map(p =>
    `<a href="${AGENCY_URLS[p.agency]||'#'}" target="_blank">${p.agency}</a>`
  ).join(", ");
  document.getElementById("meta1").innerHTML = `
    <span>Agentury: <b>${agLinks}</b></span>
    <span>Zobrazeno: <b>${S1.view === "parties" ? "Strany" : "Koalice"}</b></span>`;

  render1b(latestPolls, parties);
}

// ══ GRAF 1b — Průměr přes všechny agentury ════════════════
function render1b(latestPolls, parties) {
  const partyData = parties.map(pid => {
    const vals = latestPolls.map(p => p.parties[pid]).filter(v => v != null);
    const avg  = vals.length ? vals.reduce((s,v) => s+v, 0) / vals.length : null;
    return { pid, avg };
  }).filter(d => d.avg != null);

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
        label: "Pr\u016fm\u011br",
        data:  partyData.map(d => +d.avg.toFixed(1)),
        backgroundColor: partyData.map(d => (PC[d.pid]?.c || "#888") + "CC"),
        borderColor:     partyData.map(d => PC[d.pid]?.c || "#888"),
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#2A2E4A",
          titleFont: { family:"'Source Sans 3',sans-serif", size:11, weight:"600" },
          bodyFont:  { family:"'Source Sans 3',sans-serif", size:12 },
          padding: 9,
          callbacks: { label: c => ` Pr\u016fm\u011br: ${c.parsed.y} %` },
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

// ══ Lineární interpolace chybějících měsíců ═══════════════
function interpolate(data) {
  const r = data.slice();
  for (let i = 1; i < r.length - 1; i++) {
    if (r[i] !== null) continue;
    let prev = -1, next = -1;
    for (let j = i-1; j >= 0; j--)            { if (r[j] !== null) { prev = j; break; } }
    for (let j = i+1; j < r.length; j++)       { if (r[j] !== null) { next = j; break; } }
    if (prev >= 0 && next >= 0)
      r[i] = +(r[prev] + (r[next] - r[prev]) * (i - prev) / (next - prev)).toFixed(1);
  }
  return r;
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
  const cs = ['led','\xfano','b\u0159e','dub','kv\u011b','\u010dvn','\u010dvc','srp','z\u00e1\u0159','\u0159\xedj','lis','pro'];
  const [y, m] = ym.split('-');
  return `${cs[parseInt(m)-1]} ${y.slice(2)}`;
}

// ══ GRAF 2 — spojnicový ═══════════════════════════════════
function render2() {
  const polls = POLLS
    .filter(p => S2.ag.has(p.agency))
    .sort((a,b) => a.date_fieldwork_to.localeCompare(b.date_fieldwork_to));

  if (!polls.length) return;

  const parties  = getParties(polls, S2.view).filter(p => !S2.hide.has(p));
  const agencies = [...new Set(polls.map(p => p.agency))].sort();

  const monthPollMap = {};
  polls.forEach(p => {
    const mo = p.date_fieldwork_to.substring(0, 7);
    if (!monthPollMap[mo]) monthPollMap[mo] = {};
    const prev = monthPollMap[mo][p.agency];
    if (!prev || p.date_fieldwork_to > prev.date_fieldwork_to)
      monthPollMap[mo][p.agency] = p;
  });

  const allMonths   = getAllMonths();
  const monthLabels = allMonths.map(fmtMonth);

  const datasets = [];
  parties.forEach(pid => {
    const cfg = PC[pid] || { d:pid, c:"#888" };
    agencies.forEach(ag => {
      const hasAny = allMonths.some(m => monthPollMap[m]?.[ag]?.parties[pid] != null);
      if (!hasAny) return;
      const pubDates = allMonths.map(m => monthPollMap[m]?.[ag]?.date_published ?? null);
      const rawData  = allMonths.map(m => {
        const p = monthPollMap[m]?.[ag];
        return (p && p.parties[pid] != null) ? p.parties[pid] : null;
      });
      datasets.push({
        label: `${cfg.d} \xb7 ${ag}`,
        pubDates,
        data: interpolate(rawData),
        borderColor: cfg.c,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: AGENCY_DASH[ag] || [],
        pointRadius: 3, pointHoverRadius: 5,
        pointBackgroundColor: cfg.c,
        pointBorderColor: "#fff", pointBorderWidth: 1,
        tension: 0.3, spanGaps: false,
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
      plugins:{ legend:{display:false}, tooltip:tooltipOpts() },
      scales: {
        x: { grid:{color:"#E8EAF0"},
             ticks:{ ...ticksOpts(), maxRotation:0, maxTicksLimit:18,
               font:{ family:"'Source Sans 3',sans-serif", size:10 } } },
        y: { min:0, max:45, grid:{color:"#E8EAF0"},
             ticks:{ ...ticksOpts(), callback:v => v+" %" } },
      },
    },
  });

  let legHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px 12px;width:100%">`;
  parties.forEach(pid => {
    const cfg = PC[pid]; if (!cfg) return;
    legHtml += `<div class="li ${S2.hide.has(pid)?"off":""}" onclick="toggleParty2('${pid}')">
      <div class="ld" style="background:${cfg.c}"></div>
      <span>${cfg.d}</span>
    </div>`;
  });
  legHtml += `</div><div class="leg-div"></div>`;

  legHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px 16px;width:100%">`;
  agencies.forEach(ag => {
    const dash = AGENCY_DASH[ag] || [];
    const isP  = AGENCY_TYPE[ag] === "preference";
    legHtml += `<div class="li nodim">
      <svg width="24" height="12" style="flex-shrink:0">
        <line x1="0" y1="6" x2="24" y2="6"
          stroke="${AC[ag]||'#888'}" stroke-width="2"
          stroke-dasharray="${dash.join(' ')}"/>
      </svg>
      <span>${ag}${isP ? ' <span class="pref-badge">pref</span>' : ''}</span>
    </div>`;
  });
  legHtml += `</div>`;
  document.getElementById("leg2").innerHTML = legHtml;

  const dates   = polls.map(p => p.date_fieldwork_to).sort();
  const agLinks = agencies.map(ag =>
    `<a href="${AGENCY_URLS[ag]||'#'}" target="_blank">${ag}</a>`
  ).join(", ");
  document.getElementById("meta2").innerHTML = `
    <span>Agentury: <b>${agLinks}</b></span>
    <span>Pruzkumu: <b>${polls.length}</b></span>
    <span>Obdobi: <b>${fmt(dates[0])} &ndash; ${fmt(dates[dates.length-1])}</b></span>`;
}

function toggleParty2(pid) {
  S2.hide.has(pid) ? S2.hide.delete(pid) : S2.hide.add(pid);
  render2();
}

// ══ Agency chips ══════════════════════════════════════════
function buildChips2() {
  const agencies = [...new Set(POLLS.map(p => p.agency))];
  document.getElementById("af2").innerHTML = agencies.map(a => {
    const col = AC[a] || '#888';
    return `<div class="ac on" id="af2-${a}"
      data-color="${col}"
      style="background:${col};border-color:${col};color:#fff"
      onclick="toggleAg2('${a}')">${a}</div>`;
  }).join("");
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
  } else {
    S2.ag.add(agency);
    chip.classList.add("on");
    chip.style.background = col;
    chip.style.borderColor = col;
    chip.style.color = '#fff';
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
        const dateStr = pub ? `  (vydano ${fmt(pub)})` : "";
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
