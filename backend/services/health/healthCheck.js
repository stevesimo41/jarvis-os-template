const memory = require("../../memory/memoryEngine");
const orchestrator = require("../orchestrator");

function runHealthCheck() {

    const checks = [];

    try {
        memory.getExecutiveContext();

        checks.push({
            system: "Memory",
            status: "healthy"
        });

    } catch(error) {

        checks.push({
            system: "Memory",
            status: "error",
            message: error.message
        });
    }


    try {
        if (typeof orchestrator.process !== "function") {
            throw new Error(
                "Orchestrator process function is unavailable"
            );
        }

        checks.push({
            system: "Orchestrator",
            status: "healthy"
        });

    } catch(error) {

        checks.push({
            system: "Orchestrator",
            status: "error",
            message: error.message
        });
    }


    return {
        system: "JARVIS OS",
        status: checks.every(c => c.status === "healthy") ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        checks
    };
}


module.exports = {
    runHealthCheck
};
