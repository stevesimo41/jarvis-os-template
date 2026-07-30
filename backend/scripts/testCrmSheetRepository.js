require("../config/loadEnvironment");

const GoogleSheetsProvider =
    require("../providers/googleSheetsProvider");

const CrmSheetRepository =
    require("../repositories/crmSheetRepository");

async function main() {
    const provider =
        new GoogleSheetsProvider();

    const repository =
        new CrmSheetRepository(provider);

    console.log(
        "CRM SHEET REPOSITORY STATUS:"
    );
    console.log(
        JSON.stringify(
            repository.getStatus(),
            null,
            2
        )
    );

    const metadata =
        await provider.getSpreadsheetMetadata();

    console.log(
        `\nCONNECTED: ${metadata.properties.title}`
    );

    const entities = [
        "prospects",
        "customers",
        "invoices",
        "all",
        "sheet5"
    ];

    for (const entity of entities) {
        const records =
            await repository.getEntity(
                entity
            );

        const firstRecord =
            records[0] || {};

        console.log(
            `\n${entity.toUpperCase()}: ${records.length} populated records`
        );

        console.log(
            "HEADERS:",
            Object.keys(firstRecord)
                .filter(key =>
                    key !== "_sheetRow"
                )
                .join(" | ") ||
                "(no populated records)"
        );
    }

    console.log(
        "\nCRM-003 OAUTH MIGRATION TEST PASSED"
    );
}

main().catch(error => {
    console.error(
        "\nCRM-003 OAUTH MIGRATION TEST FAILED:",
        error.message
    );

    process.exitCode = 1;
});
