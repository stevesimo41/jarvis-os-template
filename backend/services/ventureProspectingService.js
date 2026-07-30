const crypto = require("crypto");
const path = require("path");
const activity = require("../brain/activityService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const emailService = require("./emailService");
const approvals = require("../governance/approvalService");
const validation = require("./prospectValidationService");

const GENERIC_DOMAIN_KEYWORDS = ["google", "facebook", "yelp", "github", "linkedin", "twitter", "instagram", "pinterest", "yellowpages", "manta", "bbb", "chamber", "nextdoor", "tripadvisor", "blog", "wordpress", "wix", "squarespace", "medium", "hubspot", "clutch", "capterra", "g2", "softwareadvice", "getapp", "trustpilot", "sitejabber"];

const NON_COMPANY_PATH_PATTERNS = /\/(blog|article|news|directory|listing|review|jobs?|careers?|top|best|list|forum|wiki|category|tag|author|locations?|services?)\b/i;

async function readActiveCategories() {
    const GoogleSheetsProvider = require("../providers/googleSheetsProvider");
    const CrmSheetRepository = require("../repositories/crmSheetRepository");
    const provider = new GoogleSheetsProvider();
    await provider.connect();
    const repo = new CrmSheetRepository(provider);
    const prospects = await repo.getEntity("prospects");
    if (!prospects || prospects.length === 0) return [];

    const closed = new Set();
    const allPairs = new Map();

    for (const p of prospects) {
        const mc = (p["Master-Category"] || "").trim();
        const sc = (p["Sub-Category Name"] || "").trim();
        const ps = (p["Prospect, Customer, Term"] || "").trim();
        if (!mc || !sc) continue;

        const key = `${mc}||${sc}`;
        if (!allPairs.has(key)) {
            allPairs.set(key, { masterCategory: mc, subCategory: sc });
        }
        if (ps.toLowerCase() === "customer") {
            closed.add(key);
        }
    }

    const active = [];
    for (const [key, cat] of allPairs) {
        if (!closed.has(key)) {
            active.push(cat);
        }
    }

    return active;
}

function generateSearchQueries(categories) {
    const seen = new Set();
    const queries = [];
    for (const cat of categories) {
        const query = `${cat.subCategory} Columbus Ohio`;
        const key = query.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            queries.push({ query, masterCategory: cat.masterCategory, subCategory: cat.subCategory });
        }
    }
    return queries;
}

async function searchByCategoryQueries(queries, options = {}) {
    const webResearch = require("./webResearch");
    const discovered = [];
    const maxPerQuery = options.maxPerQuery || 3;

    for (const q of queries) {
        const { query, masterCategory, subCategory } = q;
        try {
            const results = await webResearch.searchWeb(query);
            for (const result of (results || []).slice(0, maxPerQuery)) {
                const name = extractCompanyName(result);
                if (!name) continue;
                discovered.push({
                    name,
                    masterCategory: masterCategory || "",
                    subCategory: subCategory || "",
                    source: "web-search",
                    sourceUrl: result.url,
                    snippet: result.snippet || "",
                    query,
                    discoveredAt: new Date().toISOString()
                });
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            activity.append("observed", `Venture prospecting query failed: ${query}`, { source: "venture-prospecting", error: error.message });
        }
    }

    return discovered;
}

function extractCompanyName(result) {
    const title = (result.title || "").trim();
    const url = (result.url || "").trim();
    if (!title || title.length < 3 || !url) return null;

    if (/^\d+\s+(best|top|list|directory|review|companies|contractors|agencies)/i.test(title)) return null;
    if (/(jobs?|hiring|careers?)\s+(in|at|near)\b/i.test(title)) return null;

    try {
        const parsed = new URL(url);
        const pn = parsed.pathname.replace(/\/+$/, "");
        const pathSegments = pn.split("/").filter(Boolean);

        if (pathSegments.length > 2) return null;
        if (NON_COMPANY_PATH_PATTERNS.test(pn)) return null;

        const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
        if (GENERIC_DOMAIN_KEYWORDS.some(d => hostname.includes(d))) return null;
        if (/\b(reviews?|blog|directory|wiki|forum|listings?)\b/.test(hostname)) return null;

        const parts = title.split(/ [-–|·] /);
        let name = (parts[0] || "").trim();

        if (validation.isPlaceholderName(name)) return null;

        const descriptionPattern = /\b(services?|agency|consulting|solutions?|audits?|consultants?|company|marketing|seo|crm|automation|optimization|implementation)\b/i;
        if (descriptionPattern.test(name)) {
            if (parts.length > 1) {
                const second = parts[1].trim();
                if (second.length >= 3 && !descriptionPattern.test(second) && !/^(in|for|near|at|and|of|the|a)\b/i.test(second)) {
                    return second;
                }
            }
            return null;
        }

        if (name.length < 3) return null;
        if (/\.\.\./.test(name) || /&\s*(amp;)?$/.test(name)) return null;
        if (/\b(?:in|near|for)\s+(Columbus|Ohio|Central\s*Ohio)\b/i.test(name)) return null;
        if (/^(?:Real Estate|Home Inspector|Home Inspection|Professional|Residential|Commercial)\b/i.test(name)) return null;
        name = name.replace(/^Welcome to\s+/i, "").trim();
        if (name.length < 3) return null;
        return name;
    } catch {
        return null;
    }
}

const SERVICES = [
    {
        id: "visibility-audit",
        title: "AI & Media Visibility Audit",
        priority: 1,
        targetCustomer: "established local businesses depending on reputation and search visibility",
        searchQueries: [
            "roofing contractor Columbus Ohio",
            "kitchen remodeling Columbus Ohio",
            "home builder Columbus Ohio",
            "HVAC company Columbus Ohio",
            "plumber Columbus Ohio",
            "law firm Columbus Ohio",
            "dental practice Columbus Ohio",
            "medical practice Columbus Ohio",
            "real estate agent Columbus Ohio",
            "home inspector Columbus Ohio",
            "landscaping company Columbus Ohio",
            "cleaning service Columbus Ohio"
        ],
        painPoints: ["inconsistent online presence", "losing to competitors in search", "no Google review strategy", "invisible to AI-powered search"],
        valueProp: "fixed-fee visibility audit combining earned-media positioning, website evidence, and AI-discovery readiness"
    },
    {
        id: "ai-readiness-sprint",
        title: "AI Readiness Sprint",
        priority: 2,
        targetCustomer: "owner-led businesses wanting practical AI adoption",
        searchQueries: [
            "accounting firm Columbus Ohio",
            "insurance agency Columbus Ohio",
            "property management Columbus Ohio",
            "construction company Columbus Ohio",
            "manufacturing company Columbus Ohio",
            "logistics company Columbus Ohio",
            "financial advisor Columbus Ohio",
            "real estate agency Columbus Ohio",
            "architecture firm Columbus Ohio",
            "engineering firm Columbus Ohio"
        ],
        painPoints: ["manual repetitive tasks", "no data strategy", "competitors using AI", "owner spending time on low-value work"],
        valueProp: "practical AI adoption roadmap that identifies 3-5 high-value workflows and delivers a 30-day implementation plan"
    },
    {
        id: "crm-cleanup-sprint",
        title: "CRM Cleanup & Intelligence Sprint",
        priority: 3,
        targetCustomer: "service businesses with messy contact data and unclear follow-up",
        searchQueries: [
            "home services company Columbus Ohio",
            "insurance agency Columbus Ohio",
            "real estate agency Columbus Ohio",
            "property management Columbus Ohio",
            "medical practice Columbus Ohio",
            "legal practice Columbus Ohio",
            "financial advisor Columbus Ohio",
            "consulting firm Columbus Ohio"
        ],
        painPoints: ["scattered contact lists", "leads falling through cracks", "no follow-up system", "unclear pipeline visibility"],
        valueProp: "one-week cleanup, prioritization, and next-action package that stops revenue leaks from disorganized data"
    }
];

function statePath() {
    return process.env.JARVIS_VENTURE_PROSPECTING_STATE_PATH || path.join(__dirname, "../data/agents/venture-prospecting-state.json");
}

function loadState() {
    return readJson(statePath(), {
        runs: [],
        prospects: [],
        outreachDrafts: [],
        sentMessages: [],
        enrichments: []
    });
}

function saveState(state) {
    return writeJsonAtomic(statePath(), state);
}

function matchService(prospect) {
    const text = `${prospect.name || ""} ${prospect.snippet || ""} ${prospect.description || ""} ${prospect.category || ""} ${prospect.title || ""}`.toLowerCase();

    const scores = SERVICES.map(service => {
        let score = 0;
        const keywords = service.searchQueries.join(" ").toLowerCase().split(" ");
        const uniqueKeywords = [...new Set(keywords)].filter(w => w.length > 3);
        for (const kw of uniqueKeywords) {
            if (text.includes(kw)) score += 2;
        }
        for (const pain of service.painPoints) {
            const painWords = pain.toLowerCase().split(" ");
            if (painWords.some(pw => text.includes(pw))) score += 3;
        }
        return { service, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].score > 0 ? scores[0].service : SERVICES[2];
}

function generateSubject(prospect, service) {
    const templates = [
        `Quick question about ${prospect.name || "your business"}'s ${service.id === "visibility-audit" ? "online presence" : service.id === "crm-cleanup-sprint" ? "follow-up system" : "AI readiness"}`,
        `${prospect.name || "Your team"} — ${service.title} opportunity`,
        `Idea for ${prospect.name || "your business"}: ${service.title}`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateBody(prospect, service, contactName) {
    const name = prospect.name || "your business";
    const firstName = contactName ? contactName.split(" ")[0] : "there";
    const city = prospect.city || "Columbus";

    const bodies = {
        "ai-readiness-sprint": `Hi ${firstName},

I noticed ${name} in ${city} — looks like you're building something solid.

I'm putting together AI Readiness Sprints for owner-led businesses in Central Ohio. The concept: I spend a day mapping your operations, identify 3-5 workflows where AI saves real time or money, then deliver a prioritized 30-day implementation plan.

No long contracts, no enterprise software. Just clarity on where AI actually helps vs. where it's hype.

Would a 20-minute call make sense to see if there's a fit? I'm booking a few conversations this month.

[Your Name]
[Your Company]`,

        "crm-cleanup-sprint": `Hi ${firstName},

I came across ${name} and had a thought — how consistent is your follow-up system?

I'm offering CRM Cleanup Sprints for Central Ohio service businesses. In one week, I take your existing contact data, clean it up, prioritize your hottest leads, and set up a next-action system so nothing falls through the cracks.

Most businesses I talk to are sitting on revenue they're not capturing because the follow-up process is manual or nonexistent.

Worth a quick conversation? I can share what the output looks like.

[Your Name]
[Your Company]`,

        "visibility-audit": `Hi ${firstName},

I was looking at ${name}'s online presence and had an idea worth sharing.

I'm running Visibility Audits for established Central Ohio businesses — essentially a deep dive into how you appear across Google, search results, AI-powered discovery, and earned media. You get a clear report with specific fixes.

Most businesses are surprised by the gaps. One restaurant owner found three different versions of his hours across platforms.

Would it be useful to see what your visibility score looks like? Happy to do a quick 15-minute walkthrough.

[Your Name]
[Your Company]`
    };

    return bodies[service.id] || bodies["visibility-audit"];
}

async function searchForProspects(service, options = {}) {
    const webResearch = require("./webResearch");
    const discovered = [];
    const maxPerQuery = options.maxPerQuery || 3;

    for (const query of service.searchQueries) {
        try {
            const results = await webResearch.searchWeb(query);
            for (const result of (results || []).slice(0, maxPerQuery)) {
                const name = extractCompanyName(result);
                if (!name) continue;
                discovered.push({
                    name,
                    source: "web-search",
                    sourceUrl: result.url,
                    snippet: result.snippet || "",
                    query,
                    discoveredAt: new Date().toISOString(),
                    serviceId: service.id,
                    serviceTitle: service.title
                });
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            activity.append("observed", `Venture prospecting query failed: ${query}`, { source: "venture-prospecting", error: error.message });
        }
    }

    return discovered;
}

function isDuplicate(name, existingProspects) {
    const normalized = name.toLowerCase().trim();
    return existingProspects.some(p => {
        const existing = (p.name || "").toLowerCase().trim();
        return existing === normalized || existing.includes(normalized) || normalized.includes(existing);
    });
}

function scoreProspect(prospect, service) {
    let score = 0;
    const text = `${prospect.name || ""} ${prospect.snippet || ""} ${prospect.description || ""}`.toLowerCase();

    if (text.includes("columbus") || text.includes("ohio") || text.includes("central ohio")) score += 25;
    if (text.includes("dublin") || text.includes("westerville") || text.includes("upper arlington") || text.includes("new albany") || text.includes("powell") || text.includes("bexley")) score += 10;

    const serviceKeywords = service.searchQueries.join(" ").toLowerCase().split(" ");
    for (const kw of [...new Set(serviceKeywords)].filter(w => w.length > 4)) {
        if (text.includes(kw)) score += 3;
    }

    if (prospect.sourceUrl) score += 5;
    if (text.includes("contact") || text.includes("email") || text.includes("phone")) score += 5;

    const grade = score >= 40 ? "high" : score >= 25 ? "medium" : "low";
    return { score, grade };
}

async function runProspecting(options = {}) {
    const current = loadState();
    const actor = options.actor || "venture-prospecting-agent";
    const allProspects = current.prospects;
    const escalations = require("./agentEscalationService");
    const jarvisOpps = require("../agents/jarvisOpportunitiesService");

    let discovered = [];
    let usedSheetCategories = false;
    let activeCategoryCount = 0;
    let servicesSearched = 0;

    try {
        const categories = await readActiveCategories();
        if (categories.length > 0) {
            const queries = generateSearchQueries(categories);
            activeCategoryCount = categories.length;
            servicesSearched = queries.length;
            discovered = await searchByCategoryQueries(queries, { maxPerQuery: 5 });
            usedSheetCategories = true;
        }
    } catch (error) {
        activity.append("observed", "Failed to load categories from CRM sheet, using hardcoded queries", {
            source: "venture-prospecting", error: error.message
        });
    }

    if (!usedSheetCategories) {
        const targetServiceId = options.serviceId || null;
        const servicesToSearch = targetServiceId
            ? SERVICES.filter(s => s.id === targetServiceId)
            : SERVICES.sort((a, b) => a.priority - b.priority);
        servicesSearched = servicesToSearch.length;

        for (const service of servicesToSearch) {
            const results = await searchForProspects(service, { maxPerQuery: service.priority === 1 ? 5 : 3 });
            discovered.push(...results);
        }
    }

    const seenNames = new Set();
    const seenUrls = new Set();
    const newProspects = discovered.filter(d => {
        if (isDuplicate(d.name, allProspects)) return false;
        const normName = d.name.toLowerCase().trim();
        const normUrl = (d.sourceUrl || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase();
        if (seenNames.has(normName) || seenUrls.has(normUrl)) return false;
        seenNames.add(normName);
        seenUrls.add(normUrl);
        return true;
    });

    const scored = newProspects.map(p => {
        const service = matchService(p);
        const { score, grade } = scoreProspect(p, service);
        return { ...p, fitScore: score, fitGrade: grade, matchedService: service };
    });

    const qualified = scored.filter(p => p.fitScore >= 20);

    for (const prospect of qualified) {
        const serviceName = prospect.matchedService?.title || "Digital Visibility Audit";
        const approvalRequest = approvals.requestApproval({
            action: "market_pulse_opportunity",
            ventureId: "well-noticed",
            organizationId: null,
            requestedBy: actor,
            context: {
                type: "market-opportunity",
                prospect: {
                    name: prospect.name,
                    sourceUrl: prospect.sourceUrl,
                    snippet: prospect.snippet,
                    city: prospect.city || "Columbus",
                    state: prospect.state || "OH",
                    fitScore: prospect.fitScore,
                    fitGrade: prospect.fitGrade,
                    category: prospect.masterCategory || "",
                    executiveName: "",
                    executiveTitle: "",
                    email: "",
                    phone: "",
                    enrichment: {}
                },
                opportunity: {
                    capability: serviceName,
                    pitch: prospect.matchedService?.valueProp || "",
                    service: serviceName,
                    sourceUrl: prospect.sourceUrl,
                    marketSignal: `Matched to: ${serviceName} (Score: ${prospect.fitScore}/${prospect.fitGrade}). Source: ${prospect.source}`
                },
                note: `MPO: ${prospect.name} — ${serviceName} (Score: ${prospect.fitScore})`
            }
        });

        const prospectRecord = {
            id: crypto.randomUUID(),
            name: prospect.name,
            masterCategory: prospect.masterCategory || "",
            subCategory: prospect.subCategory || "",
            sourceUrl: prospect.sourceUrl,
            snippet: prospect.snippet,
            source: prospect.source,
            query: prospect.query,
            fitScore: prospect.fitScore,
            fitGrade: prospect.fitGrade,
            serviceId: prospect.matchedService.id,
            serviceTitle: prospect.matchedService.title,
            servicePriority: prospect.matchedService.priority,
            city: prospect.city || "Columbus",
            status: "pending-approval",
            approvalId: approvalRequest.id,
            discoveredAt: prospect.discoveredAt,
            actor
        };
        current.prospects.push(prospectRecord);

        try {
            escalations.raise("venture-prospecting", "opportunity",
                `New ${prospect.matchedService.title} prospect: ${prospect.name}`,
                {
                    prospectId: prospectRecord.id,
                    name: prospect.name,
                    service: prospect.matchedService.title,
                    fitScore: prospect.fitScore,
                    city: prospect.city || "Columbus",
                    sourceUrl: prospect.sourceUrl,
                    approvalId: approvalRequest.id
                },
                prospect.fitGrade === "high" ? "high" : "info"
            );
        } catch (_e) { /* escalation already exists */ }

        try {
            jarvisOpps.addOpportunity({
                title: `${prospect.matchedService.title} — ${prospect.name}`,
                description: `${prospect.matchedService.valueProp}. ${prospect.snippet || ""}`.slice(0, 500),
                ventureId: "venture-revenue",
                category: prospect.matchedService.id,
                confidence: prospect.fitGrade === "high" ? 80 : prospect.fitGrade === "medium" ? 60 : 40,
                evidence: [`Discovered via ${prospect.source}: ${prospect.query}`, `Fit score: ${prospect.fitScore} (${prospect.fitGrade})`, `City: ${prospect.city || "Columbus"}`],
                sourceUrl: prospect.sourceUrl,
                status: "discovered"
            });
        } catch (_e) { /* opp already exists or service unavailable */ }
    }

    const run = {
        id: crypto.randomUUID(),
        runAt: new Date().toISOString(),
        actor,
        source: usedSheetCategories ? "sheet-categories" : "hardcoded-queries",
        activeCategoryCount,
        servicesSearched,
        totalDiscovered: discovered.length,
        newProspects: newProspects.length,
        qualified: qualified.length,
        pendingApproval: qualified.length,
        byService: SERVICES.map(s => ({
            serviceId: s.id,
            title: s.title,
            priority: s.priority,
            discovered: scored.filter(d => d.matchedService.id === s.id).length
        }))
    };

    current.runs.push(run);
    current.runs = current.runs.slice(-50);
    saveState(current);

    activity.append("prepared", `Venture Prospecting (${usedSheetCategories ? "category-driven" : "hardcoded"}): ${qualified.length} prospects discovered, pending approval.`, {
        source: "venture-prospecting",
        runId: run.id,
        discovered: discovered.length,
        qualified: qualified.length,
        activeCategories: activeCategoryCount || "fallback"
    });

    return run;
}

function generateDraft(prospectId, contactName) {
    const current = loadState();
    const prospect = current.prospects.find(p => p.id === prospectId);
    if (!prospect) throw new Error("Prospect not found");

    const service = SERVICES.find(s => s.id === prospect.serviceId) || SERVICES[2];
    const subject = generateSubject(prospect, service);
    const body = generateBody(prospect, service, contactName || "there");

    const draft = {
        id: crypto.randomUUID(),
        prospectId,
        prospectName: prospect.name,
        serviceId: service.id,
        serviceTitle: service.title,
        subject,
        body,
        contactName: contactName || "",
        status: "draft",
        generatedAt: new Date().toISOString()
    };

    current.outreachDrafts.push(draft);
    current.outreachDrafts = current.outreachDrafts.slice(-100);
    saveState(current);

    return draft;
}

function approveDraft(draftId, actor) {
    const current = loadState();
    const draft = current.outreachDrafts.find(d => d.id === draftId);
    if (!draft) throw new Error("Draft not found");
    if (draft.status !== "draft") throw new Error("Draft is not in draft status");

    draft.status = "approved";
    draft.approvedAt = new Date().toISOString();
    draft.approvedBy = actor;
    saveState(current);

    return draft;
}

async function sendDraft(draftId, actor) {
    const current = loadState();
    const draft = current.outreachDrafts.find(d => d.id === draftId);
    if (!draft) throw new Error("Draft not found");
    if (draft.status !== "approved") throw new Error("Draft must be approved before sending");

    const prospect = current.prospects.find(p => p.id === draft.prospectId);
    if (!prospect) throw new Error("Prospect not found");
    if (validation.isPlaceholderName(prospect.name)) {
        throw new Error(`Cannot send: company name is invalid ("${prospect.name || '(empty)'}"). Enrich the prospect first.`);
    }

    const toEmail = prospect?.email || prospect?.contactEmail;
    if (!toEmail) throw new Error("No email address found for this prospect. Enrich the prospect first.");

    const domainMatch = validation.companyMatchesEmailDomain(prospect.name, toEmail);
    if (!domainMatch.valid) {
        activity.append("observed", `Email domain mismatch warning for ${prospect.name}: ${domainMatch.reason}`, {
            source: "venture-prospecting",
            prospectName: prospect.name,
            email: toEmail,
            warning: domainMatch.reason
        });
    }

    try {
        await emailService.sendEmail(toEmail, draft.subject, draft.body);

        draft.status = "sent";
        draft.sentAt = new Date().toISOString();
        draft.sentBy = actor;

        if (prospect) {
            prospect.status = "sent";
            prospect.sentAt = draft.sentAt;
        }

        current.sentMessages.push({
            id: draft.id,
            prospectId: draft.prospectId,
            prospectName: draft.prospectName,
            serviceId: draft.serviceId,
            subject: draft.subject,
            sentAt: draft.sentAt,
            sentBy: actor
        });

        saveState(current);

        activity.append("prepared", `Venture outreach sent to ${draft.prospectName} for ${draft.serviceTitle}`, {
            source: "venture-prospecting",
            draftId,
            prospectName: draft.prospectName,
            service: draft.serviceTitle
        });

        return draft;
    } catch (error) {
        draft.status = "send-failed";
        draft.sendError = error.message;
        saveState(current);
        throw error;
    }
}

function status() {
    const current = loadState();
    const byStatus = {};
    for (const p of current.prospects) {
        const s = p.status || "unknown";
        byStatus[s] = (byStatus[s] || 0) + 1;
    }

    return {
        agent: { id: "venture-prospecting", name: "Venture Prospecting Agent", version: "1.0" },
        services: SERVICES.map(s => ({ id: s.id, title: s.title })),
        metrics: {
            totalProspects: current.prospects.length,
            totalRuns: current.runs.length,
            totalDrafts: current.outreachDrafts.length,
            totalSent: current.sentMessages.length,
            byStatus,
            lastRunAt: current.runs.length > 0 ? current.runs[current.runs.length - 1].runAt : null
        },
        recentRuns: current.runs.slice(-5).reverse(),
        pendingApproval: current.prospects.filter(p => p.status === "pending-approval").slice(-20),
        drafts: current.outreachDrafts.filter(d => ["draft", "approved"].includes(d.status)).slice(-20),
        sentMessages: current.sentMessages.slice(-10).reverse()
    };
}

module.exports = { SERVICES, runProspecting, generateDraft, approveDraft, sendDraft, status, loadState };
