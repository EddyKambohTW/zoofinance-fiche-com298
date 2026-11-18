# Zoo Finance — online Fiche personnelle (COM-298 / COM-298-V, 2026-12)

A free, static, bilingual (FR/EN) version of the Revenu Québec information sheet that clients
fill in online instead of printing. It runs on **GitHub Pages**, has no server and no build step.

**How it works**
1. The client picks a language and answers only the parts that apply to them (spouse, seniors, solidarity
   credit, newcomer and similar parts appear only when they're relevant).
2. Answers autosave in the client's own browser (`localStorage`), so they can close the page and come back.
   Saved answers are deleted after they submit, when they click *Erase my answers*, or after 60 days.
   There's a switch to turn saving off on a shared computer.
3. On the last step the client's browser builds the completed sheet as a **PDF** (pdf-lib, bundled in `vendor/`)
   and the client follows three steps: **(1)** download the PDF, **(2)** email it to **serviceclient@zoofinance.ca**
   (the "Open my email" button fills in the address, subject and message, and on phones a Share button attaches the PDF
   in the mail app directly), and **(3)** erase their answers from the device once it's sent.
4. *Optional automatic mode:* put an n8n webhook URL in `config.js` → `webhookUrl` and the last step becomes a single
   **Send** button that posts the PDF to n8n, which emails it to the inbox. The n8n workflow
   "Zoo Finance · COM-298 Form → Inbox" is already built for this but not published.

```
index.html          page shell
config.js           ← inbox address, optional webhook URL, autosave lifetime (edit this)
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

## Optional: automatic sending through n8n (already created on kambonalytics.com, not published)
Workflow **"Zoo Finance · COM-298 Form → Inbox"** (`/webhook/zf-com298`):
Webhook → validity check (honeypot empty, PDF present, last name present) → Gmail send to serviceclient@zoofinance.ca → respond `{ok:true}`.
- To switch it on: set `webhookUrl` in `config.js` to `https://kambonalytics.com/webhook/zf-com298` and **publish** the workflow in n8n.
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
- In the default mode the page sends **nothing** over the network. The PDF is built in the client's browser and leaves only by the client's own email. With a webhook set, data goes only to that webhook (enforced by a Content-Security-Policy). The page loads no third-party scripts, fonts or trackers.
- Autosave keeps answers, SIN included, in the client's browser on their own device until they send. Clients on a shared computer should turn it off.
- The PDF travels by the client's email, the same as the COM-298 PDFs clients email you today.
