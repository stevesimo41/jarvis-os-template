const fs = require("fs");
const path = require("path");
const { configurationStatus } = require("../auth/localAuth");
const secretVault = require("../services/secretVaultService");
const { getGoogleSheetsConfig } = require("../config/googleSheets");

const repoRoot = path.resolve(__dirname, "../..");

function backupInventory() {
    const directory = path.join(repoRoot, "backups");
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory)
        .filter(name => name.endsWith(".backup.json"))
        .map(name => {
            const stats = fs.statSync(path.join(directory, name));
            return { name, modifiedAt: stats.mtime.toISOString(), bytes: stats.size };
        })
        .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

function assessment() {
    const auth = configurationStatus();
    const vaultExists = fs.existsSync(secretVault.vaultPath());
    const backups = backupInventory();
    const sheets = getGoogleSheetsConfig();
    const remoteConfigured = process.env.JARVIS_REMOTE_ACCESS === "true" &&
        process.env.JARVIS_TRUST_PROXY === "true" &&
        Boolean(process.env.JARVIS_ALLOWED_ORIGINS) &&
        Boolean(process.env.JARVIS_ALLOWED_HOSTS);
    const gates = [
        { id: "authentication", label: "Strong role authentication", ready: auth.valid, critical: true, detail: auth.valid ? `${auth.roles.length} roles configured` : "Generate and configure unique role tokens" },
        { id: "encrypted-vault", label: "Encrypted credential vault", ready: vaultExists && Boolean(process.env.JARVIS_SECRETS_PASSPHRASE), critical: true, detail: vaultExists ? "Vault exists; launch passphrase must be supplied" : "Plaintext-to-vault migration not completed" },
        { id: "encrypted-backup", label: "Encrypted operational backup", ready: backups.length > 0, critical: true, detail: backups.length ? `Latest backup ${backups[0].modifiedAt}` : "Create, copy off-device, and verify an encrypted backup" },
        { id: "private-https", label: "Private HTTPS remote access", ready: remoteConfigured, critical: true, detail: remoteConfigured ? "Remote protection configuration present" : "Keep JARVIS loopback-only until private HTTPS is deployed" },
        { id: "google-sheets", label: "Google Sheets CRM provider", ready: sheets.configured, critical: false, detail: sheets.configured ? "Spreadsheet setting present; credentialed validation still required" : "Local CRM remains active; live provider not configured" },
        { id: "openai-provider", label: "Generative conversation provider", ready: Boolean(process.env.OPENAI_API_KEY), critical: false, detail: process.env.OPENAI_API_KEY ? "Provider configured" : "Local response engine active" },
        { id: "recovery-drill", label: "Documented recovery rehearsal", ready: process.env.JARVIS_RECOVERY_DRILL_COMPLETE === "true", critical: true, detail: "Requires operator-confirmed off-device restore rehearsal" }
    ];
    const ready = gates.filter(gate => gate.ready).length;
    const criticalBlockers = gates.filter(gate => gate.critical && !gate.ready);
    return {
        assessedAt: new Date().toISOString(),
        status: criticalBlockers.length ? "not-production-ready" : "ready-for-supervised-pilot",
        score: Math.round((ready / gates.length) * 100),
        gates,
        criticalBlockers: criticalBlockers.map(gate => gate.id),
        boundaries: { publicExposureAllowed: false, autonomousExternalActionsAllowed: false }
    };
}

module.exports = { assessment };
