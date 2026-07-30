const crypto = require("crypto");
const activity = require("../brain/activityService");
const approvals = require("../governance/approvalService");
const AI_JOB_QUERIES = [
  '"hiring" "AI" "Columbus" Ohio',
  '"artificial intelligence" "job" "Columbus" Ohio'
];

const JUNK_DOMAINS = ["indeed", "linkedin", "glassdoor", "ziprecruiter", "monster", "careerbuilder", "simplyhired", "dice", "nucamp"];

const JUNK_TITLE_WORDS = ["top 10", "top 5", "best companies", "industries hiring", "guide", "blog", "article", "ranking", "salary"];

async function searchJobPostings(query) {
  try {
    const webResearch = require("./webResearch");
    const results = await Promise.race([
      webResearch.searchWeb(query),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
    ]);
    return (results || []).map(r => ({
      title: r.title || r.name || "",
      snippet: r.snippet || r.description || "",
      url: r.url || r.link || "",
      source: "web"
    }));
  } catch (e) {
    return [];
  }
}

function isJunkResult(title, url) {
  const lower = title.toLowerCase();
  const urlLower = (url || "").toLowerCase();
  if (JUNK_DOMAINS.some(d => urlLower.includes(d))) return true;
  if (JUNK_TITLE_WORDS.some(w => lower.includes(w))) return true;
  return false;
}

function extractCompany(title, snippet, url) {
  if (isJunkResult(title, url)) return null;
  const text = title + " " + snippet;
  const patterns = [
    /^([A-Z][A-Za-z0-9\s&.]+?)\s+(?:hiring|is hiring|seeks|looking for)\s/i,
    /(?:at|with|for)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+(?:is|are|in|–|—|-|\||\(|\n|\.))/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[1].trim();
  }
  const urlMatch = url ? url.match(/https?:\/\/(?:www\.)?([^/]+)/) : null;
  if (urlMatch) {
    const domain = urlMatch[1].replace(/\.(com|org|net|io|co).*$/, "");
    return domain.split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return null;
}

async function runAiJobProspecting(options = {}) {
  const actor = options.actor || "ai-job-prospecting";
  const discovered = [];

  const querySet = options.queries || AI_JOB_QUERIES;

  for (const query of querySet) {
    try {
      const results = await searchJobPostings(query);
      for (const r of results) {
        const company = extractCompany(r.title, r.snippet, r.url);
        if (!company || company.length < 2 || company.length > 60) continue;
        if (company.toLowerCase().includes("indeed") || company.toLowerCase().includes("linkedin") || company.toLowerCase().includes("glassdoor") || company.toLowerCase().includes("ziprecruiter")) continue;

        const key = company.toLowerCase();
        if (discovered.some(d => d.company.toLowerCase() === key)) continue;

        const record = {
          id: crypto.randomUUID(),
          company,
          jobTitle: r.title,
          snippet: r.snippet,
          sourceUrl: r.url,
          source: "ai-job-posting",
          query,
          discoveredAt: new Date().toISOString(),
          actor
        };
        discovered.push(record);
      }
    } catch (e) {
      activity.append("observed", `AI job prospecting query failed: ${query}`, { source: "ai-job-prospecting", error: e.message });
    }
  }

  let submitted = 0;
  for (const d of discovered) {
    try {
      const approvalRequest = approvals.requestApproval({
        action: "market_pulse_opportunity",
        ventureId: "well-noticed",
        requestedBy: actor,
        context: {
          type: "market-opportunity",
          prospect: {
            name: d.company,
            sourceUrl: d.sourceUrl,
            snippet: d.snippet,
            city: "Columbus",
            state: "OH",
            fitScore: 60,
            fitGrade: "medium",
            category: "",
            executiveName: "",
            executiveTitle: "",
            email: "",
            phone: "",
            enrichment: {}
          },
          opportunity: {
            capability: "AI Readiness & Implementation",
            pitch: "Company is hiring for AI roles — they're ready for AI transformation. JARVIS can help.",
            service: "AI Readiness Sprint",
            sourceUrl: d.sourceUrl,
            marketSignal: `Hiring signal: ${d.jobTitle}`
          },
          note: `AI Job Signal: ${d.company} — hiring for ${d.jobTitle}`
        }
      });
      submitted++;
    } catch (e) {
      activity.append("observed", `Failed to submit MPO for ${d.company}`, { source: "ai-job-prospecting", error: e.message });
    }
  }

  activity.append("prepared", `AI job prospecting complete: ${discovered.length} companies found, ${submitted} submitted as MPO`, {
    source: "ai-job-prospecting",
    discovered: discovered.length,
    submitted
  });

  return { discovered, submitted };
}

module.exports = { runAiJobProspecting };
