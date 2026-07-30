const fs = require("fs");
const os = require("os");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");
const { google } = require("googleapis");

let cachedOAuth = null;

function getCredentialsConfig() {
    const dir = path.join(os.homedir(), ".jarvis", "credentials");
    return {
        clientPath: path.join(dir, "google-oauth-client.json"),
        tokenPath: path.join(dir, "google-oauth-token.json")
    };
}

function readJsonFile(filePath, label) {
    if (!fs.existsSync(filePath)) throw new Error(`${label} not found at ${filePath}`);
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
    catch (e) { throw new Error(`${label} could not be parsed: ${e.message}`); }
}

function getOAuthClient() {
    if (cachedOAuth) return cachedOAuth;
    const { clientPath, tokenPath } = getCredentialsConfig();
    const clientPayload = readJsonFile(clientPath, "Google OAuth client credentials");
    const tokenPayload = readJsonFile(tokenPath, "Google OAuth token");
    const creds = clientPayload.installed || clientPayload.web || {};
    if (!creds.client_id || !creds.client_secret) throw new Error("OAuth client JSON missing client_id or client_secret");
    const oauth2 = new OAuth2Client(creds.client_id, creds.client_secret, (creds.redirect_uris || [])[0] || "http://localhost");
    oauth2.setCredentials(tokenPayload);
    cachedOAuth = oauth2;
    return oauth2;
}

function resetClient() { cachedOAuth = null; }

function getSheetsClient() {
    const auth = getOAuthClient();
    return google.sheets({ version: "v4", auth });
}

function getYouTubeClient() {
    const auth = getOAuthClient();
    return google.youtube({ version: "v3", auth });
}

function getStatus() {
    const { clientPath, tokenPath } = getCredentialsConfig();
    const status = {
        sheets: false,
        youtube: false,
        oauthClientPresent: fs.existsSync(clientPath),
        oauthTokenPresent: fs.existsSync(tokenPath)
    };
    if (status.oauthTokenPresent) {
        try {
            const token = readJsonFile(tokenPath, "token");
            const scopes = (token.scope || "").split(" ").filter(Boolean);
            status.sheets = scopes.some(s => s.includes("spreadsheets"));
            status.youtube = scopes.some(s => s.includes("youtube"));
            status.scopes = scopes;
        } catch (_) {}
    }
    return status;
}

module.exports = { getOAuthClient, getSheetsClient, getYouTubeClient, getStatus, resetClient };