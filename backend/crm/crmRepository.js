const fs = require("fs");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

function getDataDirectory() {
    return process.env.JARVIS_CRM_DATA_DIR ||
        path.join(__dirname, "../data/crm");
}

const FILES = {
    organizations:
        "organizations.json",

    contacts:
        "contacts.json",

    relationships:
        "relationships.json",

    interactions:
        "interactions.json",

    tasks:
        "tasks.json",

    opportunities:
        "opportunities.json"
};

function getFilePath(entity) {

    const fileName =
        FILES[entity];

    if (!fileName) {
        throw new Error(
            `Unknown CRM entity: ${entity}`
        );
    }

    return path.join(
        getDataDirectory(),
        fileName
    );
}

function readEntity(entity) {

    const filePath =
        getFilePath(entity);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    return readJson(filePath, []);
}

function writeEntity(
    entity,
    records
) {

    const filePath =
        getFilePath(entity);

    writeJsonAtomic(filePath, records);

    return records;
}

function getAll(entity) {

    return readEntity(entity);
}

function getById(
    entity,
    id
) {

    return readEntity(entity)
        .find(
            record =>
                record.id === id
        );
}

function getByVenture(
    entity,
    ventureId
) {

    return readEntity(entity)
        .filter(
            record =>
                record.ventureId === ventureId
        );
}

function create(
    entity,
    record
) {

    const records =
        readEntity(entity);

    records.push(record);

    writeEntity(
        entity,
        records
    );

    return record;
}

function update(
    entity,
    id,
    updates
) {

    const records =
        readEntity(entity);

    const index =
        records.findIndex(
            record =>
                record.id === id
        );

    if (index === -1) {
        return null;
    }

    records[index] = {
        ...records[index],
        ...updates,
        updatedAt:
            new Date().toISOString()
    };

    writeEntity(
        entity,
        records
    );

    return records[index];
}

module.exports = {
    getAll,
    getById,
    getByVenture,
    create,
    update
};
