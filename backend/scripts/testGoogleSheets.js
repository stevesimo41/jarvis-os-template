require("dotenv").config();

const GoogleSheetsProvider =
    require("../providers/googleSheetsProvider");

const {
    createGoogleSheetsClient
} = require("../providers/createGoogleSheetsClient");

async function run() {
    try {
        const client =
            createGoogleSheetsClient();

        const provider =
            new GoogleSheetsProvider({
                client
            });

        const configStatus =
            provider.getStatus();

        console.log("Google Sheets configuration:");
        console.log(
            JSON.stringify(configStatus, null, 2)
        );

        const metadata =
            await client.spreadsheets.get({
                spreadsheetId:
                    provider.config.spreadsheetId,
                fields:
                    "properties.title,sheets.properties"
            });

        const spreadsheetTitle =
            metadata.data.properties?.title ||
            "Unknown spreadsheet";

        const sheets =
            metadata.data.sheets || [];

        console.log("");
        console.log(
            `CONNECTED: ${spreadsheetTitle}`
        );

        console.log("");
        console.log("AVAILABLE SHEETS:");

        sheets.forEach(sheet => {
            const properties =
                sheet.properties || {};

            console.log(
                [
                    properties.title,
                    `gid=${properties.sheetId}`,
                    `rows=${properties.gridProperties?.rowCount || 0}`,
                    `columns=${properties.gridProperties?.columnCount || 0}`
                ].join(" | ")
            );
        });
    } catch (error) {
        console.error("");
        console.error(
            `GOOGLE SHEETS TEST FAILED: ${error.message}`
        );

        process.exit(1);
    }
}

run();
