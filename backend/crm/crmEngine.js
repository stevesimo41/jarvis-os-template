const repository =
    require("./crmRepository");

const crypto = require("crypto");

const ventures =
    require("./avos");

const ENTITY_TYPES = [
    "organizations",
    "contacts",
    "relationships",
    "interactions",
    "tasks",
    "opportunities"
];

function validateEntity(
    entity
) {

    if (
        !ENTITY_TYPES.includes(entity)
    ) {

        throw new Error(
            `Invalid CRM entity: ${entity}`
        );
    }
}

function getDashboard() {

    const ventureList =
        ventures.getVentures();

    return ventureList.map(
        venture => {

            const summary = {};

            ENTITY_TYPES.forEach(
                entity => {

                    summary[entity] =
                        repository
                            .getByVenture(
                                entity,
                                venture.id
                            )
                            .length;

                }
            );

            return {
                venture,
                summary
            };

        }
    );

}

function getVentures() {

    return ventures.getVentures();

}

function getVenture(
    ventureId
) {

    const venture =
        ventures.getVentureById(
            ventureId
        );

    if (!venture) {
        return null;
    }

    const result = {
        venture,
        data: {}
    };

    ENTITY_TYPES.forEach(
        entity => {

            result.data[entity] =
                repository
                    .getByVenture(
                        entity,
                        ventureId
                    );

        }
    );

    return result;

}

function getEntity(
    entity,
    ventureId
) {

    validateEntity(entity);

    if (ventureId) {

        return repository
            .getByVenture(
                entity,
                ventureId
            );

    }

    return repository
        .getAll(entity);

}

function createEntity(entity, input) {
    validateEntity(entity);

    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("A CRM record object is required");
    }

    if (!input.ventureId || !ventures.getVentureById(input.ventureId)) {
        throw new Error("A valid ventureId is required");
    }

    const timestamp = new Date().toISOString();
    const record = {
        ...input,
        id: input.id || crypto.randomUUID(),
        createdAt: input.createdAt || timestamp,
        updatedAt: timestamp
    };

    return repository.create(entity, record);
}

function updateEntity(entity, id, updates) {
    validateEntity(entity);

    if (!id) {
        throw new Error("A CRM record id is required");
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
        throw new Error("A CRM updates object is required");
    }

    const { id: ignoredId, createdAt: ignoredCreatedAt, ...safeUpdates } = updates;
    return repository.update(entity, id, safeUpdates);
}

module.exports = {
    getDashboard,
    getVentures,
    getVenture,
    getEntity,
    createEntity,
    updateEntity
};
