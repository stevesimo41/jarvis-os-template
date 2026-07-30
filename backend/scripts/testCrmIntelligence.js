const assert = require("assert");

const {
    buildProfile,
    invalidate
} = require("../services/prospectIntelligenceService");

const prospect = {
    "Company Name": "CRM 007 Test Company",
    "Master-Category": "Home Services",
    "Main Contact": "Test Contact",
    "EMAIL": "test@example.com",
    "Phone": "614-555-0100",
    "Website": "example.com",
    "City": "Columbus",
    "ST": "OH"
};

invalidate(prospect);

const fresh = buildProfile(prospect);

assert.strictEqual(
    fresh.company,
    "CRM 007 Test Company"
);

assert.ok(
    fresh.opportunityScore >= 75,
    "Expected a strong opportunity score."
);

assert.ok(
    fresh.summary.includes("CRM 007 Test Company")
);

assert.ok(
    fresh.nextBestAction
);

const cached = buildProfile(prospect);

assert.strictEqual(
    cached.cached,
    true,
    "Expected the second profile read to use cache."
);

invalidate(prospect);

console.log("CRM-007 INTELLIGENCE SERVICE TEST PASSED");
