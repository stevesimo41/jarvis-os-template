const crypto = require("crypto");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const webResearch = require("../services/webResearch");
const activity = require("../brain/activityService");
const { enrichProspect } = require("../services/prospectEnrichmentService");

const MIN_FIT_SCORE = 40;

const VENTURE_QUERIES = {
    "well-noticed": [
        { query: "home improvement companies Columbus Ohio", location: "Columbus, OH" },
        { query: "home remodeling services Columbus Ohio", location: "Columbus, OH" },
        { query: "custom home builder Columbus Ohio", location: "Columbus, OH" },
        { query: "kitchen remodeling Columbus Ohio", location: "Columbus, OH" },
        { query: "bathroom renovation Columbus Ohio", location: "Columbus, OH" }
    ],
    "xodus": [
        { query: "recovery support services Ohio", location: "Ohio" },
        { query: "sober living homes Columbus Ohio", location: "Columbus, OH" },
        { query: "addiction recovery programs Ohio", location: "Ohio" }
    ],
    "real-estate": [
        { query: "investment properties Columbus Ohio", location: "Columbus, OH" },
        { query: "real estate investors Columbus Ohio", location: "Columbus, OH" }
    ]
};

function statePath() {
    return process.env.JARVIS_DISCOVERY_STATE_PATH || path.join(__dirname, "../data/agents/discovery-state.json");
}

function loadState() {
    const raw = readJson(statePath(), { runs: [], discoveries: [], CRMadditions: [] });
    if (Array.isArray(raw) || !raw || typeof raw !== "object") {
        return { runs: [], discoveries: [], CRMadditions: [] };
    }
    if (!raw.discoveries) raw.discoveries = [];
    if (!raw.runs) raw.runs = [];
    if (!raw.CRMadditions) raw.CRMadditions = [];
    return raw;
}

function saveState(state) {
    return writeJsonAtomic(statePath(), state);
}

function calculateFitScore(prospect) {
    let score = 0;
    const text = `${prospect.name} ${prospect.snippet || ""}`.toLowerCase();

    if (text.includes("columbus") || text.includes("ohio")) score += 20;
    if (text.includes("home") || text.includes("remodel") || text.includes("builder")) score += 20;
    if (text.includes("premium") || text.includes("luxury") || text.includes("custom")) score += 15;
    if (text.includes("windows") || text.includes("roofing") || text.includes("siding")) score += 10;
    if (prospect.website || prospect.sourceUrl) score += 10;
    if (prospect.emails && prospect.emails.length > 0) score += 10;
    if (prospect.phones && prospect.phones.length > 0) score += 5;

    let grade = "low";
    if (score >= 60) grade = "high";
    else if (score >= 40) grade = "medium";

    return { score, grade };
}

async function runDiscovery(ventureId, options) {
    const queries = VENTURE_QUERIES[ventureId] || VENTURE_QUERIES["well-noticed"];
    const maxPerQuery = Math.min(Number(options?.maxPerQuery) || 5, 10);
    const state = loadState();
    const allProspects = [];

    for (const q of queries.slice(0, 3)) {
        try {
            const result = await webResearch.discoverProspects(q.query, q.location, maxPerQuery);
            allProspects.push(...result.prospects);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            activity.append("observed", `Discovery query failed: ${q.query}`, { source: "market-discovery", error: error.message });
        }
    }

    const existingNames = new Set(state.discoveries.map(d => d.name.toLowerCase()));
    const newProspects = allProspects.filter(p => {
        const normalizedName = p.name.toLowerCase();
        return !existingNames.has(normalizedName) && normalizedName.length > 2;
    });

    for (const prospect of newProspects) {
        const { score, grade } = calculateFitScore(prospect);
        prospect.fitScore = score;
        prospect.fitGrade = grade;
        prospect.ventureId = ventureId;
        prospect.discoveredBy = "market-discovery-agent";
    }

    const highFit = newProspects.filter(p => p.fitGrade === "high");
    const mediumFit = newProspects.filter(p => p.fitGrade === "medium");

    const run = {
        id: crypto.randomUUID(),
        runAt: new Date().toISOString(),
        ventureId,
        queriesUsed: queries.slice(0, 3).map(q => q.query),
        totalDiscovered: allProspects.length,
        newProspects: newProspects.length,
        highFit: highFit.length,
        mediumFit: mediumFit.length,
        prospects: newProspects.slice(0, 20)
    };

    state.runs.push(run);
    state.discoveries.push(...newProspects);
    state.discoveries = state.discoveries.slice(-200);
    saveState(state);

    activity.append("prepared", `Market discovery found ${newProspects.length} new prospects (${highFit.length} high fit) for ${ventureId}`, {
        source: "market-discovery-agent",
        ventureId,
        totalDiscovered: newProspects.length,
        highFit: highFit.length
    });

    return run;
}

async function discoverAndSubmit(ventureId, options) {
    const approvals = require("../governance/approvalService");
    const run = await runDiscovery(ventureId, options);
    const qualified = run.prospects.filter(p => p.fitScore >= MIN_FIT_SCORE);
    const requests = [];

    for (let prospect of qualified) {
        try {
            // Enrich before approval so human sees enriched data
            let enrichedEmail = prospect.email || prospect.emails?.[0] || "";
            let enrichedPhone = prospect.phone || prospect.phones?.[0] || "";
            let enrichedExec = prospect.executiveName ? { name: prospect.executiveName } : null;
            try {
                const enriched = await enrichProspect({
                    name: prospect.name,
                    website: prospect.sourceUrl || prospect.website || "",
                    email: enrichedEmail,
                    phone: enrichedPhone,
                    city: prospect.city || "Columbus",
                    state: prospect.state || "OH"
                });
                const edata = enriched.data || {};
                if (edata.email && !enrichedEmail) enrichedEmail = edata.email;
                if (edata.phone && !enrichedPhone) enrichedPhone = edata.phone;
                if (edata.executiveName) enrichedExec = { name: edata.executiveName };
                if (edata.name) prospect.name = edata.name;
                // Update snippet with enriched data
                const enrichedParts = [];
                if (enrichedEmail) enrichedParts.push(`email: ${enrichedEmail}`);
                if (enrichedPhone) enrichedParts.push(`phone: ${enrichedPhone}`);
                if (enrichedExec?.name) enrichedParts.push(`exec: ${enrichedExec.name}`);
                if (enrichedParts.length > 0) {
                    prospect.snippet = (prospect.snippet ? prospect.snippet + " | " : "") + enrichedParts.join(", ");
                }
            } catch (_e) { /* enrichment non-critical */ }

            const hasEmail = !!(enrichedEmail);
            const note = `Fit: ${prospect.fitScore} (${prospect.fitGrade}). ${hasEmail ? `Email: ${enrichedEmail}` : "No email found — needs manual enrichment."}${enrichedExec?.name ? ` Executive: ${enrichedExec.name}` : ""}. ${prospect.snippet || ""}`.slice(0, 300);

            const approvalRequest = approvals.requestApproval({
                action: "add_prospects_to_crm",
                ventureId: ventureId,
                organizationId: null,
                requestedBy: options?.actor || "market-discovery-agent",
                context: {
                    type: "market-discovery-prospect",
                    prospect: {
                        name: prospect.name,
                        source: "market-discovery",
                        sourceUrl: prospect.sourceUrl || prospect.website || "",
                        snippet: (prospect.snippet || "").slice(0, 200),
                        city: prospect.city || "",
                        state: prospect.state || "OH",
                        category: prospect.category || "",
                        fitScore: prospect.fitScore,
                        fitGrade: prospect.fitGrade,
                        email: enrichedEmail || null,
                        phone: enrichedPhone || null,
                        executiveName: enrichedExec?.name || null
                    },
                    discoveryRunId: run.id,
                    note
                }
            });
            requests.push(approvalRequest);
        } catch (error) {
            activity.append("observed", `Failed to submit discovery for approval: ${prospect.name}`, { source: "market-discovery", error: error.message });
        }
    }

    activity.append("prepared", `Market discovery submitted ${requests.length} prospects for approval`, {
        source: "market-discovery-agent",
        ventureId,
        discovered: run.newProspects,
        submitted: requests.length
    });

    return {
        ...run,
        submittedForApproval: requests.length,
        approvalRequests: requests
    };
}

function getStatus() {
    const state = loadState();
    const recent = state.runs.slice(-10).reverse();
    const allDiscoveries = state.discoveries;
    const highFit = allDiscoveries.filter(d => d.fitGrade === "high");
    const mediumFit = allDiscoveries.filter(d => d.fitGrade === "medium");

    return {
        agent: { id: "market-discovery-agent", name: "Market Discovery Agent", version: "1.0", mode: "shadow" },
        metrics: {
            totalRuns: state.runs.length,
            totalDiscoveries: allDiscoveries.length,
            highFitCount: highFit.length,
            mediumFitCount: mediumFit.length,
            crmAdditions: state.CRMadditions.length
        },
        recentRuns: recent,
        highFitProspects: highFit.slice(-20),
        mediumFitProspects: mediumFit.slice(-20),
        ventures: Object.keys(VENTURE_QUERIES)
    };
}

function discoverLocalOhioProspects() {
    return [
        { name: "Ohio Exteriors", industry: "Home Improvement", city: "Columbus", state: "OH", website: "https://ohioexteriors.com", description: "Exterior home remodeling", homeownerRelevance: true, highValueService: true, localOrRegional: true, premiumMarketingPotential: true },
        { name: "The Cleary Company", industry: "Home Builder", city: "Columbus", state: "OH", website: "https://theclearycompany.com", description: "Custom home building and remodeling", homeownerRelevance: true, highValueService: true, localOrRegional: true, premiumMarketingPotential: true },
        { name: "J.S. Brown & Co.", industry: "Home Remodeling", city: "Columbus", state: "OH", website: "https://jsbrown.com", description: "Luxury home remodeling", homeownerRelevance: true, highValueService: true, localOrRegional: true, premiumMarketingPotential: true },
        { name: "Manning Building Company", industry: "Home Builder", city: "Columbus", state: "OH", website: "https://manningbuilding.com", description: "Custom home construction", homeownerRelevance: true, highValueService: true, localOrRegional: true, premiumMarketingPotential: true },
        { name: "Copper Creek Homes", industry: "Home Builder", city: "Columbus", state: "OH", website: "https://coppercreekhomes.com", description: "Custom homes and renovations", homeownerRelevance: true, highValueService: true, localOrRegional: true, premiumMarketingPotential: true }
    ];
}

function discoverProspects(ventureId, candidates) {
    const existingNames = new Set();
    const newProspects = [];

    for (const candidate of (candidates || [])) {
        const normalizedName = (candidate.name || "").toLowerCase().trim();
        if (!normalizedName || existingNames.has(normalizedName)) continue;
        existingNames.add(normalizedName);

        const { score, grade } = calculateFitScore({ name: candidate.name, snippet: candidate.description || "", website: candidate.website, emails: [], phones: [] });
        newProspects.push({ ...candidate, fitScore: score, fitGrade: grade, status: "qualified" });
    }

    return {
        ventureId,
        venture: { id: ventureId },
        totalCandidates: (candidates || []).length,
        newProspects,
        duplicates: (candidates || []).length - newProspects.length,
        recommendations: newProspects.filter(p => p.fitGrade === "high"),
        crmMutations: false,
        status: "simulation_only"
    };
}

module.exports = { runDiscovery, discoverAndSubmit, getStatus, calculateFitScore, discoverLocalOhioProspects, discoverProspects, VENTURE_QUERIES };
