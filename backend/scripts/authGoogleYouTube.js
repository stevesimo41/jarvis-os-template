const fs = require("fs");
const os = require("os");
const path = require("path");

require("../config/loadEnvironment");

const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/youtube"
];

const CREDENTIALS_PATH = path.join(os.homedir(), ".jarvis", "credentials", "google-oauth-client.json");

const TOKEN_PATH = path.join(os.homedir(), ".jarvis", "credentials", "google-oauth-token.json");

async function loadSavedCredentials() {
    try {
        const content = fs.readFileSync(TOKEN_PATH, "utf8");
        return google.auth.fromJSON(JSON.parse(content));
    } catch {
        return null;
    }
}

async function saveCredentials(client) {
    const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    if (!key) throw new Error("OAuth client JSON is missing installed credentials.");

    const payload = {
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
        scope: SCOPES.join(" ")
    };

    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true, mode: 0o700 });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
    console.log(`Token saved to ${TOKEN_PATH}`);
}

async function authorize() {
    let client = await loadSavedCredentials();
    if (client) {
        console.log("Existing token found. Checking YouTube access...");
        try {
            const youtube = google.youtube({ version: "v3", auth: client });
            const test = await youtube.channels.list({ part: "snippet", mine: true });
            console.log(`YouTube API works! Channel: ${test.data.items?.[0]?.snippet?.title || "connected"}`);
            return client;
        } catch (e) {
            if (e.message?.includes("insufficient")) {
                console.log("Token doesn't have YouTube scope. Re-authenticating...");
            } else {
                console.log(`YouTube check failed: ${e.message}. Will re-authenticate anyway.`);
            }
        }
    }

    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH
    });

    if (client.credentials) {
        await saveCredentials(client);
    }

    return client;
}

async function run() {
    console.log("JARVIS — Google YouTube + Sheets Authorization");
    console.log("===============================================");
    console.log("A browser window will open. Sign in as wellnoticedcolumbus@gmail.com");
    console.log("and grant access to manage your YouTube channel and sheets.\n");

    const auth = await authorize();

    console.log("\n=== VERIFICATION ===");
    console.log("YouTube & Sheets:");
    const youtube = google.youtube({ version: "v3", auth });
    const ytRes = await youtube.channels.list({ part: "snippet", mine: true });
    const channel = ytRes.data.items?.[0];
    if (channel) {
        console.log(`  Channel: ${channel.snippet.title}`);
        console.log(`  URL: https://www.youtube.com/channel/${channel.id}`);
    } else {
        console.log("  No channel found on this account.");
    }

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (sheetId) {
        const ssRes = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: "properties.title" });
        console.log(`  Sheets: ${ssRes.data.properties.title}`);
    }

    console.log("\n✅ YouTube + Sheets both authorized. You can now use YouTube API features.");
}

run().catch(err => {
    console.error("\n❌ Authorization failed:", err.message);
    process.exit(1);
});