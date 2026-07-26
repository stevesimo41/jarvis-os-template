const approvals = require("../governance/approvalService");
const marketPulseAgent = require("../agents/marketPulseAgent");

function registry() {
    const allAgents = [
        { id: "market-pulse-agent", name: "Market Pulse Agent", mode: "supervised", mission: "Job posting and market signal scanning for revenue opportunities", status: "active", operational: true, source: "marketPulseAgent.js" },
        { id: "web-research-agent", name: "Web Research Agent", mode: "supervised", mission: "DuckDuckGo search, website scraping, and content extraction", status: "active", operational: true, source: "webResearch.js" },
        { id: "email-agent", name: "Email Agent", mode: "planned", mission: "SMTP email outreach and cadence management", status: "planned", operational: false, source: "emailService.js" },
        { id: "crm-agent", name: "CRM Agent", mode: "planned", mission: "Contact and pipeline management via Google Sheets", status: "planned", operational: false, source: "pending" },
    ];
    return allAgents;
}

async function inbox() {
    const approvalRecords = approvals.listApprovals();
    const mpStatus = marketPulseAgent.status ? marketPulseAgent.status() : { recentFindings: [], totalScanned: 0 };
    const items = [
        ...approvalRecords.filter(item => item.status === "pending").map(item => {
            const ctx = item.context || {};
            const prospect = ctx.prospect || {};
            const title = ctx.type === "new-prospect"
                ? `Add prospect: ${prospect.name || "unknown"} (fit: ${prospect.fitScore || "?"})`
                : ctx.type === "enrich-prospect"
                ? `Enrich prospect: ${prospect.name || "unknown"} (row ${prospect.sheetRow || "?"})`
                : ctx.type === "market-opportunity"
                ? `MPO · ${prospect.name || "Unknown"} — ${(ctx.opportunity || {}).capability || "Market Signal"}`
                : item.action;
            return { id: item.id, type: "governance-approval", title, action: item.action, status: item.status, requestedAt: item.requestedAt, approvalId: item.id };
        }),
    ];

    const mpoApprovals = approvalRecords
        .filter(item => item.status === "pending" && item.action === "market_pulse_opportunity")
        .map(item => {
            const ctx = item.context || {};
            const p = ctx.prospect || {};
            const opp = ctx.opportunity || {};
            return {
                id: item.id,
                approvalId: item.id,
                action: item.action,
                requestedAt: item.requestedAt,
                context: {
                    type: ctx.type,
                    prospect: {
                        name: p.name || "",
                        city: p.city || "",
                        state: p.state || "",
                        category: p.category || "",
                        fitScore: p.fitScore || 0,
                        fitGrade: p.fitGrade || "",
                        specificStrength: p.specificStrength || ""
                    },
                    opportunity: {
                        capability: opp.capability || "",
                        pitch: opp.pitch || "",
                        service: opp.service || ""
                    },
                    findingId: ctx.findingId || "",
                    note: ctx.note || ""
                }
            };
        });

    return {
        generatedAt: new Date().toISOString(), items,
        summary: { total: items.length, approvalsPending: approvalRecords.filter(item => item.status === "pending").length },
        registry: registry(),
        marketPulse: mpStatus,
        mpoApprovals,
        boundaries: { externalActions: false, spend: 0, ownerDecisionRequired: true }
    };
}

module.exports = { inbox, registry };
