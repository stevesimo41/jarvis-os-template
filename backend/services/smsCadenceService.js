const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const activity = require("../brain/activityService");

const STATE_PATH = path.join(__dirname, "../data/agents/well-noticed-sms-cadences.json");

function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_e) { return fallback; }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadState() {
    return readJson(STATE_PATH, { cadences: [] });
}

function saveState(state) {
    writeJson(STATE_PATH, state);
}

const SMS_CADENCE_STEPS = [
    { step: 1, channel: "sms", delayDays: 0, name: "Introduction Text", description: "Initial introduction via text" },
    { step: 2, channel: "sms", delayDays: 2, name: "Value Prop Text", description: "Share the value proposition" },
    { step: 3, channel: "sms", delayDays: 4, name: "Social Proof Text", description: "Share credibility and results" },
    { step: 4, channel: "sms", delayDays: 7, name: "Final Follow-Up Text", description: "Last outreach with urgency" }
];

function getSmsMessages(prospect) {
    const name = prospect.name || "your business";
    const category = prospect.category || "local business";
    const city = prospect.city || "Columbus";
    const execName = prospect.executiveName || "";
    const greeting = execName ? `Hi ${execName}` : `Hi there`;

    return [
        {
            step: 1,
            channel: "sms",
            message: `${greeting}, I'm reaching out about ${name} and a partnership opportunity I believe could be a strong fit. We're limiting partners to one per category and your business stood out. Would you be open to a quick 10-min call this week?`,
            notes: "Introduction text. Keep it under 300 chars for best delivery."
        },
        {
            step: 2,
            channel: "sms",
            message: `${greeting} — circling back on the partnership opportunity. Each partner gets measurable results and targeted audience reach. Would love 5 minutes to show you how this could work for ${name}.`,
            notes: "Value prop text with QR code and audience stats."
        },
        {
            step: 3,
            channel: "sms",
            message: `${greeting}, quick update — we've had strong interest from businesses in your space. Given ${name}'s reputation, I'd hate for the opportunity to pass before we connect. Any interest in a brief call?`,
            notes: "Social proof + urgency text."
        },
        {
            step: 4,
            channel: "sms",
            message: `${greeting} — last note from me. We're finalizing our partner selection this week. No pressure, but wanted to give ${name} one more look at the opportunity. Happy to chat whenever works.`,
            notes: "Final follow-up with clear deadline."
        }
    ];
}

function createSmsCadence(prospect) {
    const state = loadState();
    const name = prospect.name || prospect.companyName || "";
    const phone = prospect.phone || prospect.phones?.[0] || "";
    if (!name || !phone) return null;

    const existing = state.cadences.find(c =>
        c.status === "active" && c.phone === phone
    );
    if (existing) return null;

    const messages = getSmsMessages(prospect);
    const id = `sms-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    const cadence = {
        id,
        ventureId: "well-noticed",
        type: "sms",
        prospectName: name,
        executiveName: prospect.executiveName || "",
        phone,
        fitScore: prospect.fitScore || 0,
        category: prospect.category || "",
        status: "active",
        currentStep: 1,
        startedAt: now.toISOString(),
        nextActionAt: now.toISOString(),
        steps: messages.map(m => ({
            ...m,
            status: "pending",
            executedAt: null,
            notes: null
        })),
        createdAt: now.toISOString()
    };

    state.cadences.push(cadence);
    saveState(state);

    activity.append("prepared", `SMS cadence created for ${name} (${phone})`, {
        source: "sms-cadence",
        cadenceId: id,
        prospectName: name,
        phone,
        totalSteps: messages.length
    });

    return cadence;
}

function listActiveSmsCadences() {
    const state = loadState();
    return state.cadences.filter(c => c.status === "active");
}

function pauseSmsCadence(id, reason) {
    const state = loadState();
    const cadence = state.cadences.find(c => c.id === id);
    if (!cadence) return null;
    cadence.status = "paused";
    cadence.pauseReason = reason || "Manually paused";
    saveState(state);
    return cadence;
}

function metrics() {
    const state = loadState();
    const cadences = state.cadences || [];
    return {
        total: cadences.length,
        active: cadences.filter(c => c.status === "active").length,
        completed: cadences.filter(c => c.status === "completed").length,
        paused: cadences.filter(c => c.status === "paused").length
    };
}

module.exports = {
    createSmsCadence,
    listActiveSmsCadences,
    pauseSmsCadence,
    metrics,
    getSmsMessages,
    SMS_CADENCE_STEPS
};
