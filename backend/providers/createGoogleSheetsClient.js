const fs = require("fs");
const os = require("os");
const { OAuth2Client } = require("google-auth-library");

const {
    getGoogleSheetsConfig
} = require("../config/googleSheets");

let _Sheets = null;
function getSheetsClass() {
    if (!_Sheets) {
        _Sheets = require("googleapis/build/src/apis/sheets/v4").sheets_v4.Sheets;
    }
    return _Sheets;
}

function readJsonFile(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `${label} was not found at ${filePath}`
        );
    }

    try {
        return JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );
    } catch (error) {
        throw new Error(
            `${label} could not be parsed: ${error.message}`
        );
    }
}

function getDesktopClientCredentials(payload) {
    const credentials =
        payload.installed ||
        payload.web;

    if (!credentials) {
        throw new Error(
            "OAuth client JSON must contain an installed or web credential."
        );
    }

    const {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: redirectUris = []
    } = credentials;

    if (!clientId || !clientSecret) {
        throw new Error(
            "OAuth client JSON is missing client_id or client_secret."
        );
    }

    return {
        clientId,
        clientSecret,
        redirectUri:
            redirectUris[0] ||
            "http://localhost"
    };
}

function createGoogleSheetsClient(options = {}) {
    const config =
        options.config ||
        getGoogleSheetsConfig();

    if (!config.configured) {
        throw new Error(
            `Google Sheets is not configured. Missing: ${config.missing.join(", ")}`
        );
    }

    const clientPayload =
        readJsonFile(
            config.oauthClientPath,
            "Google OAuth client credentials"
        );

    const tokenPayload =
        readJsonFile(
            config.oauthTokenPath,
            "Google OAuth token"
        );

    const {
        clientId,
        clientSecret,
        redirectUri
    } = getDesktopClientCredentials(
        clientPayload
    );

    const oauth2 = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    );

    oauth2.setCredentials(tokenPayload);

    const Sheets = getSheetsClass();
    return new Sheets({ auth: oauth2 });
}

module.exports = {
    createGoogleSheetsClient
};
