console.log("Chief of Staff module loaded");

async function loadChiefOfStaff() {

    const workspace = document.getElementById("conversation");

    if (!workspace) return;

    workspace.innerHTML = `
        <div class="module-shell chief-center">
            <div class="module-hero">
                <div>
                    <div class="eyebrow">CHIEF OF STAFF</div>
                    <h1>Operational Command</h1>
                    <p>Synchronizing priorities, ventures, and executive decisions.</p>
                </div>
                <div class="system-status">
                    <span class="status-dot"></span>
                    LOADING OPERATIONS
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
            "/api/chief-of-staff"
        );

        if (!response.ok) {
            throw new Error(`Chief of Staff returned HTTP ${response.status}`);
        }

        const data = await response.json();

        workspace.innerHTML = `

            <div class="module-shell chief-center">

                <div class="module-hero">

                    <div>
                        <div class="eyebrow">
                            CHIEF OF STAFF
                        </div>

                        <h1>
                            Operational Command
                        </h1>

                        <p class="subtitle">
                            Executive coordination across priorities,
                            ventures, decisions, and active initiatives.
                        </p>
                    </div>

                    <div class="system-status">
                        <span class="status-dot"></span>
                        LIVE OPERATIONS
                    </div>

                </div>


                <div class="module-grid">


                    <div class="module-card primary">

                        <div class="card-label">
                            EXECUTIVE PROFILE
                        </div>

                        <h2>
                            ${data.owner}
                        </h2>

                        <p>
                            ${data.role}
                        </p>

                    </div>


                    <div class="module-card">

                        <div class="card-label">
                            SYSTEM STATUS
                        </div>

                        <h2>
                            OPERATIONAL
                        </h2>

                        <p>
                            Chief of Staff coordination layer active.
                        </p>

                    </div>


                    <div class="module-card full">

                        <div class="card-label">
                            ACTIVE AVOS
                        </div>

                        <h2>
                            AVO Portfolio
                        </h2>

                        <div class="module-list">

                            ${
                                data.activeVentures
                                .map(venture => `
                                    <div class="module-list-item">

                                        <strong>
                                            ${venture.name}
                                        </strong>

                                        <span>
                                            ${venture.mission}
                                        </span>

                                    </div>
                                `)
                                .join("")
                            }

                        </div>

                    </div>


                    <div class="module-card full">

                        <div class="card-label">
                            CURRENT PRIORITIES
                        </div>

                        <h2>
                            Executive Focus
                        </h2>

                        <div class="module-list">

                            ${
                                data.priorities
                                .map((priority, index) => `
                                    <div class="module-list-item">

                                        <strong>
                                            ${index + 1}. ${priority.name}
                                        </strong>

                                        <span>
                                            ${priority.focus}
                                        </span>

                                    </div>
                                `)
                                .join("")
                            }

                        </div>

                    </div>


                    <div class="module-card full">

                        <div class="card-label">
                            RECENT DECISIONS
                        </div>

                        <h2>
                            Decision History
                        </h2>

                        <div class="module-list">

                            ${
                                data.recentDecisions
                                .map(decision => `
                                    <div class="module-list-item">

                                        <strong>
                                            Decision Recorded
                                        </strong>

                                        <span>
                                            ${decision.decision}
                                        </span>

                                    </div>
                                `)
                                .join("")
                            }

                        </div>

                    </div>


                    <div class="module-card full">

                        <div class="card-label">
                            CHIEF OF STAFF STATUS
                        </div>

                        <p class="module-status-message">
                            ${data.message}
                        </p>

                    </div>


                </div>

            </div>

        `;

    } catch (error) {

        console.error(
            "Chief of Staff loading failed",
            error
        );

        workspace.innerHTML = `

            <div class="chief-center">

                <div class="module-error">

                    <div class="eyebrow">
                        CHIEF OF STAFF ERROR
                    </div>

                    <h2>
                        Unable to load Operations
                    </h2>

                    <p>
                        ${error.message}
                    </p>

                    <button onclick="loadChiefOfStaff()">
                        Retry
                    </button>

                </div>

            </div>

        `;

    }

}

window.loadChiefOfStaff = loadChiefOfStaff;
