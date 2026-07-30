const path = require("path");
const { readJson } = require("../storage/atomicJsonStore");

const dataPath = path.join(__dirname, "../data/opportunityEngine/opportunities.json");
const dimensions = ["customerPain", "demandEvidence", "fit", "startupCost", "timeToRevenue", "margin", "risk", "missionAlignment", "familyTimeImpact"];
const stages = ["discovered", "researching", "validated", "experiment", "approved", "executing", "revenue", "rejected", "learned"];

function score(item) {
    const total = dimensions.reduce((sum, key) => sum + (Number(item[key]) || 0), 0);
    return Math.round((total / (dimensions.length * 10)) * 100);
}

function enrich(item) {
    return {
        ...item,
        score: score(item),
        confidence: Math.min(100, 35 + (item.evidence?.length || 0) * 20 + (item.demandEvidence || 0) * 4),
        researchPacket: {
            evidence: item.evidence || [],
            businessCase: `${item.title} is currently estimated at $${Number(item.revenueHypothesis || 0).toLocaleString()} in potential value.`,
            experiment: item.nextAction,
            externalActions: false,
            spending: false
        }
    };
}

function inbox(filters = {}) {
    let records = readJson(dataPath, []).map(enrich);
    if (filters.ventureId) records = records.filter(item => item.ventureId === filters.ventureId);
    if (filters.stage) records = records.filter(item => item.stage === filters.stage);
    return records.sort((a, b) => b.score - a.score);
}

function weeklyReview() {
    const records = inbox();
    const revenue = records.filter(item => item.stage === "revenue");
    return {
        generatedAt: new Date().toISOString(),
        metrics: {
            found: records.length,
            qualified: records.filter(item => item.score >= 70).length,
            tested: records.filter(item => ["experiment", "approved", "executing", "revenue", "learned"].includes(item.stage)).length,
            converted: revenue.length,
            revenueGenerated: revenue.reduce((sum, item) => sum + (Number(item.realizedRevenue) || 0), 0),
            projectedValue: records.reduce((sum, item) => sum + (Number(item.revenueHypothesis) || 0), 0),
            externalActions: 0,
            spend: 0
        },
        topOpportunities: records.slice(0, 5),
        governance: "Research and internal preparation only; execution requires a future approved workflow."
    };
}

module.exports = { inbox, weeklyReview, score, stages, dimensions };
