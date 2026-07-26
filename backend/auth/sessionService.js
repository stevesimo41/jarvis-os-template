const crypto = require("crypto");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sessionsPath() {
    return process.env.JARVIS_SESSIONS_PATH ||
        path.resolve(__dirname, "../data/auth/sessions.json");
}

function tokenHash(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function sessionTtl() {
    const configured = Number.parseInt(process.env.JARVIS_SESSION_TTL_MINUTES, 10);
    if (!Number.isFinite(configured) || configured < 5) return DEFAULT_TTL_MS;
    return Math.min(configured * 60 * 1000, MAX_TTL_MS);
}

function readSessions() {
    return readJson(sessionsPath(), []);
}

function saveSessions(sessions) {
    return writeJsonAtomic(sessionsPath(), sessions);
}

function publicSession(session) {
    const { hash, ...safe } = session;
    return safe;
}

function prune(sessions, now = Date.now()) {
    return sessions.filter(session =>
        !session.revokedAt && Date.parse(session.expiresAt) > now
    );
}

function create(identity, input = {}) {
    const now = Date.now();
    const token = crypto.randomBytes(32).toString("base64url");
    const session = {
        id: crypto.randomUUID(),
        hash: tokenHash(token),
        name: identity.name,
        role: identity.role,
        deviceName: String(input.deviceName || "JARVIS browser").trim().slice(0, 80),
        createdAt: new Date(now).toISOString(),
        lastSeenAt: new Date(now).toISOString(),
        expiresAt: new Date(now + sessionTtl()).toISOString(),
        revokedAt: null
    };
    saveSessions([...prune(readSessions(), now), session]);
    return { token, session: publicSession(session) };
}

function authenticate(token) {
    if (!token) return null;
    const sessions = readSessions();
    const hash = tokenHash(token);
    const index = sessions.findIndex(item =>
        !item.revokedAt &&
        Date.parse(item.expiresAt) > Date.now() &&
        typeof item.hash === "string" &&
        item.hash.length === hash.length &&
        crypto.timingSafeEqual(Buffer.from(item.hash), Buffer.from(hash))
    );
    if (index === -1) return null;

    sessions[index].lastSeenAt = new Date().toISOString();
    saveSessions(sessions);
    return publicSession(sessions[index]);
}

function list() {
    return readSessions().map(publicSession).reverse();
}

function revoke(id, actor) {
    const sessions = readSessions();
    const index = sessions.findIndex(item => item.id === id);
    if (index === -1) return null;
    sessions[index].revokedAt = new Date().toISOString();
    sessions[index].revokedBy = actor;
    saveSessions(sessions);
    return publicSession(sessions[index]);
}

function revokeAll(actor, exceptId = null) {
    const timestamp = new Date().toISOString();
    const sessions = readSessions().map(session =>
        !session.revokedAt && session.id !== exceptId
            ? { ...session, revokedAt: timestamp, revokedBy: actor }
            : session
    );
    saveSessions(sessions);
    return sessions.filter(item => item.revokedAt === timestamp).length;
}

module.exports = {
    authenticate,
    create,
    list,
    revoke,
    revokeAll,
    sessionTtl
};
