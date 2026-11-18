# Zoo Finance — online Fiche personnelle (COM-298 / COM-298-V, 2026-12)

A free, static, bilingual (FR/EN) version of the Revenu Québec information sheet that clients
fill in online instead of printing. It runs on **GitHub Pages**, has no server and no build step.

**How it works**
1. The client picks a language and answers only the parts that apply to them (spouse, seniors, solidarity
   credit, newcomer and similar parts appear only when they're relevant).
2. Answers autosave in the client's own browser (`localStorage`), so they can close the page and come back.
   Saved answers are deleted after they submit, when they click *Erase my answers*, or after 60 days.
   There's a switch to turn saving off on a shared computer.
3. When the client clicks **Send**, their browser builds the completed sheet as a **PDF** (pdf-lib, bundled in `vendor/`)
   and posts it to your n8n webhook. n8n emails it to **serviceclient@zoofinance.ca**, with the PDF attached
   and Reply-To set to the client's email.
4. If sending fails, the client automatically gets the PDF as a download, along with a mailto link to the inbox.

```
index.html          page shell
config.js           ← webhook URL, inbox, autosave lifetime (edit this)
js/schema.js        every question, FR + EN labels, and the "when does this apply" rules
js/pdf.js           PDF layout (same schema, so the form and the PDF always match)
js/app.js           wizard, validation (SIN check digit, postal code), autosave, submit
css/styles.css
vendor/pdf-lib.min.js  (MIT)
```

## Deploy on GitHub Pages (about 5 minutes)
1. Create a new **public** repo, e.g. `zoofinance-fiche` (Pages is free for public repos. The repo holds no client data, only the form).
2. Upload all of these files to the repo root and commit.
3. Go to **Settings → Pages → Build and deployment**, choose *Deploy from a branch*, select `main` / `/ (root)`, and save.
4. After about a minute the form is live at `https://<your-user>.github.io/zoofinance-fiche/`.
   You can add `?lang=en` or `?lang=fr` to the link to choose the starting language.
5. Optional: to use a custom domain such as `fiche.zoofinance.ca`, enter it under Settings → Pages and add a CNAME record at your DNS.
   You can link to it from the Google Site.

## n8n side (already created on kambonalytics.com)
Workflow **"Zoo Finance · COM-298 Form → Inbox"** (`/webhook/zf-com298`):
Webhook → validity check (honeypot empty, PDF present, last name present) → Gmail send to serviceclient@zoofinance.ca → respond `{ok:true}`.
- **Publish it** in n8n so the production URL starts answering.
- Open the Webhook node → Options → **Allowed Origins** and replace `*` with your Pages origin,
  e.g. `https://<your-user>.github.io` (or your custom domain).
- Successful runs are **not saved** in n8n's execution history, so client PDFs and SINs don't pile up there.
  Failures go to *System: Error Handler*.
- The email goes out through the connected Gmail account. If you'd rather send from @zoofinance.ca, swap the Gmail node
  for a Microsoft Outlook node (or SMTP) that uses your M365 mailbox.

## Yearly update
Change `YEAR` at the top of `js/schema.js` and the form number in `UI.formNo`. Then compare the new COM-298 with the
schema: each question is one line, with its label in both languages.

## Privacy notes
- The page sends data **only** to your webhook (a Content-Security-Policy enforces this) and loads no third-party scripts, fonts or trackers.
- Autosave keeps answers, SIN included, in the client's browser on their own device until they send. Clients on a shared computer should turn it off.
- The PDF travels by email, the same as the COM-298 PDFs clients email you today.
