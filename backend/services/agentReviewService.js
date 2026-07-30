const fs = require("fs");
const path = require("path");
const approvals = require("../governance/approvalService");
const renewal = require("./renewalBriefService");
const opportunity = require("../agents/opportunityPilotService");
const production = require("../agents/productionAgentService");
const contentAgent = require("./contentAgentService");
const ventureProspecting = require("./ventureProspectingService");
const escalation = require("./agentEscalationService");

function registry() {
    const allAgents = [
        { id: "chief-of-staff", name: "Chief of Staff", mode: "operational-oversight", mission: "Coordinates priorities, risks, approvals, and agent handoffs", status: "active", operational: true, source: "chiefOfStaffOperationsService.js" },
        { id: "opportunity-discovery-agent", name: "Opportunity Discovery Agent", mode: "supervised", mission: "CRM evidence preparation and prospect evaluation", status: "active", operational: true, source: "opportunityPilotService.js" },
        { id: "market-discovery-agent", name: "Market Discovery Agent", mode: "shadow", mission: "Web-search-based prospect discovery and fit scoring", status: "active", operational: true, source: "marketDiscoveryAgent.js" },
        { id: "strategic-intelligence-agent", name: "Strategic Intelligence Agent", mode: "supervised", mission: "RSS feed monitoring and market intelligence", status: "active", operational: true, source: "strategicIntelligenceService.js" },
        { id: "content-agent", name: "Content Agent", mode: "supervised", mission: "Website review, social media content, and print ad design", status: "active", operational: true, source: "contentAgentService.js" },
        { id: "daily-priorities-agent", name: "Daily Priorities Agent", mode: "supervised", mission: "Daily mission briefing and focus recommendations", status: "active", operational: true, source: "dailyPrioritiesService.js" },
        { id: "venture-prospecting-agent", name: "Prospecting Agent", mode: "supervised", mission: "Research and qualify prospects for venture services", status: "active", operational: true, source: "ventureProspectingService.js" },
        { id: "market-pulse-agent", name: "Market Pulse Agent", mode: "supervised", mission: "Market signal scanning for revenue opportunities", status: "active", operational: true, source: "marketPulseAgent.js" },
        { id: "production-agent", name: "Production Agent", mode: "supervised", mission: "Task execution and delivery management", status: "idle", operational: true, source: "productionAgentService.js" },
        { id: "research-agent", name: "Research Agent", mode: "supervised", mission: "Web research and data gathering", status: "idle", operational: true, source: "researchAgent.js" },
        { id: "prospect-qualification-agent", name: "Prospect Qualification Agent", mode: "supervised", mission: "Lead scoring and qualification", status: "idle", operational: true, source: "prospectQualificationAgent.js" },
    ];
    return allAgents;
}

async function inbox() {
    let approvalRecords = [];
    let renewalBriefs = [];
    let opportunityState = { preview: [] };
    let productionState = { agents: [], schedules: [], metrics: { runs: 0 } };
    let wellNoticedState = {};
    let campaignState = {};
    let contentState = { knowledge: {} };
    let ventureState = { candidates: [] };
    let ventureProspectingState = {};
    let jarvisOppsState = { opportunities: [] };
    let activeEscalations = [];

    try { approvalRecords = approvals.listApprovals(); } catch (_e) { console.warn("[agentReview] listApprovals failed:", _e.message); }
    try { renewalBriefs = renewal.list(); } catch (_e) { console.warn("[agentReview] renewal.list failed:", _e.message); }
    try { opportunityState = await opportunity.status(); } catch (_e) { console.warn("[agentReview] opportunity.status failed:", _e.message); }
    try { productionState = production.status(); } catch (_e) { console.warn("[agentReview] production.status failed:", _e.message); }
    try { contentState = contentAgent.status ? contentAgent.status() : { knowledge: {} }; } catch (_e) { console.warn("[agentReview] contentAgent.status failed:", _e.message); }
    try { ventureProspectingState = ventureProspecting.status(); } catch (_e) { console.warn("[agentReview] ventureProspecting.status failed:", _e.message); }
    try { activeEscalations = escalation.active(); } catch (_e) { console.warn("[agentReview] escalation.active failed:", _e.message); }
    function priorityTier(item) {
        const ctx = item.context || {};
        const p = ctx.prospect || {};
        if (p.name && p.name !== "Unknown" && p.name !== "N/A") {
            const fit = p.fitScore || 0;
            const hasEmail = !!(p.email || p.emails?.length > 0);
            const hasWebsite = !!(p.website || p.sourceUrl);
            const hasPhone = !!(p.phone || p.phones?.length > 0);
            if (fit >= 60 && hasEmail && hasWebsite) return "hot";
            if (fit >= 40 && (hasEmail || hasWebsite)) return "warm";
        }
        return "cold";
    }

    const items = [
        ...approvalRecords.filter(item => item.status === "pending").map(item => {
            const ctx = item.context || {};
            const prospect = ctx.prospect || {};
            const tier = priorityTier(item);
            const title = ctx.type === "new-prospect"
                ? `Add prospect: ${prospect.name || "unknown"} (fit: ${prospect.fitScore || "?"})`
                : ctx.type === "enrich-prospect"
                ? `Enrich prospect: ${prospect.name || "unknown"} (row ${prospect.sheetRow || "?"})`
                : ctx.type === "market-opportunity"
                ? `MPO · ${prospect.name || "Unknown"} — ${(ctx.opportunity || {}).capability || "Market Signal"}`
                : item.action;
            return { id: item.id, type: "governance-approval", title, action: item.action, status: item.status, ventureId: item.ventureId, organizationId: item.organizationId, requestedAt: item.requestedAt, approvalId: item.id, context: item.context, priorityTier: tier };
        }),
        ...renewalBriefs.map(item => ({ id: `renewal-${item.organization.id}`, type: "renewal-brief", title: `Review renewal brief: ${item.organization.name}`, status: "owner-review", organizationId: item.organization.id, risks: item.risks })),
        ...opportunityState.preview.map(item => ({ id: `opportunity-${item.id}`, type: "opportunity-candidate", title: item.title, status: "owner-review", ventureId: item.ventureId, organizationId: item.organizationId, confidence: item.confidence, evidence: item.evidence }))
    ];
    items.sort((a, b) => {
        const order = { hot: 0, warm: 1, cold: 2 };
        return (order[a.priorityTier] || 2) - (order[b.priorityTier] || 2);
    });

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
        })
        .filter(item => {
            const score = item.context?.prospect?.fitScore || 0;
            return score >= 10;
        });

    return {
        generatedAt: new Date().toISOString(), items,
        wellNoticedItems: items.filter(i => ["add_prospects_to_crm", "enrich_crm_prospect"].includes(i.action)),
        avoItems: items.filter(i => !["add_prospects_to_crm", "enrich_crm_prospect"].includes(i.action)),
        summary: { total: items.length, approvalsPending: approvalRecords.filter(item => item.status === "pending").length, renewalBriefs: renewalBriefs.length, opportunityCandidates: opportunityState.preview.length },
        registry: registry(), production: productionState, opportunityAgent: opportunityState,
        content: contentState,
        venture: { prospecting: ventureProspectingState },
        mpoApprovals,
        escalations: activeEscalations,
        boundaries: { externalActions: false, spend: 0, ownerDecisionRequired: true }
    };
}

module.exports = { inbox, registry };
