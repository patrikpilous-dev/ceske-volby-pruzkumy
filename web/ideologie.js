/* Kruhová časová osa na stránkách ideologií (ceske-volby.cz/ideologie/<slug>/).
   Čte data z atributů .ido: data-osa (JSON), data-foto (URL), data-osoba.
   Desktop: kruh s fotkou uprostřed, události jako body po obvodu, vpravo karta vybrané události.
   Mobil (pod 820 px): svislá časová osa. Mimo WordPress kvůli wpautop. */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var TYP = {
    myslenka: ["Myšlenky a texty", "#262362"],
    revoluce: ["Revoluce a převraty", "#ED1C24"],
    rezim: ["Režimy", "#574F61"],
    cesko: ["České země", "#B35F00"],
    dnes: ["Dnes", "#2C7A4B"]
  };
  var CSS = [
    ".ido{--cr:#141118;--nd:#574F61;--mu:#6E6779;--ln:#DCD8E2;--sf:#ECE9F0;--rd:#ED1C24;--rt:#B3141A;--bl:#262362;font-family:'Source Sans 3',Verdana,sans-serif}",
    ".ido .lst{display:none}",
    ".ido .gr{display:grid;grid-template-columns:minmax(0,560px) minmax(0,1fr);gap:40px;align-items:center}",
    ".ido svg{display:block;width:100%;height:auto;overflow:visible}",
    ".ido .ring{fill:none;stroke:var(--ln);stroke-width:2}",
    ".ido .prog{fill:none;stroke:var(--rd);stroke-width:4;stroke-linecap:round;transition:stroke-dashoffset .35s}",
    ".ido .bod{cursor:pointer}.ido .bod circle{stroke:#fff;stroke-width:3;transition:r .15s}",
    ".ido .bod text{font:600 16px 'IBM Plex Mono',Consolas,monospace;fill:var(--nd);pointer-events:none}",
    ".ido .bod.on text{fill:var(--rt);font-size:18px}.ido .bod.on circle{stroke:var(--rd);stroke-width:4}",
    ".ido .bod:focus{outline:none}.ido .bod:focus-visible circle{stroke:var(--rd);stroke-width:5}",
    ".ido .karta{border-top:3px solid var(--cr);padding-top:14px;min-height:220px}",
    ".ido .karta .rk{font:500 46px/1 'Literata',Georgia,serif;color:var(--cr)}",
    ".ido .karta .tp{display:inline-block;font:600 12px/1.6 'Source Sans 3',Verdana,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff;padding:1px 8px;margin:10px 0 8px}",
    ".ido .karta h3{font:500 25px/1.25 'Literata',Georgia,serif;color:var(--cr);margin:0 0 8px;padding:0;border:0}",
    ".ido .karta p{margin:0 0 14px;color:#4A4453;line-height:1.6;font-size:17px}",
    ".ido .nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
    ".ido .nav button{font:600 13.5px/18px 'Source Sans 3',Verdana,sans-serif;padding:8px 14px;border:1px solid var(--bl);background:var(--bl);color:#fff;cursor:pointer;border-radius:0}",
    ".ido .nav button.o{background:#fff;color:var(--bl)}",
    ".ido .nav button:focus-visible{outline:2px solid var(--rd);outline-offset:2px}",
    ".ido .nav span{font:500 13px 'IBM Plex Mono',Consolas,monospace;color:var(--mu);margin-left:auto}",
    ".ido .lg{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:14px;font-size:13.5px;color:var(--mu)}",
    ".ido .lg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}",
    ".ido .mob{display:none;position:relative;padding-left:26px;border-left:2px solid var(--cr);margin-left:6px}",
    ".ido .mob>div{position:relative;padding:0 0 18px}",
    ".ido .mob>div:before{content:'';position:absolute;left:-33px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--c);box-shadow:0 0 0 3px #fff}",
    ".ido .mob b{display:block;font:500 15px/1.4 'IBM Plex Mono',Consolas,monospace;color:var(--bl)}",
    ".ido .mob strong{display:block;font:500 18px/1.3 'Literata',Georgia,serif;color:var(--cr);margin:2px 0 2px}",
    ".ido .mob span{color:#4A4453;line-height:1.55}",
    ".ido .mob .fo{display:block;width:140px;height:140px;border-radius:50%;object-fit:cover;margin:0 0 18px -6px;border:4px solid var(--rd)}",
    "@media(max-width:820px){.ido .gr{display:none}.ido .mob{display:block}}",
    "@media(prefers-reduced-motion:reduce){.ido *{transition:none!important}}"
  ].join("");

  function sv(t, a, x) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); if (x != null) n.textContent = x; return n; }
  function el(t, a, x) { var n = document.createElement(t); if (a) for (var k in a) n.setAttribute(k, a[k]); if (x != null) n.textContent = x; return n; }

  function start() {
    var w = document.querySelector(".ido[data-osa]");
    if (!w || w.getAttribute("data-hotovo")) return;
    w.setAttribute("data-hotovo", "1");
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var O = JSON.parse(w.getAttribute("data-osa")), foto = w.getAttribute("data-foto"), osoba = w.getAttribute("data-osoba") || "";
    var n = O.length, S = 560, C = S / 2, R = 200, sel = 0;

    // desktop: kruh
    var gr = el("div", { "class": "gr" });
    var s = sv("svg", { viewBox: "-40 -20 640 600", role: "img", "aria-label": "Časová osa ideologie" });
    var defs = sv("defs"), cp = sv("clipPath", { id: "idofoto" });
    cp.appendChild(sv("circle", { cx: C, cy: C, r: 132 })); defs.appendChild(cp); s.appendChild(defs);
    s.appendChild(sv("circle", { "class": "ring", cx: C, cy: C, r: R }));
    var obvod = 2 * Math.PI * R, kus = obvod / n;
    var prog = sv("circle", { "class": "prog", cx: C, cy: C, r: R, transform: "rotate(-90 " + C + " " + C + ")", "stroke-dasharray": obvod, "stroke-dashoffset": obvod });
    s.appendChild(prog);
    if (foto) {
      s.appendChild(sv("circle", { cx: C, cy: C, r: 138, fill: "#ED1C24" }));
      var im = sv("image", { href: foto, x: C - 132, y: C - 132, width: 264, height: 264, "clip-path": "url(#idofoto)", preserveAspectRatio: "xMidYMid slice" });
      im.appendChild(sv("title", {}, osoba));
      s.appendChild(im);
    }
    var body = [];
    O.forEach(function (u, i) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / n, x = C + R * Math.cos(a), y = C + R * Math.sin(a);
      var lx = C + (R + 34) * Math.cos(a), ly = C + (R + 34) * Math.sin(a) + 5;
      var anchor = Math.abs(Math.cos(a)) < 0.25 ? "middle" : (Math.cos(a) > 0 ? "start" : "end");
      var g = sv("g", { "class": "bod", tabindex: "0", role: "button", "aria-label": u.rok + ", " + u.titulek });
      g.appendChild(sv("circle", { cx: x, cy: y, r: 10, fill: (TYP[u.typ] || TYP.myslenka)[1] }));
      g.appendChild(sv("text", { x: lx, y: ly, "text-anchor": anchor }, u.rok));
      g.addEventListener("click", function () { vyber(i); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); vyber(i); } });
      s.appendChild(g); body.push(g);
    });
    var karta = el("div", { "class": "karta", "aria-live": "polite" });
    var pravy = el("div"); pravy.appendChild(karta);
    var nav = el("div", { "class": "nav" });
    var bz = el("button", { "class": "o", type: "button" }, "Předchozí"), bd = el("button", { type: "button" }, "Další"), poc = el("span");
    nav.appendChild(bz); nav.appendChild(bd); nav.appendChild(poc); pravy.appendChild(nav);
    var lg = el("div", { "class": "lg" });
    Object.keys(TYP).forEach(function (k) {
      if (!O.some(function (u) { return u.typ === k; })) return;
      var sp = el("span"); var i = el("i"); i.style.background = TYP[k][1]; sp.appendChild(i); sp.appendChild(document.createTextNode(TYP[k][0])); lg.appendChild(sp);
    });
    pravy.appendChild(lg);
    gr.appendChild(s); gr.appendChild(pravy); w.appendChild(gr);

    function vyber(i) {
      sel = (i + n) % n;
      body.forEach(function (g, k) { g.classList.toggle("on", k === sel); g.querySelector("circle").setAttribute("r", k === sel ? 14 : 10); });
      prog.setAttribute("stroke-dashoffset", obvod - kus * sel);
      var u = O[sel], t = TYP[u.typ] || TYP.myslenka;
      karta.innerHTML = "";
      karta.appendChild(el("div", { "class": "rk" }, u.rok));
      var tp = el("span", { "class": "tp" }, t[0]); tp.style.background = t[1]; karta.appendChild(tp);
      karta.appendChild(el("h3", null, u.titulek));
      karta.appendChild(el("p", null, u.popis));
      poc.textContent = (sel + 1) + " / " + n;
    }
    bz.addEventListener("click", function () { vyber(sel - 1); });
    bd.addEventListener("click", function () { vyber(sel + 1); });
    vyber(0);

    // mobil: svislá osa
    var mob = el("div", { "class": "mob" });
    if (foto) { var f = el("img", { "class": "fo", src: foto, alt: osoba, loading: "lazy" }); mob.appendChild(f); }
    O.forEach(function (u) {
      var d = el("div"); d.style.setProperty("--c", (TYP[u.typ] || TYP.myslenka)[1]);
      d.appendChild(el("b", null, u.rok)); d.appendChild(el("strong", null, u.titulek)); d.appendChild(el("span", null, u.popis));
      mob.appendChild(d);
    });
    w.appendChild(mob);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
