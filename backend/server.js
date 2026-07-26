require("./config/loadEnvironment");
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const health = require("./services/health/healthCheck");
const security = require("./http/security");
const auth = require("./routes/auth");
const todayActions = require("./routes/todayActions");
const marketPulse = require("./routes/marketPulse");
const agentHub = require("./routes/agentHub");
const webResearch = require("./routes/webResearch");

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
app.use("/api/today-actions", todayActions);
app.use("/api/market-pulse", marketPulse);
app.use("/api/agent-hub", agentHub);
app.use("/api/web-research", webResearch);

app.get("/health", (req, res) => {
    res.json(health.runHealthCheck());
});
app.get("/api/health", (req, res) => {
    res.json(health.runHealthCheck());
});

if (require.main === module) {
    security.validateRemoteConfiguration(HOST);
    app.listen(PORT, HOST, () => {
        console.log(`JARVIS backend running on ${HOST}:${PORT}`);
        console.log(`JARVIS Command Center: http://${HOST}:${PORT}`);

        const marketPulseAgent = require("./agents/marketPulseAgent");
        const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
        setInterval(async () => {
            try {
                if (marketPulseAgent.tick) await marketPulseAgent.tick();
            } catch (error) {
                console.error("[Scheduler Tick] Error:", error.message);
            }
        }, SCHEDULER_INTERVAL_MS);
        console.log(`Agent Scheduler: checking every ${SCHEDULER_INTERVAL_MS / 1000}s`);
    });
}

module.exports = app;
