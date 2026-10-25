/* Kruhová časová osa na stránkách ideologií (ceske-volby.cz/ideologie/<slug>/).
   Čte data z atributů .ido: data-osa (JSON, u událostí volitelně obrazek {url, alt}), data-foto (výchozí portrét), data-osoba.
   Desktop: oblouk s mezerou nahoře (první a poslední rok nejsou spojené), události jako body, uprostřed obrázek
   vybrané události, vpravo karta. Mobil: svislou osu s obrázky vykresluje server (.mob), tady se jen skryje na desktopu.
   Mimo WordPress kvůli wpautop. */
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
    ".ido .gr{display:grid;grid-template-columns:minmax(0,560px) minmax(0,1fr);gap:44px;align-items:center}",
    ".ido svg{display:block;width:100%;height:auto;overflow:visible}",
    ".ido .ring{fill:none;stroke:var(--ln);stroke-width:2}",
    ".ido .prog{fill:none;stroke:var(--rd);stroke-width:4;stroke-linecap:round;transition:stroke-dashoffset .35s}",
    ".ido .bod{cursor:pointer}.ido .bod circle{stroke:#fff;stroke-width:3;transition:r .15s}",
    ".ido .bod text{font:600 16px 'IBM Plex Mono',Consolas,monospace;fill:var(--nd);pointer-events:none}",
    ".ido .bod.on text{fill:var(--rt);font-size:18px}.ido .bod.on circle{stroke:var(--rd);stroke-width:4}",
    ".ido .bod:focus{outline:none}.ido .bod:focus-visible circle{stroke:var(--rd);stroke-width:5}",
    ".ido .stred{transition:opacity .25s}",
    ".ido .karta{border-top:3px solid var(--cr);padding-top:14px;min-height:300px}",
    ".ido .karta .rk{font:500 46px/1 'Literata',Georgia,serif;color:var(--cr)}",
    ".ido .karta .tp{display:inline-block;font:600 12px/1.6 'Source Sans 3',Verdana,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff;padding:1px 8px;margin:10px 0 8px}",
    ".ido .karta h3{font:500 25px/1.25 'Literata',Georgia,serif;color:var(--cr);margin:0 0 8px;padding:0;border:0}",
    ".ido .karta p{margin:0 0 10px;color:#4A4453;line-height:1.6;font-size:17px}",
    ".ido .karta small{display:block;font-size:12.5px;color:var(--mu);margin:0 0 14px;line-height:1.4}",
    ".ido .nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
    ".ido .nav button{font:600 13.5px/18px 'Source Sans 3',Verdana,sans-serif;padding:8px 14px;border:1px solid var(--bl);background:var(--bl);color:#fff;cursor:pointer;border-radius:0}",
    ".ido .nav button.o{background:#fff;color:var(--bl)}",
    ".ido .nav button:focus-visible{outline:2px solid var(--rd);outline-offset:2px}",
    ".ido .nav span{font:500 13px 'IBM Plex Mono',Consolas,monospace;color:var(--mu);margin-left:auto}",
    ".ido .lg{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:14px;font-size:13.5px;color:var(--mu)}",
    ".ido .lg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}",
    "@media(min-width:821px){.ido.js .mob{display:none}}",
    "@media(max-width:820px){.ido .gr{display:none}}",
    "@media(prefers-reduced-motion:reduce){.ido *{transition:none!important}}"
  ].join("");

  function sv(t, a, x) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); if (x != null) n.textContent = x; return n; }
  function el(t, a, x) { var n = document.createElement(t); if (a) for (var k in a) n.setAttribute(k, a[k]); if (x != null) n.textContent = x; return n; }

  var poradi = 0;
  function start() {
    var vse = document.querySelectorAll(".ido[data-osa]");
    if (!vse.length) return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    vse.forEach(function (w) { if (!w.getAttribute("data-hotovo")) { w.setAttribute("data-hotovo", "1"); w.classList.add("js"); kruh(w); } });
  }
  function kruh(w) {
    var cid = "idofoto" + (poradi++);
    var O = JSON.parse(w.getAttribute("data-osa")), foto = w.getAttribute("data-foto"), osoba = w.getAttribute("data-osoba") || "";
    var n = O.length, C = 280, R = 200, MEZ = 40 * Math.PI / 180;           // mezera 40° nahoře
    var A0 = -Math.PI / 2 + MEZ / 2, A1 = -Math.PI / 2 - MEZ / 2 + 2 * Math.PI;
    var uhel = function (i) { return n > 1 ? A0 + (A1 - A0) * i / (n - 1) : A0; };
    var bodXY = function (a, r) { return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
    var sel = 0;

    var gr = el("div", { "class": "gr" });
    var s = sv("svg", { viewBox: "-40 -20 640 600", role: "img", "aria-label": "Časová osa ideologie" });
    var defs = sv("defs"), cp = sv("clipPath", { id: cid });
    cp.appendChild(sv("circle", { cx: C, cy: C, r: 132 })); defs.appendChild(cp); s.appendChild(defs);
    var p0 = bodXY(A0, R), p1 = bodXY(A1, R);
    var d = "M" + p0[0] + "," + p0[1] + " A" + R + "," + R + " 0 1 1 " + p1[0] + "," + p1[1];
    s.appendChild(sv("path", { "class": "ring", d: d }));
    var prog = sv("path", { "class": "prog", d: d });
    s.appendChild(prog);
    var delka = R * (A1 - A0);
    prog.setAttribute("stroke-dasharray", delka); prog.setAttribute("stroke-dashoffset", delka);
    s.appendChild(sv("circle", { cx: C, cy: C, r: 138, fill: "#ED1C24" }));
    var im = sv("image", { "class": "stred", href: foto, x: C - 132, y: C - 132, width: 264, height: 264, "clip-path": "url(#" + cid + ")", preserveAspectRatio: "xMidYMid slice" });
    var imT = sv("title", {}, osoba); im.appendChild(imT); s.appendChild(im);
    var body = [];
    O.forEach(function (u, i) {
      var a = uhel(i), p = bodXY(a, R), l = bodXY(a, R + 34);
      var anchor = Math.abs(Math.cos(a)) < 0.25 ? "middle" : (Math.cos(a) > 0 ? "start" : "end");
      var g = sv("g", { "class": "bod", tabindex: "0", role: "button", "aria-label": u.rok + ", " + u.titulek });
      g.appendChild(sv("circle", { cx: p[0], cy: p[1], r: 10, fill: (TYP[u.typ] || TYP.myslenka)[1] }));
      g.appendChild(sv("text", { x: l[0], y: l[1] + 5, "text-anchor": anchor }, u.rok));
      g.addEventListener("click", function () { vyber(i); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); vyber(i); } });
      s.appendChild(g); body.push(g);
      if (u.obrazek && u.obrazek.url) { var pre = new Image(); pre.src = u.obrazek.url; }
    });
    var pravy = el("div"), karta = el("div", { "class": "karta", "aria-live": "polite" });
    pravy.appendChild(karta);
    var nav = el("div", { "class": "nav" });
    var bz = el("button", { "class": "o", type: "button" }, "Předchozí"), bd = el("button", { type: "button" }, "Další"), poc = el("span");
    nav.appendChild(bz); nav.appendChild(bd); nav.appendChild(poc); pravy.appendChild(nav);
    var lg = el("div", { "class": "lg" });
    Object.keys(TYP).forEach(function (k) {
      if (!O.some(function (u) { return u.typ === k; })) return;
      var sp = el("span"), i = el("i"); i.style.background = TYP[k][1]; sp.appendChild(i); sp.appendChild(document.createTextNode(TYP[k][0])); lg.appendChild(sp);
    });
    pravy.appendChild(lg);
    gr.appendChild(s); gr.appendChild(pravy);
    w.insertBefore(gr, w.firstChild);

    function vyber(i) {
      sel = Math.max(0, Math.min(n - 1, i));
      body.forEach(function (g, k) { g.classList.toggle("on", k === sel); g.querySelector("circle").setAttribute("r", k === sel ? 14 : 10); });
      prog.setAttribute("stroke-dashoffset", n > 1 ? delka - delka * sel / (n - 1) : delka);
      var u = O[sel], t = TYP[u.typ] || TYP.myslenka, ob = u.obrazek && u.obrazek.url ? u.obrazek : null;
      var novy = ob ? ob.url : foto;
      if (im.getAttribute("href") !== novy) {
        im.style.opacity = 0;
        setTimeout(function () { im.setAttribute("href", novy); imT.textContent = ob ? ob.alt : osoba; im.style.opacity = 1; }, 180);
      }
      karta.innerHTML = "";
      karta.appendChild(el("div", { "class": "rk" }, u.rok));
      var tp = el("span", { "class": "tp" }, t[0]); tp.style.background = t[1]; karta.appendChild(tp);
      karta.appendChild(el("h3", null, u.titulek));
      karta.appendChild(el("p", null, u.popis));
      if (ob && ob.kredit) karta.appendChild(el("small", null, ob.kredit));
      poc.textContent = (sel + 1) + " / " + n;
      bz.disabled = sel === 0; bd.disabled = sel === n - 1;
      bz.style.opacity = sel === 0 ? .4 : 1; bd.style.opacity = sel === n - 1 ? .4 : 1;
    }
    bz.addEventListener("click", function () { vyber(sel - 1); });
    bd.addEventListener("click", function () { vyber(sel + 1); });
    vyber(0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
