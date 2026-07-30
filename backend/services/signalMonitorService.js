const activity = require("../brain/activityService");

const SIGNAL_SOURCES = [
  {
    id: "columbus-business-news",
    name: "Columbus Business News",
    type: "rss",
    url: "https://www.bizjournals.com/columbus/feed/rss",
    keywords: ["expansion", "new location", "growing", "hiring", "investment", "relocating", "moves to", "opens in"]
  },
  {
    id: "columbus-economic",
    name: "Columbus Economic Development",
    type: "rss",
    url: "https://www.columbus.gov/economicdevelopment/rss",
    keywords: ["small business", "development", "growth", "awarded", "grant"]
  }
];

const VENTURE_KEYWORDS = {
  "well-noticed": [
    "home remodeling", "kitchen remodel", "bath remodel", "landscaping", "interior design",
    "med spa", "chiropractor", "fitness center", "restaurant", "fine dining",
    "luxury", "premium", "new business", "grand opening"
  ],
  "avo": [
    "revenue", "growth", "funding", "acquisition", "expansion",
    "new ceo", "partnership", "contract award"
  ],
  "mpo": [
    "job opening", "hiring", "new facility", "investment", "relocation"
  ]
};

let monitorInterval = null;

async function scanSignals() {
  const signals = [];

  for (const source of SIGNAL_SOURCES) {
    if (source.type === "rss") {
      try {
        const response = await fetch(source.url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) continue;
        const text = await response.text();
        const items = parseRSS(text);
        for (const item of items.slice(0, 10)) {
          const matchedVentures = matchVentures(item, source.keywords);
          if (matchedVentures.length > 0) {
            signals.push({ source: source.name, title: item.title, url: item.link, snippet: item.snippet, ventures: matchedVentures, detectedAt: new Date().toISOString() });
          }
        }
      } catch {
        continue;
      }
    }
  }

  if (signals.length > 0) {
    activity.append("observed", `Signal monitor detected ${signals.length} signal(s)`, { source: "signal-monitor", count: signals.length });
  }

  return signals;
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const link = (block.match(/<link>([^<]*)<\/link>/) || [])[1] || "";
    const desc = (block.match(/<description>([^<]*)<\/description>/) || [])[1] || "";
    items.push({ title, link, snippet: desc.replace(/<[^>]*>/g, "").slice(0, 300) });
  }
  return items;
}

function matchVentures(item, sourceKeywords) {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  const matched = [];

  for (const [venture, keywords] of Object.entries(VENTURE_KEYWORDS)) {
    const allKw = [...sourceKeywords, ...keywords];
    if (allKw.some(kw => text.includes(kw.toLowerCase()))) {
      matched.push(venture);
    }
  }

  return matched;
}

async function runScan() {
  try {
    return await scanSignals();
  } catch (e) {
    console.warn("[SignalMonitor] scan failed:", e.message);
    return [];
  }
}

function startMonitoring(intervalMs) {
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(() => { runScan().catch(() => {}); }, intervalMs || 3600000);
  console.log("[SignalMonitor] monitoring every", (intervalMs || 3600000) / 1000 + "s");
  return monitorInterval;
}

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

module.exports = { runScan, startMonitoring, stopMonitoring, scanSignals };
