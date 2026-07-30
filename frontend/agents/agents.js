console.log("Agents module loaded");

async function loadAgents() {

    const workspace =
        document.getElementById("conversation");

    if (!workspace) {
        console.error("Agent workspace not found.");
        return;
    }

    workspace.innerHTML = `
        <div class="module-shell">
            <div class="module-hero">
                <div>
                    <div class="eyebrow">AGENT NETWORK</div>
                    <h1>Agent Intelligence</h1>
                    <p>Connecting to the JARVIS agent registry.</p>
                </div>
                <div class="system-status">
                    <span class="status-dot"></span>
                    LOADING NETWORK
                </div>
            </div>
            <div class="module-loading">
                <div class="loading-pulse"></div>
                <span>Synchronizing live intelligence...</span>
            </div>
        </div>
    `;

    try {

        const response =
            await fetch("/api/agents");

        if (!response.ok) {
            throw new Error(
                `Agent registry returned HTTP ${response.status}`
            );
        }

        const agents =
            await response.json();

        workspace.innerHTML = `

            <div class="module-shell">

                <div class="module-hero">

                    <div>
                        <div class="eyebrow">
                            JARVIS OS
                        </div>

                        <h1>
                            Agent Network
                        </h1>

                        <p class="subtitle">
                            Specialized intelligence and execution systems.
                        </p>
                    </div>

                    <div class="system-status">
                        <span class="status-dot"></span>
                        NETWORK ONLINE
                    </div>

                </div>


                <div class="module-grid">

                    <div class="module-card primary">

                        <div class="card-label">
                            AGENTS
                        </div>

                        <h2>
                            ${agents.length}
                        </h2>

                        <p>
                            Registered agent systems
                        </p>

                    </div>


                    <div class="module-card">

                        <div class="card-label">
                            STATUS
                        </div>

                        <h2>
                            ONLINE
                        </h2>

                        <p>
                            Agent network connected
                        </p>

                    </div>

                </div>


                <div class="module-card full">

                    <div class="card-label">
                        AGENT REGISTRY
                    </div>

                    <h2>
                        Available Intelligence
                    </h2>

                    <div class="agent-registry">

                    ${
                        agents.map(agent => `

                            <button
                                class="agent-registry-card"
                                onclick="openAgent('${agent.id}')"
                            >

                                <div class="agent-card-header">

                                    <div class="agent-icon">
                                        ⬡
                                    </div>

                                    <div>

                                        <h3>
                                            ${agent.name || agent.id}
                                        </h3>

                                        <span class="agent-status">
                                            ${agent.status || "active"}
                                        </span>

                                    </div>

                                </div>

                                <p>
                                    ${
                                        agent.mission ||
                                        "Specialized JARVIS intelligence system."
                                    }
                                </p>

                                <div class="agent-card-action">
                                    OPEN AGENT →
                                </div>

                            </button>

                        `).join("")

                    }

                </div>

                </div>

            </div>

        `;

    }

    catch(error) {

        console.error(
            "Agent Network loading failed:",
            error
        );

        workspace.innerHTML = `

            <div class="command-error">

                <div class="eyebrow">
                    AGENT NETWORK ERROR
                </div>

                <h2>
                    Unable to load agent registry
                </h2>

                <p>
                    ${error.message}
                </p>

                <button
                    onclick="loadAgents()"
                >
                    RETRY
                </button>

            </div>

        `;

    }

}


async function openAgent(agentId) {

    const workspace =
        document.getElementById("conversation");

    workspace.innerHTML = `

        <div class="dashboard-card wide">

            <div class="card-label">
                AGENT INTELLIGENCE
            </div>

            <h2>
                Loading Agent...
            </h2>

        </div>

    `;

    try {

        const response =
            await fetch(
                `/api/agents/${agentId}`
            );

        if (!response.ok) {

            throw new Error(
                `Agent returned HTTP ${response.status}`
            );

        }

        const agent =
            await response.json();

        workspace.innerHTML = `

            <div class="module-shell">

                <div class="module-hero">

                    <div>

                        <div class="eyebrow">
                            AGENT INTELLIGENCE
                        </div>

                        <h1>
                            ${agent.name || agent.id}
                        </h1>

                        <p class="subtitle">
                            ${agent.mission || "Specialized JARVIS agent."}
                        </p>

                    </div>

                    <div class="system-status">

                        <span class="status-dot"></span>

                        ${agent.status || "ONLINE"}

                    </div>

                </div>


                <div class="module-grid">

                    <div class="module-card full">

                        <div class="card-label">
                            CAPABILITIES
                        </div>

                        <h2>
                            Agent Functions
                        </h2>

                        <div class="agent-capabilities">

                    ${
                        Array.isArray(agent.capabilities)

                        ? agent.capabilities.map(capability => `

                            <div class="capability-card">

                                <span class="status-dot"></span>

                                ${capability}

                            </div>

                        `).join("")

                        : `
                            <div class="empty-state">
                                No capabilities registered.
                            </div>
                        `
                    }

                        </div>

                    </div>

                    <div class="module-card full">

                        <div class="card-label">
                            AGENT OPERATIONS
                        </div>

                        <h2>
                            Direct Agent Interface
                        </h2>

                        <div class="command-message">

                    <p>
                        This agent is registered with JARVIS OS and ready for direct interaction.
                    </p>

                        <p>
                            Direct agent conversation and autonomous task execution will be connected next.
                        </p>

                    </div>

                    </div>

                </div>


                <button
                    class="secondary-button"
                    onclick="loadAgents()"
                >
                    ← BACK TO AGENT NETWORK
                </button>

        `;

    }

    catch(error) {

        console.error(
            "Agent loading failed:",
            error
        );

        workspace.innerHTML = `

            <div class="command-error">

                <h2>
                    Unable to load agent
                </h2>

                <p>
                    ${error.message}
                </p>

                <button
                    onclick="loadAgents()"
                >
                    BACK TO AGENT NETWORK
                </button>

            </div>

        `;

    }

}


window.loadAgents =
    loadAgents;

window.openAgent =
    openAgent;
