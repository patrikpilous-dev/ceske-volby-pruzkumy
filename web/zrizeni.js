/* Schéma moci na stránkách politických zřízení (ceske-volby.cz/politicky-system/<slug>/).
   Čte data z atributu data-moc na .sch a kreslí návrh podle data-navrh:
   "1" mapa moci se šipkami, panelem a průvodcem krok za krokem,
   "2" patra moci, karty v pásech podle úrovně a spojnice po kliknutí.
   Mimo WordPress, aby wpautop nerozbil skript. */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var CSS = [
    ".sch{--cr:#141118;--nd:#574F61;--mu:#6E6779;--ln:#DCD8E2;--sf:#ECE9F0;--al:#F1EFF4;--rd:#ED1C24;--rt:#B3141A;--bl:#262362;font-family:'Source Sans 3',Verdana,sans-serif}",
    ".sch .lst{display:none}",
    ".sch button{font:inherit;cursor:pointer}",
    ".sch .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px}",
    ".sch .btn{font:600 13.5px/18px 'Source Sans 3',Verdana,sans-serif;padding:8px 14px;border:1px solid var(--bl);background:var(--bl);color:#fff;border-radius:0}",
    ".sch .btn.o{background:#fff;color:var(--bl)}",
    ".sch .btn:focus-visible,.sch .uz:focus-visible,.sch .kt:focus-visible{outline:2px solid var(--rd);outline-offset:2px}",
    ".sch .hint{font-size:14px;color:var(--mu)}",
    /* návrh 1 */
    ".sch .n1{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:22px;align-items:start}",
    ".sch .n1 svg{display:block;width:100%;height:auto;overflow:visible}",
    ".sch .uz{cursor:pointer}.sch .uz rect{fill:#fff;stroke:var(--ln);stroke-width:1.5;transition:fill .15s,stroke .15s,opacity .15s}",
    ".sch .uz:hover rect{stroke:var(--cr)}.sch .uz.v0 rect{fill:var(--bl);stroke:var(--bl)}",
    ".sch .uz text{pointer-events:none}.sch .uz .t1{font:600 16px 'Source Sans 3',Verdana,sans-serif;fill:var(--cr)}.sch .uz .t2{font:400 12.5px 'Source Sans 3',Verdana,sans-serif;fill:var(--mu)}",
    ".sch .uz.v0 .t1{fill:#fff}.sch .uz.v0 .t2{fill:#D9D6F2}",
    ".sch .uz.sel rect{fill:var(--rd);stroke:var(--rd)}.sch .uz.sel .t1{fill:#fff}.sch .uz.sel .t2{fill:#FFE3E4}.sch .uz.dim{opacity:.25}",
    ".sch .hr path{fill:none;stroke:var(--nd);stroke-width:1.6;opacity:.65;transition:opacity .15s}",
    ".sch .hr text{font:600 13.5px 'Source Sans 3',Verdana,sans-serif;fill:var(--nd);paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round}",
    ".sch .hr.on path{stroke:var(--rd);stroke-width:2.6;opacity:1}.sch .hr.on text{fill:var(--rt)}.sch .hr.dim{opacity:.07}",
    ".sch .pan{position:sticky;top:20px;border-top:3px solid var(--cr);padding:14px 0 0}",
    ".sch .pan .k{font:600 12px/16px 'Source Sans 3',Verdana,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--bl)}",
    ".sch .pan h3{font:500 22px/1.25 Literata,Georgia,serif;color:var(--cr);margin:6px 0 6px;padding:0;border:0}",
    ".sch .pan p{margin:0 0 12px;color:#4A4453;line-height:1.55}",
    ".sch .pan ul{list-style:none;margin:0!important;padding:0!important}.sch .pan li{list-style:none;margin:0!important;padding:8px 0;border-top:1px solid var(--sf);line-height:1.45}",
    ".sch .pan li b{color:var(--rt);font-weight:600}",
    ".sch .krok{font:500 13px/1 'IBM Plex Mono',Consolas,monospace;color:var(--mu);margin-left:auto}",
    /* návrh 2 */
    ".sch .n2{position:relative}",
    ".sch .pas{display:grid;grid-template-columns:150px minmax(0,1fr);border-top:1px solid var(--ln)}",
    ".sch .pas:last-child{border-bottom:1px solid var(--ln)}",
    ".sch .pas .lb{padding:22px 16px 22px 0;font:500 12.5px/1.35 'IBM Plex Mono',Consolas,monospace;color:var(--mu);position:relative}",
    ".sch .pas .lb b{display:block;font:500 15px/1.3 Literata,Georgia,serif;color:var(--cr);margin-bottom:4px}",
    ".sch .pas .ks{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;padding:22px 0}",
    ".sch .kt{position:relative;z-index:2;width:230px;text-align:left;background:#fff;border:1px solid var(--ln);padding:12px 14px;border-radius:0;transition:opacity .15s,border-color .15s,background .15s}",
    ".sch .kt:hover{border-color:var(--cr)}",
    ".sch .kt b{display:block;font:600 16px/1.3 'Source Sans 3',Verdana,sans-serif;color:var(--cr)}",
    ".sch .kt span{display:block;font-size:13.5px;line-height:1.4;color:var(--mu);margin-top:3px}",
    ".sch .p0 .kt{background:var(--bl);border-color:var(--bl)}.sch .p0 .kt b{color:#fff}.sch .p0 .kt span{color:#D9D6F2}",
    ".sch .kt.sel{background:var(--rd)!important;border-color:var(--rd)!important}.sch .kt.sel b{color:#fff}.sch .kt.sel span{color:#FFE3E4}",
    ".sch .kt.rel{border-color:var(--rd);box-shadow:inset 0 0 0 1px var(--rd)}.sch .kt.dim{opacity:.3}",
    ".sch .kt i{display:none;font-style:normal;font:600 12.5px/1.3 'Source Sans 3',Verdana,sans-serif;color:var(--rt);margin-top:8px;padding-top:6px;border-top:1px solid var(--sf)}",
    ".sch .kt.rel i{display:block}",
    ".sch .p0 .kt.rel i{color:#FFD5D7;border-top-color:rgba(255,255,255,.2)}",
    ".sch .n2 svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible}",
    ".sch .n2 svg path{fill:none;stroke:var(--rd);stroke-width:2.2}",
    ".sch .osa{position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--bl),var(--al))}",
    ".sch .pas .lb{padding-left:18px}",
    "@media(max-width:860px){.sch .n1{grid-template-columns:1fr}.sch .pan{position:static}.sch .pas{grid-template-columns:1fr}.sch .pas .lb{padding:14px 0 0 18px}.sch .pas .ks{justify-content:flex-start;padding:12px 0 18px 18px}.sch .kt{width:100%}}",
    "@media(prefers-reduced-motion:reduce){.sch *{transition:none!important}}"
  ].join("");

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function sv(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function zalom(t, n) {
    var w = (t || "").split(" "), a = "", b = "";
    w.forEach(function (x) { if (!b && (a + " " + x).trim().length <= n) a = (a + " " + x).trim(); else b = (b + " " + x).trim(); });
    if (b.length > n) b = b.slice(0, n - 1) + "…";
    return [a, b];
  }
  function popisVazby(D, T, id) {
    return D.vazby.filter(function (v) { return v[0] === id || v[1] === id; }).map(function (v) {
      return v[0] === id ? ["", v[2], T[v[1]].t] : [T[v[0]].t, v[2], ""];
    });
  }
  function urovne(D) {
    var u = [];
    D.uzly.forEach(function (x) { if (u.indexOf(x.uroven) < 0) u.push(x.uroven); });
    return u.sort(function (a, b) { return a - b; });
  }

  /* Návrh 1, mapa moci s panelem a průvodcem */
  function navrh1(w, D, T) {
    var U = urovne(D), W = 940, RW = 220, RH = 66, DY = 150, poz = {};
    U.forEach(function (lv, i) {
      var r = D.uzly.filter(function (x) { return x.uroven === lv; }), n = r.length;
      var krok = n > 1 ? Math.min(460, (W - RW - 30) / (n - 1)) : 0;
      r.forEach(function (x, j) { poz[x.id] = [W / 2 + (j - (n - 1) / 2) * krok, 50 + i * DY]; });
    });
    var H = 50 + (U.length - 1) * DY + RH / 2 + 24;
    var bar = el("div", { "class": "bar" });
    var bt = el("button", { "class": "btn", type: "button" }, "Projít krok za krokem");
    var bz = el("button", { "class": "btn o", type: "button" }, "Zrušit výběr");
    var kr = el("span", { "class": "krok" });
    bar.appendChild(bt); bar.appendChild(bz); bar.appendChild(el("span", { "class": "hint" }, "nebo klikněte na kteroukoli instituci")); bar.appendChild(kr);
    var g = el("div", { "class": "n1" });
    var s = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": D.popis || "Schéma moci" });
    var defs = sv("defs"), mk = sv("marker", { id: "cvzs1", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" });
    mk.appendChild(sv("path", { d: "M0,0L10,5L0,10z", fill: "#574F61" })); defs.appendChild(mk);
    var mk2 = mk.cloneNode(true); mk2.setAttribute("id", "cvzs1r"); mk2.firstChild.setAttribute("fill", "#ED1C24"); defs.appendChild(mk2);
    s.appendChild(defs);
    var hrany = [], popisky = [];
    D.vazby.forEach(function (v) {
      var a = v[0], b = v[1]; if (!poz[a] || !poz[b]) return;
      var x1 = poz[a][0], y1 = poz[a][1], x2 = poz[b][0], y2 = poz[b][1], sx, sy, ex, ey, cx, cy, lx, ly;
      if (Math.abs(y1 - y2) < 1) {
        var d = x2 > x1 ? 1 : -1; sx = x1 + d * RW / 2; ex = x2 - d * (RW / 2 + 4); sy = ey = y1 + 10; cx = (sx + ex) / 2; cy = sy; lx = cx; ly = y1 - 4;
      } else {
        var dd = y2 > y1 ? 1 : -1, off = Math.max(-RW / 2 + 24, Math.min(RW / 2 - 24, (x2 - x1) * 0.3));
        var par = D.vazby.some(function (q) { return q[0] === b && q[1] === a; }), pos = par ? (dd > 0 ? 24 : -24) : 0;
        sx = x1 + off + pos; sy = y1 + dd * RH / 2; ex = x2 - off + pos; ey = y2 - dd * (RH / 2 + 4);
        cx = (sx + ex) / 2; cy = (sy + ey) / 2; lx = cx + (par ? pos * 2.4 : 0); ly = cy + 4;
      }
      var gg = sv("g", { "class": "hr", "data-a": a, "data-b": b });
      gg.appendChild(sv("path", { d: "M" + sx + "," + sy + " Q" + cx + "," + cy + " " + ex + "," + ey, "marker-end": "url(#cvzs1)" }));
      hrany.push(gg);
      var gl = sv("g", { "class": "hr", "data-a": a, "data-b": b });
      gl.appendChild(sv("text", { x: lx, y: ly, "text-anchor": "middle" }, v[2]));
      popisky.push(gl);
    });
    hrany.forEach(function (x) { s.appendChild(x); });
    D.uzly.forEach(function (u) {
      var p = poz[u.id], z = zalom(u.s, 32);
      var gg = sv("g", { "class": "uz" + (u.uroven === U[0] ? " v0" : ""), "data-id": u.id, tabindex: "0", role: "button", "aria-label": u.t });
      gg.appendChild(sv("rect", { x: p[0] - RW / 2, y: p[1] - RH / 2, width: RW, height: RH }));
      gg.appendChild(sv("text", { "class": "t1", x: p[0], y: z[1] ? p[1] - 10 : p[1] - 3, "text-anchor": "middle" }, u.t));
      gg.appendChild(sv("text", { "class": "t2", x: p[0], y: z[1] ? p[1] + 8 : p[1] + 15, "text-anchor": "middle" }, z[0]));
      if (z[1]) gg.appendChild(sv("text", { "class": "t2", x: p[0], y: p[1] + 23, "text-anchor": "middle" }, z[1]));
      s.appendChild(gg);
    });
    popisky.forEach(function (x) { s.appendChild(x); });
    var pan = el("div", { "class": "pan", "aria-live": "polite" });
    g.appendChild(s); g.appendChild(pan);
    w.appendChild(bar); w.appendChild(g);
    var poradi = D.uzly.slice().sort(function (a, b) { return a.uroven - b.uroven; }).map(function (x) { return x.id; }), sel = null;
    function zaklad() {
      pan.innerHTML = "";
      pan.appendChild(el("div", { "class": "k" }, "Kdo měl moc"));
      pan.appendChild(el("h3", null, "Vyberte instituci"));
      pan.appendChild(el("p", null, D.popis || ""));
    }
    function vyber(id) {
      sel = id;
      var i = poradi.indexOf(id);
      kr.textContent = id ? (i + 1) + " / " + poradi.length : "";
      bt.textContent = id ? (i < poradi.length - 1 ? "Další krok" : "Znovu od začátku") : "Projít krok za krokem";
      s.querySelectorAll(".uz").forEach(function (n) {
        var k = n.getAttribute("data-id"), sp = id && D.vazby.some(function (v) { return (v[0] === id && v[1] === k) || (v[1] === id && v[0] === k); });
        n.classList.toggle("sel", k === id); n.classList.toggle("dim", !!id && k !== id && !sp);
      });
      s.querySelectorAll(".hr").forEach(function (n) {
        var on = id && (n.getAttribute("data-a") === id || n.getAttribute("data-b") === id);
        n.classList.toggle("on", !!on); n.classList.toggle("dim", !!id && !on);
        var p = n.querySelector("path"); if (p) p.setAttribute("marker-end", on ? "url(#cvzs1r)" : "url(#cvzs1)");
      });
      if (!id) { zaklad(); return; }
      var u = T[id];
      pan.innerHTML = "";
      pan.appendChild(el("div", { "class": "k" }, "Krok " + (i + 1) + " z " + poradi.length));
      pan.appendChild(el("h3", null, u.t));
      pan.appendChild(el("p", null, u.s || ""));
      var ul = el("ul");
      popisVazby(D, T, id).forEach(function (r) {
        var li = el("li");
        if (r[0]) li.appendChild(document.createTextNode(r[0] + " "));
        li.appendChild(el("b", null, r[1]));
        if (r[2]) li.appendChild(document.createTextNode(" " + r[2]));
        ul.appendChild(li);
      });
      pan.appendChild(ul);
    }
    s.querySelectorAll(".uz").forEach(function (n) {
      var id = n.getAttribute("data-id");
      n.addEventListener("click", function () { vyber(sel === id ? null : id); });
      n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); vyber(sel === id ? null : id); } });
    });
    bt.addEventListener("click", function () {
      var i = sel ? poradi.indexOf(sel) : -1;
      vyber(poradi[(i + 1) % poradi.length]);
    });
    bz.addEventListener("click", function () { vyber(null); });
    zaklad();
  }

  /* Návrh 2, patra moci */
  function navrh2(w, D, T) {
    var U = urovne(D);
    var NAZ = ["Vrchol moci", "Výkon moci", "Opora moci", "Základna", "Základna"];
    var bar = el("div", { "class": "bar" });
    var bz = el("button", { "class": "btn o", type: "button" }, "Zrušit výběr");
    bar.appendChild(el("span", { "class": "hint" }, "Klikněte na kartu a uvidíte, s kým byla instituce spojená a jak."));
    bar.appendChild(bz);
    var box = el("div", { "class": "n2" });
    box.appendChild(el("div", { "class": "osa", "aria-hidden": "true" }));
    var s = sv("svg", { "aria-hidden": "true" });
    var defs = sv("defs"), mk = sv("marker", { id: "cvzs2", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" });
    mk.appendChild(sv("path", { d: "M0,0L10,5L0,10z", fill: "#ED1C24" })); defs.appendChild(mk); s.appendChild(defs);
    var karty = {};
    U.forEach(function (lv, i) {
      var pas = el("div", { "class": "pas p" + i });
      var lb = el("div", { "class": "lb" });
      lb.appendChild(el("b", null, i === U.length - 1 && U.length > 2 ? "Základna" : NAZ[Math.min(i, 3)]));
      lb.appendChild(document.createTextNode(i === 0 ? "nejvíc moci" : (i === U.length - 1 ? "nejméně moci" : (i + 1) + ". patro")));
      var ks = el("div", { "class": "ks" });
      D.uzly.filter(function (x) { return x.uroven === lv; }).forEach(function (u) {
        var k = el("button", { "class": "kt", type: "button", "data-id": u.id });
        k.appendChild(el("b", null, u.t)); k.appendChild(el("span", null, u.s || "")); k.appendChild(el("i"));
        ks.appendChild(k); karty[u.id] = k;
      });
      pas.appendChild(lb); pas.appendChild(ks); box.appendChild(pas);
    });
    box.appendChild(s);
    w.appendChild(bar); w.appendChild(box);
    var sel = null;
    function kresli() {
      while (s.childNodes.length > 1) s.removeChild(s.lastChild);
      if (!sel) return;
      var B = box.getBoundingClientRect();
      D.vazby.forEach(function (v) {
        if (v[0] !== sel && v[1] !== sel) return;
        var a = karty[v[0]].getBoundingClientRect(), b = karty[v[1]].getBoundingClientRect();
        var ax = a.left + a.width / 2 - B.left, bx = b.left + b.width / 2 - B.left, ay, by;
        if (Math.abs(a.top - b.top) < 4) { ay = a.top + a.height / 2 - B.top; by = ay; ax = a.left < b.left ? a.right - B.left : a.left - B.left; bx = a.left < b.left ? b.left - B.left - 4 : b.right - B.left + 4; }
        else if (a.top < b.top) { ay = a.bottom - B.top; by = b.top - B.top - 4; } else { ay = a.top - B.top; by = b.bottom - B.top + 4; }
        var my = (ay + by) / 2;
        s.appendChild(sv("path", { d: "M" + ax + "," + ay + " C" + ax + "," + my + " " + bx + "," + my + " " + bx + "," + by, "marker-end": "url(#cvzs2)" }));
      });
    }
    function vyber(id) {
      sel = id;
      Object.keys(karty).forEach(function (k) {
        var c = karty[k], vz = id ? D.vazby.filter(function (v) { return (v[0] === id && v[1] === k) || (v[1] === id && v[0] === k); }) : [];
        c.classList.toggle("sel", k === id); c.classList.toggle("rel", vz.length > 0); c.classList.toggle("dim", !!id && k !== id && !vz.length);
        c.setAttribute("aria-pressed", k === id ? "true" : "false");
        c.querySelector("i").textContent = vz.map(function (v) { return v[0] === id ? T[id].t + " " + v[2] : v[2] + " " + T[id].t; }).join(", ");
      });
      kresli();
    }
    Object.keys(karty).forEach(function (k) { karty[k].addEventListener("click", function () { vyber(sel === k ? null : k); }); });
    bz.addEventListener("click", function () { vyber(null); });
    window.addEventListener("resize", kresli);
  }

  function start() {
    var w = document.querySelector("#cvz .sch, .sch[data-moc]");
    if (!w || w.getAttribute("data-hotovo")) return;
    w.setAttribute("data-hotovo", "1");
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var D = JSON.parse(w.getAttribute("data-moc")), T = {};
    D.uzly.forEach(function (u) { T[u.id] = u; });
    if (w.getAttribute("data-navrh") === "2") navrh2(w, D, T); else navrh1(w, D, T);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
