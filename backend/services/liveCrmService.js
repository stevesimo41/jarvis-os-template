const GoogleSheetsProvider =
    require("../providers/googleSheetsProvider");

const CrmSheetRepository =
    require("../repositories/crmSheetRepository");

const ALLOWED_ENTITIES = [
    "prospects",
    "customers",
    "invoices",
    "all",
    "sheet5"
];

let provider = null;
let repository = null;

function getProvider() {
    if (!provider) {
        provider =
            new GoogleSheetsProvider();
    }

    return provider;
}

function getRepository() {
    if (!repository) {
        repository =
            new CrmSheetRepository(
                getProvider()
            );
    }

    return repository;
}

function parsePositiveInteger(
    value,
    fallback,
    maximum
) {
    const parsed =
        Number.parseInt(value, 10);

    if (
        !Number.isFinite(parsed) ||
        parsed < 0
    ) {
        return fallback;
    }

    if (
        maximum !== undefined &&
        parsed > maximum
    ) {
        return maximum;
    }

    return parsed;
}

function normalizeEntity(entityName) {
    const normalized =
        getRepository()
            .normalizeEntityName(
                entityName
            );

    if (
        !ALLOWED_ENTITIES.includes(
            normalized
        )
    ) {
        throw new Error(
            `Unsupported live CRM entity: ${entityName}`
        );
    }

    return normalized;
}

function paginate(records, query = {}) {
    const limit =
        parsePositiveInteger(
            query.limit,
            100,
            2000
        );

    const offset =
        parsePositiveInteger(
            query.offset,
            0
        );

    const page =
        records.slice(
            offset,
            offset + limit
        );

    return {
        total: records.length,
        count: page.length,
        limit,
        offset,
        hasMore:
            offset + page.length <
            records.length,
        data: page
    };
}

async function getStatus() {
    const activeProvider =
        getProvider();

    const activeRepository =
        getRepository();

    const metadata =
        await activeProvider
            .getSpreadsheetMetadata();

    const sheets =
        (metadata.sheets || [])
            .map(sheet => ({
                title:
                    sheet.properties.title,
                gid:
                    sheet.properties.sheetId,
                rows:
                    sheet.properties.gridProperties
                        ?.rowCount || 0,
                columns:
                    sheet.properties.gridProperties
                        ?.columnCount || 0
            }));

    return {
        service: "live-crm",
        connected: true,
        spreadsheet: {
            id:
                activeProvider
                    .config
                    .spreadsheetId,
            title:
                metadata.properties.title,
            sheets
        },
        repository:
            activeRepository.getStatus(),
        entities:
            ALLOWED_ENTITIES
    };
}

async function getEntity(
    entityName,
    query = {}
) {
    const entity =
        normalizeEntity(entityName);

    const records =
        await getRepository()
            .getEntity(entity);

    return {
        entity,
        ...paginate(
            records,
            query
        )
    };
}

async function getEntityWithColors(
    entityName,
    query = {}
) {
    const entity =
        normalizeEntity(entityName);

    const records =
        await getRepository()
            .getEntityWithColors(entity);

    return {
        entity,
        ...paginate(
            records,
            query
        )
    };
}

function resetForTests() {
    provider = null;
    repository = null;
}

module.exports = {
    ALLOWED_ENTITIES,
    getStatus,
    getEntity,
    getEntityWithColors,
    normalizeEntity,
    paginate,
    resetForTests
};
