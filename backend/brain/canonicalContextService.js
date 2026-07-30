const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readJson } = require("../storage/atomicJsonStore");

const CONTRACT_VERSION = "1.0";
const root = path.resolve(__dirname, "..");

const sources = {
    goals: { file: "memory/context/goals.json", key: "goals", privacy: "private" },
    ventures: { file: "memory/context/avos.json", key: "ventures", privacy: "private" },
    opportunities: { file: "data/crm/opportunities.json", privacy: "confidential" },
    tasks: { file: "data/crm/tasks.json", privacy: "confidential" },
    organizations: { file: "data/crm/organizations.json", privacy: "confidential" },
    contacts: { file: "data/crm/contacts.json", privacy: "confidential" },
    decisions: { file: "memory/history/decisionHistory.json", key: "decisions", privacy: "private" },
    outcomes: { file: "memory/history/outcomes.json", key: "outcomes", privacy: "private" },
    approvals: {
        resolve: () => process.env.JARVIS_APPROVALS_PATH ||
            path.join(root, "data/governance/approvals.json"),
        privacy: "restricted"
    }
};

function sourcePath(definition) {
    return definition.resolve ? definition.resolve() : path.join(root, definition.file);
}

function deterministicId(type, item, index) {
    if (item.id) return String(item.id);
    const identity = item.name || item.title || item.timestamp || JSON.stringify(item);
    return `${type}-${crypto.createHash("sha256").update(`${identity}:${index}`).digest("hex").slice(0, 12)}`;
}

function freshness(observedAt) {
    const ageHours = Math.max(0, (Date.now() - Date.parse(observedAt)) / 3600000);
    if (ageHours <= 24) return "fresh";
    if (ageHours <= 168) return "aging";
    return "stale";
}

function readSource(type, definition) {
    const filePath = sourcePath(definition);
    const exists = fs.existsSync(filePath);
    const modifiedAt = exists ? fs.statSync(filePath).mtime.toISOString() : null;
    const raw = exists ? readJson(filePath, definition.key ? {} : []) : (definition.key ? {} : []);
    const values = definition.key ? raw[definition.key] || [] : raw;
    const records = (Array.isArray(values) ? values : []).map((item, index) => ({
        id: deterministicId(type, item, index),
        type,
        data: item,
        provenance: {
            source: "local-json",
            path: path.relative(root, filePath),
            observedAt: modifiedAt,
            freshness: modifiedAt ? freshness(modifiedAt) : "unknown"
        },
        policy: {
            privacy: definition.privacy,
            retention: type === "approvals" ? "security-record" : "operational",
            writeAuthority: type === "approvals" ? "governance-service" : "source-repository"
        }
    }));
    return { records, exists, modifiedAt };
}

function detectConflicts(collections) {
    const conflicts = [];
    for (const type of ["organizations", "contacts", "ventures"]) {
        const names = new Map();
        for (const record of collections[type] || []) {
            const name = String(record.data.name || record.data["Company Name"] || "").trim().toLowerCase();
            if (!name) continue;
            const existing = names.get(name) || [];
            existing.push(record.id);
            names.set(name, existing);
        }
        for (const [name, ids] of names) {
            if (ids.length > 1) conflicts.push({ type, field: "name", value: name, recordIds: ids });
        }
    }
    return conflicts;
}

function assemble(options = {}) {
    const requested = options.include
        ? String(options.include).split(",").map(value => value.trim()).filter(Boolean)
        : Object.keys(sources);
    const collections = {};
    const sourceStatus = {};

    for (const type of requested) {
        if (!sources[type]) continue;
        const result = readSource(type, sources[type]);
        collections[type] = result.records;
        sourceStatus[type] = {
            available: result.exists,
            count: result.records.length,
            synchronizedAt: result.modifiedAt
        };
    }

    const conflicts = detectConflicts(collections);
    const counts = Object.fromEntries(
        Object.entries(collections).map(([type, records]) => [type, records.length])
    );
    return {
        contractVersion: CONTRACT_VERSION,
        assembledAt: new Date().toISOString(),
        collections,
        summary: {
            counts,
            totalRecords: Object.values(counts).reduce((sum, count) => sum + count, 0),
            conflicts: conflicts.length
        },
        synchronization: {
            strategy: "read-through canonical adapters",
            sourceStatus,
            conversations: {
                available: false,
                ownership: "browser-local until authenticated cross-device history is released"
            }
        },
        conflicts
    };
}

function schema() {
    return {
        contractVersion: CONTRACT_VERSION,
        entityTypes: [...Object.keys(sources), "conversations", "agentActivity"],
        requiredEnvelopeFields: ["id", "type", "data", "provenance", "policy"],
        provenanceFields: ["source", "path", "observedAt", "freshness"],
        privacyClassifications: ["private", "confidential", "restricted"],
        freshnessStates: ["fresh", "aging", "stale", "unknown"],
        conflictRule: "Duplicate normalized names are reported and never merged automatically.",
        retentionRule: "Source repositories remain authoritative; adapters do not duplicate or delete records."
    };
}

module.exports = { assemble, schema, CONTRACT_VERSION };
