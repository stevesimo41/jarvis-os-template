const fs = require("fs");
const path = require("path");
const activity = require("../brain/activityService");

const TASK_STATE_PATH = path.join(__dirname, "../data/agents/cadence-review-tasks.json");
const CAMPAIGNS_PATH = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
const CADENCES_PATH = path.join(__dirname, "../data/agents/jarvis-cadences.json");

function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_e) { return fallback; }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadTasks() {
    return readJson(TASK_STATE_PATH, { tasks: [], completed: [] });
}

function saveTasks(state) {
    writeJson(TASK_STATE_PATH, state);
}

const CATEGORY_MAP = {
    "home improvement": "Home Improvement", "remodeling": "Home Improvement", "remodling": "Home Improvement",
    "home & décor": "Home Improvement", "design": "Home Improvement", "real estate": "Real Estate",
    "plumbing": "Home Services", "hvac": "Home Services", "landscaping": "Home Services",
    "painting": "Home Services", "roofing": "Home Services", "windows": "Home Services",
    "siding": "Home Services", "kitchen": "Home Improvement", "bathroom": "Home Improvement",
    "flooring": "Home Improvement", "deck": "Home Improvement", "fence": "Home Services",
    "concrete": "Home Services", "pet": "Pet Services", "fitness": "Health & Fitness",
    "wellness": "Health & Fitness", "salon": "Health & Fitness", "spa": "Health & Fitness",
    "dental": "Healthcare", "healthcare": "Healthcare", "chiropractic": "Healthcare",
    "medical": "Healthcare", "veterinary": "Pet Services", "animal": "Pet Services",
    "food": "Food & Beverage", "restaurant": "Food & Beverage", "coffee": "Food & Beverage",
    "brewery": "Food & Beverage", "winery": "Food & Beverage", "catering": "Food & Beverage",
    "entertainment": "Entertainment", "arts": "Entertainment", "music": "Entertainment",
    "non profit": "Non-Profit", "charity": "Non-Profit", "education": "Education",
    "school": "Education", "auto": "Automotive", "car": "Automotive", "jewelry": "Retail",
    "clothing": "Retail", "retail": "Retail", "law": "Professional Services",
    "financial": "Professional Services", "insurance": "Professional Services"
};

function normalizeCategory(masterCategory, subCategory) {
    const combined = ((masterCategory || "") + " " + (subCategory || "")).toLowerCase();
    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
        if (combined.includes(keyword)) return category;
    }
    return masterCategory || "Other";
}

function cleanCompanyName(name) {
    if (!name) return name;
    let cleaned = name;
    cleaned = cleaned.replace(/\s*:\s*(Kitchen|Bathroom|Home|Roofing|Remodeling|Design|Construction|Contractors?|Services?|Solutions?|Remodel|Improvement).*$/i, "");
    cleaned = cleaned.replace(/\s*\(.*?\)\s*/g, " ");
    cleaned = cleaned.replace(/\s*&\s*Company\.?\s*$/i, "");
    cleaned = cleaned.replace(/\s+(LLC|L\.L\.C\.|Inc\.?|Corp\.?|Ltd\.?|Co\.?)\.?\s*$/i, "");
    cleaned = cleaned.replace(/\s+(Kitchen|Bathroom|Home|Roofing|Remodeling|Design|Construction|Contractors?|Services?|Solutions?|Remodel|Improvement|Salon|Spa|Fitness|Pet|Care|Resort|Daycare|Trainers|Wellness)\s+(in|of|for|near)\s+(Columbus|Ohio|OH|Central Ohio).*$/i, "");
    cleaned = cleaned.replace(/,?\s+(Ohio|OH|Central Ohio)\s*$/i, " ");
    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
}

function validateEmail(email) {
    if (!email) return { valid: false, email: null, type: "missing", reason: "no email provided" };
    email = email.trim().toLowerCase();
    if (!email.includes("@") || !email.includes(".")) {
        return { valid: false, email: null, type: "invalid", reason: "malformed email" };
    }
    if (email.includes("example.com") || email.includes("test.com")) {
        return { valid: false, email: null, type: "invalid", reason: "test email domain" };
    }
    const badPrefixes = ["bugreport", "noreply", "donotreply", "no-reply", "accessibility", "webmaster", "abuse", "postmaster", "hostmaster"];
    const prefix = email.split("@")[0];
    if (badPrefixes.includes(prefix)) {
        return { valid: false, email: null, type: "invalid", reason: `rejected prefix: ${prefix}@` };
    }
    const domain = email.split("@")[1];
    const nonOhioTlds = [".ca", ".uk", ".au", ".de", ".fr", ".jp", ".cn", ".in", ".br", ".mx"];
    if (nonOhioTlds.some(tld => domain.endsWith(tld))) {
        return { valid: false, email: null, type: "invalid", reason: `non-Ohio domain: ${domain}` };
    }
    const genericPrefixes = ["info", "contact", "admin", "support", "hello", "office", "mail", "enquiry", "inquiries", "sales"];
    if (genericPrefixes.includes(prefix)) {
        return { valid: true, email, type: "generic", reason: "generic inbox — no named executive" };
    }
    return { valid: true, email, type: "personal", reason: "appears to be a named individual" };
}

function fixWebsiteUrl(url) {
    if (!url) return null;
    url = url.trim();
    if (!url.match(/^https?:\/\//i)) {
        url = "https://" + url;
    }
    url = url.replace(/\/+$/, "");
    return url;
}

function isValidGreeting(name, companyName) {
    if (!name) return false;
    const categoryWords = ["remodeling", "remodel", "improvement", "services", "design", "construction",
        "columbus", "ohio", "home", "kitchen", "bathroom", "roofing", "plumbing", "hvac",
        "landscaping", "painting", "flooring", "fitness", "salon", "spa", "pet", "veterinary"];
    const lowerName = name.toLowerCase();
    if (categoryWords.some(word => lowerName.includes(word))) return false;
    if (name.length > 30) return false;
    if (!/^[A-Z]/.test(name)) return false;
    const words = name.split(/\s+/);
    if (words.length < 2) return false;
    return true;
}

const NATIONAL_CHAINS = ["medvet", "petco", "petSmart", "petsmart", "banfield", "VCA", "aspen dental",
    "heartland", "servpro", "servicemaster", "rainbow restoration", "stanley steemer",
    "terminix", "orkin", "abc home", "college hunks", "junk king", "two men and a truck"];

function isNationalChain(companyName) {
    if (!companyName) return false;
    const lower = companyName.toLowerCase();
    return NATIONAL_CHAINS.some(chain => lower.includes(chain.toLowerCase()));
}

function isNonLocal(companyName, email) {
    if (isNationalChain(companyName)) return true;
    const universityPatterns = ["university", "college", "osu", "ohio state", "columbus state"];
    if (universityPatterns.some(p => (companyName || "").toLowerCase().includes(p))) return true;
    if (email && email.includes("osu.edu")) return true;
    return false;
}

function cleanseCampaignData(campaign) {
    const report = { company: campaign.prospectName || campaign.companyName, changes: [], flags: [] };
    const nameField = campaign.prospectName ? "prospectName" : "companyName";
    const originalName = campaign[nameField];

    if (originalName) {
        const cleaned = cleanCompanyName(originalName);
        if (cleaned !== originalName) {
            campaign[nameField] = cleaned;
            report.changes.push({ type: "name-cleaned", from: originalName, to: cleaned });
        }
    }

    const emailResult = validateEmail(campaign.executiveEmail);
    if (!emailResult.valid && campaign.executiveEmail) {
        report.changes.push({ type: "email-removed", email: campaign.executiveEmail, reason: emailResult.reason });
        campaign.executiveEmail = null;
    } else if (emailResult.valid && emailResult.type === "generic") {
        report.flags.push({ type: "generic-email", email: emailResult.email, note: "using generic inbox — no named executive" });
    } else if (emailResult.valid && emailResult.type === "personal") {
        report.flags.push({ type: "personal-email", email: emailResult.email });
    }
    if (campaign.executiveEmail) {
        campaign.executiveEmail = campaign.executiveEmail.trim().toLowerCase();
    }

    if (campaign.website) {
        const fixed = fixWebsiteUrl(campaign.website);
        if (fixed !== campaign.website) {
            report.changes.push({ type: "website-url-fixed", from: campaign.website, to: fixed });
            campaign.website = fixed;
        }
    }

    if (campaign.executiveName === "null" || campaign.executiveName === "undefined") {
        campaign.executiveName = null;
        report.changes.push({ type: "exec-name-nullified", reason: "string null" });
    }
    if (campaign.executiveName && !isValidGreeting(campaign.executiveName, originalName)) {
        report.flags.push({ type: "suspicious-exec-name", name: campaign.executiveName, reason: "looks like category/location text, not a person" });
    }

    const name = campaign.prospectName || campaign.companyName || "";
    if (isNationalChain(name)) {
        report.flags.push({ type: "national-chain", name });
    }
    if (isNonLocal(name, campaign.executiveEmail)) {
        report.flags.push({ type: "non-local", name });
    }

    if (campaign.executiveEmail && typeof campaign.executiveEmail === "string") {
        campaign.executiveEmail = campaign.executiveEmail.trim().toLowerCase();
    }

    return report;
}

async function cleanseCadences() {
    const wnState = readJson(CAMPAIGNS_PATH, { campaigns: [] });
    const jState = readJson(CADENCES_PATH, { cadences: [] });
    const report = { wellNoticed: [], jarvis: [], summary: { changes: 0, flags: 0 } };

    wnState.campaigns.forEach(c => {
        const r = cleanseCampaignData(c);
        r.company = c.prospectName;
        report.wellNoticed.push(r);
        report.summary.changes += r.changes.length;
        report.summary.flags += r.flags.length;
    });

    jState.cadences.forEach(c => {
        const originalName = c.companyName;
        if (originalName) {
            const cleaned = cleanCompanyName(originalName);
            if (cleaned !== originalName) {
                c.companyName = cleaned;
                report.jarvis.push({ company: cleaned, changes: [{ type: "name-cleaned", from: originalName, to: cleaned }] });
                report.summary.changes++;
            }
        }
        const emailResult = validateEmail(c.executiveEmail);
        if (!emailResult.valid && c.executiveEmail) {
            c.executiveEmail = null;
            report.summary.changes++;
        }
        if (c.executiveName === "null" || c.executiveName === "undefined") {
            c.executiveName = null;
        }
    });

    writeJson(CAMPAIGNS_PATH, wnState);
    writeJson(CADENCES_PATH, jState);

    activity.append("executed", `Enhanced data cleansing: ${report.summary.changes} fixes, ${report.summary.flags} flags`, {
        source: "data-cleansing",
        changes: report.summary.changes,
        flags: report.summary.flags
    });

    return report;
}

async function enrichMissingNames() {
    let webResearch;
    try { webResearch = require("./webResearch"); } catch (_e) { return { enriched: 0, message: "web research unavailable" }; }

    const wnState = readJson(CAMPAIGNS_PATH, { campaigns: [] });
    const results = [];

    const missing = wnState.campaigns.filter(c =>
        (!c.executiveName || c.executiveName.length < 3 || !isValidGreeting(c.executiveName, c.prospectName)) &&
        (c.status === "active" || c.status === "paused")
    );

    const SEARCH_QUERIES = [
        (n) => `${n} owner Columbus Ohio`,
        (n) => `${n} CEO founder Columbus Ohio`,
        (n) => `${n} general manager Columbus Ohio`,
        (n) => `${n} president Columbus Ohio`
    ];

    const NAME_PATTERN = /\b([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?:\s+[A-Z][a-z]{1,20})?\b/g;
    const TITLE_KEYWORDS = ["owner", "president", "ceo", "founder", "manager", "director", "principal", "partner"];
    const EMAIL_PATTERN = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

    for (const c of missing.slice(0, 15)) {
        const companyName = c.prospectName || c.companyName;
        if (!companyName) continue;

        let bestName = null;
        let bestEmail = null;
        let bestTitle = null;
        let bestSource = null;

        for (const queryFn of SEARCH_QUERIES) {
            try {
                const searchResults = await webResearch.searchWeb(queryFn(companyName));
                const companyLower = companyName.toLowerCase();

                for (const r of searchResults.slice(0, 6)) {
                    const fullText = ((r.title || "") + " " + (r.snippet || "")).toLowerCase();
                    const rawText = (r.title || "") + " " + (r.snippet || "");

                    // Extract emails from results
                    if (!bestEmail) {
                        const emailMatches = rawText.match(EMAIL_PATTERN);
                        if (emailMatches) {
                            for (const email of emailMatches) {
                                const ev = validateEmail(email);
                                if (ev.valid && ev.type === "personal") {
                                    bestEmail = email.toLowerCase();
                                    bestSource = r.url || "web-search";
                                    break;
                                }
                            }
                        }
                    }

                    // Extract names — skip results that are just the company itself
                    if (!bestName && fullText.includes(companyLower)) {
                        // The result is about the company, look for names near title keywords
                        for (const title of TITLE_KEYWORDS) {
                            const titleIdx = fullText.indexOf(title);
                            if (titleIdx === -1) continue;
                            // Look for a name within 80 chars of the title keyword
                            const context = rawText.substring(Math.max(0, titleIdx - 60), titleIdx + 80);
                            let match;
                            while ((match = NAME_PATTERN.exec(context)) !== null) {
                                const candidate = match[0];
                                const candidateLower = candidate.toLowerCase();
                                // Skip if it's the company name or a common non-name word
                                if (candidateLower.includes(companyLower) || candidateLower.includes("columbus") || candidateLower.includes("ohio")) continue;
                                if (!bestName) {
                                    bestName = candidate;
                                    bestTitle = title.charAt(0).toUpperCase() + title.slice(1);
                                }
                            }
                            NAME_PATTERN.lastIndex = 0;
                        }
                    }

                    // Also try general name extraction from titles
                    if (!bestName) {
                        let match;
                        while ((match = NAME_PATTERN.exec(rawText)) !== null) {
                            const candidate = match[0];
                            const candidateLower = candidate.toLowerCase();
                            if (candidateLower.includes(companyLower) || candidateLower.includes("columbus") || candidateLower.includes("ohio") || candidateLower.includes("service")) continue;
                            // Check if nearby text has a title
                            const nearIdx = rawText.indexOf(candidate);
                            const nearby = rawText.substring(Math.max(0, nearIdx - 40), nearIdx + candidate.length + 40).toLowerCase();
                            if (TITLE_KEYWORDS.some(t => nearby.includes(t))) {
                                bestName = candidate;
                                bestSource = r.url || "web-search";
                                break;
                            }
                        }
                        NAME_PATTERN.lastIndex = 0;
                    }

                    if (bestName && bestEmail) break;
                }
                if (bestName && bestEmail) break;
            } catch (_e) {
                // continue to next query
            }
            await new Promise(r => setTimeout(r, 400));
        }

        results.push({
            company: companyName,
            campaignId: c.id,
            suggestedName: bestName || null,
            suggestedEmail: bestEmail || null,
            executiveTitle: bestTitle || null,
            source: bestSource || null,
            confidence: bestName && bestEmail ? "high" : bestName ? "medium" : "low"
        });
    }

    const enrichmentPath = path.join(__dirname, "../data/agents/enrichment-suggestions.json");
    writeJson(enrichmentPath, {
        suggestions: results,
        generatedAt: new Date().toISOString(),
        summary: {
            total: results.length,
            withName: results.filter(r => r.suggestedName).length,
            withEmail: results.filter(r => r.suggestedEmail).length,
            highConfidence: results.filter(r => r.confidence === "high").length
        }
    });

    activity.append("observed", `Name enrichment: ${results.filter(r => r.suggestedName).length}/${results.length} found, ${results.filter(r => r.confidence === "high").length} high-confidence`, {
        source: "data-cleansing",
        enriched: results.filter(r => r.suggestedName).length,
        total: results.length,
        highConfidence: results.filter(r => r.confidence === "high").length
    });

    return {
        enriched: results.filter(r => r.suggestedName).length,
        total: results.length,
        suggestions: results
    };
}

function createReviewTasks() {
    const wnState = readJson(CAMPAIGNS_PATH, { campaigns: [] });
    const jState = readJson(CADENCES_PATH, { cadences: [] });
    const existingTasks = loadTasks();
    const tasks = [];

    wnState.campaigns.forEach(c => {
        if (c.status !== "active") return;
        const emailResult = validateEmail(c.executiveEmail);
        const hasEmail = emailResult.valid;
        const hasPersonalEmail = emailResult.type === "personal";
        const hasGenericEmail = emailResult.type === "generic";
        const hasName = c.executiveName && c.executiveName.length > 2 && isValidGreeting(c.executiveName, c.prospectName);
        const websiteFixed = c.website && c.website.startsWith("https://");

        let priority = "medium";
        let notes = [];

        if (!hasEmail) { priority = "low"; notes.push("No email — email steps will skip"); }
        else if (hasGenericEmail) { notes.push("Using generic inbox (info@/contact@) — no named executive"); }
        else if (hasPersonalEmail) { notes.push("Has personal executive email"); }

        if (!hasName) { notes.push("No executive name — greeting will be generic"); }
        if (!websiteFixed) { notes.push("Website URL needs https:// prefix"); }
        if (c.fitScore >= 70) { priority = "high"; notes.push("High fit score (" + c.fitScore + ")"); }

        tasks.push({
            id: "review-" + c.id, type: "review-cadence", cadenceType: "well-noticed",
            cadenceId: c.id, companyName: c.prospectName, email: c.executiveEmail || "none",
            score: c.fitScore, priority, status: "pending",
            notes: notes.join("; ") || "Ready for review", createdAt: new Date().toISOString()
        });
    });

    jState.cadences.forEach(c => {
        if (c.status !== "active") return;
        const hasEmail = c.executiveEmail && c.executiveEmail.includes("@");
        const hasName = c.executiveName && c.executiveName.length > 2;
        let priority = "medium";
        let notes = [];
        if (!hasEmail) { priority = "low"; notes.push("No email address"); }
        if (!hasName) { notes.push("No executive name — using generic greeting"); }
        if (c.fitScore >= 70) { priority = "high"; notes.push("High fit score (" + c.fitScore + ")"); }
        tasks.push({
            id: "review-" + c.id, type: "review-cadence", cadenceType: "jarvis",
            cadenceId: c.id, companyName: c.companyName, email: c.executiveEmail || "none",
            score: c.fitScore, priority, status: "pending",
            notes: notes.join("; ") || "Ready for review", createdAt: new Date().toISOString()
        });
    });

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
        return (b.score || 0) - (a.score || 0);
    });

    const taskState = {
        tasks, completed: existingTasks.completed || [],
        summary: {
            total: tasks.length, high: tasks.filter(t => t.priority === "high").length,
            medium: tasks.filter(t => t.priority === "medium").length, low: tasks.filter(t => t.priority === "low").length,
            wellNoticed: tasks.filter(t => t.cadenceType === "well-noticed").length,
            jarvis: tasks.filter(t => t.cadenceType === "jarvis").length
        }
    };
    saveTasks(taskState);

    activity.append("prepared", `Review tasks created: ${tasks.length} cadences to review`, {
        source: "cadence-review", totalTasks: tasks.length, high: taskState.summary.high,
        medium: taskState.summary.medium, low: taskState.summary.low
    });

    return taskState;
}

function getTasks(filters = {}) {
    const state = loadTasks();
    let tasks = state.tasks || [];
    if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
    if (filters.priority) tasks = tasks.filter(t => t.priority === filters.priority);
    if (filters.cadenceType) tasks = tasks.filter(t => t.cadenceType === filters.cadenceType);
    return { tasks, summary: state.summary, filtered: tasks.length };
}

function completeTask(taskId, action) {
    const state = loadTasks();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return null;
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.action = action;
    state.completed.push(task);
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    state.summary = {
        total: state.tasks.length, high: state.tasks.filter(t => t.priority === "high").length,
        medium: state.tasks.filter(t => t.priority === "medium").length, low: state.tasks.filter(t => t.priority === "low").length,
        wellNoticed: state.tasks.filter(t => t.cadenceType === "well-noticed").length,
        jarvis: state.tasks.filter(t => t.cadenceType === "jarvis").length
    };
    saveTasks(state);
    activity.append("executed", `Task ${taskId} completed: ${action}`, {
        source: "cadence-review", taskId, action, companyName: task.companyName
    });
    return task;
}

module.exports = {
    cleanseCadences, enrichMissingNames, createReviewTasks, getTasks, completeTask,
    normalizeCategory, cleanCompanyName, validateEmail, fixWebsiteUrl, cleanseCampaignData,
    isValidGreeting, isNationalChain
};
