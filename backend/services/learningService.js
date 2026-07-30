const fs = require("fs");
const path = require("path");
const activity = require("../brain/activityService");

const STATE_PATH = path.join(__dirname, "../data/learning/corrections.json");

function load() {
    try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); }
    catch (_e) { return { corrections: [], patterns: {} }; }
}

function save(data) {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(data, null, 2));
}

function recordCorrection(field, originalValue, correctedValue, context) {
    if (!correctedValue || originalValue === correctedValue) return;
    const data = load();
    data.corrections.push({
        field, originalValue, correctedValue,
        company: context?.companyName || "",
        context: context || {},
        timestamp: new Date().toISOString()
    });

    if (field === "executiveTitle") {
        const key = originalValue.toLowerCase().trim();
        if (!data.patterns.titleCorrections) data.patterns.titleCorrections = {};
        if (!data.patterns.titleCorrections[key]) {
            data.patterns.titleCorrections[key] = { count: 0, correctedTo: correctedValue, lastCorrectedAt: null };
        }
        data.patterns.titleCorrections[key].count++;
        data.patterns.titleCorrections[key].correctedTo = correctedValue;
        data.patterns.titleCorrections[key].lastCorrectedAt = new Date().toISOString();
    }

    if (field === "executiveName") {
        if (!data.patterns.namePatterns) data.patterns.namePatterns = {};
        const key = originalValue.toLowerCase().trim();
        if (!data.patterns.namePatterns[key]) {
            data.patterns.namePatterns[key] = { count: 0, correctedTo: correctedValue };
        }
        data.patterns.namePatterns[key].count++;
        data.patterns.namePatterns[key].correctedTo = correctedValue;
    }

    if (field === "correctedName") {
        if (!data.patterns.companyNamePatterns) data.patterns.companyNamePatterns = {};
        const key = originalValue.toLowerCase().trim();
        if (!data.patterns.companyNamePatterns[key]) {
            data.patterns.companyNamePatterns[key] = { count: 0, correctedTo: correctedValue };
        }
        data.patterns.companyNamePatterns[key].count++;
        data.patterns.companyNamePatterns[key].correctedTo = correctedValue;
    }

    if (field === "website" || field === "email" || field === "phone") {
        if (!data.patterns.contactCorrections) data.patterns.contactCorrections = {};
        if (!data.patterns.contactCorrections[field]) data.patterns.contactCorrections[field] = {};
        const companyKey = (context?.companyName || "").toLowerCase().trim();
        if (companyKey) {
            data.patterns.contactCorrections[field][companyKey] = {
                correctedValue, lastCorrectedAt: new Date().toISOString()
            };
        }
    }

    save(data);

    activity.append("observed", `Learning: recorded ${field} correction for ${context?.companyName || "unknown"}`, {
        source: "learning-service",
        field, originalValue, correctedValue, company: context?.companyName
    });
}

function applyPatterns(enrichmentResult, prospectContext) {
    const data = load();
    const patterns = data.patterns || {};
    const companyKey = (prospectContext?.name || "").toLowerCase().trim();

    if (patterns.titleCorrections && enrichmentResult.executiveTitle) {
        const key = enrichmentResult.executiveTitle.toLowerCase().trim();
        if (patterns.titleCorrections[key] && patterns.titleCorrections[key].count >= 1) {
            enrichmentResult.executiveTitle = patterns.titleCorrections[key].correctedTo;
            enrichmentResult._learnedTitle = true;
        }
    }

    if (patterns.namePatterns && enrichmentResult.executiveName) {
        const key = enrichmentResult.executiveName.toLowerCase().trim();
        if (patterns.namePatterns[key] && patterns.namePatterns[key].count >= 1) {
            enrichmentResult.executiveName = patterns.namePatterns[key].correctedTo;
            enrichmentResult._learnedName = true;
        }
    }

    if (patterns.companyNamePatterns && enrichmentResult.correctedName) {
        const key = enrichmentResult.correctedName.toLowerCase().trim();
        if (patterns.companyNamePatterns[key] && patterns.companyNamePatterns[key].count >= 1) {
            enrichmentResult.correctedName = patterns.companyNamePatterns[key].correctedTo;
            enrichmentResult._learnedCompanyName = true;
        }
    }

    if (patterns.contactCorrections && companyKey) {
        const contact = patterns.contactCorrections;
        if (contact.email && contact.email[companyKey] && !enrichmentResult.email) {
            enrichmentResult.email = contact.email[companyKey].correctedValue;
        }
        if (contact.website && contact.website[companyKey] && !enrichmentResult.website) {
            enrichmentResult.website = contact.website[companyKey].correctedValue;
        }
    }

    return enrichmentResult;
}

function getStats() {
    const data = load();
    const patterns = data.patterns || {};
    return {
        totalCorrections: data.corrections.length,
        titlePatterns: Object.keys(patterns.titleCorrections || {}).length,
        namePatterns: Object.keys(patterns.namePatterns || {}).length,
        companyNamePatterns: Object.keys(patterns.companyNamePatterns || {}).length,
        contactCorrections: Object.keys(patterns.contactCorrections || {}).length,
        recentCorrections: (data.corrections || []).slice(-5).map(c => ({
            field: c.field, original: c.originalValue, corrected: c.correctedValue, company: c.company
        }))
    };
}

module.exports = { recordCorrection, applyPatterns, getStats };
