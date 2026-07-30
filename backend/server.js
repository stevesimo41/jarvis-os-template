require("./config/loadEnvironment");
const routerAgent = require("./routes/router");
const agents = require("./routes/agents");
const executor = require("./routes/executor");
const chiefOfStaff = require("./routes/chiefOfStaff");
const command = require("./routes/command");
const jarvis = require("./routes/jarvis");
const ventureProspecting = require("./routes/ventureProspecting");
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const health = require("./services/health/healthCheck");
const mission = require("./routes/mission");
const crmWorkflow =
    require("./routes/crmWorkflow");
const research =
    require("./routes/research");
const workspaces = require("./routes/workspaces");
const execution = require("./routes/execution");
const memory = require("./routes/memory");
const commandCenter = require("./routes/commandCenter");
const crm = require("./routes/crm");
const auth = require("./routes/auth");
const releases = require("./routes/releases");
const brain = require("./routes/brain");
const opportunities = require("./routes/opportunities");
const systemControl = require("./routes/systemControl");
const ventureIdeation = require("./routes/avoIdeation");
const ventureProjects = require("./routes/avoProjects");
const apple = require("./routes/apple");
const autonomy = require("./routes/autonomy");
const readiness = require("./routes/readiness");
const productionAgents = require("./routes/productionAgents");
const systemInventory = require("./routes/systemInventory");
const renewals = require("./routes/renewals");
const executiveState = require("./routes/executiveState");
const mobileAccess = require("./routes/mobileAccess");
const opportunityAgent = require("./routes/opportunityAgent");
const agentHub = require("./routes/agentHub");
const xodusAgent = require("./routes/xodusAgent");
const ventureAgent = require("./routes/avoAgent");
const agentScheduler = require("./routes/agentScheduler");
const marketDiscovery = require("./routes/marketDiscovery");
const webResearch = require("./routes/webResearch");
const wellNoticedCrm = require("./routes/wellNoticedCrm");
const jarvisOpportunities = require("./routes/jarvisOpportunities");
const ventureOperations = require("./routes/avoOperations");
const prospectEnrichment = require("./routes/prospectEnrichment");
const strategicIntelligence = require("./routes/strategicIntelligence");
const dailyPriorities = require("./routes/dailyPriorities");
const contentAgent = require("./routes/contentAgent");
const todayActions = require("./routes/todayActions");
const marketPulse = require("./routes/marketPulse");
const security = require("./http/security");
const lemonSqueezy = require("./routes/lemonSqueezy");
const lemonSqueezyWebhook = require("./routes/lemonSqueezyWebhook");
const socialFeed = require("./routes/socialFeed");
const leadPipeline = require("./routes/leadPipeline");
const cadenceReview = require("./routes/cadenceReview");

const crmIntelligenceRoutes = require("./routes/crmIntelligence");
const campaignExecution = require("./routes/campaignExecution");
const emailTracking = require("./routes/emailTracking");
const emailReply = require("./routes/emailReply");
const learningRoutes = require("./routes/learning");
const competitiveIntelRoutes = require("./routes/competitiveIntel");
const discoveryAgent = require("./services/discoveryAgentService");
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.JARVIS_HOST || "127.0.0.1";

if (process.env.JARVIS_TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(express.json());
app.use((req, res, next) => {
    const suppliedId = req.get("X-Request-Id");
    req.id = suppliedId || crypto.randomUUID();
    res.set("X-Request-Id", req.id);
    next();
});
app.use(security.securityHeaders);
app.use(security.hostGuard);
app.use(security.sameOriginCors);
app.use("/api", security.rateLimit({ scope: "api", maximum: 300 }));
app.use(
    "/api/auth/session",
    security.rateLimit({ scope: "session", maximum: 10, windowMs: 15 * 60 * 1000 })
);
app.use(security.remoteApiProtection);
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
        res.set("Cache-Control", "no-store");
    }
    next();
});
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/api/auth", auth);
app.use("/api/releases", releases);
app.use("/api/brain", brain);
app.use("/api/opportunities", opportunities);
app.use("/api/system-control", systemControl);
app.use("/api/apple", apple);
app.use("/api/autonomy", autonomy);
app.use("/api/readiness", readiness);
app.use("/api/production-agents", productionAgents);
app.use("/api/system-inventory", systemInventory);
app.use("/api/renewals", renewals);
app.use("/api/executive-state", executiveState);
app.use("/api/mobile-access", mobileAccess);
app.use("/api/opportunity-agent", opportunityAgent);
app.use("/api/agent-hub", agentHub);
app.use("/api/xodus-agent", xodusAgent);
app.use("/api/venture-agent", ventureAgent);
app.use("/api/agent-scheduler", agentScheduler);
app.use("/api/market-discovery", marketDiscovery);
app.use("/api/web-research", webResearch);
app.use("/api/well-noticed-crm", wellNoticedCrm);
app.use("/api/jarvis-opportunities", jarvisOpportunities);
app.use("/api/venture-operations", ventureOperations);
app.use("/api/venture-prospecting", ventureProspecting);
app.use("/api/crm/enrich", prospectEnrichment);
app.use("/api/strategic-intel", strategicIntelligence);
app.use("/api/daily-priorities", dailyPriorities);
app.use("/api/content-agent", contentAgent);
app.use("/api/today-actions", todayActions);
app.use("/api/market-pulse", marketPulse);
app.use("/api/lemon-squeezy", lemonSqueezy);
app.use("/api/lemon-squeezy/webhook", lemonSqueezyWebhook);
app.use("/api/social", socialFeed);
app.use("/api/lead-pipeline", leadPipeline);
app.use("/api/cadence-review", cadenceReview);
app.use("/api/workspaces", workspaces);
app.use("/api/router", routerAgent);
app.use("/api/executor", executor);
app.use("/api/agents", agents);
app.use("/api/mission", mission);
app.use(
    "/api/research",
    research
);
app.use(
    "/api/crm/workflow",
    crmWorkflow
);
app.use("/api/memory", memory);
app.use("/api/agents/run", execution);
app.use("/api/jarvis", jarvis);
app.use("/api/chief-of-staff", chiefOfStaff);
app.use("/api/command", command);
app.use("/api/command-center", commandCenter);
app.use("/api/crm", crm);
app.use("/api/crm/intelligence", crmIntelligenceRoutes);
app.use("/api/campaign-execute", campaignExecution);
app.use("/api/venture-ideation", ventureIdeation);
app.use("/api/avo-projects", ventureProjects);
app.use("/api/tracking", emailTracking);
app.use("/api/email-reply", emailReply);
app.use("/api/learning", learningRoutes);
app.use("/api/competitive-intel", competitiveIntelRoutes);

// Discovery API
app.get("/api/discovery", (_req, res) => {
    try {
        const result = discoveryAgent.runDiscovery();
        res.json({ ok: true, ...discoveryAgent.getSummary(result) });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});
app.get("/health", (req,res)=>{

    res.json(
        health.runHealthCheck()
    );

});
app.get("/api/health", (req,res)=>{
    res.json(
        health.runHealthCheck()
    );
});
app.get("/api/routes-test", (req, res) => {
    res.json({
        jarvisLoaded: true,
        message: "JARVIS mount exists"
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Newest server.js is running"
    });
});
app.get("/api/jarvis-test", (req, res) => {
    res.json({
        success: true,
        message: "JARVIS test route works"
    });
});
if (require.main === module) {
    process.on("unhandledRejection", (reason, promise) => {
        console.error("[SERVER] Unhandled Rejection at:", promise, "reason:", reason?.message || reason);
    });
    process.on("uncaughtException", (error) => {
        console.error("[SERVER] Uncaught Exception:", error.message, error.stack);
        console.error("[SERVER] Server continuing despite uncaught exception");
    });

    security.validateRemoteConfiguration(HOST);
    app.listen(PORT, HOST, () => {
        console.log(`JARVIS backend running on ${HOST}:${PORT}`);
        console.log(`JARVIS Command Center: http://${HOST}:${PORT}`);

        const agentScheduler = require("./agents/agentSchedulerService");
        const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;
        setInterval(async () => {
            try {
                const result = await agentScheduler.tick();
                if (result.ran > 0) {
                    console.log(`[Scheduler Tick] Ran ${result.ran} schedule(s):`,
                        result.results.map(r => `${r.name} → ${r.outcome}`).join("; "));
                }
            } catch (error) {
                console.error("[Scheduler Tick] Error:", error.message);
            }
        }, SCHEDULER_INTERVAL_MS);
        console.log(`Agent Scheduler: checking every ${SCHEDULER_INTERVAL_MS / 1000}s`);

        // Run Discovery Agent on first boot
        try {
            const result = discoveryAgent.runDiscovery();
            const summary = discoveryAgent.getSummary(result);
            if (!result.cached) {
                console.log("");
                console.log("╔══════════════════════════════════════╗");
                console.log("║    JARVIS OS Discovery Complete     ║");
                console.log("╠══════════════════════════════════════╣");
                console.log(`║ ${summary.title.padEnd(36)}║`);
                console.log(`║ ${summary.environment.padEnd(36)}║`);
                console.log(`║ Tools: ${summary.toolsFound.toString().padEnd(30)}║`);
                console.log("╚══════════════════════════════════════╝");
                if (!result.llm.length) {
                    console.log("[Discovery] No LLM detected — JARVIS running in rule-based mode.");
                    console.log("[Discovery] Add an API key to .env to enable AI features.");
                } else {
                    console.log(`[Discovery] LLM: ${result.llm.map(p => p.name).join(", ")}`);
                }
                console.log("");
            }
        } catch (err) {
            console.warn("[Server] Discovery agent failed:", err.message);
        }
    });
}

module.exports = app;
