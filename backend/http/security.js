const { authenticate, configurationStatus } = require("../auth/localAuth");
const { sendError } = require("./apiResponse");

const buckets = new Map();

function securityHeaders(_req, res, next) {
    res.set({
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
    });
    if (_req.secure || _req.get("X-Forwarded-Proto") === "https") {
        res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    return next();
}

function requestHostname(req) {
    const host = String(req.get("Host") || "");
    if (host.startsWith("[")) return host.slice(1, host.indexOf("]"));
    return host.split(":")[0];
}

function hostGuard(req, res, next) {
    const allowed = new Set([
        "localhost",
        "127.0.0.1",
        "::1",
        ...String(process.env.JARVIS_ALLOWED_HOSTS || "")
            .split(",")
            .map(value => value.trim())
            .filter(Boolean)
    ]);
    if (!allowed.has(requestHostname(req))) {
        return sendError(req, res, {
            statusCode: 403,
            code: "HOST_NOT_ALLOWED",
            message: "Request host is not allowed."
        });
    }
    return next();
}

function allowedOrigins(req) {
    const configured = String(process.env.JARVIS_ALLOWED_ORIGINS || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
    const host = req.get("Host");
    return new Set([
        ...configured,
        ...(host ? [`http://${host}`, `https://${host}`] : [])
    ]);
}

function sameOriginCors(req, res, next) {
    const origin = req.get("Origin");
    if (origin && !allowedOrigins(req).has(origin)) {
        return sendError(req, res, {
            statusCode: 403,
            code: "ORIGIN_NOT_ALLOWED",
            message: "Request origin is not allowed."
        });
    }
    if (origin) {
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Vary", "Origin");
    }
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id");
    res.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
}

function rateLimit(options = {}) {
    const windowMs = options.windowMs || 60_000;
    const maximum = options.maximum || 300;
    const scope = options.scope || "api";

    return (req, res, next) => {
        const now = Date.now();
        const key = `${scope}:${req.ip || req.socket.remoteAddress || "local"}`;
        const current = buckets.get(key);
        const bucket = !current || current.resetAt <= now
            ? { count: 0, resetAt: now + windowMs }
            : current;
        bucket.count += 1;
        buckets.set(key, bucket);
        res.set("RateLimit-Limit", String(maximum));
        res.set("RateLimit-Remaining", String(Math.max(0, maximum - bucket.count)));
        res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
        if (bucket.count > maximum) {
            return sendError(req, res, {
                statusCode: 429,
                code: "RATE_LIMITED",
                message: "Too many requests. Try again later."
            });
        }
        return next();
    };
}

function remoteApiProtection(req, res, next) {
    if (process.env.JARVIS_REMOTE_ACCESS !== "true") return next();
    const publicRoutes = new Set([
        "/api/auth/status",
        "/api/auth/session"
    ]);
    if (!req.path.startsWith("/api/") || publicRoutes.has(req.path)) return next();
    return authenticate(req, res, next);
}

function isLocalNetwork(host) {
    return host === "0.0.0.0" || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

function validateRemoteConfiguration(host) {
    const loopback = new Set(["127.0.0.1", "::1", "localhost"]);
    if (!loopback.has(host) && !isLocalNetwork(host) && process.env.JARVIS_REMOTE_ACCESS !== "true") {
        throw new Error(
            "Non-loopback binding requires JARVIS_REMOTE_ACCESS=true and hardened authentication."
        );
    }
    if (process.env.JARVIS_REMOTE_ACCESS === "true") {
        const auth = configurationStatus();
        if (!auth.valid) {
            throw new Error("Remote access requires valid authentication configuration.");
        }
        if (process.env.JARVIS_TRUST_PROXY !== "true") {
            throw new Error("Remote access requires a trusted HTTPS reverse proxy.");
        }
        if (!process.env.JARVIS_ALLOWED_ORIGINS || !process.env.JARVIS_ALLOWED_HOSTS) {
            throw new Error("Remote access requires explicit allowed origins and hosts.");
        }
    }
}

module.exports = {
    rateLimit,
    hostGuard,
    remoteApiProtection,
    sameOriginCors,
    securityHeaders,
    validateRemoteConfiguration
};
