const fs = require("fs");
const path = require("path");
const activity = require("../brain/activityService");

const STATE_PATH = path.join(__dirname, "../data/learning/engine.json");

function load() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); }
  catch { return { decisions: [], outcomes: [], patterns: {}, queryScores: {}, categoryBonuses: {}, extractionRules: [], crmProfile: null }; }
}

function save(data) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(data, null, 2));
}

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function recordDecision(action, prospect, approved, reason) {
  const data = load();
  data.decisions.push({
    action,
    name: prospect.name || "",
    normalized: normalizeName(prospect.name),
    category: prospect.category || "",
    fitScore: prospect.fitScore || 0,
    fitGrade: prospect.fitGrade || "",
    hasEmail: !!prospect.email,
    hasPhone: !!prospect.phone,
    hasWebsite: !!prospect.website,
    hasExecutive: !!prospect.executiveName,
    approved,
    reason: reason || "",
    timestamp: new Date().toISOString()
  });
  data.decisions = data.decisions.slice(-500);
  updatePatterns(data);
  save(data);
  activity.append("observed", `Learning: recorded ${approved ? "approval" : "denial"} for ${prospect.name || "unknown"}`, {
    source: "learning-engine", action, approved, fitScore: prospect.fitScore
  });
}

function recordOutcome(prospectName, prospectEmail, outcome, sentiment, details) {
  const data = load();
  const entry = {
    prospectName: prospectName || "",
    prospectEmail: prospectEmail || "",
    normalized: normalizeName(prospectName),
    outcome,
    sentiment,
    details: details || {},
    timestamp: new Date().toISOString()
  };
  data.outcomes.push(entry);
  data.outcomes = data.outcomes.slice(-500);
  updateOutcomePatterns(data);
  save(data);
  activity.append("observed", `Outcome: ${outcome}/${sentiment} for ${prospectName || prospectEmail}`, {
    source: "learning-engine", outcome, sentiment
  });
}

function updatePatterns(data) {
  const recent = data.decisions.slice(-100);
  if (recent.length < 5) return;

  const approved = recent.filter(d => d.approved);
  const denied = recent.filter(d => !d.approved);
  const total = recent.length;

  const minApprovedScore = approved.length > 0 ? Math.min(...approved.map(d => d.fitScore)) : 0;
  const minDeniedScore = denied.length > 0 ? Math.min(...denied.map(d => d.fitScore)) : 0;

  const categories = {};
  for (const d of recent) {
    if (!d.category) continue;
    if (!categories[d.category]) categories[d.category] = { total: 0, approved: 0, denied: 0 };
    categories[d.category].total++;
    if (d.approved) categories[d.category].approved++;
    else categories[d.category].denied++;
  }

  const categoryBonuses = {};
  for (const [cat, stats] of Object.entries(categories)) {
    if (stats.total >= 3) {
      const ratio = stats.approved / stats.total;
      if (ratio >= 0.6) categoryBonuses[cat] = { bonus: 10, reason: `high approval rate (${Math.round(ratio * 100)}%)` };
      else if (ratio <= 0.2) categoryBonuses[cat] = { penalty: -15, reason: `low approval rate (${Math.round(ratio * 100)}%)` };
    }
  }

  const approvedContactProfiles = approved.map(d => ({
    hasEmail: d.hasEmail, hasPhone: d.hasPhone, hasWebsite: d.hasWebsite, hasExecutive: d.hasExecutive
  }));

  const emailRate = approved.length > 0 ? approved.filter(d => d.hasEmail).length / approved.length : 0;
  const websiteRate = approved.length > 0 ? approved.filter(d => d.hasWebsite).length / approved.length : 0;
  const phoneRate = approved.length > 0 ? approved.filter(d => d.hasPhone).length / approved.length : 0;

  data.patterns = {
    totalDecisions: data.decisions.length,
    recentDecisions: recent.length,
    approvalRate: total > 0 ? approved.length / total : 0,
    minApprovedScore,
    minDeniedScore,
    effectiveThreshold: Math.max(minApprovedScore, 25),
    emailPreference: emailRate > 0.5 ? "high" : "medium",
    websitePreference: websiteRate > 0.5 ? "high" : "medium",
    phonePreference: phoneRate > 0.3 ? "medium" : "low",
    contactPriority: emailRate >= websiteRate ? ["email", "website", "phone"] : ["website", "email", "phone"],
    lastUpdated: new Date().toISOString()
  };

  const catAdjustments = {};
  for (const [cat, bonus] of Object.entries(categoryBonuses)) {
    catAdjustments[cat] = bonus;
  }
  data.categoryBonuses = catAdjustments;

  const deniedNames = new Set(denied.map(d => d.normalized).filter(Boolean));
  const approvedNames = new Set(approved.map(d => d.normalized).filter(Boolean));
  const repeatedlyDenied = {};
  for (const d of denied) {
    if (!d.normalized) continue;
    if (!repeatedlyDenied[d.normalized]) repeatedlyDenied[d.normalized] = { name: d.name, count: 0, reasons: [] };
    repeatedlyDenied[d.normalized].count++;
    if (d.reason) repeatedlyDenied[d.normalized].reasons.push(d.reason);
  }

  data.extractionRules = Object.entries(repeatedlyDenied)
    .filter(([_, s]) => s.count >= 2)
    .map(([normalized, stats]) => ({
      pattern: normalized,
      originalName: stats.name,
      denyCount: stats.count,
      action: "block"
    }));
}

function updateOutcomePatterns(data) {
  const outcomes = data.outcomes || [];
  if (outcomes.length < 3) return;

  const byCategory = {};
  for (const d of (data.decisions || [])) {
    if (!d.category) continue;
    const match = outcomes.find(o => o.normalized === normalizeName(d.name));
    if (!match) continue;
    if (!byCategory[d.category]) byCategory[d.category] = { total: 0, positive: 0, negative: 0, neutral: 0 };
    byCategory[d.category].total++;
    if (match.sentiment === "positive") byCategory[d.category].positive++;
    else if (match.sentiment === "negative") byCategory[d.category].negative++;
    else byCategory[d.category].neutral++;
  }

  const byFitBand = { high: { total: 0, positive: 0 }, medium: { total: 0, positive: 0 }, low: { total: 0, positive: 0 } };
  for (const d of (data.decisions || [])) {
    const match = outcomes.find(o => o.normalized === normalizeName(d.name));
    if (!match) continue;
    const band = d.fitScore >= 60 ? "high" : d.fitScore >= 40 ? "medium" : "low";
    byFitBand[band].total++;
    if (match.sentiment === "positive") byFitBand[band].positive++;
  }

  const byEnrichment = { withEmail: { total: 0, positive: 0 }, withoutEmail: { total: 0, positive: 0 } };
  for (const d of (data.decisions || [])) {
    const match = outcomes.find(o => o.normalized === normalizeName(d.name));
    if (!match) continue;
    if (d.hasEmail) { byEnrichment.withEmail.total++; if (match.sentiment === "positive") byEnrichment.withEmail.positive++; }
    else { byEnrichment.withoutEmail.total++; if (match.sentiment === "positive") byEnrichment.withoutEmail.positive++; }
  }

  const outcomePatterns = {
    totalOutcomes: outcomes.length,
    positiveRate: outcomes.filter(o => o.sentiment === "positive").length / outcomes.length,
    negativeRate: outcomes.filter(o => o.sentiment === "negative").length / outcomes.length,
    neutralRate: outcomes.filter(o => o.sentiment === "neutral").length / outcomes.length,
    byCategory: Object.entries(byCategory).map(([cat, s]) => ({ category: cat, ...s, positiveRate: s.total > 0 ? s.positive / s.total : 0 })),
    byFitBand,
    byEnrichment,
    lastUpdated: new Date().toISOString()
  };

  data.outcomePatterns = outcomePatterns;
}

function getAdjustments() {
  const data = load();
  const patterns = data.patterns || {};
  const outcomes = data.outcomePatterns || {};
  return {
    scoring: {
      categoryBonuses: data.categoryBonuses || {},
      minimumThreshold: patterns.effectiveThreshold || 40,
      emailBonus: patterns.emailPreference === "high" ? 10 : 5,
      websiteBonus: patterns.websitePreference === "high" ? 10 : 5,
      phoneBonus: patterns.phonePreference === "medium" ? 5 : 0
    },
    contactPriority: patterns.contactPriority || ["email", "website", "phone"],
    extraction: {
      blockedNames: (data.extractionRules || []).filter(r => r.action === "block").map(r => r.pattern),
      denyHistory: data.extractionRules || []
    },
    approvalProfile: {
      rate: patterns.approvalRate || 0,
      minApprovedScore: patterns.minApprovedScore || 0,
      recentDecisions: patterns.recentDecisions || 0
    },
    outcomeProfile: {
      positiveRate: outcomes.positiveRate || 0,
      totalOutcomes: outcomes.totalOutcomes || 0,
      bestCategory: (outcomes.byCategory || []).sort((a, b) => b.positiveRate - a.positiveRate)[0] || null
    },
    corrections: (data.corrections || []).slice(-20).reverse()
  };
}

async function crmProfile(repo) {
  try {
    const all = await repo.getEntity("prospects");
    const withEmail = all.filter(p => !!p["Email"] || !!p["email"] || !!p["EMAIL"]);
    const withPhone = all.filter(p => !!p["Phone"] || !!p["phone"]);
    const withWebsite = all.filter(p => !!p["Website"] || !!p["website"] || !!p["WEBSITE"]);
    const categories = {};
    for (const p of all) {
      const cat = p["Category"] || p["category"] || p["CATEGORY"] || "";
      if (!cat) continue;
      if (!categories[cat]) categories[cat] = { total: 0, withEmail: 0, withPhone: 0, withWebsite: 0 };
      categories[cat].total++;
      if (p["Email"] || p["email"]) categories[cat].withEmail++;
      if (p["Phone"] || p["phone"]) categories[cat].withPhone++;
      if (p["Website"] || p["website"]) categories[cat].withWebsite++;
    }

    const total = all.length;
    const profile = {
      total,
      withEmail: withEmail.length,
      withPhone: withPhone.length,
      withWebsite: withWebsite.length,
      emailRate: total > 0 ? withEmail.length / total : 0,
      phoneRate: total > 0 ? withPhone.length / total : 0,
      websiteRate: total > 0 ? withWebsite.length / total : 0,
      topCategories: Object.entries(categories)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .map(([name, stats]) => ({ name, ...stats })),
      generatedAt: new Date().toISOString()
    };

    const data = load();
    data.crmProfile = profile;
    save(data);
    return profile;
  } catch (e) {
    console.warn("[LearningEngine] CRM profile failed:", e.message);
    return null;
  }
}

function getCrmProfile() {
  return (load()).crmProfile;
}

function recordCorrection(originalName, correctedName, category) {
  const data = load();
  const original = normalizeName(originalName);
  const corrected = normalizeName(correctedName);
  if (!original || !corrected || original === corrected) return;

  if (!data.corrections) data.corrections = [];
  data.corrections.push({
    original: originalName,
    corrected: correctedName,
    originalNormalized: original,
    correctedNormalized: corrected,
    category: category || "",
    timestamp: new Date().toISOString()
  });
  data.corrections = data.corrections.slice(-200);

  const blocked = new Set((data.extractionRules || []).filter(r => r.action === "block").map(r => r.pattern));
  if (!blocked.has(original)) {
    data.extractionRules.push({
      pattern: original,
      originalName: originalName,
      correctedName: correctedName,
      denyCount: 1,
      action: "block"
    });
  } else {
    const existing = data.extractionRules.find(r => r.pattern === original);
    if (existing) existing.denyCount = (existing.denyCount || 0) + 1;
  }

  save(data);
  activity.append("observed", `Learning: corrected name "${originalName}" → "${correctedName}"`, {
    source: "learning-engine", correction: true, category
  });
}

function getDeniedNameSet() {
  const data = load();
  return new Set(
    data.decisions.filter(d => !d.approved).map(d => d.normalized).filter(Boolean)
  );
}

function getOutcomes() {
  const data = load();
  return {
    outcomes: (data.outcomes || []).slice(-100).reverse(),
    outcomesPatterns: data.outcomePatterns || null
  };
}

function getInsights() {
  const data = load();
  const decisions = data.decisions || [];
  const outcomes = data.outcomes || [];
  const patterns = data.patterns || {};
  const outcomePatterns = data.outcomePatterns || {};
  const cats = data.categoryBonuses || {};

  const lines = [];
  if (decisions.length >= 5) {
    lines.push(`Approval rate: ${Math.round((patterns.approvalRate || 0) * 100)}% across ${patterns.recentDecisions || 0} recent decisions`);
    lines.push(`Effective fit threshold: ${patterns.effectiveThreshold || 40}`);
  }
  if (Object.keys(cats).length > 0) {
    for (const [cat, info] of Object.entries(cats)) {
      if (info.bonus) lines.push(`Category "${cat}": +${info.bonus} fit bonus (${info.reason})`);
      if (info.penalty) lines.push(`Category "${cat}": ${info.penalty} fit penalty (${info.reason})`);
    }
  }
  if (outcomes.length >= 3) {
    const pos = outcomes.filter(o => o.sentiment === "positive").length;
    const neg = outcomes.filter(o => o.sentiment === "negative").length;
    const posRate = Math.round((pos / outcomes.length) * 100);
    lines.push(`Response tracking: ${outcomes.length} replies analyzed — ${pos} positive (${posRate}%), ${neg} negative`);

    const cats = outcomePatterns.byCategory || [];
    const best = cats.sort((a, b) => b.positiveRate - a.positiveRate)[0];
    if (best && best.total >= 2) {
      lines.push(`Best responding category: "${best.category}" — ${Math.round(best.positiveRate * 100)}% positive (${best.positive}/${best.total})`);
    }
    const worst = cats.sort((a, b) => a.positiveRate - b.positiveRate)[0];
    if (worst && worst.total >= 2 && worst !== best) {
      lines.push(`Weakest responding category: "${worst.category}" — ${Math.round(worst.positiveRate * 100)}% positive (${worst.positive}/${worst.total})`);
    }

    const emailEff = outcomePatterns.byEnrichment;
    if (emailEff && emailEff.withEmail && emailEff.withEmail.total >= 2) {
      const withEmailPosRate = Math.round((emailEff.withEmail.positive / emailEff.withEmail.total) * 100);
      lines.push(`Prospects WITH email respond positively ${withEmailPosRate}% of the time`);
    }
  }
    if ((data.extractionRules || []).length > 0) {
      lines.push(`${data.extractionRules.length} name patterns blocked by repeated denial`);
    }
    const corrections = data.corrections || [];
    if (corrections.length > 0) {
      lines.push(`${corrections.length} name corrections recorded from manual overrides`);
    }

  return {
    summary: lines,
    stats: getStats(),
    generatedAt: new Date().toISOString()
  };
}

function getStats() {
  const data = load();
  const p = data.patterns || {};
  const o = data.outcomePatterns || {};
  return {
    decisions: data.decisions.length,
    outcomes: (data.outcomes || []).length,
    corrections: (data.corrections || []).length,
    patterns: {
      approvalRate: p.approvalRate || 0,
      effectiveThreshold: p.effectiveThreshold || 40,
      minApprovedScore: p.minApprovedScore || 0
    },
    outcomePatterns: {
      positiveRate: o.positiveRate || 0,
      totalOutcomes: o.totalOutcomes || 0
    },
    categoryBonuses: Object.keys(data.categoryBonuses || {}).length,
    extractionRules: (data.extractionRules || []).length,
    crmProfile: !!data.crmProfile
  };
}

module.exports = { recordDecision, recordOutcome, recordCorrection, getOutcomes, getInsights, getAdjustments, crmProfile, getCrmProfile, getDeniedNameSet, getStats };
