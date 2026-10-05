// Gillu app. One file, no framework: each screen is a function that draws itself into #app.
(() => {
  const cfg = window.GILLU, app = document.getElementById("app");
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const devServer = !native && ["localhost", "127.0.0.1"].includes(location.hostname);   // this computer only
  const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  const tester = devServer && /[?&]tester/.test(location.search);                          // local test mode: no real sign-in
  const sb = !tester && cfg.SUPABASE_PUBLISHABLE_KEY && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, { auth: { flowType: "pkce", detectSessionInUrl: !native } })
    : null;

  /* ---------- small helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: carry on in memory */ } };
  let prefs = load("gillu.prefs", {}), user = null, back = null, current = null;
  const t = (k) => (window.T[prefs.lang] || window.T.en)[k] ?? window.T.en[k] ?? k;
  const gillu = (cls = "gillu") => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true"><use href="#gillu-full"/></svg>`;
  const head = '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#gillu-head"/></svg>';
  const I = {
    cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1-1.6a1.5 1.5 0 0 1 1.27-.7h3.86a1.5 1.5 0 0 1 1.27.7l1 1.6h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12.3" r="3.3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="currentColor"/></svg>',
    again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.3-5.2M5 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3h3.4l.5 2.4 1.7.7 2-1.3 2.4 2.4-1.3 2 .7 1.7 2.4.5v3.4l-2.4.5-.7 1.7 1.3 2-2.4 2.4-2-1.3-1.7.7-.5 2.4h-3.4l-.5-2.4-1.7-.7-2 1.3-2.4-2.4 1.3-2-.7-1.7L3 13.7v-3.4l2.4-.5.7-1.7-1.3-2 2.4-2.4 2 1.3 1.7-.7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    tick: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#2A1A10" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    google: '<svg class="gmark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.3-1.9-6.2-4.6H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.2 9.1 5.3 12 5.3z"/></svg>',
  };
  function draw(name, html, cls = "") {
    current = name; stopAudio();
    document.documentElement.lang = prefs.lang || "en";
    app.innerHTML = `<section class="screen ${cls}" id="${name}">${html}</section>`;
    return app.firstElementChild;
  }
  function toast(msg) {
    document.querySelectorAll(".toast").forEach((e) => e.remove());
    const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = msg;
    document.body.append(d); setTimeout(() => d.remove(), 2600);
  }
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach((e) => e.addEventListener("click", (ev) => fn(e, ev)));

  /* ---------- saved homework (on this phone) ---------- */
  const db = (() => {
    let mem = [], idb = null;
    const open = () => new Promise((res) => {
      try {
        const r = indexedDB.open("gillu", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("items", { keyPath: "id" });
        r.onsuccess = () => res((idb = r.result)); r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    const tx = (mode, fn) => new Promise((res) => {
      try { const s = idb.transaction("items", mode).objectStore("items"); const q = fn(s); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); }
    });
    return {
      async all() { if (!idb) await open(); const r = idb ? await tx("readonly", (s) => s.getAll()) : mem; return (r || []).sort((a, b) => b.ts - a.ts); },
      async put(item) {
        if (!idb) await open();
        if (!idb) { mem = [item, ...mem.filter((m) => m.id !== item.id)]; return; }
        await tx("readwrite", (s) => s.put(item));
        const all = await this.all(); for (const old of all.slice(30)) await tx("readwrite", (s) => s.delete(old.id));
      },
      async clear() { if (!idb) await open(); mem = []; if (idb) await tx("readwrite", (s) => s.clear()); },
    };
  })();

  /* ---------- photos ---------- */
  function shrink(dataUrl, max, q) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", q));
      };
      im.onerror = rej; im.src = dataUrl;
    });
  }
  function pickFile(camera) {
    return new Promise((res) => {
      const inp = document.getElementById(camera ? "file-camera" : "file-gallery");
      inp.value = "";
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return res(null);
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(f);
      };
      inp.click();
    });
  }
  async function getPhoto(camera) {
    let url = null;
    if (native && plugins.Camera) {
      try {
        const p = await plugins.Camera.getPhoto({ quality: 85, width: 1600, resultType: "dataUrl", source: camera ? "CAMERA" : "PHOTOS", correctOrientation: true });
        url = p && p.dataUrl;
      } catch (e) { return null; }                    // the parent closed the camera
    } else url = await pickFile(camera);
    if (!url) return null;
    try { return await shrink(url, 1600, 0.82); } catch (e) { return null; }
  }

  /* ---------- server ---------- */
  async function api(body) {
    let url = cfg.SUPABASE_URL + "/functions/v1/explain", headers = { "Content-Type": "application/json" };
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (!data.session) throw { code: "signin" };
      headers.Authorization = "Bearer " + data.session.access_token; headers.apikey = cfg.SUPABASE_PUBLISHABLE_KEY;
    } else if (devServer) url = "/explain";
    else throw { code: "signin" };
    let r;
    const stop = new AbortController(), timer = setTimeout(() => stop.abort(), 150000);     // never leave a parent waiting forever
    try { r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: stop.signal }); } catch (e) { throw { code: "generic" }; } finally { clearTimeout(timer); }
    if (r.status === 429) throw { code: "limit" };
    if (r.status === 503) throw { code: "busy" };
    if (r.status === 401) throw { code: "signin" };
    if (!r.ok) throw { code: "generic" };
    return r.json();
  }

  /* ---------- sign-in ---------- */
  async function refreshUser() {
    if (sb) {
      const { data } = await sb.auth.getSession();
      user = data.session ? { id: data.session.user.id, name: (data.session.user.user_metadata || {}).full_name || "", meta: data.session.user.user_metadata || {} } : null;
      if (user && !prefs.klass && user.meta.gillu_klass) { prefs = { ...prefs, klass: user.meta.gillu_klass, board: user.meta.gillu_board }; save("gillu.prefs", prefs); }
    } else user = devServer && load("gillu.dev", false) ? { id: "dev", name: load("gillu.devname", "Tester") } : null;
  }
  function pushPrefs() {
    save("gillu.prefs", prefs);
    if (sb && user) sb.auth.updateUser({ data: { gillu_lang: prefs.lang, gillu_klass: prefs.klass, gillu_board: prefs.board } }).catch(() => {});
  }
  async function googleSignIn() {
    if (!sb) return;
    if (native) {
      const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: cfg.APP_SCHEME + "://auth", skipBrowserRedirect: true } });
      if (error || !data.url) return toast(t("err_generic"));
      await plugins.Browser.open({ url: data.url });
    } else {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
      if (error) toast(t("err_generic"));
    }
  }
  if (native && plugins.App) {
    plugins.App.addListener("appUrlOpen", async ({ url }) => {            // Google sends the parent back here
      if (!sb || !url || !url.startsWith(cfg.APP_SCHEME + "://")) return;
      const code = new URL(url.replace(cfg.APP_SCHEME + "://", "https://x/")).searchParams.get("code");
      try { await plugins.Browser.close(); } catch (e) { /* already closed */ }
      if (code) { const { error } = await sb.auth.exchangeCodeForSession(code); if (error) toast(t("err_generic")); }
      route();
    });
    plugins.App.addListener("backButton", () => { if (back) back(); else plugins.App.exitApp(); });
  }

  /* ---------- screens ---------- */
  async function route() {
    await refreshUser();
    if (!prefs.lang) return welcome();
    if (!user) return signin();
    if (!prefs.klass) return setup();
    home();
  }

  function welcome() {
    back = null;
    const s = draw("welcome", `
      <div class="hero">${gillu()}<h1>${esc(window.T.en.welcome_title)}</h1><p class="muted">${esc(window.T.en.welcome_sub)}</p></div>
      <div class="stack"><p class="muted" id="lang-h" style="text-align:center"><span lang="hi">भाषा चुनिए</span> · <span lang="pa">ਭਾਸ਼ਾ ਚੁਣੋ</span> · Choose your language</p>
      <div class="choices" role="group" aria-labelledby="lang-h">
        <button class="btn outline" data-lang="hi" lang="hi">हिंदी</button>
        <button class="btn outline" data-lang="pa" lang="pa">ਪੰਜਾਬੀ</button>
        <button class="btn outline" data-lang="en" lang="en">English</button>
      </div></div>`, "center");
    on(s, "[data-lang]", (b) => { prefs.lang = b.dataset.lang; save("gillu.prefs", prefs); route(); });
  }

  function signin() {
    back = () => { delete prefs.lang; save("gillu.prefs", prefs); welcome(); };
    const s = draw("signin", `
      <div class="hero">${gillu()}<h1>${esc(t("signin_title"))}</h1></div>
      <div class="stack">
        <button class="btn primary" id="google" ${sb ? "" : "disabled"}>${I.google}<span>${esc(t("signin_google"))}</span></button>
        ${sb ? "" : `<p class="small muted" style="text-align:center">${esc(t("signin_off"))}</p>`}
        ${devServer && !sb ? '<button class="btn outline" id="dev" lang="en">Tester sign-in (this computer only)</button>' : ""}
        <p class="small muted" style="text-align:center">${esc(t("signin_note"))}</p>
        <button class="btn text" id="chlang">${esc(t("language"))}</button>
        ${sb ? `<button class="btn text small" id="rev" lang="en">App reviewer sign-in</button>
        <form class="stack" id="revform" hidden>
          <input class="field" id="rev-email" type="email" autocomplete="username" placeholder="Reviewer email" aria-label="Reviewer email" required>
          <input class="field" id="rev-pass" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required>
          <button class="btn outline" type="submit">Sign in</button>
        </form>` : ""}
      </div>`, "center");
    on(s, "#google", googleSignIn);
    on(s, "#dev", () => { save("gillu.dev", true); route(); });
    on(s, "#chlang", () => back());
    on(s, "#rev", (b) => { b.hidden = true; s.querySelector("#revform").hidden = false; s.querySelector("#rev-email").focus(); });
    const form = s.querySelector("#revform");                 // store reviewers cannot use their own Google account, so they get a test login
    if (form) form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const { error } = await sb.auth.signInWithPassword({ email: s.querySelector("#rev-email").value.trim(), password: s.querySelector("#rev-pass").value });
      if (error) toast("Wrong email or password"); else route();
    });
  }

  function classChips(sel) {
    return `<div class="chips" role="group">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<button class="chip" data-klass="${n}" aria-pressed="${String(sel) === String(n)}">${esc(t("klass"))} ${n}</button>`).join("")}</div>`;
  }
  function setup() {
    back = null;
    let klass = prefs.klass || "", board = prefs.board || "CBSE";
    const s = draw("setup", `
      <div class="bar"><span class="avatar">${head}</span><h1>${esc(t("setup_title"))}</h1></div>
      ${classChips(klass)}
      <div class="row"><span class="label" id="board-h">${esc(t("setup_board"))}</span>
        <div class="chips" role="group" aria-labelledby="board-h">${["CBSE", "ICSE", "State"].map((b) => `<button class="chip" data-board="${b}" aria-pressed="${b === board}" lang="en">${b}</button>`).join("")}</div></div>
      <div class="grow"></div>
      <button class="btn primary" id="go" ${klass ? "" : "disabled"}>${esc(t("cont"))}</button>`);
    const press = (sel, val, attr) => s.querySelectorAll(sel).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset[attr] === String(val))));
    on(s, "[data-klass]", (b) => { klass = b.dataset.klass; press("[data-klass]", klass, "klass"); s.querySelector("#go").disabled = false; });
    on(s, "[data-board]", (b) => { board = b.dataset.board; press("[data-board]", board, "board"); });
    on(s, "#go", () => { prefs.klass = klass; prefs.board = board; pushPrefs(); home(); });
  }

  const when = (ts) => { const d = new Date(ts); return d.getDate() + "/" + (d.getMonth() + 1); };   // plain numbers: phones lack Punjabi month names
  async function home() {
    back = null;
    const s = draw("home", `
      <div class="bar"><div class="who"><span class="avatar">${head}</span><div class="stack tight"><h1>${esc(t("hello"))}${user && user.name ? ", " + esc(user.name.split(" ")[0]) : ""}</h1><span class="small muted">${esc(t("klass"))} ${esc(prefs.klass)} · ${esc(prefs.board || "")}</span></div></div>
        <button class="iconbtn" id="gear" aria-label="${esc(t("settings"))}">${I.gear}</button></div>
      <div class="cta">
        <button class="btn primary" id="cam">${I.cam}<span>${esc(t("home_cta"))}</span></button>
        <button class="btn outline" id="gal">${esc(t("home_gallery"))}</button>
        <p class="small muted">${esc(t("home_tip"))}</p>
      </div>
      <div class="stack"><h2>${esc(t("recent"))}</h2><div class="list" id="recent"><div class="empty">${esc(t("empty_recent"))}</div></div></div>`);
    on(s, "#cam", () => capture(true));
    on(s, "#gal", () => capture(false));
    on(s, "#gear", settings);
    const items = await db.all();
    if (current !== "home" || !items.length) return;
    const list = s.querySelector("#recent");
    list.innerHTML = items.map((it, i) => `<button class="item" data-i="${i}"><img src="${it.thumb}" alt=""><span><b lang="${it.lang}">${esc(it.plan.topic || it.plan.subject || "")}</b><span>${esc(it.plan.class_guess || "")} · ${esc(when(it.ts))}</span></span>${I.next}</button>`).join("");
    on(list, ".item", (b) => player(items[+b.dataset.i]));
  }

  async function capture(camera) {
    const photo = await getPhoto(camera);
    if (photo) working(photo);
  }

  async function working(photo) {
    back = null;                                         // nothing to go back to while Gillu is thinking
    const s = draw("working", `
      <img class="shot" src="${photo}" alt="">
      <div class="hero thinking">${gillu()}</div>
      <div class="stages">${["w1", "w2", "w3"].map((k, i) => `<div class="stage${i === 0 ? " now" : ""}"><i>${I.tick}</i><span>${esc(t(k))}</span></div>`).join("")}</div>
      <p class="small muted" style="text-align:center">${esc(t("working_note"))}</p>`, "center");
    const st = [...s.querySelectorAll(".stage")];
    const adv = (i) => { if (current !== "working") return; st.forEach((e, n) => { e.classList.toggle("done", n < i); e.classList.toggle("now", n === i); }); };
    const timers = [setTimeout(() => adv(1), 4000), setTimeout(() => adv(2), 13000)];
    try {
      const r = await api({ image: photo, lang: prefs.lang, klass: "Class " + prefs.klass, board: prefs.board, voice: prefs.voice || "female" });
      timers.forEach(clearTimeout);
      if (!r.readable) return problem(t("unreadable"), r.reason, true);
      const item = { id: r.id || "local-" + Date.now(), ts: Date.now(), lang: prefs.lang, plan: r.plan, sure: r.sure !== false, things: r.things || {}, audio: r.audio || [], photo, thumb: await shrink(photo, 160, 0.7) };
      await db.put(item);
      player(item, true);
    } catch (e) {
      timers.forEach(clearTimeout);
      if (e && e.code === "signin") { user = null; return signin(); }
      const full = e && (e.code === "limit" || e.code === "busy");
      problem(e && e.code === "limit" ? t("err_limit") : e && e.code === "busy" ? t("err_busy") : t("err_generic"), "", !full);
    }
  }

  function problem(title, detail, canRetry) {
    back = home;
    const s = draw("problem", `
      <div class="hero">${gillu()}<h1>${esc(title)}</h1>${detail ? `<p class="muted">${esc(detail)}</p>` : ""}</div>
      <div class="stack">${canRetry ? `<button class="btn primary" id="retry">${I.cam}<span>${esc(t("retry"))}</span></button>` : ""}
      <button class="btn ${canRetry ? "outline" : "primary"}" id="home-b">${esc(t("home"))}</button></div>`, "center");
    on(s, "#retry", () => capture(true)); on(s, "#home-b", home);
  }

  /* ---------- the explanation player ---------- */
  let audio = null, timer = null;
  function stopAudio() { if (audio) { audio.pause(); audio.onended = null; audio = null; } clearTimeout(timer); }
  const boardLine = (line) => esc(String(line).replace(/[\u{1F000}-\u{1FAFF}☀-➿️]/gu, "").trim())
    .replace(/(\d+)\s*\/\s*(\d+)/g, '<span class="fr"><i>$1</i><i>$2</i></span>').replace(/□/g, '<span class="box">?</span>');

  function player(item, autoplay) {
    back = home;
    window.registerThings(item.things);                  // object pictures painted for this question
    const steps = item.plan.steps || [], hasVoice = item.audio && item.audio.length === steps.length;
    const anyPic = steps.some((x) => window.drawPicture(x.picture));
    const total = steps.reduce((n, x) => n + (x.board || []).length, 0);
    const size = anyPic ? (total <= 5 ? 26 : total <= 7 ? 22 : 19) : (total <= 6 ? 30 : total <= 9 ? 26 : 22);
    let step = 0, playing = false, finished = false;
    const s = draw("player", `
      <div class="bar"><button class="iconbtn" id="back" aria-label="${esc(t("back"))}">${I.prev}</button><h2 class="one" lang="${item.lang}">${esc(item.plan.topic || item.plan.subject || "")}</h2><span class="dots" aria-hidden="true">${steps.map(() => "<i></i>").join("")}</span></div>
      <button class="photo" id="photo" aria-label="${esc(t("zoom"))}"><img src="${item.photo || item.thumb}" alt=""></button>
      <div class="board${anyPic ? "" : " nopic"}" style="--bs:${size}px"><div class="lines" lang="${item.lang}"></div><span id="pic"></span></div>
      <p class="cap" lang="${item.lang}"></p>
      ${item.sure === false ? `<p class="small unsure">${esc(t("not_sure"))}</p>` : ""}
      ${hasVoice ? "" : `<p class="small muted" style="text-align:center">${esc(t("no_voice"))}</p>`}
      <div class="controls">
        <button class="iconbtn" id="prev" aria-label="${esc(t("prev"))}">${I.prev}</button>
        <button class="playbtn" id="play" aria-label="${esc(t("play"))}">${I.play}</button>
        <button class="iconbtn" id="next" aria-label="${esc(t("next"))}">${I.next}</button>
      </div>
      <button class="btn outline" id="toq">${esc(t("to_questions"))}</button>`);
    const lines = s.querySelector(".lines"), pic = s.querySelector("#pic"), cap = s.querySelector(".cap"), playBtn = s.querySelector("#play"), toq = s.querySelector("#toq");
    const dots = [...s.querySelectorAll(".dots i")], board = s.querySelector(".board");
    function show() {
      let html = "", lastPic = "";
      steps.forEach((x, i) => {
        if (i > step) return;
        (x.board || []).forEach((l) => { html += `<div class="line${i === step ? " now" : ""}">${boardLine(l)}</div>`; });
        lastPic = window.drawPicture(x.picture) || lastPic;      // keep the last picture until a new one comes
      });
      lines.innerHTML = html; pic.innerHTML = lastPic; cap.textContent = steps[step].say;
      dots.forEach((d, i) => d.classList.toggle("on", i <= step));
      let fit = size;                                            // shrink the writing until every line fits beside the picture
      board.style.setProperty("--bs", fit + "px");
      while (fit > 14 && [...lines.children].some((l) => l.scrollWidth > lines.clientWidth + 1)) board.style.setProperty("--bs", --fit + "px");
      s.querySelector("#prev").disabled = step === 0; s.querySelector("#next").disabled = step === steps.length - 1;
    }
    function setPlaying(p) {
      playing = p;
      playBtn.innerHTML = p ? I.pause : (finished ? I.again : I.play);
      playBtn.setAttribute("aria-label", p ? t("pause") : (finished ? t("again") : t("play")));
    }
    function ended() {
      if (current !== "player") return;
      if (step < steps.length - 1) { step++; show(); run(); }
      else { finished = true; setPlaying(false); toq.classList.replace("outline", "primary"); }
    }
    function run() {
      stopAudio(); setPlaying(true);
      if (hasVoice) {
        audio = new Audio("data:audio/mpeg;base64," + item.audio[step]); audio.onended = ended;
        audio.play().catch(() => { setPlaying(false); });       // the phone may need one tap before sound
      } else timer = setTimeout(ended, Math.max(4000, steps[step].say.length / 13 * 1000));
    }
    function go(i) { step = Math.max(0, Math.min(steps.length - 1, i)); finished = false; show(); if (playing) run(); else setPlaying(false); }
    on(s, "#play", () => { if (playing) { stopAudio(); setPlaying(false); } else { if (finished) { step = 0; finished = false; show(); } run(); } });
    on(s, "#prev", () => go(step - 1)); on(s, "#next", () => go(step + 1));
    on(s, "#back", home); on(s, "#toq", () => questions(item));
    on(s, "#photo", (b) => b.classList.toggle("big"));
    show(); setPlaying(false);
    if (autoplay) run();
  }

  function questions(item) {
    back = () => player(item);
    const p = item.plan;
    const s = draw("questions", `
      <div class="bar"><button class="iconbtn" id="back" aria-label="${esc(t("back"))}">${I.prev}</button><h1>${esc(t("q_title"))}</h1></div>
      <p class="muted">${esc(t("q_sub"))}</p>
      <div class="stack" lang="${item.lang}">${(p.questions || []).map((q) => `<div class="q"><p>${esc(q)}</p><button class="tick" aria-pressed="false"><span>${esc(t("asked"))}</span>${I.tick}</button></div>`).join("")}</div>
      ${p.kitchen ? `<div class="note" lang="${item.lang}"><b>${esc(t("kitchen"))}</b><span>${esc(p.kitchen)}</span></div>` : ""}
      <div class="stack">
        <button class="btn primary" id="check">${I.cam}<span>${esc(t("check_btn"))}</span></button>
        <button class="btn outline" id="done">${esc(t("done"))}</button>
        <button class="btn text" id="wrong">${esc(t("wrong_btn"))}</button>
      </div>`);
    on(s, "#back", () => back()); on(s, "#done", home); on(s, "#check", () => capture(true));
    on(s, ".tick", (b) => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")));
    on(s, "#wrong", async (b) => { b.disabled = true; toast(t("wrong_thanks")); try { await api({ action: "feedback", id: item.id }); } catch (e) { /* saved on the next try */ } });
  }

  function settings() {
    back = home;
    const s = draw("settings", `
      <div class="bar"><button class="iconbtn" id="back" aria-label="${esc(t("back"))}">${I.prev}</button><h1>${esc(t("settings"))}</h1></div>
      <div class="row"><span class="label">${esc(t("language"))}</span><div class="chips" role="group">
        ${[["hi", "हिंदी"], ["pa", "ਪੰਜਾਬੀ"], ["en", "English"]].map(([k, n]) => `<button class="chip" data-lang="${k}" lang="${k}" aria-pressed="${prefs.lang === k}">${n}</button>`).join("")}</div></div>
      <div class="row"><span class="label">${esc(t("setup_title"))}</span>${classChips(prefs.klass)}</div>
      <div class="grow"></div>
      <div class="stack" id="acts"><button class="btn outline" id="out">${esc(t("signout"))}</button><button class="btn text danger" id="del">${esc(t("del"))}</button></div>`);
    on(s, "#back", home);
    on(s, "[data-lang]", (b) => { prefs.lang = b.dataset.lang; pushPrefs(); settings(); });
    on(s, "[data-klass]", (b) => { prefs.klass = b.dataset.klass; pushPrefs(); settings(); toast(t("saved")); });
    on(s, "#out", async () => { if (sb) await sb.auth.signOut(); save("gillu.dev", false); route(); });
    on(s, "#del", () => {
      s.querySelector("#acts").innerHTML = `<div class="confirm"><p>${esc(t("del_sure"))}</p><button class="btn outline danger" id="yes">${esc(t("del_yes"))}</button><button class="btn primary" id="no">${esc(t("cancel"))}</button></div>`;
      on(s, "#no", settings);
      on(s, "#yes", async (b) => {
        b.disabled = true;
        try { if (sb) { await api({ action: "delete" }); await sb.auth.signOut(); } } catch (e) { b.disabled = false; return toast(t("err_generic")); }
        await db.clear(); const lang = prefs.lang; prefs = { lang }; save("gillu.prefs", prefs); save("gillu.dev", false);
        await route(); toast(t("deleted"));
      });
    });
  }

  if (sb) sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" && current === "signin") route(); });
  window.gilluTest = devServer ? { working, route, home, welcome, player, questions, db } : undefined;   // lets the local test server drive the app; absent in the real app
  route();
})();
