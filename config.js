/* Zoo Finance — form settings. Edit these, commit, and GitHub Pages redeploys. */
window.ZF_CONFIG = {
  // Leave empty: the client downloads the PDF and emails it to `inbox` themselves.
  // To send automatically instead, put the n8n webhook URL here, e.g.
  // "https://kambonalytics.com/webhook/zf-com298" (workflow "Zoo Finance · COM-298 Form → Inbox").
  webhookUrl: "",
  // address the client emails the PDF to
  inbox: "serviceclient@zoofinance.ca",
  // saved answers are discarded after this many days on the client's device
  storageDays: 60,
};
