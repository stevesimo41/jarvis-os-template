const os = require("os");
const path = require("path");

const REQUIRED_SETTINGS = [
    "GOOGLE_SHEETS_SPREADSHEET_ID"
];

function resolveHomePath(value, fallback) {
    const selected = value || fallback;

    if (selected === "~") {
        return os.homedir();
    }

    if (selected.startsWith("~/")) {
        return path.join(
            os.homedir(),
            selected.slice(2)
        );
    }

    return path.resolve(selected);
}

function getGoogleSheetsConfig() {
    const credentialsDirectory =
        path.join(
            os.homedir(),
            ".jarvis",
            "credentials"
        );

    const config = {
        spreadsheetId:
            process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "",

        oauthClientPath:
            resolveHomePath(
                process.env.GOOGLE_OAUTH_CLIENT_PATH,
                path.join(
                    credentialsDirectory,
                    "google-oauth-client.json"
                )
            ),

        oauthTokenPath:
            resolveHomePath(
                process.env.GOOGLE_OAUTH_TOKEN_PATH,
                path.join(
                    credentialsDirectory,
                    "google-oauth-token.json"
                )
            ),

        wellNoticedSheetGid:
            process.env.WELL_NOTICED_SHEET_GID ||
            "1398738875",

        ranges: {
            prospects:
                process.env.GOOGLE_SHEETS_PROSPECTS_RANGE ||
                "Prospects!A:R",

            customers:
                process.env.GOOGLE_SHEETS_CUSTOMERS_RANGE ||
                "Customers!A:Z",

            invoices:
                process.env.GOOGLE_SHEETS_INVOICES_RANGE ||
                "Invoice!A:Z",

            all:
                process.env.GOOGLE_SHEETS_ALL_RANGE ||
                "All!A:Z",

            sheet5:
                process.env.GOOGLE_SHEETS_SHEET5_RANGE ||
                "Sheet5!A:X"
        }
    };

    const missing = REQUIRED_SETTINGS.filter(name =>
        !process.env[name]
    );

    return {
        ...config,
        configured: missing.length === 0,
        missing
    };
}

module.exports = {
    getGoogleSheetsConfig
};
