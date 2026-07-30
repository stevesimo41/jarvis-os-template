const fs = require("fs");

const {
    getGoogleSheetsConfig
} = require("../config/googleSheets");

const {
    createGoogleSheetsClient
} = require("./createGoogleSheetsClient");

function rgbToStatus(bg) {
    if (!bg) return "white";
    const r = Math.round((bg.red || 0) * 255);
    const g = Math.round((bg.green || 0) * 255);
    const b = Math.round((bg.blue || 0) * 255);

    if (r > 200 && g > 200 && b > 200) return "white";
    if (r < 100 && g < 100 && b < 100) return "gray";
    if (r > 180 && g < 150 && b < 100) return "orange";
    if (r < 150 && g < 150 && b > 180) return "blue";
    if (r > 100 && g > 100 && b > 100) return "gray";
    return "white";
}

function statusToRgb(status) {
    const colors = {
        white: { red: 1, green: 1, blue: 1 },
        blue: { red: 0.2, green: 0.4, blue: 0.8 },
        orange: { red: 1, green: 0.6, blue: 0 },
        gray: { red: 0.7, green: 0.7, blue: 0.7 }
    };
    return colors[status] || colors.white;
}

class GoogleSheetsProvider {
    constructor(options = {}) {
        this.config =
            options.config ||
            getGoogleSheetsConfig();

        this.client =
            options.client ||
            null;
    }

    getStatus() {
        return {
            provider: "google-sheets",
            authentication: "oauth-desktop",
            configured: this.config.configured,
            spreadsheetIdPresent:
                Boolean(this.config.spreadsheetId),
            oauthClientPresent:
                fs.existsSync(
                    this.config.oauthClientPath
                ),
            oauthTokenPresent:
                fs.existsSync(
                    this.config.oauthTokenPath
                ),
            oauthClientPath:
                this.config.oauthClientPath,
            oauthTokenPath:
                this.config.oauthTokenPath,
            missing:
                this.config.missing
        };
    }

    async connect() {
        if (!this.config.configured) {
            throw new Error(
                `Google Sheets provider is not configured. Missing: ${this.config.missing.join(", ")}`
            );
        }

        if (!this.client) {
            this.client =
                createGoogleSheetsClient({
                    config: this.config
                });
        }

        return this.client;
    }

    async withRetry(fn, retries = 2) {
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                const isAuthError = error.message?.includes("token") || error.message?.includes("auth") ||
                    error.message?.includes("refresh") || error.message?.includes("ENOTFOUND") ||
                    error.code === 401 || error.code === 403 || (typeof error.code === "string" && error.code.startsWith("ENO"));
                if (isAuthError) {
                    this.client = null;
                    console.warn(`[GoogleSheetsProvider] Auth/network error, retrying (${attempt + 1}/${retries}): ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                } else {
                    throw error;
                }
            }
        }
        try { require("../services/alertService").record("googleSheets"); } catch {}
        throw lastError;
    }

    async getSpreadsheetMetadata() {
        const client =
            await this.connect();

        const response =
            await client.spreadsheets.get({
                spreadsheetId:
                    this.config.spreadsheetId,
                fields:
                    "properties.title,sheets.properties"
            });

        return response.data;
    }

    async readRange(range) {
        if (!range) {
            throw new Error(
                "A Google Sheets range is required."
            );
        }

        return this.withRetry(async () => {
            const client = await this.connect();
            const response = await client.spreadsheets.values.get({
                spreadsheetId: this.config.spreadsheetId,
                range
            });
            return response.data.values || [];
        });
    }

    async writeRange(range, values) {
        if (!range) {
            throw new Error(
                "A Google Sheets range is required."
            );
        }

        if (!Array.isArray(values)) {
            throw new Error(
                "Values must be an array."
            );
        }

        return this.withRetry(async () => {
            const client = await this.connect();
            const response = await client.spreadsheets.values.update({
                spreadsheetId: this.config.spreadsheetId,
                range,
                valueInputOption: "USER_ENTERED",
                requestBody: { values }
            });
            return response.data;
        });
    }

    async readRangeWithFormatting(range) {
        if (!range) {
            throw new Error("A Google Sheets range is required.");
        }

        const client = await this.connect();

        const response = await client.spreadsheets.get({
            spreadsheetId: this.config.spreadsheetId,
            ranges: range,
            includeGridData: true,
        });

        const sheets = response.data.sheets || [];
        if (sheets.length === 0) return { values: [], colors: [] };

        const sheetData = sheets[0].data || [];
        if (sheetData.length === 0) return { values: [], colors: [] };

        const values = [];
        const colors = [];

        for (const block of sheetData) {
            const rows = block.rowData || [];

            for (const row of rows) {
                const cells = row.values || [];

                if (cells.length === 0) continue;

                const rowValues = [];
                const colorRow = [];

                for (const cell of cells) {
                    if (!cell) {
                        rowValues.push("");
                        colorRow.push("white");
                        continue;
                    }
                    const val = cell.userEnteredValue;
                    const effectiveVal = cell.effectiveValue;
                    let cellValue = "";
                    if (val) {
                        cellValue = val.stringValue ?? val.numberValue ?? val.boolValue ?? val.formulaValue ?? "";
                    } else if (effectiveVal) {
                        cellValue = effectiveVal.stringValue ?? effectiveVal.numberValue ?? effectiveVal.boolValue ?? "";
                    }
                    rowValues.push(cellValue);

                    const bg = cell.userEnteredFormat?.backgroundColor || cell.effectiveFormat?.backgroundColor;
                    if (bg) {
                        colorRow.push(rgbToStatus(bg));
                    } else {
                        colorRow.push("white");
                    }
                }

                values.push(rowValues);
                colors.push(colorRow);
            }
        }

        return { values, colors };
    }

    async updateCellFormat(range, backgroundColor) {
        if (!range) {
            throw new Error("A Google Sheets range is required.");
        }

        const client = await this.connect();

        const color = statusToRgb(backgroundColor);

        const response = await client.spreadsheets.batchUpdate({
            spreadsheetId: this.config.spreadsheetId,
            requestBody: {
                requests: [{
                    repeatCell: {
                        range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: color
                            }
                        },
                        fields: "userEnteredFormat.backgroundColor"
                    }
                }]
            }
        });

        return response.data;
    }

    async appendRange(range, values) {
        if (!range) {
            throw new Error(
                "A Google Sheets range is required."
            );
        }

        if (!Array.isArray(values)) {
            throw new Error(
                "Values must be an array."
            );
        }

        return this.withRetry(async () => {
            const client = await this.connect();
            const response = await client.spreadsheets.values.append({
                spreadsheetId: this.config.spreadsheetId,
                range,
                valueInputOption: "USER_ENTERED",
                insertDataOption: "INSERT_ROWS",
                requestBody: { values }
            });
            return response.data;
        });
    }
}

module.exports = GoogleSheetsProvider;
