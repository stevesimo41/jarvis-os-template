const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data/agents");
const STATE_FILE = path.join(DATA_DIR, "agent-escalations.json");

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Failed to load escalation state:", e.message);
    }
    return { escalations: [] };
}

function saveState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Failed to save escalation state:", e.message);
    }
}

function raise(agentId, type, message, context, severity) {
    const state = loadState();
    const escalation = {
        id: `escalation-${crypto.randomUUID().slice(0, 8)}`,
        agentId,
        type: type || "blocker",
        message,
        context: context || {},
        severity: severity || "warning",
        raisedAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        resolution: null
    };
    state.escalations.push(escalation);
    state.escalations = state.escalations.slice(-200);
    saveState(state);
    return escalation;
}

function resolve(escalationId, resolvedBy, resolution) {
    const state = loadState();
    const esc = state.escalations.find(e => e.id === escalationId);
    if (!esc) return null;
    esc.resolvedAt = new Date().toISOString();
    esc.resolvedBy = resolvedBy || "owner";
    esc.resolution = resolution || "Resolved";
    saveState(state);
    return esc;
}

function active() {
    return loadState().escalations.filter(e => !e.resolvedAt);
}

function all() {
    return loadState().escalations;
}

function byAgent(agentId) {
    return loadState().escalations.filter(e => e.agentId === agentId && !e.resolvedAt);
}

function status() {
    const all_ = loadState().escalations;
    const active_ = all_.filter(e => !e.resolvedAt);
    return {
        total: all_.length,
        active: active_.length,
        resolved: all_.length - active_.length,
        bySeverity: {
            critical: active_.filter(e => e.severity === "critical").length,
            warning: active_.filter(e => e.severity === "warning").length,
            info: active_.filter(e => e.severity === "info").length
        },
        byAgent: active_.reduce((acc, e) => {
            acc[e.agentId] = (acc[e.agentId] || 0) + 1;
            return acc;
        }, {})
    };
}

module.exports = { raise, resolve, active, all, byAgent, status };
