// Interaktivní schéma politického systému ČR (ceske-volby.cz, 22. 10. 2026).
const F = "https://patrikpilous-dev.github.io/ceske-volby-pruzkumy/web/";
const P = "https://www.ceske-volby.cz/politici/";
const W = 140, H = 58;

const N = {
  obcane: {x: 450, y: 45, t: "Občané", s: "voliči od 18 let",
    o: "Zdrojem veškeré moci je podle Ústavy lid. Občané volí přímo Poslaneckou sněmovnu, Senát, prezidenta, Evropský parlament, kraje a obce.",
    fa: [["18 let", "právo volit"], ["21 let", "kandidovat do Sněmovny"], ["40 let", "Senát a prezident"], ["8 voleb", "typů přímé volby"]],
    pr: ["Volí poslance, senátory, prezidenta, europoslance a zastupitele krajů a obcí.", "Mohou se účastnit místního a krajského referenda.", "Mohou zakládat politické strany a hnutí."],
    ln: [["Aktuální volební průzkumy", "https://www.ceske-volby.cz/preference/"]]},
  samosprava: {x: 78, y: 185, t: "Kraje a obce", s: "14 krajů, asi 6 250 obcí",
    o: "Územní samospráva. Krajská a obecní zastupitelstva se volí na čtyři roky, v čele krajů stojí hejtmani a v čele obcí starostové a primátoři.",
    fa: [["14", "krajů včetně Prahy"], ["asi 6 250", "obcí"], ["4 roky", "volební období"], ["2028", "příští krajské volby"]],
    pr: ["Spravují školy, silnice, sociální služby a územní plánování.", "Kraje mohou navrhovat zákony Sněmovně.", "Hospodaří s vlastním rozpočtem."],
    ln: [["Komunální politika", "https://www.ceske-volby.cz/category/komunalni-politika/"]]},
  snemovna: {x: 450, y: 185, t: "Poslanecká sněmovna", s: "200 poslanců na 4 roky",
    o: "Dolní komora Parlamentu. Volí se poměrným systémem ve 14 krajích, do Sněmovny se dostane strana s aspoň 5 % hlasů, koalice dvou stran s 8 % a větší koalice s 11 %.",
    fa: [["200", "poslanců"], ["4 roky", "volební období"], ["101", "většina všech poslanců"], ["5 %", "uzavírací klauzule"]],
    pr: ["Schvaluje zákony a státní rozpočet.", "Vyslovuje vládě důvěru a nedůvěru.", "Přehlasuje Senát i veto prezidenta 101 hlasy.", "Volí veřejného ochránce práv a navrhuje vedení NKÚ."],
    os: [["Tomio Okamura", "předseda Sněmovny, SPD", "politici-foto/tomio-okamura.jpg", "tomio-okamura"]],
    ln: [["Průměr průzkumů a přepočet na mandáty", "https://www.ceske-volby.cz/preference/"]]},
  senat: {x: 264, y: 185, t: "Senát", s: "81 senátorů na 6 let",
    o: "Horní komora Parlamentu. Senátoři se volí většinovým systémem v 81 obvodech, každé dva roky se obměňuje třetina. Senát nelze rozpustit.",
    fa: [["81", "senátorů"], ["6 let", "mandát"], ["1/3", "obměna každé 2 roky"], ["40 let", "věk pro kandidaturu"]],
    pr: ["Schvaluje, zamítá nebo vrací zákony Sněmovně.", "Dává souhlas se jmenováním soudců Ústavního soudu.", "Ústavní zákony a mezinárodní smlouvy potřebují i jeho souhlas.", "Navrhuje kandidáty na ombudsmana."],
    os: [["Miloš Vystrčil", "předseda Senátu, ODS", null, null]],
    ln: [["Senátní volby", "https://www.ceske-volby.cz/category/parlamentni-volby-2017/senatni-volby/"]]},
  prezident: {x: 636, y: 185, t: "Prezident", s: "přímá volba na 5 let",
    o: "Hlava státu. Volí se přímo na pět let, nejvýš dvakrát po sobě. Část pravomocí vykonává sám, část jen s podpisem premiéra.",
    fa: [["5 let", "funkční období"], ["2×", "nejvýš po sobě"], ["15 dní", "na podpis zákona"], ["40 let", "věk pro kandidaturu"]],
    pr: ["Jmenuje premiéra a na jeho návrh ministry.", "Jmenuje soudce, soudce Ústavního soudu a bankovní radu ČNB.", "Může vrátit zákon Sněmovně (veto).", "Je vrchním velitelem ozbrojených sil."],
    os: [["Petr Pavel", "prezident od 9. 3. 2023", "politici-foto/petr-pavel.jpg", "petr-pavel"]],
    ln: [["Jak funguje volba prezidenta", "https://www.ceske-volby.cz/2026/10/02/volba-prezidenta/"]]},
  ep: {x: 822, y: 185, t: "Evropský parlament", s: "21 europoslanců za ČR",
    o: "Čeští voliči volí 21 z 720 europoslanců na pět let. Evropský parlament schvaluje evropské zákony a rozpočet EU spolu s Radou EU.",
    fa: [["21", "europoslanců za ČR"], ["5 let", "volební období"], ["2029", "příští eurovolby"], ["5 %", "uzavírací klauzule"]],
    pr: ["Schvaluje evropskou legislativu a rozpočet EU.", "Volí předsedu Evropské komise.", "Kontroluje Evropskou komisi."]},
  nku: {x: 450, y: 530, t: "NKÚ", s: "Nejvyšší kontrolní úřad",
    o: "Nezávislý úřad, který kontroluje hospodaření se státním majetkem a státním rozpočtem. Prezidenta a viceprezidenta NKÚ jmenuje prezident republiky na návrh Sněmovny na devět let.",
    fa: [["9 let", "mandát prezidenta NKÚ"], ["nezávislý", "na vládě"]],
    pr: ["Kontroluje ministerstva a státní instituce.", "Kontroluje plnění státního rozpočtu.", "Zveřejňuje kontrolní závěry."]},
  ombudsman: {x: 78, y: 360, t: "Ombudsman", s: "veřejný ochránce práv",
    o: "Chrání lidi před nesprávným postupem úřadů a před diskriminací. Volí ho Sněmovna na šest let z kandidátů, které navrhnou prezident a Senát.",
    fa: [["6 let", "funkční období"], ["2", "navrhovatelé"]],
    pr: ["Prošetřuje stížnosti na úřady.", "Kontroluje místa, kde jsou lidé omezeni na svobodě.", "Může navrhnout zrušení předpisu Ústavnímu soudu."],
    os: [["Eva Kostolanská", "ombudsmanka od června 2026", null, null]]},
  vlada: {x: 545, y: 360, t: "Vláda", s: "premiér a ministři",
    o: "Vrcholný orgán výkonné moci. Odpovídá Sněmovně, která jí musí vyslovit důvěru. Koalici ANO, SPD a Motoristů vede Andrej Babiš.",
    fa: [["16", "členů vlády"], ["108", "mandátů koalice"], ["ANO, SPD, Motoristé", "koalice"], ["15. 1. 2026", "důvěra Sněmovny"]],
    pr: ["Řídí ministerstva a státní správu.", "Navrhuje zákony a státní rozpočet.", "Vydává nařízení vlády.", "Navrhuje soudce."],
    os: [["Andrej Babiš", "předseda vlády, ANO", "hlavy/ano.jpg", "andrej-babis"], ["Petr Macinka", "místopředseda vlády, ministr zahraničí", "hlavy/motoriste.jpg", "petr-macinka"], ["Alena Schillerová", "místopředsedkyně vlády, ministryně financí", "politici-foto/alena-schillerova.jpg", "alena-schillerova"]]},
  cnb: {x: 822, y: 360, t: "ČNB", s: "Česká národní banka",
    o: "Centrální banka nezávislá na vládě. Pečuje o cenovou stabilitu, určuje úrokové sazby a dohlíží na finanční trh. Sedmičlennou bankovní radu jmenuje prezident na šest let.",
    fa: [["7", "členů bankovní rady"], ["6 let", "mandát"], ["2 %", "inflační cíl"]],
    pr: ["Určuje úrokové sazby.", "Vydává bankovky a mince.", "Dohlíží na banky a pojišťovny."],
    os: [["Aleš Michl", "guvernér ČNB", null, null]]},
  us: {x: 264, y: 530, t: "Ústavní soud", s: "15 soudců na 10 let",
    o: "Soudní orgán ochrany ústavnosti. Soudce jmenuje prezident se souhlasem Senátu na deset let. Ruší zákony a předpisy v rozporu s ústavou a rozhoduje spory mezi ústavními orgány.",
    fa: [["15", "soudců"], ["10 let", "mandát"], ["Brno", "sídlo"]],
    pr: ["Ruší zákony v rozporu s ústavou.", "Rozhoduje o ústavních stížnostech.", "Rozhoduje kompetenční spory, například o účasti prezidenta na summitu NATO v roce 2026."],
    os: [["Josef Baxa", "předseda Ústavního soudu", null, null]]},
  soudy: {x: 636, y: 530, t: "Soudy", s: "Nejvyšší soud, NSS a další",
    o: "Soustava obecných soudů od okresních přes krajské a vrchní po Nejvyšší soud a Nejvyšší správní soud. Soudce jmenuje prezident bez časového omezení.",
    fa: [["4 stupně", "obecných soudů"], ["bez omezení", "mandát soudců"]],
    pr: ["Rozhodují trestní, civilní a správní spory.", "Nejvyšší správní soud rozhoduje i o rozpuštění politických stran a sporech o volby."]}
};

const E = [
  ["obcane", "snemovna", "voli", "volí"], ["obcane", "senat", "voli", "volí"], ["obcane", "prezident", "voli", "volí"],
  ["obcane", "ep", "voli", "volí"], ["obcane", "samosprava", "voli", "volí"],
  ["prezident", "vlada", "jmenuje", "jmenuje"], ["snemovna", "vlada", "kontroluje", "důvěra"],
  ["prezident", "us", "jmenuje", "jmenuje soudce"], ["senat", "us", "jmenuje", "souhlasí"],
  ["prezident", "cnb", "jmenuje", "bankovní rada"], ["prezident", "soudy", "jmenuje", "jmenuje soudce"],
  ["snemovna", "ombudsman", "voli", "volí"], ["snemovna", "nku", "jmenuje", "navrhuje vedení"],
  ["prezident", "snemovna", "kontroluje", "veto"], ["us", "snemovna", "kontroluje", "ruší zákony", -25],
  ["nku", "vlada", "kontroluje", "kontroluje"], ["ombudsman", "vlada", "kontroluje", "úřady"],
  ["vlada", "snemovna", "zakony", "návrh zákona"], ["snemovna", "senat", "zakony", "zákon"], ["senat", "snemovna", "zakony", "vrací"],
  ["snemovna", "prezident", "zakony", "k podpisu"]
];

const KROKY = [
  ["Návrh zákona", "Zákon může navrhnout vláda, skupina poslanců, Senát nebo krajské zastupitelstvo. Většinu zákonů předkládá vláda.", ["vlada", "snemovna", "senat", "samosprava"]],
  ["Sněmovna, tři čtení", "Poslanci návrh projednají ve třech čteních a ve výborech. Ke schválení stačí většina přítomných poslanců.", ["snemovna"]],
  ["Senát", "Senát má 30 dní. Může zákon schválit, zamítnout, vrátit s pozměňovacími návrhy, nebo se jím nezabývat.", ["senat"]],
  ["Sněmovna přehlasuje Senát", "Pokud Senát zákon zamítne nebo vrátí, Sněmovna ho může přijmout znovu hlasy 101 poslanců.", ["snemovna"]],
  ["Prezident", "Prezident má 15 dní. Zákon podepíše, nebo ho vrátí Sněmovně, tomu se říká veto.", ["prezident"]],
  ["Přehlasování veta", "Vetovaný zákon Sněmovna přijme, když pro něj znovu hlasuje 101 poslanců.", ["snemovna"]],
  ["Platnost a kontrola", "Zákon vyjde ve Sbírce zákonů. Pokud odporuje ústavě, může ho zrušit Ústavní soud.", ["us"]]
];

const C = {voli: "#1D7A3A", jmenuje: "#11457E", kontroluje: "#C0272D", zakony: "#E07000"};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const vyp = new Set(); let sel = "obcane", krok = -1;

// Bod na okraji obdélníku ve směru k cíli.
function okraj(n, tx, ty) {
  const dx = tx - n.x, dy = ty - n.y, sx = (W / 2 + 4) / Math.abs(dx || 1e-6), sy = (H / 2 + 4) / Math.abs(dy || 1e-6), s = Math.min(sx, sy);
  return [n.x + dx * s, n.y + dy * s];
}

function kresli() {
  const svg = $("sv");
  let h = '<defs>' + Object.entries(C).map(([k, c]) => `<marker id="m-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join("") + '</defs>';
  E.forEach(([a, b, t, l, ohyb], i) => {
    const A = N[a], B = N[b];
    const par = E.some(([x, y]) => x === b && y === a) ? 1 : 0;
    const [x1, y1] = okraj(A, B.x, B.y), [x2, y2] = okraj(B, A.x, A.y);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
    const o = par ? par * (ohyb ?? 26) : (ohyb ?? 0);
    const cx = mx - dy / d * o, cy = my + dx / d * o;
    const lx = (x1 + 2 * cx + x2) / 4, ly = (y1 + 2 * cy + y2) / 4;
    h += `<g class="e" data-a="${a}" data-b="${b}" data-t="${t}"><path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" stroke="${C[t]}" marker-end="url(#m-${t})"/>`
      + `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" fill="${C[t]}">${esc(l)}</text></g>`;
  });
  Object.entries(N).forEach(([k, n]) => {
    h += `<g class="node" data-k="${k}" tabindex="0" role="button" aria-label="${esc(n.t)}"><rect x="${n.x - W / 2}" y="${n.y - H / 2}" width="${W}" height="${H}" rx="0"/>`
      + `<text class="t1" x="${n.x}" y="${n.y - 3}" text-anchor="middle">${esc(n.t)}</text><text class="t2" x="${n.x}" y="${n.y + 15}" text-anchor="middle">${esc(n.s)}</text></g>`;
  });
  svg.innerHTML = h;
  svg.querySelectorAll(".node").forEach(g => {
    g.onclick = () => { krok = -1; $("kb").classList.remove("on"); vyber(g.dataset.k); };
    g.onkeydown = ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); g.onclick(); } };
  });
}

function zvyrazni() {
  const svg = $("sv");
  const zapojene = new Set([sel]);
  svg.querySelectorAll(".e").forEach(e => {
    const skryt = vyp.has(e.dataset.t);
    e.classList.toggle("hide", skryt);
    const moje = e.dataset.a === sel || e.dataset.b === sel;
    e.classList.toggle("dim", krok < 0 && !moje);
    if (moje && !skryt) { zapojene.add(e.dataset.a); zapojene.add(e.dataset.b); }
  });
  const kr = krok >= 0 ? new Set(KROKY[krok][2]) : null;
  svg.querySelectorAll(".node").forEach(g => {
    const k = g.dataset.k;
    g.classList.toggle("sel", kr ? kr.has(k) : k === sel);
    g.classList.toggle("krok", false);
    g.classList.toggle("dim", kr ? !kr.has(k) : !zapojene.has(k));
  });
  if (kr) svg.querySelectorAll(".e").forEach(e => e.classList.toggle("dim", !(e.dataset.t === "zakony" && (kr.has(e.dataset.a) || kr.has(e.dataset.b)))));
  report();
}

function vyber(k) {
  sel = k; const n = N[k];
  const vazby = E.filter(([a, b]) => a === k || b === k).map(([a, b, t, l]) =>
    `<div><i style="background:${C[t]}"></i>${a === k ? `${esc(l)} → <b>${esc(N[b].t)}</b>` : `<b>${esc(N[a].t)}</b> → ${esc(l)}`}</div>`).join("");
  const os = (n.os || []).map(([j, f, foto, slug]) => {
    const img = foto ? `<img src="${F}${foto}" alt="${esc(j)}" loading="lazy">` : "";
    const obsah = `${img}<div><b>${esc(j)}</b><span>${esc(f)}</span></div>`;
    return slug ? `<a class="os" target="_top" href="${P}${slug}/">${obsah}</a>` : `<div class="os">${obsah}</div>`;
  }).join("");
  $("det").innerHTML = `<div class="c1"><h3 class="ser">${esc(n.t)}</h3><div class="sub">${esc(n.s)}</div>`
    + `<p style="font-size:15px;margin-bottom:12px">${esc(n.o)}</p>`
    + `<div class="fa">${n.fa.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("")}</div>`
    + (os ? `<div class="kick" style="margin-bottom:6px">Kdo ji teď vede</div>${os}` : "") + `</div><div class="c2">`
    + `<div class="kick" style="margin:4px 0 6px">Pravomoci</div><ul>${n.pr.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`
    + (vazby ? `<div class="kick" style="margin-bottom:6px">Vazby</div><div class="rel">${vazby}</div>` : "")
    + (n.ln ? `<div style="margin-top:12px">${n.ln.map(([t, u]) => `<a class="ln" target="_top" href="${u}">${esc(t)}</a>`).join("<br>")}</div>` : "") + "</div>";
  zvyrazni();
}

function ukazKrok() {
  const [t, p] = KROKY[krok];
  $("kb").classList.add("on");
  $("kc").textContent = `Jak vzniká zákon · krok ${krok + 1} z ${KROKY.length}`;
  $("kt").textContent = t; $("kp").textContent = p;
  $("kz").disabled = krok === 0; $("kd").textContent = krok === KROKY.length - 1 ? "Znovu" : "Další krok";
  zvyrazni();
}

document.querySelectorAll(".f").forEach(f => f.onclick = () => {
  const t = f.dataset.t; vyp.has(t) ? vyp.delete(t) : vyp.add(t); f.classList.toggle("off", vyp.has(t)); zvyrazni();
});
$("zakon").onclick = () => { krok = 0; ukazKrok(); };
$("kd").onclick = () => { krok = krok === KROKY.length - 1 ? 0 : krok + 1; ukazKrok(); };
$("kz").onclick = () => { if (krok > 0) { krok--; ukazKrok(); } };
$("kx").onclick = () => { krok = -1; $("kb").classList.remove("on"); zvyrazni(); };

let _posl = 0;
function report() {
  const h = $("app").offsetHeight;
  if (h > 300 && Math.abs(h - _posl) > 8) { _posl = h; window.parent.postMessage({type: "pruzkumyHeight", height: h}, "*"); }
}
window.addEventListener("resize", () => { clearTimeout(window._rh); window._rh = setTimeout(report, 150); });

kresli(); vyber("obcane"); setTimeout(report, 600);
