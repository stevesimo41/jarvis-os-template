const fs = require("fs");
const path = require("path");

const policyPath = path.resolve(__dirname, "../config/approvalPolicies.json");

function registry() {
    return JSON.parse(fs.readFileSync(policyPath, "utf8"));
}

function forAction(action) {
    const policies = registry();
    const policy = policies.actions[action];
    if (!policy) {
        const error = new Error(`Action is not allowed by governance policy: ${action}`);
        error.code = "ACTION_NOT_ALLOWED";
        error.statusCode = 403;
        throw error;
    }
    return {
        id: `policy-v${policies.version}:${action}`,
        ttlMinutes: policies.defaultTtlMinutes,
        ...policy
    };
}

module.exports = { forAction, registry };
