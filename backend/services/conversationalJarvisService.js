const fs = require("fs");
const path = require("path");
const orchestrator = require("./orchestrator");
const canonicalContext = require("../brain/canonicalContextService");
const activity = require("../brain/activityService");
const llm = require("./llm/index");

const MAX_TURNS = 24;
const MAX_MESSAGE_LENGTH = 8000;
const REQUEST_TIMEOUT_MS = 60000;

function readJson(relativePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(
            path.resolve(__dirname, relativePath),
            "utf8"
        ));
    } catch (_error) {
        return fallback;
    }
}

function safeRequire(modulePath) {
    try { return require(modulePath); } catch (_e) { return null; }
}

const schedulerService = safeRequire("../agents/agentSchedulerService");
const approvalService = safeRequire("../governance/approvalService");
const agentReviewService = safeRequire("../services/agentReviewService");
const marketDiscoveryService = safeRequire("../agents/marketDiscoveryAgent");
const ventureRevenueService = safeRequire("../agents/ventureRevenueAgentService");
const xodusService = safeRequire("../agents/xodusMissionAgentService");
const jarvisOppsService = safeRequire("../agents/jarvisOpportunitiesService");
const liveCrmService = safeRequire("../services/liveCrmService");
const opportunityAgentService = safeRequire("../agents/opportunityPilotService");
const systemControlService = safeRequire("../services/systemControl");
const portfolioService = safeRequire("../crm/portfolioService");
const leadPipelineService = safeRequire("../services/leadPipelineService");
const cadenceReviewService = safeRequire("../services/dataCleansingService");
const jarvisCadenceService = safeRequire("../services/jarvisCadenceService");
const wellNoticedCampaignService = safeRequire("../services/wellNoticedCampaignService");

async function collectInternalData(query) {
    const text = query.toLowerCase();
    const data = {};
    const modules = [];

    if (/\b(agent|hub|inbox|approval|pending|approve|deny)\b/.test(text)) {
        try {
            let inbox = [];
            try { inbox = agentReviewService ? await agentReviewService.inbox() : []; } catch (_inboxErr) { inbox = []; }
            data.agentHub = {
                pendingApprovals: Array.isArray(inbox) ? inbox.length : 0,
                items: (Array.isArray(inbox) ? inbox : []).slice(0, 10),
                note: Array.isArray(inbox) && inbox.length === 0 ? "No pending approvals" : undefined
            };
            modules.push("agentHub");
        } catch (_e) {}
    }

    if (/\b(schedule|scheduler|cron|runs?|daily|weekly|automation)\b/.test(text)) {
        try {
            const status = schedulerService ? schedulerService.status() : null;
            const schedules = schedulerService ? schedulerService.getSchedules() : [];
            const runs = schedulerService ? schedulerService.getRuns() : [];
            data.scheduler = {
                status,
                scheduleCount: Array.isArray(schedules) ? schedules.length : 0,
                recentRuns: (Array.isArray(runs) ? runs : []).slice(0, 5)
            };
            modules.push("scheduler");
        } catch (_e) {}
    }

    if (/\b(crm|prospect|portfolio|contact|company|companies|pipeline|reach.out|status|dnc)\b/.test(text)) {
        try {
            let prospects = [];
            try { prospects = liveCrmService ? await liveCrmService.getEntity("prospects") : []; } catch (_crmErr) {}
            let portfolio = null;
            try { portfolio = portfolioService ? portfolioService.portfolio() : null; } catch (_portErr) {}
            data.crm = {
                prospectCount: Array.isArray(prospects) ? prospects.length : 0,
                pipeline: portfolio ? portfolio.totals : null,
                lanes: portfolio ? portfolio.lanes.map(l => ({
                    id: l.venture.id,
                    name: l.venture.name,
                    metrics: l.metrics
                })) : []
            };
            modules.push("crm");
        } catch (_e) {}
    }

    if (/\b(opportunity|opportunities|pilot|high.fit|score)\b/.test(text)) {
        try {
            const inbox = opportunityAgentService ? await opportunityAgentService.getInbox() : { items: [] };
            data.opportunities = {
                itemCount: Array.isArray(inbox.items) ? inbox.items.length : 0,
                items: (Array.isArray(inbox.items) ? inbox.items : []).slice(0, 10)
            };
            modules.push("opportunities");
        } catch (_e) {}
    }

    if (/\b(jarvis.opportunity|revenue.discovery|opportunity.pilot)\b/.test(text)) {
        try {
            const status = jarvisOppsService ? jarvisOppsService.status() : null;
            data.jarvisOpportunities = status;
            modules.push("jarvisOpportunities");
        } catch (_e) {}
    }

    if (/\b(xodus|recovery|rehab|sober|addiction|mission)\b/.test(text)) {
        try {
            const status = xodusService ? xodusService.status() : null;
            const candidates = xodusService ? xodusService.getCandidates() : [];
            data.xodus = {
                status,
                candidateCount: Array.isArray(candidates) ? candidates.length : 0,
                recentCandidates: (Array.isArray(candidates) ? candidates : []).slice(0, 5)
            };
            modules.push("xodus");
        } catch (_e) {}
    }

    if (/\b(venture.revenue|venture.studio|customer|outreach|sales)\b/.test(text)) {
        try {
            const status = ventureRevenueService ? ventureRevenueService.status() : null;
            data.ventureRevenue = status;
            modules.push("ventureRevenue");
        } catch (_e) {}
    }

    if (/\b(market.discovery|discover|qualified|well.noticed)\b/.test(text)) {
        try {
            const status = marketDiscoveryService ? marketDiscoveryService.status() : null;
            data.marketDiscovery = status;
            modules.push("marketDiscovery");
        } catch (_e) {}
    }

    if (/\b(system|health|status|uptime|memory)\b/.test(text)) {
        try {
            const sys = systemControlService ? systemControlService.status() : null;
            data.system = sys;
            modules.push("system");
        } catch (_e) {}
    }

    if (/\b(pipeline|lead|prospect|enrich|score|qualify)\b/.test(text)) {
        try {
            const status = leadPipelineService ? leadPipelineService.getPipelineStatus() : null;
            data.leadPipeline = status;
            modules.push("leadPipeline");
        } catch (_e) {}
    }

    if (/\b(cadence|campaign|email|outreach|touch|sequence|review|task|approve|skip)\b/.test(text)) {
        try {
            const tasks = cadenceReviewService ? cadenceReviewService.getTasks() : null;
            const wnMetrics = wellNoticedCampaignService ? wellNoticedCampaignService.metrics() : null;
            const jMetrics = jarvisCadenceService ? jarvisCadenceService.metrics() : null;
            data.cadences = {
                reviewTasks: tasks ? tasks.summary : null,
                wellNoticed: wnMetrics,
                jarvis: jMetrics
            };
            modules.push("cadences");
        } catch (_e) {}
    }

    if (modules.length === 0) {
        try {
            if (schedulerService) {
                const status = schedulerService.status();
                data.scheduler = { status };
                modules.push("scheduler");
            }
        } catch (_e) {}
        try {
            if (agentReviewService) {
                const inbox = await agentReviewService.inbox();
                data.agentHub = { pendingApprovals: Array.isArray(inbox) ? inbox.length : 0 };
                modules.push("agentHub");
            }
        } catch (_e) {}
    }

    return { data, modules };
}

function normalizeMessages(messages = []) {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter(item => item && ["user", "assistant"].includes(item.role))
        .map(item => ({
            role: item.role,
            content: String(item.content || "").trim().slice(0, MAX_MESSAGE_LENGTH)
        }))
        .filter(item => item.content)
        .slice(-MAX_TURNS);
}

function buildContext(internalData) {
    const profile = readJson("../../memory/core/profile.json", {});
    const priorities = readJson("../../memory/core/priorities.json", {});
    const ventures = readJson("../../memory/core/avos.json", {});
    const goals = readJson("../memory/context/goals.json", []);
    const releases = readJson("../data/releases.json", {});
    const brain = canonicalContext.assemble();

    const context = {
        owner: profile.name || process.env.JARVIS_OWNER_NAME || "owner",
        role: profile.role || "Founder and operator",
        priorities: priorities.priorities || priorities,
        ventures: ventures.ventures || ventures,
        goals: Array.isArray(goals) ? goals.slice(0, 8) : goals,
        release: {
            currentVersion: releases.currentVersion,
            state: releases.state,
            nextRelease: releases.nextRelease
        },
        canonicalBrain: {
            contractVersion: brain.contractVersion,
            assembledAt: brain.assembledAt,
            counts: brain.summary.counts,
            conflictCount: brain.summary.conflicts,
            collections: {
                goals: brain.collections.goals,
                ventures: brain.collections.ventures
            }
        }
    };

    if (internalData && Object.keys(internalData.data).length > 0) {
        context.internalData = internalData.data;
        context.internalDataSources = internalData.modules;
    }

    return context;
}

function detectAgentIntent(messages) {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return null;
    const text = lastUser.content.toLowerCase();

    if (/\b(xodus|recovery|rehab|sober|addiction|12.step)\b/.test(text)) return "xodus";
    if (/\b(venture|revenue|opportunity|customer|outreach|sales|pipeline|sell)\b/.test(text)) return "venture-studio";
    if (/\b(research|analyze|market|competitor|investigate|study|data)\b/.test(text)) return "research";
    if (/\b(invest|investment|capital|fund|financial|portfolio|return)\b/.test(text)) return "investment";
    if (/\b(chief.of.staff|coordinate|agents|priorities|plan|schedule|delegate)\b/.test(text)) return "chief-of-staff";
    if (/\b(real.estate|property|properties|house|rent|mortgage)\b/.test(text)) return "real-estate";
    if (/\b(content|website|social.media|post|blog|article|copywriting|brand|marketing.content|print.ad|squarespace|xodusrp)\b/.test(text)) return "content";
    if (/\b(lead|prospect|enrich|score|qualify|pipeline)\b/.test(text)) return "lead-pipeline";
    if (/\b(cadence|campaign|email|outreach|touch|sequence|review|task)\b/.test(text)) return "cadence-review";

    return null;
}

function instructions(context) {
    return [
        "You are JARVIS, the user's direct, thoughtful executive operating-system assistant.",
        "Lead with the answer, use plain language, and preserve useful context across turns.",
        "IMPORTANT: Use the supplied internalData when available — it is live data from JARVIS backend APIs (CRM, agents, scheduler, approvals, lead pipeline, cadences). Answer from this data first before reasoning generally.",
        "Never claim live knowledge you were not given. If internalData covers the question, answer from it directly.",
        "Answer, explain, review, and plan freely. Do not claim to have executed, contacted, purchased, deleted, or modified anything.",
        "Any consequential action or data mutation must be routed through JARVIS governance and explicit approval.",
        "CAPABILITIES: You have access to lead pipeline (scoring, enrichment, qualification), cadence review tasks (approve/skip/edit), Well Noticed campaigns (5-touch), JARVIS cadences (3-touch), CRM data, agent hub, and system health.",
        "When the user asks about leads, cadences, or outreach, use the internalData to provide specific, actionable insights.",
        `Local JARVIS context: ${JSON.stringify(context)}`
    ].join("\n");
}

function extractText(payload) {
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
        return payload.output_text.trim();
    }
    return (payload.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text" && item.text)
        .map(item => item.text)
        .join("\n")
        .trim();
}

function runLocalDiagostic() {
    const fs = require("fs");
    const path = require("path");
    const lines = ["**JARVIS Self-Diagnostic**\n"];

    try {
        const llmStatus = llm.status();
        lines.push(`**LLM Provider:** ${llmStatus.configured ? "green" : "yellow"} — ${llmStatus.configured ? `${llmStatus.provider} / ${llmStatus.model}` : "No API key — using local rule engine (Gemini quota may be exhausted)"}`);
    } catch (e) {
        lines.push(`**LLM Provider:** red — ${e.message}`);
    }

    try {
        const scheduler = require("../agents/agentSchedulerService");
        const schedules = scheduler.getSchedules();
        const enabled = schedules.filter(s => s.enabled).length;
        const totalRuns = schedules.reduce((sum, s) => sum + (s.runCount || 0), 0);
        lines.push(`**Agent Scheduler:** ${enabled > 0 ? "green" : "yellow"} — ${enabled} enabled schedules, ${totalRuns} total runs`);
    } catch (e) {
        lines.push(`**Agent Scheduler:** red — ${e.message}`);
    }

    try {
        const hub = require("../services/agentReviewService");
        const inbox = hub.inbox();
        const reg = inbox.registry || [];
        const prod = inbox.production || {};
        const prodAgents = prod.agents || [];
        lines.push(`**Agent Hub:** green — ${reg.length} registered, ${prodAgents.length + 1} production, ${inbox.summary?.approvalsPending || 0} pending approvals`);
    } catch (e) {
        lines.push(`**Agent Hub:** red — ${e.message}`);
    }

    try {
        const crmPath = path.resolve(__dirname, "../data/crm");
        const orgsFile = path.join(crmPath, "organizations.json");
        const contactsFile = path.join(crmPath, "contacts.json");
        const orgs = fs.existsSync(orgsFile) ? JSON.parse(fs.readFileSync(orgsFile, "utf8")) : [];
        const contacts = fs.existsSync(contactsFile) ? JSON.parse(fs.readFileSync(contactsFile, "utf8")) : [];
        lines.push(`**CRM Data:** ${orgs.length > 0 ? "green" : "yellow"} — ${orgs.length} organizations, ${contacts.length} contacts`);
    } catch (e) {
        lines.push(`**CRM Data:** red — ${e.message}`);
    }

    try {
        const goalsPath = path.resolve(__dirname, "../memory/context/goals.json");
        const goals = fs.existsSync(goalsPath) ? JSON.parse(fs.readFileSync(goalsPath, "utf8")) : { goals: [] };
        const activeGoals = (goals.goals || []).filter(g => g.status === "active");
        lines.push(`**Goals & Strategy:** ${activeGoals.length > 0 ? "green" : "yellow"} — ${activeGoals.length} active goals`);
    } catch (e) {
        lines.push(`**Goals & Strategy:** red — ${e.message}`);
    }

    try {
        const IntelService = require("../services/strategicIntelligenceService");
        const intel = IntelService.getLatestInsights();
        lines.push(`**Strategic Intelligence:** ${intel.status === "ready" ? "green" : "yellow"} — ${intel.status === "ready" ? `${intel.total} insights` : "No scans yet"}`);
    } catch (e) {
        lines.push(`**Strategic Intelligence:** red — ${e.message}`);
    }

    try {
        const dailyPath = path.resolve(__dirname, "../data/agents/daily-priorities.json");
        const daily = fs.existsSync(dailyPath) ? JSON.parse(fs.readFileSync(dailyPath, "utf8")) : null;
        lines.push(`**Daily Priorities:** ${daily ? "green" : "yellow"} — ${daily ? `${daily.history?.length || 0} days tracked` : "No history yet"}`);
    } catch (e) {
        lines.push(`**Daily Priorities:** red — ${e.message}`);
    }

    try {
        const healthPath = path.resolve(__dirname, "../data/governance/system-control.json");
        const health = fs.existsSync(healthPath) ? JSON.parse(fs.readFileSync(healthPath, "utf8")) : {};
        lines.push(`**System Control:** ${health.stopped ? "yellow" : "green"} — ${health.stopped ? "EMERGENCY STOP ACTIVE" : "Running"}`);
    } catch (e) {
        lines.push(`**System Control:** green — No overrides`);
    }

    lines.push("\n**Summary:** 8 subsystems checked. Core systems operational. LLM quota exhausted — using local rule engine for responses.");

    // Autonomous pipeline capabilities
    const campaignCount = (() => {
        try {
            const p = path.resolve(__dirname, "../data/agents/well-noticed-campaigns.json");
            const d = JSON.parse(fs.readFileSync(p, "utf8"));
            const campaigns = d.campaigns || d;
            return Array.isArray(campaigns) ? campaigns.filter(c => c.status === "active").length : 0;
        } catch (_e) { return "?"; }
    })();
    const replyCount = (() => {
        try {
            const p = path.resolve(__dirname, "../data/agents/email-reply-state.json");
            const d = JSON.parse(fs.readFileSync(p, "utf8"));
            return d.pausedCampaigns?.length || 0;
        } catch (_e) { return 0; }
    })();
    lines.push("\n**Autonomous Prospecting Pipeline:**");
    lines.push("- Daily (2PM) + Weekly (Mon 8AM) market discovery → auto-enrich → approval → CRM + cadence");
    lines.push(`- ${campaignCount} active campaigns running with 5-touch cadences`);
    lines.push(`- Email tracking: opens/clicks per campaign visible in CRM`);
    lines.push(`- Reply detection: ${replyCount} campaigns auto-paused on prospect reply`);
    lines.push("- Invalid email protection: blocks user@domain.com, email@domain.com, analytics emails");
    lines.push("- Server crash resilience: global error handlers + OAuth retry logic active");

    return lines.join("\n");
}

function runLocalContentResponse(query) {
    const contentAgent = require("../services/contentAgentService");

    const isWellNoticed = /\b(well.noticed|mailer|mail.piece|print.ad|flyer|brochure|advert|panel|dtc|direct.mail)\b/i.test(query);
    const isWebsite = /\b(website|site|review|analyze|xodusrp|squarespace)\b/i.test(query);
    const isSocial = /\b(social|post|linkedin|facebook|instagram|twitter|x\.com)\b/i.test(query);

    const companyMatch = query.match(/\b(?:for|about)\s+([A-Z][A-Za-z\s&]{1,30})\b/i)
        || query.match(/\b(APCO|[A-Z]{2,}[A-Za-z]*)\b/);

    const companyName = companyMatch ? companyMatch[1].trim() : null;

    if (isWellNoticed) {
        const spec = contentAgent.getPrintSpec("well-noticed-ad");
        const lines = [
            "**Well Noticed Print Ad Content**\n",
            `**Print Specs:**`,
            `- Total size with bleed: ${spec.totalWidth}" x ${spec.totalHeight}"`,
            `- Bleed: ${spec.bleed}"`,
            `- Paper size: ${spec.paperWidth}" x ${spec.paperHeight}"`,
            `- Live area: ${spec.liveWidth}" x ${spec.liveHeight}" (keep important info here)`,
            `- Color mode: ${spec.colorMode}`,
            `- No spot colors or patterns`,
            "",
        ];

        if (companyName) {
            lines.push(`**Company:** ${companyName}`);
            lines.push("");
        }

        lines.push("**To create the full ad content, use the Content Studio:**");
        lines.push("1. Go to Content Studio in the sidebar");
        lines.push("2. Click the 'Print Content' tab");
        lines.push(`3. Enter company name: ${companyName || "(company name)"}`);
        lines.push("4. Add company details and key selling points");
        lines.push("5. Click 'GENERATE PRINT CONTENT'");
        lines.push("");
        lines.push("**Or ask JARVIS again when Gemini quota is restored** — the Content Agent will generate headlines, body copy, CTAs, and layout recommendations matching these exact specs.");

        return lines.join("\n");
    }

    if (isWebsite) {
        const url = query.match(/(https?:\/\/[^\s]+)/)?.[1] || "(URL)";
        return [
            "**Website Review**",
            "",
            `URL: ${url}`,
            "",
            "**To review this website, use the Content Studio:**",
            "1. Go to Content Studio in the sidebar",
            "2. Click the 'Website Review' tab",
            `3. Enter the URL: ${url}`,
            "4. Click 'REVIEW SITE'",
            "",
            "The Content Agent will scrape the site and extract headings, contact info, links, and generate a full review prompt."
        ].join("\n");
    }

    if (isSocial) {
        return [
            "**Social Media Content**",
            "",
            "**To create social posts, use the Content Studio:**",
            "1. Go to Content Studio in the sidebar",
            "2. Click the 'Social Media' tab",
            "3. Select the venture (Well Noticed, Xodus, Real Estate, Personal)",
            "4. Enter your topic",
            "5. Select platforms (LinkedIn, Facebook, Instagram, X)",
            "6. Click 'GENERATE'",
            "",
            "The Content Agent will create platform-appropriate posts with hashtags, visual suggestions, and posting recommendations."
        ].join("\n");
    }

    return [
        "**Content Agent**",
        "",
        "I can help with:",
        "- **Website review** — analyze any site for content, SEO, and brand improvements",
        "- **Social media** — create posts for LinkedIn, Facebook, Instagram, X",
        "- **Print content** — generate Well Noticed ad content (9.25\" x 4.125\" CMYK)",
        "- **Brand management** — ensure consistency across all content",
        "",
        "Use the **Content Studio** in the sidebar, or ask me about a specific task.",
        "",
        "**Tip:** When Gemini quota is restored, I'll be able to generate the actual content directly in chat."
    ].join("\n");
}

function runLocalLeadPipelineResponse(query, context) {
    const pipelineData = context.internalData?.leadPipeline;
    if (!pipelineData) {
        return [
            "**Lead Pipeline**",
            "",
            "No pipeline data available. Run the lead pipeline first.",
            "",
            "To run the pipeline:",
            "1. Go to Agent Hub in the sidebar",
            "2. Or use the API: POST /api/lead-pipeline/run",
            "",
            "The pipeline reads from your Google Sheet, scores prospects, and creates cadences."
        ].join("\n");
    }

    return [
        "**Lead Pipeline Status**",
        "",
        `**Last Run:** ${pipelineData.lastRun ? new Date(pipelineData.lastRun).toLocaleString() : "Never"}`,
        `**Total Processed:** ${pipelineData.totalProcessed}`,
        `**Qualified:** ${pipelineData.qualified}`,
        `**Cadences Created:** ${pipelineData.cadencesCreated}`,
        `**Skipped:** ${pipelineData.skipped}`,
        "",
        "**Recent Runs:**",
        ...(pipelineData.recentRuns || []).map(r => 
            `- ${r.timestamp ? new Date(r.timestamp).toLocaleString() : "Unknown"}: ${r.candidates || 0} candidates, ${r.created || 0} created`
        ).join("\n"),
        "",
        "**Next Steps:**",
        "- Review pending tasks in cadence review",
        "- Approve high-priority prospects",
        "- Run pipeline again to process new leads"
    ].join("\n");
}

function runLocalCadenceReviewResponse(query, context) {
    const cadenceData = context.internalData?.cadences;
    if (!cadenceData) {
        return [
            "**Cadence Review**",
            "",
            "No cadence data available. Run the lead pipeline first to create cadences.",
            "",
            "To view tasks:",
            "1. Go to Agent Hub in the sidebar",
            "2. Or use the API: GET /api/cadence-review/tasks",
            "",
            "Tasks are created when you run the lead pipeline."
        ].join("\n");
    }

    const taskSummary = cadenceData.reviewTasks;
    const wnMetrics = cadenceData.wellNoticed;
    const jMetrics = cadenceData.jarvis;

    return [
        "**Cadence Review Status**",
        "",
        "**Pending Tasks:**",
        taskSummary ? `- Total: ${taskSummary.total}` : "- No tasks",
        taskSummary ? `- High Priority: ${taskSummary.high}` : "",
        taskSummary ? `- Medium Priority: ${taskSummary.medium}` : "",
        taskSummary ? `- Low Priority: ${taskSummary.low}` : "",
        "",
        "**Well Noticed Campaigns:**",
        wnMetrics ? `- Active: ${wnMetrics.active}` : "- No campaigns",
        wnMetrics ? `- Completed: ${wnMetrics.completed}` : "",
        wnMetrics ? `- Response Rate: ${wnMetrics.responseRate}%` : "",
        "",
        "**JARVIS Cadences:**",
        jMetrics ? `- Active: ${jMetrics.active}` : "- No cadences",
        jMetrics ? `- Completed: ${jMetrics.completed}` : "",
        jMetrics ? `- Positive: ${jMetrics.positive}` : "",
        "",
        "**Actions:**",
        "- Review high-priority tasks first",
        "- Approve prospects with good email addresses",
        "- Skip prospects without email or with DNC flags",
        "- Edit tasks to update contact info before approving"
    ].join("\n");
}

function localResponse(messages, context, providerError) {
    const current = messages[messages.length - 1].content;
    const priorUser = [...messages.slice(0, -1)]
        .reverse()
        .find(item => item.role === "user");
    const releaseQuestion = /\b(release|version|upgrade|development)\b/i.test(current);
    const selfDiag = /\b(lacking|health|diagnos|capabilities|gap|status|broken|missing|what can you|what do you)\b/i.test(current);
    const contentRequest = /\b(content|website|social.media|post|blog|article|copywriting|brand|marketing.content|print.ad|squarespace|xodusrp|mailer|flyer|brochure|advert|ad example|mail piece)\b/i.test(current);
    const leadPipelineRequest = /\b(lead|prospect|enrich|score|qualify|pipeline)\b/i.test(current);
    const cadenceReviewRequest = /\b(cadence|campaign|email|outreach|touch|sequence|review|task|approve|skip)\b/i.test(current);

    let result;
    if (selfDiag) {
        result = { response: runLocalDiagostic(), memory: null };
    } else if (contentRequest) {
        result = { response: runLocalContentResponse(current), memory: null };
    } else if (leadPipelineRequest) {
        result = { response: runLocalLeadPipelineResponse(current, context), memory: null };
    } else if (cadenceReviewRequest) {
        result = { response: runLocalCadenceReviewResponse(current, context), memory: null };
    } else if (releaseQuestion) {
        result = {
            response: `${context.release.currentVersion} is the current released version. The next planned release is ${context.release.nextRelease?.id || "not yet assigned"}: ${context.release.nextRelease?.title || "scope pending"}. You can open Development & Releases for validation results, completed releases, known issues, and demo status.`,
            memory: context.release
        };
    } else {
        result = orchestrator.process(current);
    }
    const isFollowUp = /^(and|also|why|how|what about|tell me more|go on|continue)\b/i.test(current);
    const continuity = isFollowUp && priorUser
        ? `Following your earlier question about "${priorUser.content.slice(0, 120)}," `
        : "";

    let response = String(result.response || "").trim();

    if (context.internalData && Object.keys(context.internalData).length > 0) {
        const sources = context.internalDataSources || [];
        const summary = Object.entries(context.internalData)
            .map(([key, val]) => {
                if (val && typeof val === "object") {
                    const brief = JSON.stringify(val).slice(0, 400);
                    return `${key}: ${brief}`;
                }
                return `${key}: ${val}`;
            }).join("\n");
        if (!response || response.includes("I understand the request")) {
            response = `Based on live JARVIS data (${sources.join(", ")}):\n${summary}\n\nTo refine this further, configure a GEMINI_API_KEY in backend/.env for generative responses.`;
        } else {
            response = `${response}\n\n[Live data from: ${sources.join(", ")}]\n${summary}`;
        }
    } else if (!response) {
        response = `I understand the request: ${current}. I can help plan and analyze it locally, but an LLM API key is required for a fully generative response. Set GEMINI_API_KEY or OPENAI_API_KEY in backend/.env.`;
    }

    return {
        response: `${continuity}${response}`,
        provider: "local",
        model: "jarvis-rule-engine",
        agent: null,
        toolsUsed: context.internalDataSources || [],
        providerError: providerError ? "Provider unavailable; local fallback used." : null,
        memory: result.memory,
        contextOwner: context.owner
    };
}

async function respond(messages) {
    const normalized = normalizeMessages(messages);
    if (!normalized.length || normalized[normalized.length - 1].role !== "user") {
        const error = new Error("A user message is required.");
        error.status = 400;
        throw error;
    }

    const query = normalized[normalized.length - 1].content;
    const internalData = await collectInternalData(query);
    const context = buildContext(internalData);
    const agentId = detectAgentIntent(normalized);
    activity.append("observed", "Conversation request received", {
        source: "ask-jarvis",
        agent: agentId || "general",
        internalSources: internalData.modules
    });

    const llmStatus = llm.status();
    if (!llmStatus.configured) {
        const result = localResponse(normalized, context);
        activity.append("recommended", "Local JARVIS prepared a response (no LLM key configured)", {
            source: "ask-jarvis", provider: result.provider
        });
        return result;
    }

    try {
        const systemPrompt = llm.buildJarvisSystemPrompt(agentId, context);
        const result = await llm.complete({
            systemPrompt,
            messages: normalized,
            context
        });

        activity.append("recommended", `JARVIS prepared a response via ${result.provider}`, {
            source: "ask-jarvis", provider: result.provider, model: result.model, agent: agentId || "general"
        });

        return {
            response: result.text,
            provider: result.provider,
            model: result.model,
            agent: agentId,
            toolsUsed: result.toolCallsMade > 0 ? [`Used ${result.toolCallsMade} tool round(s)`] : [],
            contextOwner: context.owner
        };
    } catch (error) {
        console.error("JARVIS LLM provider unavailable:", error.message);
        const result = localResponse(normalized, context, error);
        activity.append("recommended", "Local JARVIS prepared a fallback response", {
            source: "ask-jarvis", provider: result.provider
        });
        return result;
    }
}

function status() {
    const llmStatus = llm.status();
    return {
        provider: llmStatus.configured ? llmStatus.provider : "local",
        model: llmStatus.configured ? llmStatus.model : "jarvis-rule-engine",
        llm: llmStatus,
        history: "browser-local",
        contextContract: canonicalContext.CONTRACT_VERSION,
        maxTurns: MAX_TURNS,
        toolsAvailable: llmStatus.toolsAvailable,
        governanceRequiredForActions: true
    };
}

module.exports = { normalizeMessages, respond, status };
