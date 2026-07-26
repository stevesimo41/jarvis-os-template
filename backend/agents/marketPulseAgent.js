const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const activity = require("../brain/activityService");
const approvalService = require("../governance/approvalService");
const RSSParser = require("rss-parser");
const parser = new RSSParser({
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
});

const RSS_FEEDS = [
    { url: "https://news.google.com/rss/search?q=marketing+agency+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Marketing", label: "Google News: Marketing Columbus" },
    { url: "https://news.google.com/rss/search?q=new+business+startup+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "New Business", label: "Google News: New Business Columbus" },
    { url: "https://news.google.com/rss/search?q=hiring+small+business+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Hiring", label: "Google News: Hiring Columbus" },
    { url: "https://news.google.com/rss/search?q=web+design+agency+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Web Design", label: "Google News: Web Design Columbus" },
    { url: "https://news.google.com/rss/search?q=social+media+marketing+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Social Media", label: "Google News: Social Media Columbus" },
    { url: "https://news.google.com/rss/search?q=SEO+services+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "SEO", label: "Google News: SEO Columbus" },
    { url: "https://news.google.com/rss/search?q=email+marketing+automation+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Email Marketing", label: "Google News: Email Marketing Columbus" },
    { url: "https://news.google.com/rss/search?q=video+production+commercial+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Video Production", label: "Google News: Video Production Columbus" },
    { url: "https://news.google.com/rss/search?q=print+advertising+design+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Print Advertising", label: "Google News: Print Advertising Columbus" },
    { url: "https://news.google.com/rss/search?q=branding+graphic+design+Columbus+Ohio&hl=en-US&gl=US&ceid=US:en", category: "Design", label: "Google News: Design Columbus" }
];

const JARVIS_CAPABILITIES = [
    "Marketing Strategy", "Web Design & Development", "Social Media Management",
    "SEO & Local Search", "Email Marketing & Automation", "Print Advertising Design",
    "CRM & Customer Management", "Content Creation", "Brand Identity",
    "Business Consulting", "Revenue Pipeline Design", "AI/Automation Solutions",
    "Recovery Community Platform", "Event Management", "Video Production"
];

function statePath() {
    return process.env.JARVIS_MARKET_PULSE_STATE ||
        path.join(__dirname, "../data/agents/market-pulse-state.json");
}

function loadState() {
    return readJson(statePath(), {
        findings: [],
        runs: [],
        lastRunAt: null,
        totalRuns: 0
    });
}

function saveState(state) {
    return writeJsonAtomic(statePath(), state);
}

function scoreCapabilityMatch(category, text) {
    const combined = `${category} ${text || ""}`.toLowerCase();
    let matches = 0;
    const matchedCapabilities = [];
    const keywords = {
        "Marketing": ["marketing", "brand", "advertising", "campaign", "outreach"],
        "Web Design": ["website", "web design", "landing page", "online presence", "site"],
        "Social Media": ["social media", "instagram", "facebook", "linkedin", "tiktok", "content"],
        "SEO": ["seo", "search engine", "google ranking", "local search", "google business"],
        "Email Marketing": ["email", "newsletter", "automation", "drip", "campaign"],
        "Print Advertising": ["print", "flyer", "brochure", "mail", "postcard", "ad design"],
        "New Business": ["new business", "startup", "llc", "filing", "launch", "opening", "grand opening"],
        "Hiring": ["hiring", "job posting", "looking for", "need", "recruiting", "staff", "employee"],
        "Consulting": ["consultant", "advisor", "strategy", "business plan", "operations"],
        "Video Production": ["video", "commercial", "promo", "filming", "production"],
        "Design": ["design", "creative", "visual", "branding", "logo"]
    };

    for (const [cap, words] of Object.entries(keywords)) {
        if (words.some(w => combined.includes(w))) {
            matches++;
            matchedCapabilities.push(cap);
        }
    }

    const rawScore = Math.min(10, Math.round((matches / 2) * 10));
    return { score: rawScore, matchedCapabilities, matches };
}

const NOISE_PATTERNS = [
    /obituary|obit\.|funeral|memorial|passed away|death notice/i,
    /meet\s+\w+\s+\w+\s*[-–]/i,
    /spotlight:\s*\w+/i,
    /gets?\s+(?:graphic|new)\s+(?:design|position|job|role)/i,
    /senior\s+spotlight/i,
    /trustee\s+meeting/i,
    /township\s+(?:trustee|meeting|board)/i,
    /bargain\s+hunter/i,
    /event[s]?\s*[-–:]\s*(?:walnut|holmes|franklin)/i,
    /win(?:s|ner|ning)?\s+(?:a|the)\s+(?:prize|award|contest|competition|scholarship)/i,
    /scholarship\s+(?:winner|recipient|awarded)/i,
    /named?\s+(?:to|as|chief|vp|director|officer)/i,
    /promoted?\s+to/i,
    /joins?\s+(?:as|the|board|team)/i,
    /hired?\s+as/i,
    /luring\s+californians/i,
    /uni\s*watch/i,
    /daily\s+heller/i,
    /outsider\s+art/i,
    /game-day\s+posters?/i,
    /artist\s+(?:behind|collin|williams)/i,
    /spreads?\s+joy/i,
    /cozy\s+designs?/i,
    /eugenia\s+hoster/i,
    /holmes\s+county/i,
    /meet\s+the\s+artist/i,
    /obituary.*dignity\s+memorial/i,
    /xavier\s+university/i,
    /senior\s+spotlight.*xavier/i,
    /top\s+\d+.*(?:agency|firm|company)/i,
    /best\s+of\s+(?:business|20)/i,
    /indispensable\s+\w+\s+tools/i,
    /wins?\s+\d+\s+marketing\s+awards?/i,
    /honors?|honored|celebrates?|50\s+years?/i,
    /(?:red\s+cross|nationwide|re\/max)\s+(?:honors?|welcomes?|adds?)/i,
    /(?:american|ohio)\s+red\s+cross/i,
    /board\s+member/i,
    /new\s+board\s+member/i,
    /supply\s+program/i,
    /approved\s+supplier/i
];

const IRRELEVANT_TITLE_PATTERNS = [
    /^meet\s+\w+/i,
    /^interview\s+with/i,
    /^q&a\s+with/i,
    /^profile:\s*/i,
    /^\d+\s+(?:best|top|ways|tips|things)/i,
    /^how\s+(?:\w+\s+){0,3}(?:is|are|can|will|was)/i,
    /^what\s+(?:\w+\s+){0,3}(?:means|says|thinks)/i,
    /obituary|funeral|memorial|passed away/i,
    /inside\s+(?:\w+'s|the)\s+(?:new|big)/i,
    /craft.*brand/i,
    /abundance.*craft/i
];

const ACTIONABLE_SIGNALS = [
    /launch(?:es|ing|ed)?\s+(?:new|their|a|the)/i,
    /open(?:s|ing|ed)?\s+(?:new|their|a|the)/i,
    /expand(?:s|ing|ed)?\s+(?:their|into|to|operations)/i,
    /hire(?:s|ing|ed)?\s+(?:a|an|for|team)/i,
    /look(?:ing)?\s+for\s+(?:a|an|help|services|agency|partner)/i,
    /need(?:s)?\s+(?:help|services|marketing|website|design|a)/i,
    /win(?:s|ning)?\s+(?:new|contract|deal|client|customer)/i,
    /rais(?:es|ing|ed)?\s+(?:\$|funding|capital|million)/i,
    /acqui(?:res|ring|red|sition)/i,
    /partner(?:s|ing|ed)?\s+with/i,
    /rebrand(?:s|ing|ed)?/i,
    /redesign(?:s|ing|ed)?/i,
    /new\s+(?:website|brand|identity|campaign|product|service)/i,
    /startup\s+(?:raises?|launches?|secures?)/i,
    /(?:company|agency|firm)\s+(?:launches?|opens?|expands?|announces?)/i,
    /(?:million|billion)\s+(?:deal|contract|investment|funding)/i,
    /small\s+business\s+(?:grant|funding|loan|program)/i,
    /columbus\s+(?:company|business|startup|firm)/i,
    /central\s+ohio\s+(?:company|business|startup|firm)/i
];

function isNoise(title, snippet) {
    const combined = `${title} ${snippet || ""}`;
    return NOISE_PATTERNS.some(p => p.test(combined));
}

function isIrrelevantTitle(title) {
    return IRRELEVANT_TITLE_PATTERNS.some(p => p.test(title));
}

function hasActionableSignal(title, snippet) {
    const combined = `${title} ${snippet || ""}`;
    return ACTIONABLE_SIGNALS.some(p => p.test(combined));
}

function isColumbusSpecific(title, snippet) {
    const combined = `${title} ${snippet || ""}`.toLowerCase();
    return /\b(columbus|central\s+ohio|ohio\s+(?:company|business|startup|firm)|columbus\s+(?:area|metro|region))\b/i.test(combined);
}

function calculateQualityScore(category, title, snippet) {
    const combined = `${title} ${snippet || ""}`;

    if (isNoise(title, snippet)) return { score: 0, quality: "noise", reasons: ["noise-pattern"] };
    if (isIrrelevantTitle(title)) return { score: 0, quality: "irrelevant", reasons: ["irrelevant-title"] };

    const { score: rawScore, matchedCapabilities, matches } = scoreCapabilityMatch(category, combined);

    let adjustedScore = rawScore;
    const reasons = [];

    if (isColumbusSpecific(title, snippet)) {
        adjustedScore += 3;
        reasons.push("columbus-specific");
    }

    if (hasActionableSignal(title, snippet)) {
        adjustedScore += 2;
        reasons.push("actionable-signal");
    }

    const age = snippet || "";
    if (/202[4-5]/.test(age) && !/2026/.test(age)) {
        adjustedScore -= 3;
        reasons.push("old-content");
    }

    const finalScore = Math.max(0, Math.min(10, adjustedScore));
    const quality = finalScore >= 7 ? "high" : finalScore >= 4 ? "medium" : "low";

    return {
        score: finalScore,
        quality,
        reasons,
        matchedCapabilities,
        matches,
        isColumbus: isColumbusSpecific(title, snippet),
        isActionable: hasActionableSignal(title, snippet)
    };
}

function deduplicateFindings(findings) {
    const seen = new Map();
    for (const f of findings) {
        const key = (f.title || "").toLowerCase().slice(0, 80);
        if (!seen.has(key)) {
            seen.set(key, f);
        } else {
            const existing = seen.get(key);
            const existingScore = existing.quality === "high" ? (existing.score || 0) + 5 : (existing.score || 0);
            const newScore = f.quality === "high" ? (f.score || 0) + 5 : (f.score || 0);
            if (newScore > existingScore) {
                seen.set(key, f);
            }
        }
    }
    return [...seen.values()];
}

async function fetchFeed(feed) {
    try {
        const rss = await parser.parseURL(feed.url);
        return (rss.items || []).slice(0, 10).map(item => {
            const title = item.title || "Untitled";
            const snippet = (item.contentSnippet || item.content || item.description || "").replace(/<[^>]*>/g, "").trim().slice(0, 300);
            const quality = calculateQualityScore(feed.category, title, snippet);

            return {
                id: `mp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                title: title.slice(0, 200),
                snippet,
                url: item.link || "",
                category: feed.category,
                source: feed.label,
                score: quality.score,
                quality: quality.quality,
                reasons: quality.reasons,
                matchedCapabilities: quality.matchedCapabilities || [],
                isColumbus: quality.isColumbus || false,
                isActionable: quality.isActionable || false,
                published: item.pubDate || item.isoDate || new Date().toISOString(),
                discoveredAt: new Date().toISOString()
            };
        }).filter(f => f.title !== "Untitled" && f.url && f.score > 0);
    } catch (e) {
        activity.append("observed", `Market Pulse RSS failed: ${feed.label}`, {
            source: "market-pulse-agent",
            error: e.message,
            feed: feed.label
        });
        return [];
    }
}

async function runMarketPulse(actor) {
    const state = loadState();
    const allFindings = [];

    const feedResults = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchFeed(feed))
    );

    for (const result of feedResults) {
        if (result.status === "fulfilled") {
            allFindings.push(...result.value);
        }
    }

    const deduped = deduplicateFindings(allFindings);
    const existingTitles = new Set(state.findings.map(f => f.title.toLowerCase().slice(0, 80)));
    const newFindings = deduped.filter(f =>
        !existingTitles.has(f.title.toLowerCase().slice(0, 80))
    );

    state.findings.push(...newFindings);
    state.findings = state.findings.slice(-200);
    state.lastRunAt = new Date().toISOString();
    state.totalRuns = (state.totalRuns || 0) + 1;
    state.runs.push({
        id: `run-${Date.now()}`,
        runAt: new Date().toISOString(),
        actor: actor || "scheduler",
        totalFound: allFindings.length,
        newFound: newFindings.length,
        categories: [...new Set(newFindings.map(f => f.category))]
    });
    state.runs = state.runs.slice(-50);

    saveState(state);

    activity.append("prepared", `Market Pulse scan: ${newFindings.length} new opportunities from ${RSS_FEEDS.length} feeds`, {
        source: "market-pulse-agent",
        totalFound: allFindings.length,
        newFound: newFindings.length,
        categories: [...new Set(newFindings.map(f => f.category))].join(", ")
    });

    return {
        totalFound: allFindings.length,
        newFound: newFindings.length,
        findings: newFindings,
        categories: [...new Set(newFindings.map(f => f.category))],
        runCount: state.totalRuns
    };
}

function getFindings(options) {
    const state = loadState();
    let findings = state.findings.slice().reverse();
    if (options?.category) {
        findings = findings.filter(f => f.category === options.category);
    }
    if (options?.minScore) {
        findings = findings.filter(f => (f.score || 0) >= options.minScore);
    }
    return findings.slice(0, Math.min(options?.limit || 50, 200));
}

function extractBusinessSignal(finding) {
    const title = (finding.title || "").toLowerCase();
    const snippet = (finding.snippet || "").toLowerCase();
    const combined = `${title} ${snippet}`;

    const businessPatterns = [
        /launch\w*\s+(?:new|their|a)/i,
        /opens?\s+(?:new|their|a)/i,
        /expand\w*\s+(?:their|into|to)/i,
        /hire\w*\s+(?:for|new|their)/i,
        /need\w*\s+(?:help|services|marketing|website|design)/i,
        /looking\s+for\s+(?:a|an|help|services)/i,
        /hiring\s+(?:a|an|for)/i,
        /wins?\s+(?:new|contract|deal|award)/i,
        /raises?\s+(?:\$|funding|capital)/i,
        /acquires?\s+/i,
        /partners?\s+with/i,
        /rebrands?\s+/i,
        /redesigns?\s+/i,
        /new\s+(?:website|brand|identity|campaign)/i
    ];

    let signalStrength = 0;
    const matchedPatterns = [];
    for (const pattern of businessPatterns) {
        if (pattern.test(combined)) {
            signalStrength++;
            matchedPatterns.push(pattern.source);
        }
    }

    const hasBusinessName = /[A-Z][a-z]+ (?:Co|LLC|Inc|Group|Agency|Studio|Partners|Collective)/.test(finding.title) ||
        /\b(?:company|agency|firm|studio|business)\b/i.test(snippet);

    if (hasBusinessName) signalStrength += 2;

    const relevanceScore = Math.min(10, Math.round(
        (finding.score || 0) * 0.4 +
        signalStrength * 2.5
    ));

    return {
        relevanceScore,
        signalStrength,
        matchedPatterns,
        hasBusinessName,
        isActionable: relevanceScore >= 5 && signalStrength >= 1
    };
}

function generateOutreachPackage(finding, signal) {
    const category = finding.category || "Business Services";
    const title = finding.title || "";
    const snippet = finding.snippet || "";

    const templates = {
        "Marketing": {
            capability: "Marketing Strategy & Campaign Design",
            pitch: `Based on recent market activity in Columbus, there's strong demand for ${category.toLowerCase()} services. We can help businesses build data-driven marketing strategies that convert.`,
            service: "Full-service marketing from strategy to execution"
        },
        "Web Design": {
            capability: "Web Design & Development",
            pitch: `The Columbus market shows businesses actively seeking web design and development services. We build conversion-focused websites that drive revenue.`,
            service: "Custom websites built for lead generation and conversions"
        },
        "Social Media": {
            capability: "Social Media Management",
            pitch: `Social media marketing demand is growing in Central Ohio. We manage end-to-end social presence that builds community and drives engagement.`,
            service: "Social media strategy, content creation, and community management"
        },
        "SEO": {
            capability: "SEO & Local Search Optimization",
            pitch: `Businesses in Columbus are competing for search visibility. We deliver local SEO that puts businesses in front of ready-to-buy customers.`,
            service: "Local SEO, technical optimization, and content strategy"
        },
        "Email Marketing": {
            capability: "Email Marketing & Automation",
            pitch: `Email marketing remains the highest-ROI channel. We build automated email systems that nurture leads and drive repeat business.`,
            service: "Email sequences, automation workflows, and campaign management"
        },
        "New Business": {
            capability: "Business Launch & Brand Development",
            pitch: `New businesses in Columbus need a complete brand and marketing foundation. We help startups launch with impact.`,
            service: "Brand identity, website, marketing strategy, and launch campaign"
        },
        "Hiring": {
            capability: "Employer Branding & Recruitment Marketing",
            pitch: `Companies hiring in Columbus need to stand out. We build employer brands that attract top talent.`,
            service: "Career pages, job postings, employer brand content"
        },
        "Video Production": {
            capability: "Video Production & Commercial Content",
            pitch: `Video content is essential for modern marketing. We produce professional video that tells your story and drives results.`,
            service: "Commercial production, social video, brand storytelling"
        },
        "Print Advertising": {
            capability: "Print Advertising & Direct Mail Design",
            pitch: `Print advertising delivers tangible results in a digital world. We design print campaigns that get noticed and drive action.`,
            service: "Print ad design, direct mail campaigns, brand collateral"
        },
        "Design": {
            capability: "Brand Identity & Visual Design",
            pitch: `Strong design is the foundation of every successful brand. We create visual identities that resonate and convert.`,
            service: "Logo design, brand guidelines, marketing collateral"
        }
    };

    const template = templates[category] || templates["Marketing"];

    return {
        capability: template.capability,
        pitch: template.pitch,
        service: template.service,
        source: finding.source,
        sourceUrl: finding.url,
        publishedAt: finding.published,
        marketSignal: title,
        signalSnippet: snippet,
        category,
        matchScore: finding.score,
        relevanceScore: signal.relevanceScore
    };
}

async function createPipelineApprovals(findings, actor) {
    const state = loadState();
    const created = [];

    for (const finding of findings) {
        const signal = extractBusinessSignal(finding);
        if (!signal.isActionable) continue;

        const existingApproval = state.findings.find(
            f => f.title === finding.title && f.approvalId
        );
        if (existingApproval) continue;

        const package_ = generateOutreachPackage(finding, signal);

        try {
            const approval = await approvalService.requestApproval({
                action: "market_pulse_opportunity",
                ventureId: "jarvis",
                requestedBy: actor || "market-pulse-agent",
                context: {
                    type: "market-opportunity",
                    prospect: {
                        name: finding.title.slice(0, 100),
                        source: "market-pulse",
                        sourceUrl: finding.url,
                        city: "Columbus",
                        state: "OH",
                        category: finding.category,
                        fitScore: signal.relevanceScore * 10,
                        fitGrade: signal.relevanceScore >= 7 ? "high" : signal.relevanceScore >= 5 ? "medium" : "low",
                        snippet: finding.snippet,
                        executiveName: "",
                        email: "",
                        phone: "",
                        googleReviewCount: 0,
                        specificStrength: package_.capability,
                        source: "market-pulse"
                    },
                    opportunity: package_,
                    findingId: finding.id,
                    note: `Market signal: ${finding.title.slice(0, 80)}. Category: ${finding.category}. Score: ${signal.relevanceScore}/10.`
                }
            });

            const fIdx = state.findings.findIndex(f => f.id === finding.id);
            if (fIdx >= 0) {
                state.findings[fIdx].approvalId = approval.id;
                state.findings[fIdx].pipelineStatus = "pending";
            }

            created.push({ finding: finding.title, approvalId: approval.id });
        } catch (e) {
            activity.append("observed", `Market Pulse approval creation failed: ${finding.title.slice(0, 50)}`, {
                source: "market-pulse-agent",
                error: e.message,
                findingId: finding.id
            });
        }
    }

    if (created.length > 0) {
        saveState(state);
    }

    return created;
}

async function runMarketPulseWithPipeline(actor) {
    const scanResult = await runMarketPulse(actor);

    const leadFindings = scanResult.findings.filter(f => {
        if (f.quality === "noise" || f.quality === "irrelevant") return false;
        if (!f.isColumbus && !f.isActionable) return false;
        if (f.score < 7) return false;
        const title = (f.title || "").toLowerCase();
        if (/competitor|rival|agency\s+(?:wins?|launches?|secures?)/i.test(title)) return false;
        if (/acqui(?:res?|ring|sition)/i.test(title)) return false;
        if (/honors?|honored|celebrates?|50\s+years?/i.test(title)) return false;
        if (/named?\s+(?:to|as|chief|vp|director|officer)/i.test(title)) return false;
        if (/top\s+\d+|best\s+of/i.test(title)) return false;
        if (/tools?\s+(?:for|to)|\d+\s+(?:best|top)/i.test(title)) return false;
        return true;
    });

    let pipelineResults = [];
    if (leadFindings.length > 0) {
        pipelineResults = await createPipelineApprovals(leadFindings, actor);
    }

    activity.append("prepared", `Market Pipeline: ${pipelineResults.length} leads from ${scanResult.newFound} findings`, {
        source: "market-pulse-agent",
        scanNew: scanResult.newFound,
        leads: leadFindings.length,
        pipelineCreated: pipelineResults.length
    });

    return {
        ...scanResult,
        pipeline: {
            leads: leadFindings.length,
            created: pipelineResults
        }
    };
}

function status() {
    const state = loadState();
    const highScore = state.findings.filter(f => (f.score || 0) >= 7);
    const qualityDist = { high: 0, medium: 0, low: 0, noise: 0, irrelevant: 0 };
    const categories = {};
    const columbusFindings = state.findings.filter(f => f.isColumbus);
    const actionableFindings = state.findings.filter(f => f.isActionable);

    for (const f of state.findings) {
        categories[f.category] = (categories[f.category] || 0) + 1;
        if (f.quality) qualityDist[f.quality] = (qualityDist[f.quality] || 0) + 1;
    }
    return {
        agent: { id: "market-pulse-agent", name: "Market Pulse Agent", version: "2.0" },
        metrics: {
            totalFindings: state.findings.length,
            highScoreFindings: highScore.length,
            columbusFindings: columbusFindings.length,
            actionableFindings: actionableFindings.length,
            qualityDistribution: qualityDist,
            totalRuns: state.totalRuns,
            lastRunAt: state.lastRunAt,
            categories,
            feedsMonitored: RSS_FEEDS.length
        },
        topCapabilities: JARVIS_CAPABILITIES,
        recentRuns: state.runs.slice(-5).reverse()
    };
}

module.exports = { runMarketPulse, runMarketPulseWithPipeline, getFindings, status, extractBusinessSignal, generateOutreachPackage, createPipelineApprovals };
