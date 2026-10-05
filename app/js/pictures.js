// Pictures Gillu draws on the board. The QUESTION decides the picture: the server sends a type, the numbers and
// (for countable things) the name of the object from the question. This file draws it exactly, so a quarter is
// always a quarter and five pencils are always five pencils.
(function () {
  const C1 = "#F2A900", C2 = "#0E5E6F", INK = "#2A1A10", SOFT = "#FFE6A8", PAPER = "#FFFDF8";
  const F = 'font-family="Poppins, Mukta, sans-serif" font-weight="600"';
  let uid = 0;
  const int = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- object pictures: shipped with the app, or painted on demand by the server ---------- */
  const SHIPPED = new Set("apple ball balloon banana bird biscuit book bottle bus car chocolate cup egg fish flower kite laddoo mango marble orange pen pencil plate roti samosa star toffee tree".split(" "));
  const remote = {};           // name -> web address of a picture the server painted
  const ready = {};            // name -> cut-out picture, ready to draw
  const slug = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

  // Server-painted pictures arrive on a plain background. Make everything joined to the border and close to its colour see-through.
  function cutOut(name, url) {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
        const g = c.getContext("2d"); g.drawImage(im, 0, 0, S, S);
        const d = g.getImageData(0, 0, S, S), px = d.data;
        if (px[3] !== 0) {                                           // already see-through at the corner: nothing to do
          const bg = [px[0], px[1], px[2]], near = (i) => Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]) < 36;
          const seen = new Uint8Array(S * S), q = [];
          const push = (x, y) => { const k = y * S + x; if (!seen[k] && near(k * 4)) { seen[k] = 1; q.push(k); } };
          for (let i = 0; i < S; i++) { push(i, 0); push(i, S - 1); push(0, i); push(S - 1, i); }
          while (q.length) { const k = q.pop(), x = k % S, y = (k - x) / S; if (x) push(x - 1, y); if (x < S - 1) push(x + 1, y); if (y) push(x, y - 1); if (y < S - 1) push(x, y + 1); }
          for (let k = 0; k < S * S; k++) if (seen[k]) px[k * 4 + 3] = 0;
          g.putImageData(d, 0, 0);
          let x0 = S, y0 = S, x1 = 0, y1 = 0;                        // trim the empty margin so the object fills its slot
          for (let k = 0; k < S * S; k++) if (!seen[k]) { const x = k % S, y = (k - x) / S; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          if (x1 > x0 && y1 > y0) {
            const side = Math.max(x1 - x0, y1 - y0) + 8, t = document.createElement("canvas"); t.width = t.height = side;
            t.getContext("2d").drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (side - (x1 - x0)) / 2, (side - (y1 - y0)) / 2, x1 - x0 + 1, y1 - y0 + 1);
            ready[name] = t.toDataURL("image/png");
          }
        }
        ready[name] = ready[name] || c.toDataURL("image/png");
      } catch (e) { ready[name] = url; }                             // could not read the pixels: show it as it is
      document.querySelectorAll(`image[data-thing="${name}"]`).forEach((el) => el.setAttribute("href", ready[name]));
    };
    im.onerror = () => { ready[name] = ""; };
    im.src = url;
  }
  window.registerThings = function (map) {
    Object.entries(map || {}).forEach(([n, url]) => { const k = slug(n); if (url && !SHIPPED.has(k) && !remote[k]) { remote[k] = url; cutOut(k, url); } });
  };
  const known = (name) => SHIPPED.has(slug(name)) || !!remote[slug(name)];
  function thing(name, x, y, w, h, extra = "") {
    const k = slug(name), src = SHIPPED.has(k) ? `assets/things/${k}.png` : (ready[k] || "");
    return `<image data-thing="${k}" href="${src}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(h ?? w).toFixed(1)}" ${extra}/>`;
  }

  /* ---------- countable things ---------- */
  function things(p) {
    if (!known(p.thing)) return "";
    const rows = (p.rows || []).slice(0, 6).map((r) => int(r && typeof r === "object" ? r.count : r, 0, 12, 0));
    const size = Math.min(104, 296 / Math.max(...rows, 1), 292 / rows.length);
    const top = (300 - rows.length * size) / 2;
    let out = "";
    rows.forEach((n, ri) => { for (let i = 0; i < n; i++) out += thing(p.thing, 2 + i * size, top + ri * size, size * 0.94); });
    return out;
  }
  function share(p) {
    const name = known(p.thing) ? p.thing : "toffee";
    const items = int(p.items, 1, 40, 12), plates = int(p.plates, 1, 6, 3);
    const rounds = Math.min(int(p.rounds, 0, 3, 0), Math.max(0, Math.floor(items / plates) - 1));   // never deal everything: the child finishes
    const left = items - rounds * plates, cols = 6, s = 49;
    let out = "";
    for (let i = 0; i < left; i++) out += thing(name, 3 + (i % cols) * s, Math.floor(i / cols) * 37, s * 0.8);
    const w = 300 / plates, d = Math.min(92, w - 4);
    for (let k = 0; k < plates; k++) {
      const cx = w * (k + 0.5);
      out += thing("plate", cx - d / 2, 252 - d / 2, d);
      for (let j = 0; j < rounds; j++) { const t = d * 0.5, o = j - (rounds - 1) / 2; out += thing(name, cx - t / 2 + o * t * 0.4, 252 - t * 0.5 + o * t * 0.3, t); }
    }
    return out;
  }

  /* ---------- fractions ---------- */
  function oneRoti(cx, cy, r, partsIn, shade) {
    const parts = int(partsIn, 1, 12, 4);
    let owner = [];
    (shade || []).slice(0, 2).forEach((n, gi) => { for (let i = 0; i < int(n, 0, parts, 0); i++) owner.push(gi); });
    owner = owner.concat(Array(parts).fill(null)).slice(0, parts);
    if (parts === 1) {
      const who = owner[0];
      return thing("roti", cx - r, cy - r, 2 * r, 2 * r, who === null ? 'opacity=".3"' : "") +
        (who === null ? "" : `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="none" stroke="${[C1, C2][who]}" stroke-width="6"/>`);
    }
    const gap = Math.max(3, r * 0.045);
    let out = "";
    for (let k = 0; k < parts; k++) {
      const a0 = -Math.PI / 2 + 2 * Math.PI * k / parts, a1 = -Math.PI / 2 + 2 * Math.PI * (k + 1) / parts, mid = (a0 + a1) / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const id = "w" + (uid++), who = owner[k];
      out += `<g transform="translate(${(gap * Math.cos(mid)).toFixed(1)} ${(gap * Math.sin(mid)).toFixed(1)})">` +
        `<clipPath id="${id}"><path d="M${cx} ${cy}L${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z"/></clipPath>` +
        thing("roti", cx - r, cy - r, 2 * r, 2 * r, `clip-path="url(#${id})"` + (who === null ? ' opacity=".28"' : "")) +
        (who === null ? "" : `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${[C1, C2][who]}" stroke-width="7" stroke-linecap="round"/>`) +
        "</g>";
    }
    return out;
  }
  function roti(p) {
    const rotis = (p.rotis || [p]).slice(0, 2);
    if (rotis.length === 1) return oneRoti(150, 150, 122, rotis[0].parts, rotis[0].shade);
    return oneRoti(66, 150, 58, rotis[0].parts, rotis[0].shade) +
      (p.equal ? `<text x="150" y="163" ${F} font-size="36" fill="${INK}" text-anchor="middle">=</text>` : "") +
      oneRoti(234, 150, 58, rotis[1].parts, rotis[1].shade);
  }

  /* ---------- time ---------- */
  function oneClock(cx, cy, r, time) {
    const m = String(time).match(/(\d{1,2})[:.](\d{2})/); if (!m) return "";
    const h = int(m[1], 0, 23, 12), min = int(m[2], 0, 59, 0);
    const ha = ((h % 12) + min / 60) * 30 - 90, ma = min * 6 - 90, rad = Math.PI / 180;
    let out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="${r > 80 ? 5 : 4}"/>`;
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 - 90) * rad;
      out += `<text x="${(cx + r * 0.78 * Math.cos(a)).toFixed(1)}" y="${(cy + r * 0.78 * Math.sin(a) + r * 0.07).toFixed(1)}" ${F} font-size="${(r * 0.2).toFixed(1)}" fill="${INK}" text-anchor="middle">${i}</text>`;
    }
    out += `<path d="M${cx} ${cy}L${(cx + r * 0.46 * Math.cos(ha * rad)).toFixed(1)} ${(cy + r * 0.46 * Math.sin(ha * rad)).toFixed(1)}" stroke="${INK}" stroke-width="${r > 80 ? 8 : 6}" stroke-linecap="round"/>`;
    out += `<path d="M${cx} ${cy}L${(cx + r * 0.66 * Math.cos(ma * rad)).toFixed(1)} ${(cy + r * 0.66 * Math.sin(ma * rad)).toFixed(1)}" stroke="${C2}" stroke-width="${r > 80 ? 5 : 4}" stroke-linecap="round"/>`;
    out += `<circle cx="${cx}" cy="${cy}" r="${r > 80 ? 7 : 5}" fill="${C1}"/>`;
    out += `<text x="${cx}" y="${cy + r + 30}" ${F} font-size="22" fill="${C2}" text-anchor="middle">${esc(String(time).trim())}</text>`;
    return out;
  }
  function clock(p) {
    const times = (p.times || [p.time]).filter(Boolean).slice(0, 2);
    if (times.length === 1) return oneClock(150, 132, 112, times[0]);
    return oneClock(72, 130, 62, times[0]) + `<path d="M140 130h18m-7-7l7 7-7 7" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` + oneClock(228, 130, 62, times[1]);
  }

  /* ---------- shapes ---------- */
  function rect(p) {
    const w = Number(p.w), h = Number(p.h); if (!(w > 0 && h > 0)) return "";
    const k = Math.min(210 / w, 160 / h), W = w * k, H = h * k, x = (300 - W) / 2, y = (300 - H) / 2, u = p.unit ? " " + esc(p.unit) : "";
    const label = (tx, ty, v, faint) => `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" ${F} font-size="22" fill="${faint ? "#8C7A66" : C2}" text-anchor="middle">${esc(v)}${u}</text>`;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" rx="4" fill="${SOFT}" stroke="${INK}" stroke-width="4"/>` +
      label(150, y - 12, w) + label(150, y + H + 28, w, true) +
      `<g transform="translate(${(x + W + 14).toFixed(1)} 150) rotate(90)">${label(0, 0, h)}</g>` +
      `<g transform="translate(${(x - 14).toFixed(1)} 150) rotate(-90)">${label(0, 0, h, true)}</g>`;
  }

  /* ---------- tens and ones ---------- */
  function blocks(p) {
    const H = int(p.hundreds, 0, 3, 0), T = int(p.tens, 0, 12, 0), O = int(p.ones, 0, 19, 0), s = 12, gap = 8;
    let out = "", x = 0;
    const cell = (cx, cy, fill) => `<rect x="${cx}" y="${cy}" width="${s - 1}" height="${s - 1}" rx="2" fill="${fill}"/>`;
    for (let i = 0; i < H; i++) { for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) out += cell(x + c * s, r * s, "#C4203A"); x += 10 * s + gap; }
    for (let i = 0; i < T; i++) { for (let r = 0; r < 10; r++) out += cell(x, r * s, C2); x += s + (i === T - 1 ? gap * 1.5 : 4); }
    for (let i = 0; i < O; i++) out += cell(x + Math.floor(i / 5) * (s + 3), (9 - (i % 5) * 1.25) * s, C1);
    x += Math.ceil(O / 5) * (s + 3);
    const k = Math.min(1.9, 286 / Math.max(x, 1), 250 / (10 * s));
    return `<g transform="translate(${((300 - x * k) / 2).toFixed(1)} ${((300 - 10 * s * k) / 2).toFixed(1)}) scale(${k.toFixed(3)})">${out}</g>`;
  }

  /* ---------- number line ---------- */
  function line(p) {
    const end = int(p.end, 5, 60, 20), jumps = (p.jumps || [p.jump]).map((j) => int(j, 1, 30, 0)).filter(Boolean).slice(0, 2);
    const x = (v) => 16 + (268 * v) / end, y = 150;
    let out = `<path d="M10 ${y}H290" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    const labelled = new Set([0, end]); jumps.forEach((j) => { for (let v = j; v <= end; v += j) labelled.add(v); });
    for (let v = 0; v <= end; v++) {
      const big = labelled.has(v);
      if (end <= 30 || big) out += `<path d="M${x(v).toFixed(1)} ${y - (big ? 8 : 4)}v${big ? 16 : 8}" stroke="${INK}" stroke-width="${big ? 2.5 : 1.2}"/>`;
    }
    jumps.forEach((j, ji) => {
      const up = ji === 0, col = up ? C1 : C2;
      for (let v = 0; v + j <= end; v += j) {
        const x0 = x(v), x1 = x(v + j), hgt = Math.min(46, (x1 - x0) * 0.7);
        out += `<path d="M${x0.toFixed(1)} ${y}Q${((x0 + x1) / 2).toFixed(1)} ${y + (up ? -hgt * 2 : hgt * 2)} ${x1.toFixed(1)} ${y}" fill="none" stroke="${col}" stroke-width="3.5"/>`;
      }
      for (let v = j; v <= end; v += j) out += `<text x="${x(v).toFixed(1)}" y="${up ? y - 62 : y + 78}" ${F} font-size="${end > 40 ? 12 : 15}" fill="${col}" text-anchor="middle">${v}</text>`;
    });
    return out + `<text x="${x(0)}" y="${y + 28}" ${F} font-size="14" fill="${INK}" text-anchor="middle">0</text>`;
  }

  /* ---------- money ---------- */
  function money(p) {
    const amounts = (p.amounts || []).map((a) => int(a, 1, 2000, 0)).filter(Boolean).slice(0, 10);
    let out = "", x = 8, y = 20, rowH = 0;
    amounts.forEach((a) => {
      const note = a >= 10, w = note ? 92 : 50, h = note ? 48 : 50;
      if (x + w > 294) { x = 8; y += rowH + 12; rowH = 0; }
      out += note
        ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#D3E8EB" stroke="${C2}" stroke-width="3"/><text x="${x + w / 2}" y="${y + 32}" ${F} font-size="22" fill="${C2}" text-anchor="middle">₹${a}</text>`
        : `<circle cx="${x + 25}" cy="${y + 25}" r="23" fill="#E9C48A" stroke="#B98A45" stroke-width="3"/><text x="${x + 25}" y="${y + 32}" ${F} font-size="19" fill="${INK}" text-anchor="middle">₹${a}</text>`;
      x += w + 10; rowH = Math.max(rowH, h);
    });
    const used = y + rowH;
    return `<g transform="translate(0 ${Math.max(0, (300 - used - 20) / 2).toFixed(1)})">${out}</g>`;
  }

  const DRAW = { things, objects: things, share, roti, clock, rect, blocks, line, money };
  window.drawPicture = function (p) {
    if (!p || !DRAW[p.type]) return "";
    try { const body = DRAW[p.type](p); return body ? `<svg class="pic" viewBox="0 0 300 300" aria-hidden="true">${body}</svg>` : ""; } catch (e) { return ""; }
  };
})();
