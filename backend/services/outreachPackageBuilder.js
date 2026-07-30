const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const activity = require("../brain/activityService");

const STATE_PATH = path.join(__dirname, "../data/agents/outreach-packages.json");

function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_e) { return fallback; }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadState() {
    return readJson(STATE_PATH, { packages: [], sent: [], responses: [] });
}

function saveState(state) {
    writeJson(STATE_PATH, state);
}

function buildOutreachPackage(candidate, ventureId) {
    const state = loadState();
    const id = `outreach-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const package_ = {
        id,
        ventureId,
        candidateId: candidate.id || candidate.organizationId || null,
        prospectName: candidate.name || candidate.organization || "Unknown",
        prospectEmail: candidate.email || null,
        prospectWebsite: candidate.website || null,
        executiveName: candidate.executiveName || candidate.contactName || null,
        executiveEmail: candidate.executiveEmail || null,
        category: candidate.category || "general",
        fitScore: candidate.fitScore || candidate.fit || 0,
        evidence: candidate.evidence || [],
        recommendedApproach: candidate.nextAction || "Initial outreach",
        emailDraft: generateEmailDraft(candidate, ventureId),
        talkingPoints: generateTalkingPoints(candidate, ventureId),
        status: "prepared",
        createdAt: now,
        updatedAt: now
    };

    state.packages.push(package_);
    saveState(state);

    activity.append("prepared", `Outreach package prepared for ${package_.prospectName}`, {
        source: "outreach-package-builder",
        ventureId,
        prospectName: package_.prospectName,
        fitScore: package_.fitScore
    });

    return package_;
}

function generateEmailDraft(candidate, ventureId) {
    const name = candidate.name || candidate.organization || "there";
    const problem = candidate.problem || candidate.category || "your business needs";

    if (ventureId === "well-noticed") {
        return {
            subject: `Quick question about ${name}'s online presence`,
            body: `Hi ${candidate.executiveName || "there"},\n\nI came across ${name} and noticed some opportunities to strengthen your online visibility and customer acquisition.\n\nWe help local businesses like yours improve their digital presence and attract more customers. I'd love to share a few quick observations about what's working and what could be improved.\n\nWould you have 15 minutes this week for a quick call?\n\nBest,\n[Your Name]\n[Your Company]`
        };
    }

    return {
        subject: `Partnership opportunity for ${name}`,
        body: `Hi ${candidate.executiveName || "there"},\n\nI'm reaching out because I believe there's a strong alignment between ${name} and what we're building.\n\n${problem}\n\nI'd love to explore how we might work together. Would you be open to a 15-minute conversation?\n\nBest,\n[Your Name]`
    };
}

function generateTalkingPoints(candidate, ventureId) {
    const points = [];
    points.push(`Prospect: ${candidate.name || candidate.organization}`);
    if (candidate.fitScore || candidate.fit) points.push(`Fit Score: ${candidate.fitScore || candidate.fit}/10`);
    if (candidate.problem) points.push(`Key Pain: ${candidate.problem}`);
    if (candidate.category) points.push(`Category: ${candidate.category}`);
    if (candidate.revenueHypothesis) points.push(`Revenue Potential: $${Number(candidate.revenueHypothesis).toLocaleString()}`);
    if (candidate.evidence && candidate.evidence.length) {
        points.push("Evidence:");
        candidate.evidence.slice(0, 3).forEach(e => points.push(`  - ${e.fact || e.summary || e}`));
    }
    return points;
}

function listPackages(filters = {}) {
    const state = loadState();
    let packages = state.packages || [];
    if (filters.ventureId) packages = packages.filter(p => p.ventureId === filters.ventureId);
    if (filters.status) packages = packages.filter(p => p.status === filters.status);
    return packages;
}

function getPackage(id) {
    const state = loadState();
    return state.packages.find(p => p.id === id) || null;
}

function updatePackage(id, updates) {
    const state = loadState();
    const idx = state.packages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    state.packages[idx] = { ...state.packages[idx], ...updates, updatedAt: new Date().toISOString() };
    saveState(state);
    return state.packages[idx];
}

function markSent(id, channel) {
    return updatePackage(id, { status: "sent", sentAt: new Date().toISOString(), channel });
}

function recordResponse(id, response) {
    const state = loadState();
    const pkg = state.packages.find(p => p.id === id);
    if (!pkg) return null;
    pkg.status = "responded";
    pkg.response = response;
    pkg.respondedAt = new Date().toISOString();
    pkg.updatedAt = new Date().toISOString();
    state.responses.push({ packageId: id, response, createdAt: new Date().toISOString() });
    saveState(state);
    return pkg;
}

function recordOutcome(id, outcome) {
    const state = loadState();
    const pkg = state.packages.find(p => p.id === id);
    if (!pkg) return null;
    pkg.status = "closed";
    pkg.outcome = outcome;
    pkg.closedAt = new Date().toISOString();
    pkg.updatedAt = new Date().toISOString();
    saveState(state);

    activity.append("decided", `Outreach ${outcome.result} for ${pkg.prospectName}`, {
        source: "outreach-package-builder",
        packageId: id,
        result: outcome.result,
        revenue: outcome.revenue || 0
    });

    return pkg;
}

function metrics() {
    const state = loadState();
    const packages = state.packages || [];
    const sent = packages.filter(p => p.status === "sent" || p.status === "responded" || p.status === "closed");
    const responded = packages.filter(p => p.status === "responded" || p.status === "closed");
    const closed = packages.filter(p => p.status === "closed");
    const won = closed.filter(p => p.outcome?.result === "won");

    return {
        total: packages.length,
        prepared: packages.filter(p => p.status === "prepared").length,
        sent: sent.length,
        responded: responded.length,
        closed: closed.length,
        won: won.length,
        totalRevenue: won.reduce((sum, p) => sum + (p.outcome?.revenue || 0), 0),
        conversionRate: sent.length > 0 ? Math.round((responded.length / sent.length) * 100) : 0
    };
}

module.exports = {
    buildOutreachPackage,
    listPackages,
    getPackage,
    updatePackage,
    markSent,
    recordResponse,
    recordOutcome,
    metrics,
    loadState
};
