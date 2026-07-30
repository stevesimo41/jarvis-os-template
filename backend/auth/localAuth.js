const crypto = require("crypto");
const { sendError } = require("../http/apiResponse");
const sessions = require("./sessionService");

const ROLE_RANK = {
    viewer: 1,
    operator: 2,
    owner: 3
};

function configuredIdentities() {
    return [
        {
            role: "owner",
            name: process.env.JARVIS_OWNER_NAME || "owner",
            token: process.env.JARVIS_OWNER_TOKEN || ""
        },
        {
            role: "operator",
            name: process.env.JARVIS_OPERATOR_NAME || "jarvis-operator",
            token: process.env.JARVIS_OPERATOR_TOKEN || ""
        },
        {
            role: "viewer",
            name: process.env.JARVIS_VIEWER_NAME || "jarvis-viewer",
            token: process.env.JARVIS_VIEWER_TOKEN || ""
        }
    ].filter(identity => identity.token);
}

function configurationStatus() {
    const identities = configuredIdentities();
    const tokens = identities.map(identity => identity.token);
    const weakToken = tokens.some(token => token.length < 32);
    const duplicateToken = new Set(tokens).size !== tokens.length;

    return {
        configured: identities.length > 0,
        valid: identities.length > 0 && !weakToken && !duplicateToken,
        roles: identities.map(identity => identity.role),
        minimumTokenLength: 32,
        issues: [
            ...(weakToken ? ["One or more tokens are shorter than 32 characters."] : []),
            ...(duplicateToken ? ["Authentication tokens must be unique per role."] : [])
        ]
    };
}

function secureEqual(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));

    return leftBuffer.length === rightBuffer.length &&
        crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function bearerToken(req) {
    const authorization = req.get("Authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : "";
}

function cookieToken(req) {
    const cookies = String(req.get("Cookie") || "").split(";");
    const match = cookies
        .map(value => value.trim().split("="))
        .find(([name]) => name === "jarvis_session");
    return match ? decodeURIComponent(match.slice(1).join("=")) : "";
}

function bootstrapIdentity(token) {
    return token
        ? configuredIdentities().find(candidate => secureEqual(candidate.token, token))
        : null;
}

function authenticateBootstrap(req, res, next) {
    const status = configurationStatus();
    if (!status.configured || !status.valid) {
        return sendError(req, res, {
            statusCode: 503,
            code: status.configured
                ? "AUTH_CONFIGURATION_INVALID"
                : "AUTH_NOT_CONFIGURED",
            message: status.configured
                ? status.issues.join(" ")
                : "Local authentication is not configured."
        });
    }

    const identity = bootstrapIdentity(bearerToken(req));
    if (!identity) {
        return sendError(req, res, {
            statusCode: 401,
            code: "BOOTSTRAP_AUTHENTICATION_REQUIRED",
            message: "A valid bootstrap bearer token is required."
        });
    }
    req.auth = { name: identity.name, role: identity.role, credential: "bootstrap" };
    return next();
}

function authenticate(req, res, next) {
    const identities = configuredIdentities();
    const status = configurationStatus();

    if (!status.configured) {
        return sendError(req, res, {
            statusCode: 503,
            code: "AUTH_NOT_CONFIGURED",
            message: "Local authentication is not configured."
        });
    }

    if (!status.valid) {
        return sendError(req, res, {
            statusCode: 503,
            code: "AUTH_CONFIGURATION_INVALID",
            message: status.issues.join(" ")
        });
    }

    const token = bearerToken(req) || cookieToken(req);
    const identity = bootstrapIdentity(token);
    const session = identity ? null : sessions.authenticate(token);

    if (!identity && !session) {
        return sendError(req, res, {
            statusCode: 401,
            code: "AUTHENTICATION_REQUIRED",
            message: "A valid local bearer token is required."
        });
    }

    req.auth = {
        name: identity?.name || session.name,
        role: identity?.role || session.role,
        credential: identity ? "bootstrap" : "session",
        sessionId: session?.id || null
    };
    return next();
}

function requireRole(minimumRole) {
    return [
        authenticate,
        (req, res, next) => {
            if (ROLE_RANK[req.auth.role] < ROLE_RANK[minimumRole]) {
                return sendError(req, res, {
                    statusCode: 403,
                    code: "INSUFFICIENT_ROLE",
                    message: `${minimumRole} role is required.`
                });
            }

            return next();
        }
    ];
}

module.exports = {
    authenticate,
    authenticateBootstrap,
    configurationStatus,
    configuredIdentities,
    requireRole
};
