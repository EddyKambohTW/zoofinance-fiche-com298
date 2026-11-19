/* Zoo Finance — online COM-298 information sheet.
 * Renders the schema as a step-by-step form, autosaves to this device (localStorage),
 * builds the PDF in the browser and posts it to the Zoo Finance webhook.
 */
(function () {
  const { SECTIONS, UI, YEAR } = window.ZF;
  const CFG = window.ZF_CONFIG || {};
  const KEY = `zf-com298-${YEAR}`;
  const MAX_AGE_DAYS = CFG.storageDays || 60;

  // ---------------- state ----------------
  let S = { d: {}, lang: null, step: 0, remember: true, savedAt: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.savedAt && Date.now() - s.savedAt > MAX_AGE_DAYS * 864e5) localStorage.removeItem(KEY);
      else S = Object.assign(S, s);
    }
  } catch (e) { /* storage unavailable (private mode) — form still works */ }
  const qp = new URLSearchParams(location.search).get("lang");
  if (qp === "fr" || qp === "en") S.lang = qp;
  if (!S.lang) S.lang = (navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
  const d = S.d;
  // defaults
  SECTIONS.forEach((s) => s.fields.forEach((f) => { if (f.def && d[f.id] === undefined) d[f.id] = f.def; }));

  let saveTimer = null, DONE = false;
  function save(now) {
    clearTimeout(saveTimer); saveTimer = null;
    if (DONE) return;
    const run = () => {
      try {
        if (S.remember) { S.savedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); }
        else localStorage.removeItem(KEY);
      } catch (e) {}
      renderSaveStatus();
    };
    now ? run() : (saveTimer = setTimeout(run, 300));
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }

  // ---------------- helpers ----------------
  const t = (o) => (o ? o[S.lang] : "");
  const $ = (sel, el) => (el || document).querySelector(sel);
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const optsOf = (f) => (typeof f.opts === "function" ? f.opts(d) : f.opts || []);
  const sectionsVisible = () => SECTIONS.filter((s) => !s.show || s.show(d));
  const steps = () => [...sectionsVisible(), { id: "review", title: UI.reviewTitle, num: "" }];

  function luhn(sin) {
    const n = sin.replace(/\D/g, "");
    if (n.length !== 9) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) { let x = +n[i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; }
    return sum % 10 === 0;
  }
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const postalOk = (v) => /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(v);
  const isEmpty = (v) => v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && !v.length);

  // ---------------- field rendering ----------------
  // `store` is the object the field writes into (d, or a repeat item); `ctx` is passed to show().
  function fieldEl(f, store, ctx, idPrefix) {
    const id = `${idPrefix}${f.id}`;
    const wrap = h("div", { class: `field w-${f.w || "full"} t-${f.t}${f.sub ? " sub" : ""}`, "data-fid": f.id });
    wrap._f = f; wrap._ctx = ctx;
    const set = (v) => { store[f.id] = v; onChange(); };
    const label = () => h("label", { for: id, class: "lbl" }, t(f.l), f.req ? h("span", { class: "req", title: t(UI.required) }, " *") : null);

    switch (f.t) {
      case "info": wrap.append(h("p", { class: "info" }, t(f.l))); break;
      case "heading": wrap.append(h("h3", { class: "subhead" }, t(f.l))); break;
      case "yn": case "radio": {
        const opts = f.t === "yn" ? [["yes", UI.yes], ["no", UI.no]] : optsOf(f);
        const fs = h("fieldset", { class: `choices${opts.length > 3 || opts.some((o) => t(o[1]).length > 40) ? " stack" : ""}` },
          h("legend", { class: "lbl" }, t(f.l), f.req ? h("span", { class: "req" }, " *") : null));
        opts.forEach(([v, lab]) => {
          const rid = `${id}_${v}`;
          fs.append(h("label", { class: "chip", for: rid },
            h("input", { type: "radio", id: rid, name: id, value: v, checked: store[f.id] === v, onchange: () => set(v) }),
            h("span", {}, t(lab))));
        });
        wrap.append(fs); break;
      }
      case "checks": case "months": {
        const cur = () => (Array.isArray(store[f.id]) ? store[f.id] : (store[f.id] = []));
        const fs = h("fieldset", { class: `choices ${f.t === "months" ? "months" : "stack"}` }, h("legend", { class: "lbl" }, t(f.l)));
        optsOf(f).forEach(([v, lab]) => {
          const rid = `${id}_${v}`;
          fs.append(h("label", { class: "chip box", for: rid },
            h("input", { type: "checkbox", id: rid, value: v, checked: cur().includes(v), onchange: (e) => {
              let a = cur().filter((x) => x !== v);
              if (e.target.checked) a.push(v);
              if (f.t === "months") { // "All year" is exclusive of individual months
                if (v === "all" && e.target.checked) a = ["all"];
                else if (v !== "all") a = a.filter((x) => x !== "all");
                fs.querySelectorAll("input").forEach((i) => (i.checked = a.includes(i.value)));
              }
              set(a);
            } }),
            h("span", {}, t(lab))));
        });
        wrap.append(fs); break;
      }
      case "select": {
        const sel = h("select", { id, onchange: (e) => set(e.target.value) });
        optsOf(f).forEach(([v, lab]) => sel.append(h("option", { value: v, selected: store[f.id] === v }, t(lab))));
        wrap.append(label(), sel); break;
      }
      case "textarea":
        wrap.append(label(), h("textarea", { id, rows: 4, oninput: (e) => set(e.target.value) }, store[f.id] || "")); break;
      case "consent":
        wrap.append(h("label", { class: "consent", for: id },
          h("input", { type: "checkbox", id, checked: !!store[f.id], onchange: (e) => set(e.target.checked) }),
          h("span", {}, t(f.l), h("span", { class: "req" }, " *")))); break;
      default: {
        const a = { id, value: store[f.id] || "", autocomplete: "off" };
        if (f.t === "date") Object.assign(a, { type: "date", max: "2100-12-31" });
        else if (f.t === "email") Object.assign(a, { type: "email", autocomplete: f.id === "c_email" ? "email" : "off" });
        else if (f.t === "tel") Object.assign(a, { type: "tel", autocomplete: f.id === "c_phone" ? "tel" : "off" });
        else if (f.t === "money") Object.assign(a, { inputmode: "decimal", placeholder: "0.00" });
        else if (f.t === "number") Object.assign(a, { type: "number", min: 0, step: 1 });
        else if (f.t === "sin") Object.assign(a, { inputmode: "numeric", placeholder: "000 000 000", maxlength: 11 });
        else if (f.t === "postal") Object.assign(a, { placeholder: "A1A 1A1", maxlength: 7, autocapitalize: "characters" });
        else a.type = "text";
        if (f.id === "first") a.autocomplete = "given-name";
        if (f.id === "last") a.autocomplete = "family-name";
        const inp = h("input", Object.assign(a, { oninput: (e) => {
          let v = e.target.value;
          if (f.t === "sin") { const n = v.replace(/\D/g, "").slice(0, 9); v = n.replace(/(\d{3})(?=\d)/g, "$1 ").trim(); e.target.value = v; }
          if (f.t === "postal") { const n = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); v = n.length > 3 ? n.slice(0, 3) + " " + n.slice(3) : n; e.target.value = v; }
          set(v);
        } }));
        wrap.append(label(), inp);
      }
    }
    wrap.append(h("div", { class: "err", "aria-live": "polite" }));
    return wrap;
  }

  function repeatEl(f) {
    const wrap = h("div", { class: "field w-full t-repeat", "data-fid": f.id });
    wrap._f = f; wrap._ctx = d;
    const list = Array.isArray(d[f.id]) ? d[f.id] : (d[f.id] = []);
    if (f.min && !list.length) list.push({});
    const draw = () => {
      wrap.innerHTML = "";
      wrap.append(h("h3", { class: "subhead" }, t(f.l)));
      list.forEach((item, i) => {
        const card = h("div", { class: "card" },
          h("div", { class: "card-head" }, h("strong", {}, `${t(f.item)} ${i + 1}`),
            h("button", { type: "button", class: "link", onclick: () => { list.splice(i, 1); onChange(); draw(); applyVisibility(); } }, t(UI.remove))));
        const grid = h("div", { class: "grid" });
        f.fields.forEach((sf) => grid.append(fieldEl(sf, item, item, `${f.id}${i}_`)));
        card.append(grid);
        wrap.append(card);
      });
      if (list.length < (f.max || 6))
        wrap.append(h("button", { type: "button", class: "btn ghost", onclick: () => { list.push({}); onChange(); draw(); applyVisibility(); } }, "+ " + t(f.add)));
    };
    draw();
    return wrap;
  }

  function applyVisibility() {
    document.querySelectorAll("#stage .field").forEach((el) => {
      const f = el._f; if (!f) return;
      el.hidden = !!(f.show && !f.show(el._ctx, d));
    });
  }

  function onChange() {
    S.downloaded = false;
    applyVisibility();
    renderProgress();
    save();
  }

  // ---------------- validation ----------------
  function validateStep(sec) {
    let firstBad = null;
    document.querySelectorAll("#stage .field").forEach((el) => {
      const f = el._f; const errEl = el.querySelector(":scope > .err");
      if (!f || !errEl) return;
      errEl.textContent = ""; el.classList.remove("bad");
      if (el.hidden || el.closest("[hidden]")) return;
      const store = el._ctx === d ? d : el._ctx;
      const v = store[f.id];
      let msg = "";
      if (f.req && isEmpty(v)) msg = t(UI.required);
      else if (!isEmpty(v) && f.t === "sin" && !luhn(String(v))) msg = t(UI.sinBad);
      else if (!isEmpty(v) && f.t === "email" && !emailOk(v)) msg = t(UI.emailBad);
      else if (!isEmpty(v) && f.t === "postal" && !postalOk(v)) msg = t(UI.postalBad);
      if (msg) { errEl.textContent = msg; el.classList.add("bad"); firstBad = firstBad || el; }
    });
    if (firstBad) {
      $("#formErr").textContent = t(UI.fixErrors);
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      const i = firstBad.querySelector("input,select,textarea"); i && i.focus({ preventScroll: true });
      return false;
    }
    $("#formErr").textContent = "";
    return true;
  }

  // ---------------- PDF / submit ----------------
  let lastPdf = null;
  const fileName = () => {
    const clean = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `COM-298_${YEAR}_${clean(d.last) || "Client"}_${clean(d.first)}.pdf`.replace(/_\.pdf$/, ".pdf");
  };
  async function makePdf() {
    const bytes = await window.ZFPDF.buildPdf(d, S.lang, window.PDFLib, { submittedAt: Date.now(), org: CFG.organisation || "Zoo Finance", software: CFG.downloadSoftware || "ImpôtExpert – PCBMI", impotNet: CFG.impotNet || "", userAgent: navigator.userAgent });
    lastPdf = new Blob([bytes], { type: "application/pdf" });
    return lastPdf;
  }
  function downloadBlob(blob) {
    const a = h("a", { href: URL.createObjectURL(blob), download: fileName() });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  async function submit(btn) {
    if (!validateAll()) return;
    if (!authOk()) return;
    btn.disabled = true; const label = btn.textContent; btn.textContent = t(UI.sending);
    const status = $("#submitStatus"); status.className = "status"; status.textContent = "";
    try {
      const blob = await makePdf();
      if (!CFG.webhookUrl) throw new Error("No webhook configured");
      const fd = new FormData();
      fd.append("pdf", blob, fileName());
      fd.append("first", d.first || ""); fd.append("last", d.last || "");
      fd.append("email", d.c_email || ""); fd.append("phone", d.c_phone || d.ph_home || "");
      fd.append("lang", S.lang); fd.append("year", String(YEAR));
      fd.append("spouse", window.ZF.hasSpouse(d) ? `${d.sp_first || ""} ${d.sp_last || ""}`.trim() : "");
      fd.append("flags", (d.elig || []).join(","));
      fd.append("website", $("#hp").value); // honeypot
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 45000);
      const r = await fetch(CFG.webhookUrl, { method: "POST", body: fd, signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error("HTTP " + r.status);
      // success: wipe saved answers from this device
      DONE = true; clearTimeout(saveTimer); wipe();
      showDone(blob);
    } catch (e) {
      console.error(e);
      status.className = "status fail";
      status.innerHTML = "";
      status.append(h("strong", {}, t(UI.failTitle)), " ", t(UI.failBody), " ",
        h("a", { href: `mailto:${CFG.inbox}?subject=${encodeURIComponent(`COM-298 ${YEAR} — ${d.first || ""} ${d.last || ""}`)}` }, CFG.inbox), ".");
      if (lastPdf) downloadBlob(lastPdf);
      btn.disabled = false; btn.textContent = label;
    }
  }

  function validateAll() {
    // walk every visible step; stop on the first one with an error
    const st = steps();
    for (let i = 0; i < st.length - 1; i++) {
      S.step = i; render();
      if (!validateStep(st[i])) return false;
    }
    S.step = st.length - 1; render();
    return true;
  }

  function showDone(blob) {
    const main = $("#stage"); main.innerHTML = "";
    $("#nav").hidden = true; $("#progress").hidden = true;
    main.append(h("div", { class: "done" },
      h("div", { class: "check", "aria-hidden": "true" }, "✓"),
      h("h2", {}, t(UI.sentTitle)), h("p", {}, t(UI.sentBody)),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn", onclick: () => downloadBlob(blob) }, t(UI.download)),
        h("button", { type: "button", class: "btn ghost", onclick: () => { location.href = location.pathname + `?lang=${S.lang}`; } }, t(UI.newForm)))));
    S = { d: {}, lang: S.lang, step: 0, remember: S.remember }; // in-memory reset, nothing persisted
  }

  // ---------------- COM-1076.TD.A signature ----------------
  const fmtLong = (dt) => dt.toLocaleDateString(S.lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
  const SIG_MAX_AGE = 24 * 3600e3; // re-sign after a day so the 2-day authorization is still valid on receipt

  function authOk() {
    const fresh = d.sig_at && Date.now() - new Date(d.sig_at).getTime() < SIG_MAX_AGE;
    if (!window.ZF.needsAuth(d) || (d.sig && fresh && d.sig_ok && (d.sig_name || "").trim())) return true;
    const box = $("#authBox"); const err = $("#authErr");
    if (err) err.textContent = t(UI.sigMissing);
    if (box) { box.classList.add("bad"); box.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return false;
  }

  // crop a signature canvas to the ink, with a little padding
  function trimmed(cv) {
    const c = cv.getContext("2d"); const { width: w, height: h } = cv;
    const px = c.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return cv.toDataURL("image/png");
    const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext("2d").drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  }

  function authBlock(stage) {
    const A = window.ZF.AUTH;
    const software = CFG.downloadSoftware || "ImpôtExpert – PCBMI";
    const org = CFG.organisation || "Zoo Finance";
    let expiredMsg = null;
    if (d.sig_at && Date.now() - new Date(d.sig_at).getTime() >= SIG_MAX_AGE) {
      delete d.sig; delete d.sig_full; delete d.sig_at; d.sig_ok = false; save(true); expiredMsg = t(UI.sigExpired);
    }
    if (d.sig_name === undefined) d.sig_name = `${d.first || ""} ${d.last || ""}`.trim();

    const box = h("div", { class: "estep auth", id: "authBox" });
    box.append(h("h3", {}, h("span", { class: "snum" }, "✎"), t(UI.authTitle)));
    box.append(h("p", { class: "info" }, t(UI.authWhy)));
    if (expiredMsg) box.append(h("p", { class: "form-err" }, expiredMsg));
    const doc = h("div", { class: "authdoc" },
      h("p", { class: "muted small" }, `${A.formNo} · Revenu Québec · ${t(UI.authYear)} ${YEAR}`),
      h("p", {}, h("strong", {}, `${d.first || ""} ${d.last || ""}`.trim())),
      h("p", {}, S.lang === "fr" ? A.auth(software) : A.en.auth(software, org)),
      h("p", {}, S.lang === "fr" ? A.understand : "By signing this form, I understand that"),
      h("ul", {}, ...(S.lang === "fr" ? A.bullets : A.en.bullets).map((b) => h("li", {}, b))),
      h("p", { class: "small" }, `${t(UI.authOrg)}${S.lang === "fr" ? " : " : ": "}`, h("strong", {}, org)),
      S.lang === "en" ? h("p", { class: "muted small" }, A.en.note) : null);
    box.append(doc);

    // signature pad
    const wrapC = h("div", { class: "sigpad" });
    const canvas = h("canvas", { "aria-label": t(UI.sigLabel) });
    const hint = h("span", { class: "sighint" }, t(UI.sigLabel));
    wrapC.append(canvas, hint);
    const ctx = canvas.getContext("2d");
    let drawing = false, dirty = false, last = null;
    const fit = () => {
      const r = wrapC.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(300, r.width) * dpr; canvas.height = 160 * dpr;
      canvas.style.width = "100%"; canvas.style.height = "160px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#14203c";
      const src = d.sig_full || d.sig;
      if (src) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr); img.src = src; hint.hidden = true; }
    };
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener("pointerdown", (e) => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); hint.hidden = true; ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fill(); });
    canvas.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; dirty = true; });
    const end = () => {
      if (!drawing) return; drawing = false;
      if (!dirty) return;
      d.sig_full = canvas.toDataURL("image/png");   // what's on screen (for redrawing)
      d.sig = trimmed(canvas);                       // ink only (for the PDF)
      d.sig_at = new Date().toISOString(); S.downloaded = false;
      stamp(); save(true); box.classList.remove("bad"); $("#authErr").textContent = "";
    };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("pointerleave", end);
    const stampEl = h("p", { class: "ok small" });
    const stamp = () => {
      stampEl.textContent = d.sig_at ? `✓ ${t(UI.sigSignedOn)} ${new Date(d.sig_at).toLocaleString(S.lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long", timeStyle: "short" })} — ${t(UI.sigValidUntil)} ${fmtLong(window.ZF.authValidUntil(d))}` : "";
    };
    stamp();
    box.append(wrapC, h("div", { class: "row tight" },
      h("button", { type: "button", class: "link", onclick: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); delete d.sig; delete d.sig_full; delete d.sig_at; dirty = false; hint.hidden = false; stamp(); S.downloaded = false; save(true); } }, t(UI.sigClear))), stampEl);

    box.append(h("div", { class: "field" },
      h("label", { class: "lbl", for: "sig_name" }, t(UI.sigName), h("span", { class: "req" }, " *")),
      h("input", { id: "sig_name", type: "text", value: d.sig_name || "", autocomplete: "name", oninput: (e) => { d.sig_name = e.target.value; S.downloaded = false; save(); } })));
    box.append(h("label", { class: "consent", for: "sig_ok" },
      h("input", { type: "checkbox", id: "sig_ok", checked: !!d.sig_ok, onchange: (e) => { d.sig_ok = e.target.checked; S.downloaded = false; save(true); } }),
      h("span", {}, t(UI.sigAgree), h("span", { class: "req" }, " *"))));
    box.append(h("p", { id: "authErr", class: "form-err", role: "alert" }));
    stage.append(box);
    requestAnimationFrame(fit);
    window.addEventListener("resize", () => { if (document.body.contains(canvas) && !drawing) fit(); }, { passive: true });
  }

  // ---------------- documents to attach (depends on answers) ----------------
  function docsBlock(stage) {
    const docs = window.ZF.docsFor(d);
    if (!docs.length) return;
    if (!Array.isArray(d.docs_ok)) d.docs_ok = [];
    const box = h("div", { class: "estep docs" },
      h("h3", {}, h("span", { class: "snum" }, "📎"), t(UI.docsTitle)),
      h("p", { class: "muted small" }, t(UI.docsHint)));
    const fs = h("fieldset", { class: "choices stack" });
    docs.forEach((doc) => fs.append(h("label", { class: "chip box", for: `doc_${doc.id}` },
      h("input", { type: "checkbox", id: `doc_${doc.id}`, checked: d.docs_ok.includes(doc.id), onchange: (e) => {
        d.docs_ok = d.docs_ok.filter((x) => x !== doc.id); if (e.target.checked) d.docs_ok.push(doc.id); save();
      } }),
      h("span", {}, t(doc.l)))));
    box.append(fs);
    stage.append(box);
  }

  // ---------------- "download + email it yourself" ending ----------------
  function emailSteps(stage) {
    const inbox = CFG.inbox || "serviceclient@zoofinance.ca";
    const name = `${d.first || ""} ${d.last || ""}`.trim();
    const subject = `${t(UI.mailSubject)} COM-298 ${YEAR} – ${name}`;
    const body = () => {
      let b = t(UI.mailBody).replace("{year}", YEAR).replace("{file}", fileName()).replace("{name}", name);
      const extra = [];
      if (window.ZF.needsAuth(d) && d.sig_at) extra.push(t(UI.mailAuth).replace("{signed}", fmtLong(new Date(d.sig_at))).replace("{until}", fmtLong(window.ZF.authValidUntil(d))));
      const docs = window.ZF.docsFor(d);
      if (docs.length) extra.push(t(UI.mailDocs) + "\n" + docs.map((x) => `- ${t(x.l)}`).join("\n"));
      if (extra.length) b = b.replace(/\n\n([^\n]*)\n([^\n]*)$/, "\n\n" + extra.join("\n\n") + "\n\n$1\n$2");
      return b;
    };
    const mailto = () => `mailto:${inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body())}`;

    const done1 = h("p", { class: "ok small", hidden: true });
    const step2 = h("div", { class: "estep", hidden: true });
    const step3 = h("div", { class: "estep", hidden: true });

    const btn1 = h("button", { type: "button", class: "btn big", id: "submitBtn", onclick: async (e) => {
      if (!validateAll()) return;              // jumps to the first incomplete step if needed
      if (!authOk()) return;
      const blob = await makePdf(); downloadBlob(blob);
      S.downloaded = true; save(true);
      render();                                 // validateAll re-rendered the page; draw it again with steps 2–3 open
      const s2 = document.querySelector(".estep:nth-of-type(2)") || document.querySelectorAll(".estep")[1];
      s2 && s2.scrollIntoView({ behavior: "smooth", block: "center" });
    } }, "⬇ " + t(UI.s1Btn));

    const showSteps = (blob) => {
      done1.hidden = false; done1.textContent = `✓ ${t(UI.s1Done)} ${fileName()}`;
      step2.hidden = false; step3.hidden = false;
      // Web Share (phones/tablets, some desktops): opens the mail app with the PDF already attached
      const file = blob && typeof File !== "undefined" ? new File([blob], fileName(), { type: "application/pdf" }) : null;
      const shareBox = step2.querySelector(".share");
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        shareBox.hidden = false;
        shareBox.querySelector("button").onclick = () => navigator.share({ files: [file], title: subject, text: body() }).catch(() => {});
      }
    };

    const copyBtn = h("button", { type: "button", class: "link", onclick: async (e) => {
      try { await navigator.clipboard.writeText(inbox); e.target.textContent = t(UI.copied); } catch (err) {}
    } }, t(UI.copy));

    stage.append(h("div", { class: "estep" },
      h("h3", {}, h("span", { class: "snum" }, "1"), t(UI.s1Title)),
      btn1, done1, h("p", { class: "muted small" }, t(UI.s1Hint))));

    step2.append(
      h("h3", {}, h("span", { class: "snum" }, "2"), t(UI.s2Title)),
      h("p", {}, t(UI.s2Body), " ", h("strong", { class: "addr" }, inbox), " ", copyBtn),
      h("div", { class: "row" }, h("a", { class: "btn", href: mailto(), onclick: (e) => { e.currentTarget.href = mailto(); } }, "✉ " + t(UI.s2Mail))),
      h("p", { class: "muted small" }, t(UI.s2MailHint)),
      h("div", { class: "share", hidden: true },
        h("button", { type: "button", class: "btn ghost" }, t(UI.s2Share)),
        h("p", { class: "muted small" }, t(UI.s2ShareHint))),
      h("p", { class: "muted small" }, t(UI.s2Also)));
    stage.append(step2);

    step3.append(
      h("h3", {}, h("span", { class: "snum" }, "3"), t(UI.s3Title)),
      h("p", {}, t(UI.s3Body)),
      h("button", { type: "button", class: "btn ghost", onclick: () => {
        DONE = true; clearTimeout(saveTimer); wipe(); showErased();
      } }, t(UI.s3Btn)));
    stage.append(step3);

    if (S.downloaded) showSteps(lastPdf); // after downloading (or coming back later): keep steps 2–3 visible
  }

  function showErased() {
    const main = $("#stage"); main.innerHTML = "";
    $("#nav").hidden = true; $("#progress").hidden = true;
    main.append(h("div", { class: "done" },
      h("div", { class: "check", "aria-hidden": "true" }, "✓"),
      h("h2", {}, t(UI.erasedTitle)), h("p", {}, t(UI.erasedBody)),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn ghost", onclick: () => { location.href = location.pathname + `?lang=${S.lang}`; } }, t(UI.newForm)))));
  }

  // ---------------- page rendering ----------------
  function renderSaveStatus() {
    const el = $("#saveStatus"); if (!el) return;
    el.textContent = S.remember ? `● ${t(UI.saved)}` : `○ ${t(UI.notSaved)}`;
    el.className = "save " + (S.remember ? "on" : "off");
  }
  function renderProgress() {
    const st = steps();
    if (S.step >= st.length) S.step = st.length - 1;
    const pct = Math.round((S.step / (st.length - 1)) * 100);
    $("#bar").style.width = pct + "%";
    $("#stepTxt").textContent = `${t(UI.step)} ${S.step + 1} ${t(UI.of)} ${st.length}`;
    const ol = $("#steps"); ol.innerHTML = "";
    st.forEach((s, i) => ol.append(h("li", { class: i === S.step ? "cur" : i < S.step ? "past" : "" },
      h("button", { type: "button", disabled: i > S.step, onclick: () => { S.step = i; render(); } },
        s.num ? `${s.num}. ` : "", t(s.title)))));
  }

  function render() {
    document.documentElement.lang = S.lang === "fr" ? "fr-CA" : "en-CA";
    document.title = `${t(UI.title)} ${YEAR} — Zoo Finance`;
    $("#title").textContent = t(UI.title);
    $("#formNo").textContent = t(UI.formNo);
    $("#sub").textContent = t(UI.sub);
    $("#langBtn").textContent = t(UI.lang);
    $("#rememberLbl").textContent = t(UI.remember);
    $("#rememberHint").textContent = t(UI.rememberHint);
    $("#remember").checked = S.remember;
    $("#clearBtn").textContent = t(UI.clear);
    $("#backBtn").textContent = "← " + t(UI.back);
    $("#nav").hidden = false; $("#progress").hidden = false;

    const st = steps();
    if (S.step >= st.length) S.step = st.length - 1;
    const sec = st[S.step];
    const stage = $("#stage"); stage.innerHTML = "";
    stage.append(h("h2", { class: "sec-title" }, sec.num ? h("span", { class: "num" }, sec.num) : null,
      sec.num ? h("span", { class: "part" }, `${t(UI.part)} ${sec.num} · `) : null, t(sec.title)));

    if (sec.id === "review") {
      stage.append(h("p", { class: "info" }, t(UI.reviewBody)));
      const list = h("ul", { class: "review" });
      sectionsVisible().forEach((s, i) => list.append(h("li", {},
        h("button", { type: "button", class: "link", onclick: () => { S.step = i; save(true); render(); } }, `${s.num ? s.num + ". " : ""}${t(s.title)}`))));
      stage.append(list);
      const frame = h("div", { class: "preview", id: "preview" });
      stage.append(h("div", { class: "row" },
        h("button", { type: "button", class: "btn ghost", onclick: async () => {
          const blob = await makePdf(); const url = URL.createObjectURL(blob);
          frame.innerHTML = ""; frame.append(h("iframe", { src: url, title: t(UI.preview) }));
          frame.append(h("p", { class: "muted small" }, h("a", { href: url, target: "_blank", rel: "noopener" }, t(UI.preview) + " ↗")));
        } }, t(UI.preview)),
        CFG.webhookUrl ? h("button", { type: "button", class: "btn ghost", onclick: async () => downloadBlob(await makePdf()) }, t(UI.download)) : null));
      stage.append(frame);
      if (window.ZF.needsAuth(d)) authBlock(stage);
      docsBlock(stage);
      if (!CFG.webhookUrl) { stage.querySelector(".info").textContent = t(UI.reviewBodyEmail); emailSteps(stage); $("#nextBtn").hidden = true; }
      else {
      stage.append(h("div", { class: "submit-row" },
        h("button", { type: "button", class: "btn big", id: "submitBtn", onclick: (e) => submit(e.currentTarget) }, t(UI.submit) + " →")));
      stage.append(h("div", { id: "submitStatus", class: "status", role: "status" }));
      }
      $("#nextBtn").hidden = true;
    } else {
      const grid = h("div", { class: "grid" });
      sec.fields.forEach((f) => grid.append(f.t === "repeat" ? repeatEl(f) : fieldEl(f, d, d, "")));
      stage.append(grid);
      $("#nextBtn").hidden = false;
      $("#nextBtn").textContent = (S.step === st.length - 2 ? t(UI.review) : t(UI.next)) + " →";
    }
    $("#backBtn").disabled = S.step === 0;
    $("#formErr").textContent = "";
    applyVisibility();
    renderProgress();
    renderSaveStatus();
  }

  // ---------------- wire up ----------------
  $("#form").addEventListener("submit", (e) => e.preventDefault());
  window.addEventListener("pagehide", () => { if (saveTimer) save(true); });
  $("#langBtn").addEventListener("click", () => { S.lang = S.lang === "fr" ? "en" : "fr"; save(true); render(); });
  $("#remember").addEventListener("change", (e) => { S.remember = e.target.checked; save(true); });
  $("#clearBtn").addEventListener("click", () => {
    if (!confirm(t(UI.clearConfirm))) return;
    wipe(); location.href = location.pathname + `?lang=${S.lang}`;
  });
  $("#backBtn").addEventListener("click", () => { if (S.step > 0) { S.step--; save(true); render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  $("#nextBtn").addEventListener("click", () => {
    const st = steps();
    if (!validateStep(st[S.step])) return;
    S.step = Math.min(S.step + 1, st.length - 1); save(true); render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  render();
})();
