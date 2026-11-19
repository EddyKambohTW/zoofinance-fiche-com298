/* Builds the completed COM-298 PDF in the browser (or Node, for testing) with pdf-lib.
 * Only the parts and questions that apply to the client are printed.
 */
(function (root) {
  const ZFS = (typeof module !== "undefined" && module.exports) ? require("./schema.js") : root.ZF;

  function optsOf(f, d) { return typeof f.opts === "function" ? f.opts(d) : (f.opts || []); }
  function visible(f, ctx, d) { return !f.show || f.show(ctx, d); }

  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, dd] = iso.split("-");
    return `${dd}-${m}-${y}`;
  }
  function fmtSin(s) {
    const n = String(s || "").replace(/\D/g, "");
    return n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : String(s || "");
  }
  function fmtMoney(v, lang) {
    const n = Number(String(v).replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, ""));
    if (v === "" || v == null || isNaN(n)) return String(v || "");
    return lang === "fr"
      ? n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $"
      : "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function valueText(f, v, d, lang) {
    const U = ZFS.UI;
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
    if (empty) return U.none[lang];
    switch (f.t) {
      case "yn": return v === "yes" ? U.yes[lang] : U.no[lang];
      case "radio": case "select": {
        const o = optsOf(f, d).find((x) => x[0] === v);
        return o ? o[1][lang] : String(v);
      }
      case "checks": case "months":
        return optsOf(f, d).filter((x) => v.includes(x[0])).map((x) => x[1][lang]).join(f.id === "p6" ? "\n" : "; ");
      case "date": return fmtDate(v);
      case "sin": return fmtSin(v);
      case "money": return fmtMoney(v, lang);
      case "consent": return v ? U.yes[lang] : U.no[lang];
      default: return String(v);
    }
  }

  async function buildPdf(d, lang, PDFLib, meta) {
    meta = meta || {};
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const U = ZFS.UI;
    const doc = await PDFDocument.create();
    doc.setTitle(`${U.title[lang]} ${ZFS.YEAR} — ${d.first || ""} ${d.last || ""}`.trim());
    doc.setAuthor("Zoo Finance");
    doc.setSubject(U.formNo[lang]);
    doc.setCreator("Zoo Finance online information sheet");
    const reg = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    // --- text safety: Standard fonts only encode WinAnsi; replace anything else.
    const okCache = new Map();
    const safe = (s, font) => Array.from(String(s).normalize("NFC")).map((ch) => {
      if (ch === "\n") return ch;
      const key = ch + (font === bold ? "b" : "r");
      if (!okCache.has(key)) { try { font.encodeText(ch); okCache.set(key, true); } catch { okCache.set(key, false); } }
      return okCache.get(key) ? ch : "?";
    }).join("");
    const wrap = (text, font, size, width) => {
      const out = [];
      for (const para of safe(text, font).split("\n")) {
        let line = "";
        for (const word of para.split(/\s+/)) {
          const t = line ? line + " " + word : word;
          if (font.widthOfTextAtSize(t, size) <= width) { line = t; continue; }
          if (line) out.push(line);
          // hard-break very long words
          let w = word;
          while (font.widthOfTextAtSize(w, size) > width) {
            let k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > width) k--;
            out.push(w.slice(0, k)); w = w.slice(k);
          }
          line = w;
        }
        out.push(line);
      }
      return out;
    };

    const W = 612, H = 792, M = 40, BOTTOM = 52;
    const INK = rgb(0.11, 0.13, 0.16), MUTED = rgb(0.38, 0.42, 0.47), RULE = rgb(0.86, 0.88, 0.9);
    const BRAND = rgb(0.06, 0.36, 0.33), BRAND_LIGHT = rgb(0.9, 0.95, 0.94);
    const LABEL_W = 300, VAL_X = M + LABEL_W + 14, VAL_W = W - M - VAL_X;

    let page, y;
    const pages = [];
    const newPage = () => { page = doc.addPage([W, H]); pages.push(page); y = H - M; };
    const ensure = (h) => { if (y - h < BOTTOM) { newPage(); y -= 6; } };
    const text = (s, x, yy, size, font, color) => page.drawText(safe(s, font), { x, y: yy, size, font, color: color || INK });

    // --- header
    newPage();
    page.drawRectangle({ x: 0, y: H - 74, width: W, height: 74, color: BRAND });
    text("Zoo Finance", M, H - 34, 16, bold, rgb(1, 1, 1));
    text(`${U.title[lang]} ${ZFS.YEAR}`, M, H - 54, 11, reg, rgb(0.85, 0.95, 0.93));
    const fno = U.formNo[lang];
    text(fno, W - M - bold.widthOfTextAtSize(fno, 10), H - 34, 10, bold, rgb(1, 1, 1));
    const conf = lang === "fr" ? "Confidentiel" : "Confidential";
    text(conf, W - M - reg.widthOfTextAtSize(conf, 9), H - 52, 9, reg, rgb(0.85, 0.95, 0.93));
    y = H - 98;

    const fullName = `${d.first || ""} ${d.last || ""}`.trim() || "—";
    text(fullName, M, y, 15, bold); y -= 16;
    const when = meta.submittedAt ? new Date(meta.submittedAt) : new Date();
    const stamp = when.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long", timeStyle: "short" });
    text(`${U.pdfSubmitted[lang]} ${stamp}`, M, y, 9, reg, MUTED); y -= 12;
    const contact = [d.c_email, d.c_phone].filter(Boolean).join("  ·  ");
    if (contact) { text(contact, M, y, 9, reg, MUTED); }

    // office-use box (mirrors "Date de réception de la fiche")
    const bx = W - M - 170, by = H - 140;
    page.drawRectangle({ x: bx, y: by, width: 170, height: 46, borderColor: RULE, borderWidth: 1 });
    text(U.pdfFor[lang].toUpperCase(), bx + 8, by + 34, 7, bold, MUTED);
    text(U.pdfReceived[lang], bx + 8, by + 22, 8, reg, MUTED);
    text(lang === "fr" ? "J J   M M   A A A A" : "D D   M M   Y Y Y Y", bx + 8, by + 8, 8, reg, RULE);
    y = H - 160;

    const authOn = ZFS.needsAuth(d) && d.sig && d.sig_at;
    const fmtD = (dt) => dt.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" });

    // eligibility flags
    const elig = d.elig || [];
    if (elig.length) {
      const f = ZFS.SECTIONS[0].fields.find((x) => x.id === "elig");
      const lines = wrap(valueText(f, elig, d, lang), reg, 9, W - 2 * M - 20);
      const h = 22 + lines.length * 12;
      ensure(h);
      page.drawRectangle({ x: M, y: y - h + 6, width: W - 2 * M, height: h, color: rgb(1, 0.96, 0.88) });
      text(U.pdfElig[lang], M + 10, y - 8, 9, bold, rgb(0.55, 0.33, 0)); let yy = y - 22;
      for (const ln of lines) { text("• " + ln, M + 10, yy, 9, reg); yy -= 12; }
      y -= h + 8;
    }

    const sectionHeader = (sec) => {
      ensure(40);
      y -= 6;
      page.drawRectangle({ x: M, y: y - 16, width: W - 2 * M, height: 20, color: BRAND_LIGHT });
      if (sec.num) {
        page.drawRectangle({ x: M, y: y - 16, width: 22, height: 20, color: BRAND });
        text(sec.num, M + 11 - bold.widthOfTextAtSize(sec.num, 10) / 2, y - 10, 10, bold, rgb(1, 1, 1));
      }
      text(sec.title[lang], M + (sec.num ? 30 : 8), y - 10, 10, bold, BRAND);
      y -= 26;
    };
    const subHeader = (s) => { ensure(24); y -= 4; text(s, M, y - 8, 9, bold, BRAND); y -= 14; page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: 0.6, color: BRAND }); y -= 4; };
    const row = (label, value, indent) => {
      const lx = M + (indent || 0), lw = LABEL_W - (indent || 0);
      const ll = wrap(label, reg, 8.5, lw), vl = wrap(value, bold, 9, VAL_W);
      const h = Math.max(ll.length * 10.5, vl.length * 11) + 7;
      ensure(h);
      let yy = y - 9; for (const s of ll) { text(s, lx, yy, 8.5, reg, MUTED); yy -= 10.5; }
      yy = y - 9; for (const s of vl) { text(s, VAL_X, yy, 9, bold, value === U.none[lang] ? RULE : INK); yy -= 11; }
      y -= h;
      page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.4, color: RULE });
    };

    for (const sec of ZFS.SECTIONS) {
      if (sec.id === "start") continue;
      if (sec.show && !sec.show(d)) continue;
      sectionHeader(sec);
      for (const f of sec.fields) {
        if (!visible(f, d, d)) continue;
        if (f.t === "info") continue;
        if (f.t === "heading") { subHeader(f.l[lang]); continue; }
        if (f.t === "repeat") {
          const items = d[f.id] || [];
          items.forEach((it, i) => {
            subHeader(`${f.item[lang]} ${i + 1}`);
            for (const sf of f.fields) if (visible(sf, it, d)) row(sf.l[lang], valueText(sf, it[sf.id], d, lang), 8);
          });
          continue;
        }
        row(f.l[lang], valueText(f, d[f.id], d, lang), f.sub ? 12 : 0);
      }
    }

    // documents to attach
    const docs = ZFS.docsFor(d);
    if (docs.length) {
      sectionHeader({ num: "", title: U.docsPdf });
      const ok = d.docs_ok || [];
      for (const doc of docs) {
        const lines = wrap(doc.l[lang], reg, 9, W - 2 * M - 26);
        const h = lines.length * 11 + 6;
        ensure(h);
        page.drawRectangle({ x: M + 2, y: y - 11, width: 9, height: 9, borderColor: MUTED, borderWidth: 0.8 });
        if (ok.includes(doc.id)) {
          page.drawLine({ start: { x: M + 3.5, y: y - 6.5 }, end: { x: M + 6, y: y - 9.5 }, thickness: 1.4, color: BRAND });
          page.drawLine({ start: { x: M + 6, y: y - 9.5 }, end: { x: M + 10, y: y - 3 }, thickness: 1.4, color: BRAND });
        }
        let yy = y - 9; for (const ln of lines) { text(ln, M + 20, yy, 9, reg); yy -= 11; }
        y -= h;
      }
    }

    // COM-1076.TD.A, reproduced and signed electronically
    if (authOn) await authPages();

    async function authPages() {
      const A = ZFS.AUTH;
      const software = meta.software || "ImpôtExpert – PCBMI";
      const org = meta.org || "Zoo Finance";
      const signedAt = new Date(d.sig_at);
      const dd = (t) => `${String(t.getDate()).padStart(2, "0")}-${String(t.getMonth() + 1).padStart(2, "0")}-${t.getFullYear()}`;
      const FW = W - 2 * M;
      newPage();
      const authPageNo = pages.length;
      text(A.formNo, M, y - 4, 8, reg, MUTED);
      text("Revenu Québec", W - M - bold.widthOfTextAtSize("Revenu Québec", 10), y - 4, 10, bold, INK);
      y -= 26;
      text(A.title, M, y, 14, bold); y -= 16;
      text(A.program, M, y, 10, reg, MUTED); y -= 16;
      for (const para of A.intro) { for (const ln of wrap(para, reg, 8, FW)) { text(ln, M, y, 8, reg, MUTED); y -= 9.5; } y -= 4; }
      y -= 4;
      // taxation year
      page.drawRectangle({ x: W - M - 150, y: y - 18, width: 150, height: 22, borderColor: RULE, borderWidth: 1 });
      text("Année d’imposition", W - M - 146, y - 4, 7, reg, MUTED);
      text(String(ZFS.YEAR), W - M - 146, y - 14, 10, bold); y -= 30;
      const part = (n, title) => {
        page.drawRectangle({ x: M, y: y - 14, width: FW, height: 17, color: BRAND_LIGHT });
        page.drawRectangle({ x: M, y: y - 14, width: 17, height: 17, color: INK });
        text(n, M + 6, y - 9, 9, bold, rgb(1, 1, 1));
        text(title, M + 24, y - 9, 9.5, bold, INK);
        y -= 22;
      };
      const box = (label, value, x, w) => {
        page.drawRectangle({ x, y: y - 26, width: w, height: 28, borderColor: RULE, borderWidth: 1 });
        text(label, x + 4, y - 7, 7, reg, MUTED);
        text(value || "", x + 4, y - 20, 10, bold);
      };
      part("1", "Renseignements sur le particulier");
      box("Nom de famille", d.last, M, FW / 2 - 4); box("Prénom", d.first, M + FW / 2 + 4, FW / 2 - 4); y -= 38;
      part("2", "Autorisation");
      const at = wrap(A.auth(software), reg, 8.5, FW - 90);
      const atTop = y;
      for (const ln of at) { text(ln, M, y - 8, 8.5, reg); y -= 10.5; }
      // Oui ☒  Non ☐
      const bx = W - M - 80, by = atTop - (at.length * 10.5) + 2;
      page.drawRectangle({ x: bx, y: by, width: 9, height: 9, borderColor: INK, borderWidth: 0.8 });
      page.drawLine({ start: { x: bx + 1.5, y: by + 1.5 }, end: { x: bx + 7.5, y: by + 7.5 }, thickness: 1.2, color: INK });
      page.drawLine({ start: { x: bx + 1.5, y: by + 7.5 }, end: { x: bx + 7.5, y: by + 1.5 }, thickness: 1.2, color: INK });
      text("Oui", bx + 12, by + 1, 8.5, reg);
      page.drawRectangle({ x: bx + 40, y: by, width: 9, height: 9, borderColor: INK, borderWidth: 0.8 });
      text("Non", bx + 52, by + 1, 8.5, reg);
      y -= 8;
      text(A.understand, M, y - 8, 8.5, reg); y -= 12;
      for (const b of A.bullets) { const ls = wrap(b, reg, 8.5, FW - 14); ls.forEach((ln, i) => { if (i === 0) text("•", M + 2, y - 8, 8.5, reg); text(ln, M + 12, y - 8, 8.5, reg); y -= 10.5; }); }
      y -= 10;
      // signature + date
      const sigW = FW * 0.62;
      page.drawRectangle({ x: M, y: y - 62, width: sigW, height: 64, borderColor: RULE, borderWidth: 1 });
      page.drawRectangle({ x: M + sigW + 8, y: y - 62, width: FW - sigW - 8, height: 64, borderColor: RULE, borderWidth: 1 });
      try {
        const png = await doc.embedPng(d.sig);
        const sc = Math.min((sigW - 20) / png.width, 46 / png.height);
        page.drawImage(png, { x: M + 10, y: y - 58, width: png.width * sc, height: png.height * sc });
      } catch (e) { text(d.sig_name || "", M + 10, y - 40, 14, bold); }
      text("Signature du particulier", M + 4, y - 72, 7.5, reg, MUTED);
      text(dd(signedAt), M + sigW + 18, y - 36, 12, bold);
      text("Date", M + sigW + 12, y - 72, 7.5, reg, MUTED);
      y -= 88;
      box("Nom de l’organisme autorisé à télécharger les données fiscales du particulier", org, M, FW * 0.62);
      box("Numéro ImpôtNet Québec", meta.impotNet || "", M + FW * 0.62 + 8, FW * 0.38 - 8);
      y -= 44;
      const foot = `Reproduction du formulaire ${A.formNo} de Revenu Québec, signée électroniquement le ${signedAt.toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" })} — voir le certificat de signature à la page suivante. Autorisation valable jusqu’au ${fmtD(ZFS.authValidUntil(d))}.`;
      for (const ln of wrap(foot, reg, 7.5, FW)) { text(ln, M, y, 7.5, reg, MUTED); y -= 9; }

      // ---- signature certificate ----
      newPage();
      const C = lang === "fr";
      text(C ? "Certificat de signature électronique" : "Electronic signature certificate", M, y - 6, 15, bold); y -= 22;
      text(C ? `Se rapporte à : ${A.formNo} — ${A.title} (page ${authPageNo})` : `Relates to: ${A.formNo} — ${A.title} (page ${authPageNo})`, M, y, 9, reg, MUTED); y -= 20;
      const payload = JSON.stringify({ form: A.formNo, year: ZFS.YEAR, last: d.last || "", first: d.first || "", org, software, consent: A.auth(software), signed_at: d.sig_at, typed_name: d.sig_name || "", signature_png: d.sig });
      let hash = "";
      try {
        const c = (typeof crypto !== "undefined" && crypto.subtle) ? crypto : require("crypto").webcrypto;
        const buf = await c.subtle.digest("SHA-256", new TextEncoder().encode(payload));
        hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) { hash = "—"; }
      const rows = [
        [C ? "Signataire" : "Signer", `${d.first || ""} ${d.last || ""}`.trim()],
        [C ? "Nom écrit par le signataire" : "Name typed by signer", d.sig_name || "—"],
        [C ? "Courriel du signataire" : "Signer’s email", d.c_email || "—"],
        [C ? "Date et heure de signature" : "Date and time signed", `${signedAt.toLocaleString(C ? "fr-CA" : "en-CA", { dateStyle: "long", timeStyle: "medium" })} (${Intl.DateTimeFormat().resolvedOptions().timeZone || "local"}) — UTC ${signedAt.toISOString()}`],
        [C ? "Valable jusqu’au" : "Valid until", fmtD(ZFS.authValidUntil(d))],
        [C ? "Méthode de signature" : "Signature method", C ? "Signature manuscrite tracée à l’écran, nom dactylographié et case de consentement cochée par le signataire dans le formulaire en ligne de Zoo Finance." : "Handwritten signature drawn on screen, typed name and consent box checked by the signer in Zoo Finance’s online form."],
        [C ? "Consentement" : "Consent", U.sigAgree[lang]],
        [C ? "Organisme autorisé" : "Authorized organization", org],
        [C ? "Appareil / navigateur" : "Device / browser", meta.userAgent || "—"],
        [C ? "Empreinte SHA-256 de l’autorisation" : "SHA-256 fingerprint of the authorization", hash],
      ];
      for (const [k, v] of rows) row(k, v, 0);
      y -= 10;
      const expl = C
        ? "L’empreinte est calculée sur le contenu de l’autorisation (texte, nom, date, organisme et image de la signature). Toute modification de ces éléments produirait une empreinte différente."
        : "The fingerprint is computed from the authorization content (text, name, date, organization and signature image). Any change to these would produce a different fingerprint.";
      for (const ln of wrap(expl, reg, 8, FW)) { text(ln, M, y, 8, reg, MUTED); y -= 10; }
    }

    // footer on every page
    const total = pages.length;
    pages.forEach((p, i) => {
      const s = `Zoo Finance  ·  ${U.formNo[lang]}  ·  ${fullName}  ·  ${U.pdfPage[lang]} ${i + 1} / ${total}`;
      p.drawLine({ start: { x: M, y: 36 }, end: { x: W - M, y: 36 }, thickness: 0.5, color: RULE });
      p.drawText(safe(s, reg), { x: M, y: 24, size: 7.5, font: reg, color: MUTED });
    });

    return doc.save();
  }

  const api = { buildPdf, valueText, fmtDate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ZFPDF = api;
})(typeof window !== "undefined" ? window : globalThis);
