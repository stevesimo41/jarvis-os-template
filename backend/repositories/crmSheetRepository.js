const {
    getGoogleSheetsConfig
} = require("../config/googleSheets");

class CrmSheetRepository {
    constructor(provider, options = {}) {
        if (!provider) {
            throw new Error(
                "CrmSheetRepository requires a provider."
            );
        }

        const config =
            options.config ||
            getGoogleSheetsConfig();

        this.provider = provider;

        this.ranges = {
            prospects:
                options.prospectsRange ||
                config.ranges.prospects,

            customers:
                options.customersRange ||
                config.ranges.customers,

            invoices:
                options.invoicesRange ||
                config.ranges.invoices,

            all:
                options.allRange ||
                config.ranges.all,

            sheet5:
                options.sheet5Range ||
                config.ranges.sheet5
        };

        this.aliases = {
            prospect: "prospects",
            organization: "prospects",
            organizations: "prospects",
            customer: "customers",
            invoice: "invoices",
            activity: "all",
            activities: "all",
            contact: "all",
            contacts: "all",
            task: "sheet5",
            tasks: "sheet5"
        };
    }

    normalizeEntityName(entityName) {
        const normalized =
            String(entityName || "")
                .trim()
                .toLowerCase();

        return (
            this.aliases[normalized] ||
            normalized
        );
    }

    rowsToRecords(rows) {
        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            return [];
        }

        const headers =
            rows[0].map((header, index) => {
                const trimmed =
                    String(header || "").trim();

                return (
                    trimmed ||
                    `column_${index + 1}`
                );
            });

        return rows
            .slice(1)
            .filter(row =>
                row.some(value =>
                    String(value || "").trim()
                )
            )
            .map((row, rowIndex) => {
                const record = {
                    _sheetRow:
                        rowIndex + 2
                };

                headers.forEach(
                    (header, index) => {
                        record[header] =
                            row[index] ?? "";
                    }
                );

                return record;
            });
    }

    rowsToRecordsWithColors(rows, colors) {
        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            return [];
        }

        const headers =
            rows[0].map((header, index) => {
                const trimmed =
                    String(header || "").trim();

                return (
                    trimmed ||
                    `column_${index + 1}`
                );
            });

        return rows
            .slice(1)
            .filter(row =>
                row.some(value =>
                    String(value || "").trim()
                )
            )
            .map((row, rowIndex) => {
                const record = {
                    _sheetRow:
                        rowIndex + 2
                };

                headers.forEach(
                    (header, index) => {
                        record[header] =
                            row[index] ?? "";
                    }
                );

                const colorRow =
                    colors?.[rowIndex + 1] || [];
                const firstColor =
                    colorRow[0] || "white";
                record._status = firstColor;
                record._allColors = colorRow;

                return record;
            });
    }

    async getEntity(entityName) {
        const normalized =
            this.normalizeEntityName(
                entityName
            );

        const range =
            this.ranges[normalized];

        if (!range) {
            throw new Error(
                `Unsupported CRM sheet entity: ${entityName}`
            );
        }

        const rows =
            await this.provider.readRange(
                range
            );

        return this.rowsToRecords(rows);
    }

    async getEntityWithColors(entityName) {
        const normalized =
            this.normalizeEntityName(
                entityName
            );

        const range =
            this.ranges[normalized];

        if (!range) {
            throw new Error(
                `Unsupported CRM sheet entity: ${entityName}`
            );
        }

        const { values, colors } =
            await this.provider.readRangeWithFormatting(
                range
            );

        return this.rowsToRecordsWithColors(
            values,
            colors
        );
    }

    async getProspects() {
        return this.getEntity("prospects");
    }

    async getCustomers() {
        return this.getEntity("customers");
    }

    async getInvoices() {
        return this.getEntity("invoices");
    }

    async getAll() {
        return this.getEntity("all");
    }

    async getSheet5() {
        return this.getEntity("sheet5");
    }

    // Compatibility aliases for older CRM code.
    async getOrganizations() {
        return this.getProspects();
    }

    async getContacts() {
        return this.getAll();
    }

    async getActivities() {
        return this.getAll();
    }

    async getTasks() {
        return this.getSheet5();
    }

    getStatus() {
        return {
            repository:
                "crm-sheet-repository",
            provider:
                this.provider.getStatus(),
            ranges:
                this.ranges,
            aliases:
                this.aliases
        };
    }
}

module.exports = CrmSheetRepository;
