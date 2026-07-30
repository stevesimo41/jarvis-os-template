const emailService = require("./emailService");

const counters = {};
const thresholds = {
  googleSheets: { limit: 3, window: 300000, key: "googleSheets" },
  groq429: { limit: 5, window: 300000, key: "groq429" },
};

function record(key) {
  const cfg = thresholds[key];
  if (!cfg) return;
  const now = Date.now();
  if (!counters[key]) counters[key] = [];
  counters[key] = counters[key].filter(t => now - t < cfg.window);
  counters[key].push(now);
  if (counters[key].length >= cfg.limit) {
    counters[key] = [];
    sendAlert(key);
  }
}

async function sendAlert(key) {
  const messages = {
    googleSheets: "Google Sheets API has failed 3+ times in the last 5 minutes. Check credentials, quota, or network connectivity.",
    groq429: "Groq API has returned 5+ rate-limit (429) responses in the last 5 minutes. The agent may be running too frequently.",
  };
  const msg = messages[key] || `Alert triggered for ${key}`;
  console.warn(`[Alert] ${msg}`);
  try {
    await emailService.sendEmail(
      process.env.WELL_NOTICED_EMAIL || "",
      `JARVIS Alert: ${key}`,
      `<p><strong>JARVIS Alert — ${key}</strong></p><p>${msg}</p><p>Time: ${new Date().toISOString()}</p>`
    );
  } catch {
    console.warn(`[Alert] Failed to send alert email for ${key}`);
  }
}

module.exports = { record };