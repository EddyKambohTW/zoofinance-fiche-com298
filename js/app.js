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
    const bytes = await window.ZFPDF.buildPdf(d, S.lang, window.PDFLib, { submittedAt: Date.now() });
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
        h("button", { type: "button", class: "btn ghost", onclick: async () => downloadBlob(await makePdf()) }, t(UI.download))));
      stage.append(frame);
      stage.append(h("div", { class: "submit-row" },
        h("button", { type: "button", class: "btn big", id: "submitBtn", onclick: (e) => submit(e.currentTarget) }, t(UI.submit) + " →")));
      stage.append(h("div", { id: "submitStatus", class: "status", role: "status" }));
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
