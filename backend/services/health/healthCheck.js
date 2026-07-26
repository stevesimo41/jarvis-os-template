const fs = require("fs");
const path = require("path");

function runHealthCheck() {
    const checks = [];

    try {
        const dataDir = path.resolve(__dirname, "../../data");
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        checks.push({ system: "Storage", status: "healthy" });
    } catch (error) {
        checks.push({ system: "Storage", status: "error", message: error.message });
    }

    try {
        const serverJs = fs.readFileSync(path.resolve(__dirname, "../../server.js"), "utf8");
        checks.push({ system: "Core", status: "healthy" });
    } catch (error) {
        checks.push({ system: "Core", status: "error", message: error.message });
    }

    return {
        system: "JARVIS OS",
        status: checks.every(c => c.status === "healthy") ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        checks
    };
}

module.exports = { runHealthCheck };
