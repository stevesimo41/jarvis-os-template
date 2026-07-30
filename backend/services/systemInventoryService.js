const conversation = require("./conversationalJarvisService");
const googleSheets = require("../config/googleSheets");

const modules = [
    { name: "Command Center", classification: "mixed", source: "Live health plus locally derived executive brief", note: "Faith verse is selected from a bundled seven-verse rotation." },
    { name: "Ask JARVIS", classification: "live-service", source: "Conversation service and canonical local context", note: "Uses OpenAI only when configured; otherwise the local response engine answers. Browser conversation history is device-local." },
    { name: "Executive", classification: "derived-seeded", source: "Legacy local memory and scoring engines", note: "Backend-generated, but several priorities and scores originate from seeded JSON rather than current external systems." },
    { name: "Chief of Staff", classification: "local-records", source: "Legacy memory/core JSON", note: "Reads saved profile, ventures, priorities, and decisions; it is not externally synchronized." },
    { name: "Daily Mission", classification: "derived-seeded", source: "Local mission and scheduling engines", note: "Calculated locally from saved tasks and priorities; some guidance text is templated." },
    { name: "Ventures", classification: "local-records", source: "Canonical venture, CRM, and opportunity APIs", note: "Real repository records, but not automatically synchronized with external venture systems." },
    { name: "Agents & Approvals", classification: "mixed", source: "Static registry definitions plus live production, review, and governance services", note: "Registry entries are labeled non-operational; production state, review candidates, and approval records are current local data." },
    { name: "Activity & Context", classification: "live-local", source: "Canonical context plus append-only local activity", note: "Shows actual JARVIS observations and workflow events recorded on this device." },
    { name: "CRM", classification: "snapshot-local", source: "Local CRM repository with optional Google Sheets provider", note: "APCO is a point-in-time snapshot. Google Sheets data is live only when its provider is configured and explicitly used." },
    { name: "Opportunities", classification: "local-records", source: "Local opportunity evidence and scoring ledger", note: "Scores and hypotheses are real stored outputs; projected value is not realized revenue." },
    { name: "Memory", classification: "local-records", source: "Local memory JSON", note: "Saved on this device; legacy and canonical memory stores are not yet physically consolidated." },
    { name: "Development & Releases", classification: "live-local", source: "Canonical releases.json", note: "Reflects committed local releases and their recorded validation results." },
    { name: "Mobile Access", classification: "capability-status", source: "Runtime security and PWA capability checks", note: "Installable locally; secure private HTTPS and device enrollment are not deployed." },
    { name: "Voice & iPhone", classification: "capability-status", source: "Browser voice support and Apple bridge contracts", note: "Push-to-talk is browser-capable; a native Siri replacement is not deployed." },
    { name: "Autonomy Control", classification: "live-local", source: "Durable governance policy and autonomy state", note: "Policy state is real; current runs remain preparation-only." },
    { name: "Readiness & Pilot", classification: "live-local", source: "Runtime configuration checks and pilot ledger", note: "Readiness gates and blockers reflect current local configuration without exposing secrets." },
    { name: "Right-side intelligence rail", classification: "mixed", source: "Canonical executive brief plus static agent definitions", note: "Mission text is canonically derived; agent entries are explicitly labeled REGISTERED, not active." }
];

function inventory() {
    return {
        auditedAt: new Date().toISOString(),
        conversationProvider: conversation.status().provider,
        googleSheetsConfigured: googleSheets.getGoogleSheetsConfig().configured,
        modules,
        legend: {
            "live-service": "A functioning service selected from current configuration",
            "live-local": "Current durable state recorded on this device",
            "local-records": "Real saved records without automatic external synchronization",
            "snapshot-local": "A dated copy that can become stale",
            "derived-seeded": "Calculated by backend code from legacy or seeded inputs",
            "capability-status": "Reports what is supported or configured, not a deployed integration",
            mixed: "Combines more than one source quality",
            placeholder: "Definition or presentation only; not operational evidence"
        }
    };
}

module.exports = { inventory };
