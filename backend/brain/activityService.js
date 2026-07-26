const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const auditLog = require("../governance/auditLog");

const allowedPhases = new Set([
    "observed", "recommended", "prepared", "requested", "executed", "learned"
]);

function activityPath() {
    return process.env.JARVIS_ACTIVITY_LOG_PATH ||
        path.join(__dirname, "../data/activity/activity.jsonl");
}

function safeDetails(details = {}) {
    const allowed = ["requestId", "ventureId", "organizationId", "action", "provider", "model", "outcome"];
    return Object.fromEntries(allowed.filter(key => details[key] !== undefined).map(key => [key, details[key]]));
}

function append(phase, summary, details = {}) {
    if (!allowedPhases.has(phase)) throw new Error(`Unknown activity phase: ${phase}`);
    const record = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        phase,
        summary: String(summary).slice(0, 240),
        actor: details.actor || "jarvis",
        source: details.source || "jarvis-os",
        details: safeDetails(details),
        privacy: "private"
    };
    const filePath = activityPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
    return record;
}

function readLines(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean).flatMap(line => {
        try { return [JSON.parse(line)]; } catch (_error) { return []; }
    });
}

function fromAudit(event) {
    const phase = event.event === "approval_requested" ? "requested"
        : event.event === "governed_execution_completed" ? "executed"
            : event.event?.includes("approval") ? "prepared" : "observed";
    return {
        id: `audit-${event.id}`,
        timestamp: event.timestamp,
        phase,
        summary: String(event.event || "Governance event").replaceAll("_", " "),
        actor: event.actor || "governance",
        source: "governance-audit",
        details: safeDetails(event),
        privacy: "restricted"
    };
}

function list(limit = 50) {
    const maximum = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return [...readLines(activityPath()), ...auditLog.list(200).map(fromAudit)]
        .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
        .slice(0, maximum);
}

module.exports = { append, list };
