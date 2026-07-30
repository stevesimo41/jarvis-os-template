const crm = require("../crm/crmEngine");

function eligible() {
    return crm.getEntity("organizations", "well-noticed").filter(item =>
        ["customer", "renewal"].includes(String(item.status || "").toLowerCase()) ||
        ["active", "partner"].includes(String(item.relationshipStatus || "").toLowerCase())
    );
}

function brief(organizationId) {
    const organization = eligible().find(item => item.id === organizationId);
    if (!organization) throw new Error("A reviewed Well Noticed customer or partner is required");
    const interactions = crm.getEntity("interactions", "well-noticed").filter(item => item.organizationId === organizationId);
    const opportunities = crm.getEntity("opportunities", "well-noticed").filter(item => item.organizationId === organizationId);
    const latest = interactions.slice().sort((a, b) => Date.parse(b.occurredAt || 0) - Date.parse(a.occurredAt || 0))[0] || null;
    return {
        organization: { id: organization.id, name: organization.name, owner: organization.owner || process.env.JARVIS_OWNER_NAME || "owner", status: organization.status, relationshipStatus: organization.relationshipStatus },
        generatedAt: new Date().toISOString(),
        evidence: { interactions: interactions.length, opportunities: opportunities.length, lastInteractionAt: latest?.occurredAt || organization.lastOutreachAt || null, source: organization.source || "local-crm" },
        renewalTiming: organization.renewalDate || organization.nextActionDue || null,
        relationshipSummary: organization.notes || "No relationship summary has been recorded.",
        risks: [
            ...(!interactions.length ? ["No interaction history is recorded."] : []),
            ...(!organization.renewalDate ? ["No renewal date is recorded."] : []),
            ...(!organization.primaryContactId ? ["No primary contact is linked."] : [])
        ],
        proposedNextStep: "Owner reviews evidence and decides whether to prepare a renewal conversation.",
        approvalRequired: true,
        externalActions: false,
        crmMutations: false,
        spend: 0,
        realizedRevenue: 0
    };
}

function list() { return eligible().map(item => brief(item.id)); }

module.exports = { eligible, brief, list };
