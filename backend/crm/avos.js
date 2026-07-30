const ventures = [
    {
        id: "well-noticed",
        name: "Well Noticed",
        type: "revenue",
        crmMode: "prospecting"
    },
    {
        id: "xodus",
        name: "Xodus Recovery Pathways",
        type: "mission",
        crmMode: "relationship_development"
    },
    {
        id: "real-estate",
        name: "Real Estate",
        type: "revenue",
        crmMode: "opportunities"
    },
    {
        id: "jarvis-opportunities",
        name: "AVOs",
        type: "revenue",
        crmMode: "venture_creation"
    }
];

function getVentures() {
    return ventures;
}

function getVentureById(id) {
    const normalizedId = id === "other" ? "jarvis-opportunities" : id;
    return ventures.find(
        venture => venture.id === normalizedId
    );
}

module.exports = {
    getVentures,
    getVentureById
};
