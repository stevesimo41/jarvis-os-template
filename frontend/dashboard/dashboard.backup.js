async function loadCommandCenter() {

    const container = document.getElementById("conversation");

    if (!container) {
        console.error("Command Center container not found.");
        return;
    }

    container.innerHTML = `
        <div class="command-center-loading">
            <h2>JARVIS Command Center</h2>
            <p>Connecting to JARVIS OS...</p>
        </div>
    `;

    try {

        const [healthResponse, briefResponse] = await Promise.all([
            fetch("/api/command-center"),
            fetch("/api/jarvis/brief")
        ]);

        if (!healthResponse.ok) {
            throw new Error(
                `Command Center returned HTTP ${healthResponse.status}`
            );
        }

        if (!briefResponse.ok) {
            throw new Error(
                `Executive Intelligence returned HTTP ${briefResponse.status}`
            );
        }

        const healthData = await healthResponse.json();
        const briefData = await briefResponse.json();

        const healthChecks =
            healthData.health?.checks || [];

        const brief =
            briefData.brief || {};

        const executionPlan =
            brief.executionPlan || [];

        const opportunities =
            brief.opportunityPipeline || [];

        const patterns =
            brief.learningInsights || {};

        const recommendation =
            brief.recommendation || {};

        console.log("JARVIS Command Center data loaded:", {
            healthData,
            briefData,
            brief,
            executionPlan,
            opportunities,
            patterns,
            recommendation
        });

        container.innerHTML = `

            <div class="command-center-header">

                <div>

                    <div class="eyebrow">
                        JARVIS OS
                    </div>

                    <h1>
                        Command Center
                    </h1>

                    <p class="subtitle">
                        Executive operating system online.
                    </p>

                </div>

                <div class="system-status online">

                    <span class="status-dot"></span>

                    SYSTEM ONLINE

                </div>

            </div>


            <div class="command-grid">


                <div class="command-card primary-card">

                    <div class="card-label">
                        PRIMARY MISSION
                    </div>

                    <h2>
                        ${brief.priority?.name || "No priority available"}
                    </h2>

                    <p>
                        Executive Score:
                        ${brief.priority?.executiveScore ?? "N/A"}/10
                    </p>

                    <p>
                        ${brief.priority?.nextMilestone || "No milestone available"}
                    </p>

                </div>


                <div class="command-card">

                    <div class="card-label">
                        REVENUE ENGINE
                    </div>

                    <h2>
                        ${brief.revenueOpportunity?.name || "No opportunity available"}
                    </h2>

                    <p>
                        Venture Score:
                        ${brief.revenueOpportunity?.ventureScore ?? "N/A"}/10
                    </p>

                    <p>
                        ${brief.revenueOpportunity?.nextAction || "No action available"}
                    </p>

                </div>


                <div class="command-card">

                    <div class="card-label">
                        CAPITAL OPPORTUNITY
                    </div>

                    <h2>
                        ${brief.capitalOpportunity?.name || "No capital opportunity"}
                    </h2>

                    <p>
                        Potential:
                        ${
                            brief.capitalOpportunity?.potentialValue
                            ? "$" + Number(
                                brief.capitalOpportunity.potentialValue
                            ).toLocaleString()
                            : "N/A"
                        }
                    </p>

                    <p>
                        ${brief.capitalOpportunity?.nextAction || "No action available"}
                    </p>

                </div>


                <div class="command-card">

                    <div class="card-label">
                        RESEARCH PRIORITY
                    </div>

                    <h2>
                        ${brief.researchPriority?.name || "No research priority"}
                    </h2>

                    <p>
                        ${brief.researchPriority?.target || "No target available"}
                    </p>

                </div>


            </div>


            <div class="command-section">

                <div class="section-header">

                    <div>

                        <div class="eyebrow">
                            SYSTEM HEALTH
                        </div>

                        <h2>
                            JARVIS Infrastructure
                        </h2>

                    </div>

                    <span class="section-meta">
                        Live
                    </span>

                </div>


                <div class="health-list">

                    ${
                        healthChecks.length
                        ? healthChecks.map(check => `

                            <div class="health-row">

                                <div class="health-name">

                                    <span class="status-dot ${
                                        check.status === "healthy"
                                        ? "healthy"
                                        : "warning"
                                    }"></span>

                                    ${check.system}

                                </div>

                                <div class="health-status">

                                    ${check.status}

                                </div>

                            </div>

                        `).join("")
                        :
                        `
                            <div class="empty-state">
                                No health checks available.
                            </div>
                        `
                    }

                </div>

            </div>


            <div class="command-section">

                <div class="section-header">

                    <div>

                        <div class="eyebrow">
                            TODAY'S EXECUTION
                        </div>

                        <h2>
                            Recommended Actions
                        </h2>

                    </div>

                </div>


                <div class="execution-list">

                    ${
                        executionPlan.length
                        ? executionPlan.map((item, index) => `

                            <div class="execution-row">

                                <div class="execution-number">
                                    ${index + 1}
                                </div>

                                <div>
                                    ${item}
                                </div>

                            </div>

                        `).join("")
                        :
                        `
                            <div class="empty-state">
                                No execution plan available.
                            </div>
                        `
                    }

                </div>

            </div>


            <div class="command-grid">


                <div class="command-section">

                    <div class="section-header">

                        <div>

                            <div class="eyebrow">
                                ADAPTIVE INTELLIGENCE
                            </div>

                            <h2>
                                JARVIS Recommendation
                            </h2>

                        </div>

                    </div>

                    <div class="command-message">

                        <p>
                            ${
                                recommendation.reason ||
                                recommendation.message ||
                                recommendation.recommendation ||
                                "No recommendation available."
                            }
                        </p>

                    </div>

                </div>


                <div class="command-section">

                    <div class="section-header">

                        <div>

                            <div class="eyebrow">
                                LEARNING SYSTEM
                            </div>

                            <h2>
                                Pattern Intelligence
                            </h2>

                        </div>

                    </div>

                    <div class="command-message">

                        <p>
                            ${
                                patterns.summary ||
                                patterns.insight ||
                                patterns.message ||
                                "JARVIS is analyzing historical patterns."
                            }
                        </p>

                    </div>

                </div>


            </div>


            <div class="command-section">

                <div class="section-header">

                    <div>

                        <div class="eyebrow">
                            OPPORTUNITY PIPELINE
                        </div>

                        <h2>
                            Highest Value Opportunities
                        </h2>

                    </div>

                    <span class="section-meta">
                        ${opportunities.length} identified
                    </span>

                </div>


                <div class="opportunity-list">

                    ${
                        opportunities.length
                        ? opportunities.slice(0, 5).map((opportunity, index) => `

                            <div class="opportunity-row">

                                <div class="execution-number">
                                    ${index + 1}
                                </div>

                                <div class="opportunity-content">

                                    <h3>
                                        ${opportunity.name || "Unnamed opportunity"}
                                    </h3>

                                    <p>
                                        ${
                                            opportunity.nextAction ||
                                            opportunity.description ||
                                            "No next action available."
                                        }
                                    </p>

                                </div>

                            </div>

                        `).join("")
                        :
                        `
                            <div class="empty-state">
                                No opportunities currently available.
                            </div>
                        `
                    }

                </div>

            </div>


            <div class="command-footer">

                <span>
                    Last synchronized:
                    ${
                        brief.timestamp
                        ? new Date(brief.timestamp).toLocaleString()
                        : "Unknown"
                    }
                </span>

                <button
                    class="refresh-command-center"
                    onclick="loadCommandCenter()"
                >
                    Refresh Intelligence
                </button>

            </div>

        `;

    } catch (error) {

        console.error(
            "Unable to load Command Center:",
            error
        );

        console.error("JARVIS Command Center render error:", error);

        container.innerHTML = `

            <div class="command-error">

                <div class="eyebrow">
                    CONNECTION ERROR
                </div>

                <h2>
                    JARVIS intelligence unavailable
                </h2>

                <p>
                    ${error.message}
                </p>

                <button
                    onclick="loadCommandCenter()"
                >
                    Retry Connection
                </button>

            </div>

        `;

    }

}


window.loadCommandCenter =
    loadCommandCenter;


window.loadExecutiveBrief =
    loadCommandCenter;

window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        loadCommandCenter();
    }, 100);
});



