const express = require("express");
const { requireRole } = require("../auth/localAuth");
const approvals = require("../governance/approvalService");
const escalation = require("../services/agentEscalationService");
const campaignService = require("../services/wellNoticedCampaignService");
const jarvisCadence = require("../services/jarvisCadenceService");
const ventureRevenue = require("../agents/avoRevenueAgentService");
const xodusAgent = require("../agents/xodusMissionAgentService");
const contentAgent = require("../services/contentAgentService");
const audit = require("../governance/auditLog");
const { enrichProspect } = require("../services/prospectEnrichmentService");
const learning = require("../services/learningService");
const wellNoticedCrm = require("../agents/wellNoticedCrmAgent");
const learningEngine = require("../services/learningEngine");
const avoService = require("../services/avoService");
const avoProjectService = require("../services/avoProjectService");
const router = express.Router();

function buildActions() {
    const actions = [];

    const approvalRecords = approvals.listApprovals();
    for (const a of approvalRecords) {
        if (a.status !== "pending") continue;
        const ctx = a.context || {};
        const prospect = ctx.prospect || {};
        const isProspect = ctx.type === "new-prospect";
        const isMarketOpp = ctx.type === "market-opportunity";
        const opportunity = ctx.opportunity || {};

        if (isMarketOpp) {
            const fitScore = prospect.fitScore || 0;
            if (fitScore < 10) continue;
            actions.push({
                id: a.id,
                source: "market-pulse",
                sourceLabel: "Market Pulse",
                type: "approval",
                actionType: a.action,
                title: `MPO · ${prospect.name || "Unknown"} — ${opportunity.capability || "Market Signal"}`,
                subtitle: `${prospect.category || ""} · ${prospect.city || "Columbus"}, ${prospect.state || "OH"}`,
                description: [
                    prospect.category ? `Category: ${prospect.category}` : "",
                    prospect.fitScore ? `Relevance: ${Math.round(prospect.fitScore / 10)}/10` : "",
                    prospect.city ? `${prospect.city}, ${prospect.state || "OH"}` : "",
                    opportunity.service || ""
                ].filter(Boolean).join(" · "),
                prospectDetails: {
                    name: prospect.name || "",
                    website: prospect.sourceUrl || prospect.website || "",
                    category: prospect.category || "",
                    fitScore: prospect.fitScore || 0,
                    fitGrade: prospect.fitGrade || "",
                    city: prospect.city || "",
                    state: prospect.state || "OH",
                    email: prospect.email || "",
                    executiveName: prospect.executiveName || "",
                    googleReviewCount: prospect.googleReviewCount || 0,
                    specificStrength: opportunity.capability || "",
                    source: "market-pulse"
                },
                opportunity: {
                    capability: opportunity.capability || "",
                    pitch: opportunity.pitch || "",
                    service: opportunity.service || "",
                    sourceUrl: opportunity.sourceUrl || "",
                    marketSignal: opportunity.marketSignal || ""
                },
                approvalId: a.id,
                buttons: ["approve", "deny"],
                priority: (prospect.fitScore || 0) >= 70 ? "high" : "normal",
                createdAt: a.requestedAt
            });
        } else {
            const isVentureOutreach = a.action === "venture_outreach";
            const ventureName = isVentureOutreach
                ? (ctx.serviceTitle || ctx.ventureId || "AVO").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                : "Well Noticed";
            const isReviewCandidate = a.action === "review_venture_candidate";
            const candidate = ctx.candidate || {};
            const displayName = prospect.name || candidate.title || a.title || a.action || "Approval needed";
            actions.push({
                id: a.id,
                source: isVentureOutreach ? "avo" : isReviewCandidate ? "avo" : "well-noticed",
                sourceLabel: isReviewCandidate ? "AVO Ideas" : ventureName,
                type: isReviewCandidate ? "avo-candidate" : "approval",
                actionType: a.action,
                title: displayName,
                subtitle: isProspect
                    ? "Add to CRM & Cadence"
                    : isVentureOutreach
                    ? `Enrichment opportunity · ${ctx.note || ""}`
                    : isReviewCandidate
                    ? `Score: ${candidate.score || 0}/100 · Confidence: ${candidate.confidence || 0}%`
                    : "",
                description: [
                    prospect.category ? `Category: ${prospect.category}` : "",
                    prospect.fitScore ? `Fit: ${prospect.fitScore}/100` : "",
                    candidate.problem ? candidate.problem : "",
                    candidate.evidence ? candidate.evidence : ""
                ].filter(Boolean).join(" · "),
                prospectDetails: {
                    name: displayName,
                    website: prospect.sourceUrl || prospect.website || "",
                    category: prospect.category || candidate.customer || "",
                    fitScore: prospect.fitScore || candidate.score || 0,
                    fitGrade: prospect.fitGrade || (candidate.confidence >= 70 ? "high" : candidate.confidence >= 40 ? "medium" : "low"),
                    city: prospect.city || "",
                    state: prospect.state || "OH",
                    email: prospect.email || prospect.executiveEmail || prospect.contactEmail || "",
                    executiveName: prospect.executiveName || prospect.contactName || "",
                    googleReviewCount: prospect.googleReviewCount || 0,
                    specificStrength: prospect.specificStrength || "",
                    source: prospect.source || ""
                },
                approvalId: a.id,
                buttons: isReviewCandidate ? ["accept", "defer", "reject"] : (isVentureOutreach ? ["enrich", "approve", "deny"] : ["enrich", "approve", "deny"]),
                priority: isProspect && (prospect.fitScore || 0) >= 70 ? "high" : "normal",
                createdAt: a.requestedAt
            });
        }
    }

    let ventureState;
    try {
        ventureState = ventureRevenue.status ? ventureRevenue.status() : { candidates: [] };
    } catch (_e) { console.warn("[todayActions] ventureRevenue.status failed:", _e.message); ventureState = { candidates: [] }; }
    for (const c of (ventureState.candidates || [])) {
        if (c.status !== "identified" && c.status !== "pending-review") continue;
        actions.push({
            id: `avo-${c.id}`,
            source: "avo",
            sourceLabel: "AVO",
            type: "avo-candidate",
            title: `AVO opportunity: ${c.name || c.title || "Unknown"}`,
            description: [
                c.category ? `Category: ${c.category}` : "",
                c.score ? `Score: ${c.score}` : "",
                c.revenue ? `Revenue: $${Number(c.revenue).toLocaleString()}` : ""
            ].filter(Boolean).join(" · "),
            candidateId: c.id,
            buttons: ["accept", "defer", "reject"],
            priority: (c.score || 0) >= 7 ? "high" : "normal",
            createdAt: c.discoveredAt
        });
    }

    let campaignState;
    try {
        campaignState = campaignService.metrics ? campaignService.metrics() : {};
    } catch (_e) { console.warn("[todayActions] campaignService.metrics failed:", _e.message); campaignState = {}; }
    const pausedCampaigns = [];
    try {
        const allCampaigns = campaignService.listCampaigns ? campaignService.listCampaigns() : [];
        for (const c of allCampaigns) {
            if (c.status === "paused-handoff" || c.status === "paused-bounce" || c.status === "paused-ooo") {
                pausedCampaigns.push(c);
            }
        }
    } catch (_e) { console.warn("[todayActions] campaignService.listCampaigns failed:", _e.message); }
    for (const c of pausedCampaigns) {
        actions.push({
            id: `campaign-pause-${c.id}`,
            source: "campaign",
            sourceLabel: "Campaign",
            type: "campaign-pause",
            title: `Campaign paused: ${c.prospectName || "Unknown"}`,
            description: `Status: ${c.status} · Last step: ${c.currentStep || "?"}`,
            campaignId: c.id,
            buttons: ["resume", "close"],
            priority: "normal",
            createdAt: c.updatedAt || c.createdAt
        });
    }

    let xodusState;
    try {
        xodusState = xodusAgent.status ? xodusAgent.status() : { candidates: [] };
    } catch (_e) { console.warn("[todayActions] xodusAgent.status failed:", _e.message); xodusState = { candidates: [] }; }
    for (const c of (xodusState.candidates || [])) {
        if (c.status !== "identified") continue;
        actions.push({
            id: `xodus-${c.id}`,
            source: "xodus",
            sourceLabel: "Xodus",
            type: "xodus-finding",
            title: `Recovery partner: ${c.name || "Unknown"}`,
            description: [
                c.city ? `${c.city}, ${c.state || "OH"}` : "",
                c.category ? c.category : "",
                c.fitScore ? `Fit: ${c.fitScore}` : ""
            ].filter(Boolean).join(" · "),
            candidateId: c.id,
            buttons: ["approve", "deny"],
            priority: "normal",
            createdAt: c.discoveredAt
        });
    }

        let avoList = [];
    try {
        avoList = avoService.listAvos();
    } catch (_e) {}
    for (const a of avoList) {
        if (a.status === "identified") {
            actions.push({
                id: `avo-${a.id}`,
                source: "avo",
                sourceLabel: "AVO",
                type: "avo-needs-contact",
                title: `AVO: ${a.title}`,
                subtitle: `${a.customerNeed} · Need contact info`,
                description: a.signalSnippet || a.description || "",
                avoId: a.id,
                buttons: [],
                priority: "normal",
                createdAt: a.createdAt
            });
        }
        if (a.status === "validating") {
            actions.push({
                id: `avo-${a.id}`,
                source: "avo",
                sourceLabel: "AVO",
                type: "avo-response",
                title: `AVO: ${a.title}`,
                subtitle: `${a.customerNeed} · Cadence complete, awaiting response`,
                description: a.signalSnippet || a.description || "",
                avoId: a.id,
                buttons: ["launch", "close"],
                priority: "normal",
                createdAt: a.createdAt
            });
        }
    }

    const activeEscalations = escalation.active ? escalation.active() : [];
    for (const e of activeEscalations) {
        const ctx = e.context || {};
        const needsYou = ctx.needsYou || [];
        const needsYouDesc = needsYou.length > 0
            ? `\n\nWhat you need to do:\n${needsYou.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
            : "";
        actions.push({
            id: `escalation-${e.id}`,
            source: "system",
            sourceLabel: "System",
            type: "escalation",
            title: `Human Intervention Required: ${e.message || e.title || "Issue detected"}`,
            description: `Agent: ${e.agentId || "unknown"} · Severity: ${e.severity || "normal"}${needsYouDesc}`,
            escalationId: e.id,
            escalationContext: ctx,
            buttons: ["resolve"],
            priority: e.severity === "critical" ? "high" : "normal",
            createdAt: e.raisedAt
        });
    }

    actions.sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (b.priority === "high" && a.priority !== "high") return 1;
        return 0;
    });

    return actions;
}

router.get("/", ...requireRole("viewer"), (_req, res) => {
    try {
        const actions = buildActions();
        res.json({ ok: true, data: { actions, total: actions.length, timestamp: new Date().toISOString() } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/approve/:id", ...requireRole("owner"), async (req, res) => {
    try {
        let fullApproval;
        try { fullApproval = approvals.getApproval(req.params.id); } catch (_e) { fullApproval = null; }
        const ctx = fullApproval?.context || {};
        const approval = approvals.approve(req.params.id, { confirmation: req.body?.confirmation || "APPROVE", approvedBy: req.auth.name, requestId: req.id });
        audit.append("today_actions_approved", { actor: req.auth.name, requestId: req.id, approvalId: req.params.id });

        let execution = null;

        if (ctx.type === "market-opportunity") {
            const p = ctx.prospect || {};
            const opp = ctx.opportunity || {};
            const name = p.name || "";
            if (name && name !== "Unknown" && name !== "N/A") {
                const enriched = await enrichProspect({ name, website: p.sourceUrl || p.website || "", email: p.email || "", phone: p.phone || "", city: p.city || "Columbus", state: p.state || "OH" });
                const edata = enriched.data || {};
                const email = edata.email || p.email || "";
                const execName = edata.executiveName || p.executiveName || "";

                let avoResult = null;
                try {
                    const avo = avoService.createAvoFromMpo(fullApproval, edata);
                    avoResult = { created: true, avoId: avo.id, cadenceCreated: !!avo.cadence, contactEmail: email || "none" };
                } catch (avoErr) {
                    avoResult = { created: false, error: avoErr.message };
                }

                execution = {
                    type: "market-opportunity",
                    capability: opp.capability || "",
                    service: opp.service || "",
                    pitch: opp.pitch || "",
                    enrichment: { email: email || null, phone: edata.phone || null, executiveName: execName || null },
                    avo: avoResult,
                    status: "approved-and-pipelined"
                };
            } else {
                execution = { type: "market-opportunity", status: "approved-no-action", note: "No valid company name" };
            }
        } else if (ctx.prospect) {
            const overrides = req.body?.prospectOverrides || {};
            const additionalContacts = req.body?.additionalContacts || [];
            const stepOverrides = req.body?.stepOverrides || [];
            let p = ctx.prospect;
            const originalProspect = { ...p };
            if (overrides.name || overrides.email || overrides.phone || overrides.executiveName || overrides.website || additionalContacts.length > 0) {
                const currentEnrichment = p.enrichment || {};
                const mergedProspect = {
                    ...p,
                    name: overrides.name || p.name || "",
                    email: overrides.email || p.email || "",
                    phone: overrides.phone || p.phone || "",
                    executiveName: overrides.executiveName || p.executiveName || "",
                    executiveTitle: overrides.executiveTitle || p.executiveTitle || "",
                    website: overrides.website || p.website || p.sourceUrl || "",
                    city: overrides.city || p.city || "",
                    state: overrides.state || p.state || "OH",
                    category: overrides.category || p.category || "",
                    fitScore: overrides.fitScore ?? p.fitScore ?? 0,
                    googleReviewCount: overrides.googleReviewCount ?? p.googleReviewCount ?? 0,
                    enrichment: additionalContacts.length > 0 ? {
                        ...currentEnrichment,
                        additionalEmails: additionalContacts.map(c => c.email).filter(Boolean),
                        additionalContactNames: additionalContacts.map(c => c.executiveName || "").filter(Boolean)
                    } : p.enrichment
                };
                approvals.updateApprovalContext(req.params.id, { prospect: mergedProspect });
                try { fullApproval = approvals.getApproval(req.params.id); } catch (_e) {}
                p = (fullApproval?.context || {}).prospect || p;
            }
            const name = p.name || p.companyName || "";
            if (name && name !== "Unknown" && name !== "N/A") {
                try {
                    const enrichmentData = p.enrichment || {};
                    const email = p.email || enrichmentData.emails?.[0] || "";
                    const phone = p.phone || enrichmentData.phones?.[0] || "";
                    const execName = p.executiveName || enrichmentData.executives?.[0]?.name || "";
                    const website = p.website || p.sourceUrl || enrichmentData.website || "";
                    const additionalEmails = enrichmentData.additionalEmails || [];
                    const additionalContactNames = enrichmentData.additionalContactNames || [];

                    const allEmails = [email, ...additionalEmails].filter(Boolean).slice(0, 3);

                    const buildCrmRow = (crmEmail, crmExecName) => ({
                        name, source: p.source || "agent-discovery",
                        city: p.city || "Columbus", state: p.state || "OH",
                        category: p.category || "", fitScore: p.fitScore || 0,
                        email: crmEmail || "", executiveName: crmExecName || execName,
                        enrichment: { emails: crmEmail ? [crmEmail] : [], phones: phone ? [phone] : [], website }
                    });

                    if (req.body?.cadenceType === "noemail") {
                        try {
                            const crmRows = [buildCrmRow("", execName)];
                            try { await wellNoticedCrm.appendToSheet(crmRows); } catch (_crm) {}
                            const noEmailOverrides = stepOverrides.filter(s => s.step >= 1 && s.step <= 3);
                            const campaign = campaignService.createNoEmailCampaign({
                                name, executiveName: execName, website,
                                category: p.category || "", fitScore: p.fitScore || 0,
                                city: p.city || "Columbus", googleReviewCount: p.googleReviewCount || 0
                            }, noEmailOverrides.length > 0 ? noEmailOverrides : undefined);
                            execution = {
                                crm: { added: 1 },
                                campaign: { created: true, campaignId: campaign.id, noEmailCadence: true },
                                note: "Using 3-website-ping cadence (user selected)"
                            };
                        } catch (ce) {
                            execution = { campaign: { created: false, note: ce.message } };
                        }
                    } else                     if (allEmails.length > 0) {
                        const contacts = allEmails.map((e, i) => ({
                            email: e,
                            executiveName: i === 0 ? execName : (additionalContactNames[i - 1] || ""),
                            isPrimary: i === 0
                        }));

                        const crmRows = contacts.map(c => ({
                            name, source: p.source || "agent-discovery",
                            city: p.city || "Columbus", state: p.state || "OH",
                            category: p.category || "", fitScore: p.fitScore || 0,
                            email: c.email, executiveName: c.executiveName,
                            enrichment: { emails: [c.email], phones: phone ? [phone] : [], website }
                        }));

                        await wellNoticedCrm.appendToSheet(crmRows);
                        execution = { crm: { added: crmRows.length }, contacts: contacts.length };

                        const campaigns = [];
                        for (const c of contacts) {
                            try {
                                const campaign = campaignService.createCampaign({
                                    name, executiveEmail: c.email, executiveName: c.executiveName,
                                    website, category: p.category || "", fitScore: p.fitScore || 0,
                                    city: p.city || "Columbus"
                                }, stepOverrides);
                                campaigns.push({ created: true, campaignId: campaign.id, contact: c.email, isPrimary: c.isPrimary });
                            } catch (ce) {
                                campaigns.push({ created: false, contact: c.email, note: ce.message });
                            }
                        }
                        execution.campaign = campaigns;
                    } else if (phone) {
                        try {
                            const crmRows = [buildCrmRow("", execName)];
                            try { await wellNoticedCrm.appendToSheet(crmRows); } catch (_crm) {}
                            const smsCadence = require("../services/smsCadenceService");
                            const smsResult = smsCadence.createSmsCadence({
                                name, phone, executiveName: execName,
                                category: p.category || "", fitScore: p.fitScore || 0,
                                city: p.city || "Columbus"
                            });
                            execution = { crm: { added: 1 }, sms: { created: true, cadenceId: smsResult?.id || null, phone } };
                        } catch (se) {
                            execution = { sms: { created: false, error: se.message } };
                        }
                    } else if (!(email || phone)) {
                        try {
                            const crmRows = [buildCrmRow("", execName)];
                            try { await wellNoticedCrm.appendToSheet(crmRows); } catch (_crm) {}
                            const campaign = campaignService.createNoEmailCampaign({
                                name, executiveName: execName, website,
                                category: p.category || "", fitScore: p.fitScore || 0,
                                city: p.city || "Columbus", googleReviewCount: p.googleReviewCount || 0
                            });
                            execution = {
                                crm: { added: 1 },
                                campaign: { created: true, campaignId: campaign.id, noEmailCadence: true },
                                note: "No contact info — created 3-website-ping cadence"
                            };
                        } catch (ce) {
                            execution = { campaign: { created: false, note: ce.message } };
                        }
                    }

                    if (overrides.name || overrides.email || overrides.executiveName || overrides.executiveTitle || overrides.website) {
                        try {
                            if (overrides.executiveName && overrides.executiveName !== originalProspect.executiveName) {
                                learning.recordCorrection("executiveName", originalProspect.executiveName || "", overrides.executiveName, { companyName: name });
                            }
                            if (overrides.executiveTitle && overrides.executiveTitle !== originalProspect.executiveTitle) {
                                learning.recordCorrection("executiveTitle", originalProspect.executiveTitle || "", overrides.executiveTitle, { companyName: name });
                            }
                            if (overrides.email && overrides.email !== originalProspect.email) {
                                learning.recordCorrection("email", originalProspect.email || "", overrides.email, { companyName: name });
                            }
                            if (overrides.website && overrides.website !== originalProspect.website) {
                                learning.recordCorrection("website", originalProspect.website || "", overrides.website, { companyName: name });
                            }
                        } catch (_le) {}
                    }
                } catch (crmErr) { execution = { crm: { added: false, error: crmErr.message } }; }
            }
        }
        try {
            const p = (fullApproval?.context?.prospect || {});
            learningEngine.recordDecision(ctx.type || fullApproval?.action, p, true, "");
        } catch {}
        res.json({ ok: true, data: approval, execution });
    } catch (error) { res.status(error.statusCode || 400).json({ ok: false, error: error.message }); }
});

router.post("/deny/:id", ...requireRole("owner"), (req, res) => {
    try {
        const approval = approvals.deny(req.params.id, { confirmation: req.body?.confirmation, deniedBy: req.auth.name, reason: req.body?.reason, requestId: req.id });
        audit.append("today_actions_denied", { actor: req.auth.name, requestId: req.id, approvalId: req.params.id });
        try {
            const fullApproval = approvals.getApproval(req.params.id);
            const p = (fullApproval?.context?.prospect || {});
            learningEngine.recordDecision(fullApproval?.action || "unknown", p, false, req.body?.reason || "");
        } catch {}
        res.json({ ok: true, data: approval });
    } catch (error) { res.status(error.statusCode || 400).json({ ok: false, error: error.message }); }
});

router.post("/enrich/:id", ...requireRole("owner"), async (req, res) => {
    try {
        let fullApproval;
        try { fullApproval = approvals.getApproval(req.params.id); } catch (_e) { fullApproval = null; }
        if (!fullApproval || fullApproval.status !== "pending") {
            return res.status(404).json({ ok: false, error: "Approval not found or not pending" });
        }
        const ctx = fullApproval.context || {};
        const p = ctx.prospect || {};
        const name = p.name || p.companyName || "";
        if (!name || name === "Unknown" || name === "N/A") {
            return res.status(400).json({ ok: false, error: "No company name to enrich" });
        }

        const enriched = await enrichProspect({
            name,
            website: p.sourceUrl || p.website || "",
            email: p.email || p.executiveEmail || p.contactEmail || "",
            phone: p.phone || "",
            city: p.city || "Columbus",
            state: p.state || "OH"
        });

        const edata = enriched.data || {};

        const allEmails = (edata.allEmails || []).filter(Boolean).slice(0, 3);
        const enrichmentData = {
            emails: allEmails.length > 0 ? allEmails : (p.email ? [p.email] : []),
            phones: edata.phone ? [edata.phone] : (p.phone ? [p.phone] : []),
            executives: edata.executiveName ? [{ name: edata.executiveName, title: edata.executiveTitle || null }] : [],
            website: edata.website || p.sourceUrl || p.website || "",
            summary: edata.summary || "",
            additionalEmails: allEmails.slice(1)
        };

        approvals.updateApprovalContext(req.params.id, {
            prospect: {
                name: edata.correctedName || p.name || "",
                email: edata.email || p.email || "",
                phone: edata.phone || p.phone || "",
                executiveName: edata.executiveName || p.executiveName || "",
                executiveTitle: edata.executiveTitle || p.executiveTitle || "",
                website: edata.website || p.sourceUrl || p.website || "",
                city: edata.city || p.city || "",
                googleReviewCount: edata.googleReviewCount || p.googleReviewCount || 0,
                category: p.category || "",
                fitScore: p.fitScore || 0,
                state: p.state || "OH",
                enrichment: enrichmentData
            }
        });

        audit.append("today_actions_enriched", { actor: req.auth.name, requestId: req.id, approvalId: req.params.id, emailFound: !!edata.email, phoneFound: !!edata.phone, execFound: !!edata.executiveName });

        res.json({
            ok: true,
            data: {
                originalName: name,
                enrichment: {
                    email: edata.email || null,
                    phone: edata.phone || null,
                    executiveName: edata.executiveName || null,
                    executiveTitle: edata.executiveTitle || null,
                    website: edata.website || p.sourceUrl || p.website || "",
                    sources: edata.sources || [],
                    correctedName: edata.correctedName || null,
                    additionalEmails: (edata.allEmails || []).slice(1),
                    city: edata.city || p.city || "",
                    googleReviewCount: edata.googleReviewCount || p.googleReviewCount || 0,
                    category: p.category || "",
                    fitScore: p.fitScore || 0,
                    state: p.state || "OH",
                    sourceUrl: p.sourceUrl || p.website || ""
                },
                status: "enriched",
                note: "Review the enriched data below, correct any fields, then click ADD TO CADENCE"
            }
        });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

router.post("/resolve/:id", ...requireRole("owner"), (req, res) => {
    try {
        const escalationId = req.params.id.replace("escalation-", "");
        const result = escalation.resolve(escalationId, req.auth.name, req.body?.resolution || "Resolved by owner");
        if (!result) return res.status(404).json({ ok: false, error: "Escalation not found or already resolved" });
        audit.append("today_actions_escalation_resolved", { actor: req.auth.name, requestId: req.id, escalationId: result.id });
        res.json({ ok: true, data: result });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

router.post("/auto-resolve/:id", ...requireRole("owner"), async (req, res) => {
    try {
        const escalationId = req.params.id.replace("escalation-", "");
        const state = escalation.all();
        const esc = state.find(e => e.id === escalationId || e.id === req.params.id);
        if (!esc) return res.status(404).json({ ok: false, error: "Escalation not found" });
        if (esc.resolvedAt) return res.json({ ok: true, data: { alreadyResolved: true, escalation: esc } });

        const actions = [];
        const msg = (esc.message || "").toLowerCase();
        const ctx = esc.context || {};

        if (msg.includes("governance policy") && msg.includes("venture_outreach")) {
            try {
                const allApprovals = approvals.listApprovals();
                const pendingApproval = allApprovals.find(a =>
                    a.status === "pending" &&
                    a.action === "venture_outreach" &&
                    (!ctx.prospectId || a.context?.prospect?.name?.includes(ctx.name || ""))
                );
                if (pendingApproval) {
                    approvals.approve(pendingApproval.id, { confirmation: "APPROVE", approvedBy: "auto-resolve" });
                    actions.push({ type: "approval", detail: `Approved venture_outreach: ${pendingApproval.context?.prospect?.name || "Unknown"}` });
                } else {
                    actions.push({ type: "skip", detail: "No matching pending approval found" });
                }
            } catch (e) { actions.push({ type: "error", detail: e.message }); }
        } else if (msg.includes("oauth2.googleapis.com") || msg.includes("eno") || msg.includes("fetch failed")) {
            actions.push({ type: "transient", detail: "Network/DNS issue — will self-resolve on next scheduled run" });
        } else if (msg.includes("intelligence scan") && msg.includes("0 articles")) {
            actions.push({ type: "info", detail: "RSS feeds rate-limited — scan will recover on next run" });
        } else if (msg.includes("cannot read properties") || msg.includes("undefined")) {
            actions.push({ type: "code_issue", detail: `Code bug detected: ${esc.message}` });
        } else if (msg.includes("llm analysis failed")) {
            actions.push({ type: "transient", detail: "LLM provider unavailable — will retry on next run" });
        } else {
            actions.push({ type: "manual", detail: "Unable to auto-resolve — manual review required" });
        }

        const resolution = actions.map(a => a.detail).join("; ");
        const resolved = escalation.resolve(escalationId, "auto-resolve", resolution);
        audit.append("today_actions_auto_resolved", { actor: "auto-resolve", requestId: req.id, escalationId: esc.id, actions });

        res.json({ ok: true, data: { escalation: resolved, actions } });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

router.post("/resume/:id", ...requireRole("owner"), (req, res) => {
    try {
        const campaignId = req.params.id.replace("campaign-pause-", "");
        const result = campaignService.resumeCampaign(campaignId);
        if (!result) return res.status(404).json({ ok: false, error: "Campaign not found" });
        audit.append("today_actions_campaign_resumed", { actor: req.auth.name, requestId: req.id, campaignId: result.id });
        res.json({ ok: true, data: result });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

router.post("/close/:id", ...requireRole("owner"), (req, res) => {
    try {
        const campaignId = req.params.id.replace("campaign-pause-", "");
        const result = campaignService.pauseCampaign(campaignId, req.body?.reason || "Closed by owner", req.auth.name);
        if (!result) return res.status(404).json({ ok: false, error: "Campaign not found" });
        audit.append("today_actions_campaign_closed", { actor: req.auth.name, requestId: req.id, campaignId: result.id });
        res.json({ ok: true, data: result });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

router.post("/save-edits/:id", ...requireRole("owner"), (req, res) => {
    try {
        const learningEngine = require("../services/learningEngine");
        const overrides = req.body?.prospectOverrides || {};
        const additionalContacts = req.body?.additionalContacts || [];
        let approval;
        try { approval = approvals.getApproval(req.params.id); } catch (_e) { approval = null; }
        if (!approval) return res.status(404).json({ ok: false, error: "Approval not found" });

        const originalName = approval.context?.prospect?.name || "";
        const correctedName = overrides.name || "";
        if (correctedName && originalName && correctedName !== originalName) {
            learningEngine.recordCorrection(originalName, correctedName, overrides.category || approval.context?.prospect?.category || "");
            try { learning.recordCorrection("correctedName", originalName, correctedName, { companyName: correctedName }); } catch (_le) {}
        }

        const currentEnrichment = approval.context?.prospect?.enrichment || {};

        approvals.updateApprovalContext(req.params.id, {
            prospect: {
                name: correctedName || originalName,
                email: overrides.email || approval.context?.prospect?.email || "",
                phone: overrides.phone || approval.context?.prospect?.phone || "",
                executiveName: overrides.executiveName || approval.context?.prospect?.executiveName || "",
                executiveTitle: overrides.executiveTitle || approval.context?.prospect?.executiveTitle || "",
                website: overrides.website || approval.context?.prospect?.website || approval.context?.prospect?.sourceUrl || "",
                city: overrides.city || approval.context?.prospect?.city || "",
                state: overrides.state || approval.context?.prospect?.state || "OH",
                category: overrides.category || approval.context?.prospect?.category || "",
                fitScore: overrides.fitScore ?? approval.context?.prospect?.fitScore ?? 0,
                googleReviewCount: overrides.googleReviewCount ?? approval.context?.prospect?.googleReviewCount ?? 0,
                enrichment: {
                    ...currentEnrichment,
                    additionalEmails: additionalContacts.map(c => c.email).filter(Boolean),
                    additionalContactNames: additionalContacts.map(c => c.executiveName || "").filter(Boolean)
                }
            }
        });

        audit.append("today_actions_edits_saved", { actor: req.auth.name, requestId: req.id, approvalId: req.params.id });
        res.json({ ok: true, data: { saved: true } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/preview-cadence/:id", ...requireRole("viewer"), (req, res) => {
    try {
        let approval;
        try { approval = approvals.getApproval(req.params.id); } catch (_e) { approval = null; }
        if (!approval) return res.status(404).json({ ok: false, error: "Approval not found" });

        const cadenceType = req.query.type || "standard";

        const ctx = approval.context || {};
        const p = ctx.prospect || {};
        const enrich = p.enrichment || {};
        const emails = enrich.emails || [];
        const phones = enrich.phones || [];
        const executives = enrich.executives || [];

        const name = p.name || "";
        const email = emails[0] || p.email || p.executiveEmail || p.contactEmail || "";
        const phone = phones[0] || p.phone || "";
        const execName = executives[0]?.name || p.executiveName || p.contactName || "";
        const execTitle = executives[0]?.title || p.executiveTitle || "";
        const website = enrich.website || p.website || p.sourceUrl || "";

        const campaignProspect = {
            name,
            executiveName: execName,
            executiveEmail: email,
            website,
            category: p.category || "",
            fitScore: p.fitScore || 0,
            city: p.city || "Columbus",
            specificStrength: p.specificStrength || "strong local reputation",
            googleReviewCount: p.googleReviewCount || 0,
            contactName: execName,
            contactEmail: email
        };

        let preview = null;
        let previewError = null;
        try {
            if (cadenceType === "noemail") {
                preview = campaignService.previewNoEmailCampaign(campaignProspect);
            } else {
                preview = campaignService.previewCampaign(campaignProspect);
            }
        } catch (e) {
            previewError = e.message;
        }

        res.json({
            ok: true,
            data: {
                approvalId: req.params.id,
                cadenceType,
                prospect: {
                    name,
                    website,
                    category: p.category || "",
                    fitScore: p.fitScore || 0,
                    fitGrade: p.fitGrade || "low",
                    city: p.city || "",
                    state: p.state || "OH",
                    email,
                    phone,
                    executiveName: execName,
                    executiveTitle: execTitle,
                    googleReviewCount: p.googleReviewCount || 0,
                    notes: ctx.note || ""
                },
                hasContact: !!(email || phone),
                campaignPreview: preview,
                previewError
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/avos", ...requireRole("viewer"), (_req, res) => {
    try {
        const avos = avoService.listAvos();
        res.json({ ok: true, data: { avos, total: avos.length } });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get("/avo/:id", ...requireRole("viewer"), (req, res) => {
    try {
        const avo = avoService.getAvo(req.params.id);
        if (!avo) return res.status(404).json({ ok: false, error: "AVO not found" });
        res.json({ ok: true, data: avo });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.post("/avo/:id/launch", ...requireRole("owner"), (req, res) => {
    try {
        const result = avoService.updateAvoStatus(req.params.id, "launched", req.body?.note);
        if (!result) return res.status(404).json({ ok: false, error: "AVO not found" });

        try {
            const { projects } = avoProjectService.getProjects();
            let project = projects.find(p => p.sourceAvoId === req.params.id);
            if (!project) {
                project = avoProjectService.createProjectFromAvo(result);
            }
            if (project && project.status === "accepted") {
                avoProjectService.advanceProject(project.id, "scoping", "avo-launch");
            }
        } catch (pe) {
            console.error(`Failed to advance project for launched AVO: ${pe.message}`);
        }

        audit.append("avo_launched", { actor: req.auth.name, requestId: req.id, avoId: req.params.id });
        res.json({ ok: true, data: result });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

router.post("/avo/:id/close", ...requireRole("owner"), (req, res) => {
    try {
        const result = avoService.updateAvoStatus(req.params.id, "closed", req.body?.reason || "Closed by owner");
        if (!result) return res.status(404).json({ ok: false, error: "AVO not found" });
        audit.append("avo_closed", { actor: req.auth.name, requestId: req.id, avoId: req.params.id });
        res.json({ ok: true, data: result });
    } catch (error) { res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});

module.exports = router;
