console.log("Executive module loaded");

async function loadExecutive() {

    const workspace = document.getElementById("conversation");

    if (!workspace) return;

    workspace.innerHTML = `
        <div class="module-shell executive-center">
            <div class="module-hero">
                <div>
                    <div class="eyebrow">EXECUTIVE INTELLIGENCE</div>
                    <h1>Executive Brief</h1>
                    <p>Analyzing priorities, opportunities, and execution.</p>
                </div>
                <div class="system-status">
                    <span class="status-dot"></span>
                    LOADING INTELLIGENCE
                </div>
            </div>
            <div class="module-loading">
                <div class="loading-pulse"></div>
                <span>Synchronizing live intelligence...</span>
            </div>
        </div>
    `;

    try {

        const response = await fetch(
            "/api/jarvis/brief"
        );

        if (!response.ok) {
            throw new Error(`Executive Brief returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const brief = data.brief;

        workspace.innerHTML = `

            <div class="module-shell executive-center">

                <div class="module-hero">
                    <div>
                        <div class="eyebrow">
                            EXECUTIVE INTELLIGENCE
                        </div>

                        <h1>
                            Executive Brief
                        </h1>

                        <p class="subtitle">
                            Strategic priorities, revenue opportunities,
                            capital intelligence, and today's highest value
                            execution priorities.
                        </p>
                    </div>
                    <div class="system-status">
                        <span class="status-dot"></span>
                        LIVE INTELLIGENCE
                    </div>
                </div>


                <div class="module-grid">


                    <div class="module-card primary">

                        <div class="card-label">
                            PRIMARY MISSION
                        </div>

                        <h2>
                            ${brief.priority.name}
                        </h2>

                        <span class="module-score">
                            Executive Score:
                            ${brief.priority.executiveScore}/10
                        </span>

                        <p>
                            ${brief.priority.nextMilestone}
                        </p>

                    </div>


                    <div class="module-card">

                        <div class="card-label">
                            REVENUE ENGINE
                        </div>

                        <h2>
                            ${brief.revenueOpportunity.name}
                        </h2>

                        <p>
                            ${brief.revenueOpportunity.nextAction}
                        </p>

                    </div>


                    <div class="module-card">

                        <div class="card-label">
                            CAPITAL OPPORTUNITY
                        </div>

                        <h2>
                            ${brief.capitalOpportunity.name}
                        </h2>

                        <p>
                            ${brief.capitalOpportunity.nextAction}
                        </p>

                    </div>


                    <div class="module-card">

                        <div class="card-label">
                            RESEARCH PRIORITY
                        </div>

                        <h2>
                            ${brief.researchPriority.name}
                        </h2>

                        <p>
                            ${brief.researchPriority.nextAction}
                        </p>

                    </div>


                    <div class="module-card full">

                        <div class="card-label">
                            TODAY'S EXECUTION PLAN
                        </div>

                        <h2>
                            Highest Value Actions
                        </h2>

                        <div>

                            ${
                                brief.executionPlan
                                .map((item, index) => `
                                    <div class="module-list-item">

                                        <strong>
                                            ${index + 1}. ${item}
                                        </strong>

                                        <span>
                                            Priority action identified
                                            by the JARVIS executive reasoning layer.
                                        </span>

                                    </div>
                                `)
                                .join("")
                            }

                        </div>

                    </div>


                </div>

            </div>

        `;

    } catch (error) {

        console.error(
            "Executive loading failed",
            error
        );

        workspace.innerHTML = `

            <div class="executive-center">

                <div class="module-error">

                    <div class="eyebrow">
                        EXECUTIVE INTELLIGENCE ERROR
                    </div>

                    <h2>
                        Unable to load Executive Brief
                    </h2>

                    <p>
                        ${error.message}
                    </p>

                    <button onclick="loadExecutive()">
                        Retry
                    </button>

                </div>

            </div>

        `;

    }

}

window.loadExecutive = loadExecutive;
