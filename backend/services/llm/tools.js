const fs = require("fs");
const path = require("path");
const { readJson } = require("../../storage/atomicJsonStore");
const canonicalContext = require("../../brain/canonicalContextService");
const activity = require("../../brain/activityService");

function checkService(name, fn) {
    try {
        const result = fn();
        return { name, status: "green", detail: result };
    } catch (e) {
        return { name, status: "red", detail: e.message };
    }
}

async function checkServiceAsync(name, fn) {
    try {
        const result = await fn();
        return { name, status: "green", detail: result };
    } catch (e) {
        return { name, status: "red", detail: e.message };
    }
}

const TOOLS = [
    {
        name: "web_search",
        description: "Search the web for information about a topic, company, market, or person. Returns relevant search results with titles, URLs, and snippets.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" },
                numResults: { type: "number", description: "Number of results (default 5, max 10)" }
            },
            required: ["query"]
        },
        execute: async ({ query, numResults }) => {
            const limit = Math.min(Math.max(Number(numResults) || 5, 1), 10);
            try {
                const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                const response = await fetch(url, {
                    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
                });
                const html = await response.text();
                const results = [];
                const resultPattern = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
                let match;
                while ((match = resultPattern.exec(html)) && results.length < limit) {
                    const rawUrl = match[1];
                    const decodedUrl = rawUrl.includes("uddg=")
                        ? decodeURIComponent(rawUrl.split("uddg=")[1]?.split("&")[0] || rawUrl)
                        : rawUrl;
                    results.push({
                        title: match[2].replace(/<[^>]+>/g, "").trim(),
                        url: decodedUrl,
                        snippet: match[3].replace(/<[^>]+>/g, "").trim()
                    });
                }
                if (!results.length) {
                    const simplePattern = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
                    while ((match = simplePattern.exec(html)) && results.length < limit) {
                        results.push({ title: match[1].replace(/<[^>]+>/g, "").trim(), url: "", snippet: "" });
                    }
                }
                activity.append("observed", `Web search performed: "${query}"`, { source: "llm-tools" });
                return { query, results, resultCount: results.length };
            } catch (error) {
                return { query, results: [], resultCount: 0, error: error.message };
            }
        }
    },
    {
        name: "crm_query",
        description: "Query JARVIS CRM data. Returns contacts, organizations, opportunities, or ventures based on the entity type requested.",
        parameters: {
            type: "object",
            properties: {
                entityType: { type: "string", enum: ["contacts", "organizations", "opportunities", "ventures", "tasks"], description: "What type of CRM data to query" },
                filter: { type: "string", description: "Optional text filter to match against names or fields" },
                limit: { type: "number", description: "Max records to return (default 20)" }
            },
            required: ["entityType"]
        },
        execute: async ({ entityType, filter, limit }) => {
            const max = Math.min(Math.max(Number(limit) || 20, 1), 100);
            const brain = canonicalContext.assemble({ include: entityType === "ventures" ? "ventures" : entityType });
            let records = (brain.collections[entityType] || []).map(r => r.data);
            if (filter) {
                const lower = filter.toLowerCase();
                records = records.filter(r => JSON.stringify(r).toLowerCase().includes(lower));
            }
            activity.append("observed", `CRM query: ${entityType}`, { source: "llm-tools" });
            return { entityType, count: Math.min(records.length, max), records: records.slice(0, max) };
        }
    },
    {
        name: "log_activity",
        description: "Record an activity event in JARVIS. Use this when you complete research, make a recommendation, or take a noteworthy action.",
        parameters: {
            type: "object",
            properties: {
                phase: { type: "string", enum: ["observed", "recommended", "prepared", "requested", "executed", "learned"], description: "The activity phase" },
                summary: { type: "string", description: "Brief description of what happened" },
                source: { type: "string", description: "Which agent or component generated this" }
            },
            required: ["phase", "summary"]
        },
        execute: async ({ phase, summary, source }) => {
            const record = activity.append(phase, summary, { source: source || "llm-agent" });
            return { logged: true, id: record.id, timestamp: record.timestamp };
        }
    },
    {
        name: "memory_read",
        description: "Read from JARVIS memory files. Access profile, priorities, ventures, decisions, lessons learned, or knowledge vault.",
        parameters: {
            type: "object",
            properties: {
                memoryType: { type: "string", enum: ["profile", "priorities", "ventures", "decisions", "lessons", "knowledge", "projects", "opportunities"], description: "Which memory to read" }
            },
            required: ["memoryType"]
        },
        execute: async ({ memoryType }) => {
            const memoryDir = path.resolve(__dirname, "../../memory");
            const memoryFiles = {
                profile: "profile.json",
                priorities: "priorities.json",
                ventures: "avos.json",
                decisions: "decisions.json",
                lessons: "lessons-learned.md",
                knowledge: "knowledge-vault.md",
                projects: "projects.json",
                opportunities: "opportunities.md"
            };
            const fileName = memoryFiles[memoryType];
            if (!fileName) return { error: `Unknown memory type: ${memoryType}` };
            const filePath = path.join(memoryDir, fileName);
            if (!fs.existsSync(filePath)) return { memoryType, exists: false, data: null };
            const content = fs.readFileSync(filePath, "utf8");
            let data;
            if (fileName.endsWith(".json")) {
                try { data = JSON.parse(content); } catch { data = content; }
            } else {
                data = content.slice(0, 3000);
            }
            activity.append("observed", `Memory read: ${memoryType}`, { source: "llm-tools" });
            return { memoryType, exists: true, data };
        }
    },
    {
        name: "get_agent_status",
        description: "Get the current status of all JARVIS agents including their activity, blockers, and metrics.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        execute: async () => {
            try {
                const ventureService = require("../../agents/avoRevenueAgentService");
                const xodusService = require("../../agents/xodusMissionAgentService");
                const opportunityService = require("../../agents/opportunityPilotService");
                const chiefService = require("../../agents/chiefOfStaffOperationsService");

                const agents = [
                    { id: "venture-revenue", status: ventureService.status() },
                    { id: "xodus-mission", status: xodusService.status() },
                    { id: "opportunity-pilot", status: opportunityService.status() },
                    { id: "chief-of-staff", status: chiefService.status() }
                ];

                return { agents, generatedAt: new Date().toISOString() };
            } catch (error) {
                return { error: error.message, agents: [] };
            }
        }
    },
    {
        name: "self_diagnose",
        description: "Run a self-diagnostic check on JARVIS systems. Returns green/yellow/red status for each subsystem with a one-line summary. Use this when the user asks about JARVIS's health, capabilities, gaps, or what it's lacking.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        execute: async () => {
            const subsystems = [];

            try {
                const llm = require("./index");
                const llmStatus = llm.status();
                subsystems.push({
                    name: "LLM Provider",
                    status: llmStatus.configured ? "green" : "yellow",
                    detail: llmStatus.configured
                        ? `${llmStatus.provider} / ${llmStatus.model}`
                        : "No API key configured — using local rule engine"
                });
            } catch (e) {
                subsystems.push({ name: "LLM Provider", status: "red", detail: e.message });
            }

            try {
                const scheduler = require("../../agents/agentSchedulerService");
                const schedules = scheduler.getSchedules();
                const enabled = schedules.filter(s => s.enabled).length;
                const totalRuns = schedules.reduce((sum, s) => sum + (s.runCount || 0), 0);
                subsystems.push({
                    name: "Agent Scheduler",
                    status: enabled > 0 ? "green" : "yellow",
                    detail: `${enabled} enabled schedules, ${totalRuns} total runs`
                });
            } catch (e) {
                subsystems.push({ name: "Agent Scheduler", status: "red", detail: e.message });
            }

            try {
                const hub = require("../../services/agentReviewService");
                const inbox = hub.inbox();
                const pending = inbox.summary.approvalsPending;
                subsystems.push({
                    name: "Agent Hub",
                    status: "green",
                    detail: `${inbox.registry.length} registered agents, ${inbox.production.agents.length + 1} production, ${pending} pending approvals`
                });
            } catch (e) {
                subsystems.push({ name: "Agent Hub", status: "red", detail: e.message });
            }

            try {
                const crmPath = path.resolve(__dirname, "../../data/crm");
                const orgsFile = path.join(crmPath, "organizations.json");
                const contactsFile = path.join(crmPath, "contacts.json");
                const orgs = fs.existsSync(orgsFile) ? JSON.parse(fs.readFileSync(orgsFile, "utf8")) : [];
                const contacts = fs.existsSync(contactsFile) ? JSON.parse(fs.readFileSync(contactsFile, "utf8")) : [];
                const freshness = orgs.length > 0 ? "green" : "yellow";
                subsystems.push({
                    name: "CRM Data",
                    status: freshness,
                    detail: `${orgs.length} organizations, ${contacts.length} contacts`
                });
            } catch (e) {
                subsystems.push({ name: "CRM Data", status: "red", detail: e.message });
            }

            try {
                const goalsPath = path.resolve(__dirname, "../../memory/context/goals.json");
                const goals = fs.existsSync(goalsPath) ? JSON.parse(fs.readFileSync(goalsPath, "utf8")) : { goals: [] };
                const activeGoals = (goals.goals || []).filter(g => g.status === "active");
                subsystems.push({
                    name: "Goals & Strategy",
                    status: activeGoals.length > 0 ? "green" : "yellow",
                    detail: `${activeGoals.length} active goals tracked`
                });
            } catch (e) {
                subsystems.push({ name: "Goals & Strategy", status: "red", detail: e.message });
            }

            try {
                const IntelService = require("../../services/strategicIntelligenceService");
                const intel = IntelService.getLatestInsights();
                subsystems.push({
                    name: "Strategic Intelligence",
                    status: intel.status === "ready" ? "green" : "yellow",
                    detail: intel.status === "ready"
                        ? `${intel.total} insights from last scan`
                        : "No scans completed yet"
                });
            } catch (e) {
                subsystems.push({ name: "Strategic Intelligence", status: "red", detail: e.message });
            }

            try {
                const dailyPath = path.resolve(__dirname, "../../data/agents/daily-priorities.json");
                const daily = fs.existsSync(dailyPath) ? JSON.parse(fs.readFileSync(dailyPath, "utf8")) : null;
                subsystems.push({
                    name: "Daily Priorities",
                    status: daily ? "green" : "yellow",
                    detail: daily
                        ? `${daily.history?.length || 0} days of priority history`
                        : "No priority history yet"
                });
            } catch (e) {
                subsystems.push({ name: "Daily Priorities", status: "red", detail: e.message });
            }

            try {
                const healthPath = path.resolve(__dirname, "../../data/governance/system-control.json");
                const health = fs.existsSync(healthPath) ? JSON.parse(fs.readFileSync(healthPath, "utf8")) : {};
                subsystems.push({
                    name: "System Control",
                    status: health.stopped ? "yellow" : "green",
                    detail: health.stopped ? "EMERGENCY STOP ACTIVE" : "System running normally"
                });
            } catch (e) {
                subsystems.push({ name: "System Control", status: "green", detail: "No control overrides" });
            }

            const redCount = subsystems.filter(s => s.status === "red").length;
            const yellowCount = subsystems.filter(s => s.status === "yellow").length;
            const overall = redCount > 0 ? "degraded" : yellowCount > 1 ? "needs attention" : "operational";

            activity.append("observed", "Self-diagnostic run", { source: "llm-tools" });

            return {
                overall,
                subsystems,
                summary: `${subsystems.length} subsystems checked: ${redCount} red, ${yellowCount} yellow, ${subsystems.length - redCount - yellowCount} green`
            };
        }
    }
];

function getTools() {
    return TOOLS;
}

function getToolMap() {
    return Object.fromEntries(TOOLS.map(t => [t.name, t]));
}

module.exports = { getTools, getToolMap, TOOLS };
