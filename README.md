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
   - **COM-1076.TD.A (tax data download):** if the client answers Yes in Part 4, the last step shows the authorization and asks them to
     sign it on screen (finger or mouse), type their name and check a consent box. The PDF then includes a reproduction of COM-1076.TD.A
     with the signature and a signature certificate (date and time, email, device, SHA-256 fingerprint). **The authorization is valid for 2 days**, so download the data within 48 hours of receiving the email.
     A signature older than 24 hours is cleared and the client is asked to sign again. Organization name, ImpôtNet number and software
     are set in `config.js`.
   - **Tax slips by situation:** a step "Your income and tax slips" shows a table (situation | federal slip | Québec slip | you | spouse),
     e.g. employment T4 + RL-1, EI T4E, QPIP RL-6, social assistance T5007 + RL-5, student T2202 + RL-8, bursaries T4A + RL-1 (code RB),
     OAS T4A(OAS), QPP T4A(P) + RL-2, RRSP T4RSP + RL-2, investments T5 + RL-3, childcare RL-24, tenant RL-31. The client checks what
     applied, and the last step, the PDF and the email repeat the slips as an "attached" checklist. Edit the list in `SLIPS` in `js/schema.js`.
   - **Documents to attach:** a checklist built from the answers (RL-31 for tenants, medical receipts, support judgment, RL-19,
     RPA lease and Schedule 6, newcomer proof, and so on). It appears on screen, in the PDF and in the email body.
4. *Optional automatic mode:* put an n8n webhook URL in `config.js` → `webhookUrl` and the last step becomes a single
   **Send** button that posts the PDF to n8n, which emails it to the inbox. The n8n workflow
   "Zoo Finance · COM-298 Form → Inbox" is already built for this but not published.

```
index.html          page shell
config.js           ← inbox address, optional webhook URL, autosave lifetime (edit this)
js/schema.js        every question, FR + EN labels, "when does this apply" rules, COM-1076.TD.A text, documents-to-attach rules
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

## Taxation year
- The first step asks for the **taxation year**. The default is the current filing period: from October on, the year that is ending; before October, the previous year.
  Clients can pick up to **5 earlier years** (`MAX_BACK` in `js/schema.js`).
- Every date-bound label ("December 31, {Y}", "Did you arrive in Canada in {Y}?"), the 70-or-older test (Part 5), the COM-1076.TD.A year,
  the PDF title, the file name and the email subject follow the chosen year. Labels write the year as `{Y}`.
- Changing the year clears any COM-1076.TD.A signature, because an authorization covers one taxation year. One sheet per year.
- The questions follow the 2026-12 version of COM-298. When Revenu Québec publishes a new version, compare it with the schema
  and update `UI.formNo`.

## Privacy notes
- In the default mode the page sends **nothing** over the network. The PDF is built in the client's browser and leaves only by the client's own email. With a webhook set, data goes only to that webhook (enforced by a Content-Security-Policy). The page loads no third-party scripts, fonts or trackers.
- Autosave keeps answers, SIN included, in the client's browser on their own device until they send. Clients on a shared computer should turn it off.
- The PDF travels by the client's email, the same as the COM-298 PDFs clients email you today.
