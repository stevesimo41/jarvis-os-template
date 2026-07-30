const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const activity = require("../brain/activityService");

const TRACKING_PATH = path.join(__dirname, "../data/agents/email-tracking.json");

function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_e) { return fallback; }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadState() {
    return readJson(TRACKING_PATH, { mappings: [], events: [], counters: { opens: 0, clicks: 0 } });
}

function saveState(state) {
    writeJson(TRACKING_PATH, state);
}

function registerEmail(campaignId, stepNumber, to, subject) {
    const state = loadState();
    const trackingId = crypto.randomUUID().slice(0, 12);
    const mapping = {
        trackingId,
        campaignId,
        stepNumber,
        to,
        subject: (subject || "").substring(0, 120),
        registeredAt: new Date().toISOString(),
        openCount: 0,
        clickCount: 0,
        lastOpenAt: null,
        lastClickAt: null
    };
    state.mappings.push(mapping);
    saveState(state);
    return trackingId;
}

function recordEvent(trackingId, eventType, meta) {
    const state = loadState();
    const mapping = state.mappings.find(m => m.trackingId === trackingId);
    if (!mapping) return null;

    const event = {
        trackingId,
        campaignId: mapping.campaignId,
        stepNumber: mapping.stepNumber,
        to: mapping.to,
        type: eventType,
        timestamp: new Date().toISOString(),
        ip: meta?.ip || null,
        userAgent: meta?.userAgent || null,
        url: meta?.url || null
    };
    state.events.push(event);

    if (eventType === "open") {
        mapping.openCount = (mapping.openCount || 0) + 1;
        mapping.lastOpenAt = event.timestamp;
        state.counters.opens = (state.counters.opens || 0) + 1;
    } else if (eventType === "click") {
        mapping.clickCount = (mapping.clickCount || 0) + 1;
        mapping.lastClickAt = event.timestamp;
        state.counters.clicks = (state.counters.clicks || 0) + 1;
    }

    saveState(state);

    activity.append("observed", `Email ${eventType}: ${mapping.to} (${mapping.campaignId} step ${mapping.stepNumber})`, {
        source: "email-tracking",
        trackingId,
        type: eventType,
        campaignId: mapping.campaignId
    });

    return mapping;
}

function getTrackingByCampaign(campaignId) {
    const state = loadState();
    if (!campaignId) return state.mappings || [];
    return state.mappings.filter(m => m.campaignId === campaignId);
}

function getTrackingStats() {
    const state = loadState();
    const mappings = state.mappings || [];
    const totalSent = mappings.length;
    const totalOpened = mappings.filter(m => m.openCount > 0).length;
    const totalClicked = mappings.filter(m => m.clickCount > 0).length;
    return {
        totalSent,
        totalOpened,
        totalClicked,
        openRate: totalSent ? Math.round(totalOpened / totalSent * 100) : 0,
        clickRate: totalSent ? Math.round(totalClicked / totalSent * 100) : 0,
        totalEvents: (state.events || []).length,
        counters: state.counters || { opens: 0, clicks: 0 }
    };
}

function getRecentEvents(limit) {
    const state = loadState();
    return (state.events || []).slice(-(limit || 50)).reverse();
}

const TRACKING_PIXEL = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

function getTrackingPixel() {
    return TRACKING_PIXEL;
}

function wrapLinksWithTracking(trackingId, htmlBody) {
    if (!htmlBody || !trackingId) return htmlBody;
    return htmlBody.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (match, url) => 'href="/api/tracking/click/' + trackingId + '?url=' + encodeURIComponent(url) + '"'
    );
}

module.exports = {
    registerEmail,
    recordEvent,
    getTrackingByCampaign,
    getTrackingStats,
    getRecentEvents,
    getTrackingPixel,
    wrapLinksWithTracking
};
