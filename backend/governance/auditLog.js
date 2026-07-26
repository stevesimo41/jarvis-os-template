const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getAuditPath() {
    return process.env.JARVIS_AUDIT_LOG_PATH ||
        path.join(__dirname, "../data/governance/audit.jsonl");
}

function append(event, details = {}) {
    const record = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event,
        ...details
    };
    const filePath = getAuditPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, {
        encoding: "utf8",
        mode: 0o600,
        flag: "a"
    });
    return record;
}

function list(limit = 50) {
    const filePath = getAuditPath();

    if (!fs.existsSync(filePath)) {
        return [];
    }

    return fs.readFileSync(filePath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .slice(-Math.min(Math.max(limit, 1), 250))
        .reverse();
}

module.exports = {
    append,
    list
};
