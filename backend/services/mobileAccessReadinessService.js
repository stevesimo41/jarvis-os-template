const auth = require("../auth/localAuth");
const readiness = require("../readiness/readinessService");

function status() {
    const base = readiness.assessment();
    const remoteEnabled = process.env.JARVIS_REMOTE_ACCESS === "true";
    const privateGateway = String(process.env.JARVIS_PRIVATE_GATEWAY || "").toLowerCase();
    const gatewayApproved = ["tailscale", "cloudflare-access", "private-reverse-proxy"].includes(privateGateway);
    const deviceEnrollment = process.env.JARVIS_DEVICE_ENROLLMENT === "true";
    const httpsOrigin = (process.env.JARVIS_ALLOWED_ORIGINS || "").split(",").some(value => value.trim().startsWith("https://"));
    const gates = [
        { id: "strong-auth", ready: auth.configurationStatus().valid, label: "Strong owner authentication" },
        { id: "private-gateway", ready: gatewayApproved, label: "Approved private gateway" },
        { id: "https-origin", ready: httpsOrigin, label: "Allowlisted HTTPS origin" },
        { id: "remote-api-protection", ready: remoteEnabled, label: "Remote API authentication" },
        { id: "device-enrollment", ready: deviceEnrollment, label: "Device enrollment policy" },
        { id: "recovery", ready: !base.criticalBlockers.includes("recovery-drill"), label: "Recovery drill complete" }
    ];
    return {
        status: gates.every(item => item.ready) ? "ready-for-private-phone-pilot" : "not-ready",
        gates,
        gateway: gatewayApproved ? privateGateway : "not-configured",
        publicUrl: null,
        developmentServerExposureAllowed: false,
        installablePwa: true,
        authenticationRequired: true,
        setupSequence: ["Configure strong owner authentication", "Choose an approved private HTTPS gateway", "Allowlist the HTTPS origin", "Enable remote API protection", "Enroll and name the iPhone session", "Verify emergency stop and session revocation", "Complete recovery drill"],
        warning: "Never port-forward localhost:3000 or expose the Node development server directly."
    };
}

module.exports = { status };
