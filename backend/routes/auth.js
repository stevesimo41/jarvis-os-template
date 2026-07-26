const express = require("express");
const {
    authenticateBootstrap,
    configurationStatus,
    requireRole
} = require("../auth/localAuth");
const sessions = require("../auth/sessionService");
const auditLog = require("../governance/auditLog");
const { sendError, sendSuccess } = require("../http/apiResponse");

const router = express.Router();

router.get("/status", (req, res) => {
    return sendSuccess(req, res, {
        authentication: configurationStatus()
    });
});

router.get("/me", ...requireRole("viewer"), (req, res) => {
    return sendSuccess(req, res, {
        identity: req.auth
    });
});

router.post("/session", authenticateBootstrap, (req, res) => {
    const issued = sessions.create(req.auth, {
        deviceName: req.body?.deviceName
    });
    const secure = process.env.NODE_ENV === "production" ||
        process.env.JARVIS_REMOTE_ACCESS === "true";
    res.set("Set-Cookie", [
        `jarvis_session=${encodeURIComponent(issued.token)}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${Math.floor(sessions.sessionTtl() / 1000)}`,
        ...(secure ? ["Secure"] : [])
    ].join("; "));
    auditLog.append("session_created", {
        sessionId: issued.session.id,
        actor: req.auth.name,
        role: req.auth.role,
        deviceName: issued.session.deviceName,
        requestId: req.id
    });
    return sendSuccess(req, res, {
        identity: {
            name: req.auth.name,
            role: req.auth.role
        },
        session: issued.session,
        ...(req.body?.transport === "bearer" ? { token: issued.token } : {})
    }, { statusCode: 201 });
});

router.post("/auto-login", (req, res) => {
    const identities = require("../auth/localAuth").configurationStatus();
    if (!identities.configured) {
        return sendError(req, res, { statusCode: 503, code: "AUTH_NOT_CONFIGURED", message: "No identities configured." });
    }
    const ownerIdentity = require("../auth/localAuth").configuredIdentities().find(i => i.role === "owner");
    if (!ownerIdentity) {
        return sendError(req, res, { statusCode: 503, code: "OWNER_NOT_CONFIGURED", message: "Owner identity not configured." });
    }
    req.auth = { name: ownerIdentity.name, role: ownerIdentity.role, credential: "auto-login" };
    const issued = sessions.create(req.auth, { deviceName: req.body?.deviceName || "JARVIS auto-login" });
    const secure = process.env.NODE_ENV === "production" || process.env.JARVIS_REMOTE_ACCESS === "true";
    res.set("Set-Cookie", [
        `jarvis_session=${encodeURIComponent(issued.token)}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${Math.floor(sessions.sessionTtl() / 1000)}`,
        ...(secure ? ["Secure"] : [])
    ].join("; "));
    auditLog.append("session_created", { sessionId: issued.session.id, actor: req.auth.name, role: req.auth.role, deviceName: "auto-login", requestId: req.id });
    return sendSuccess(req, res, {
        identity: { name: req.auth.name, role: req.auth.role },
        token: issued.token
    }, { statusCode: 201 });
});

router.delete("/session", ...requireRole("viewer"), (req, res) => {
    if (req.auth.sessionId) {
        sessions.revoke(req.auth.sessionId, req.auth.name);
    }
    res.set(
        "Set-Cookie",
        "jarvis_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0"
    );
    return sendSuccess(req, res, { revoked: Boolean(req.auth.sessionId) });
});

router.get("/sessions", ...requireRole("owner"), (req, res) => {
    return sendSuccess(req, res, { sessions: sessions.list() });
});

router.delete("/sessions/:sessionId", ...requireRole("owner"), (req, res) => {
    const revoked = sessions.revoke(req.params.sessionId, req.auth.name);
    if (!revoked) {
        return sendError(req, res, {
            statusCode: 404,
            code: "SESSION_NOT_FOUND",
            message: "Session not found."
        });
    }
    auditLog.append("session_revoked", {
        sessionId: revoked.id,
        actor: req.auth.name,
        requestId: req.id
    });
    return sendSuccess(req, res, { session: revoked });
});

router.post("/sessions/revoke-all", ...requireRole("owner"), (req, res) => {
    const count = sessions.revokeAll(req.auth.name, req.auth.sessionId);
    auditLog.append("sessions_revoked_all", {
        count,
        actor: req.auth.name,
        requestId: req.id
    });
    return sendSuccess(req, res, { revoked: count });
});

module.exports = router;
