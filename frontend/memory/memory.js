console.log("Memory module loaded");


async function loadMemory() {

    const workspace =
        document.getElementById("conversation");


    if (!workspace) {

        console.error(
            "Memory workspace not found."
        );

        return;

    }


    workspace.innerHTML = `

        <div class="module-shell memory-module">

            <div class="module-hero">

                <div>

                    <div class="eyebrow">
                        JARVIS OS / MEMORY
                    </div>

                    <h1>
                        Memory Center
                    </h1>

                    <p class="subtitle">
                        Persistent intelligence, executive context, and 
operating knowledge.
                    </p>

                </div>

                <div class="system-status online">

                    <span class="status-dot"></span>

                    MEMORY ONLINE

                </div>

            </div>


            <div class="memory-grid">

                <div class="memory-card memory-profile-card">

                    <div class="card-label">
                        EXECUTIVE PROFILE
                    </div>

                    <h2 id="memoryProfileName">
                        Loading...
                    </h2>

                    <p id="memoryProfileMission">
                        Retrieving executive memory.
                    </p>

                    <div class="memory-divider"></div>

                    <div class="card-label">
                        OPERATING PRINCIPLES
                    </div>

                    <div id="memoryPrinciples">
                        Loading...
                    </div>

                </div>


                <div class="memory-card">

                    <div class="card-label">
                        CURRENT PRIORITIES
                    </div>

                    <div id="memoryPriorities">
                        Loading...
                    </div>

                </div>


                <div class="memory-card">

                    <div class="card-label">
                        ACTIVE AVOS
                    </div>

                    <div id="memoryVentures">
                        Loading...
                    </div>

                </div>

            </div>


            <div class="memory-footer">

                <span>
                    Persistent executive context
                </span>

                <span class="memory-status">
                    <span class="status-dot"></span>
                    MEMORY SYSTEM ACTIVE
                </span>

            </div>

        </div>

    `;


    try {

        const response =
            await fetch(
                "/api/memory"
            );


        if (!response.ok) {

            throw new Error(
                `Memory API returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const memory =
            data.memory;


        document.getElementById(
            "memoryProfileName"
        ).textContent =
            memory.profile.name;


        document.getElementById(
            "memoryProfileMission"
        ).textContent =
            memory.profile.mission;


        document.getElementById(
            "memoryPrinciples"
        ).innerHTML =

            memory.profile.operating_principles
            .map(item => `

                <div class="memory-list-item">

                    <span class="memory-bullet"></span>

                    <span>
                        ${item}
                    </span>

                </div>

            `)
            .join("");


        document.getElementById(
            "memoryPriorities"
        ).innerHTML =

            memory.priorities.current_priorities
            .map(item => `

                <div class="memory-list-item">

                    <span class="memory-bullet"></span>

                    <div>

                        <strong>
                            ${item.priority}
                        </strong>

                        <p>
                            ${item.objective}
                        </p>

                    </div>

                </div>

            `)
            .join("");


        document.getElementById(
            "memoryVentures"
        ).innerHTML =

            memory.ventures.ventures
            .map(item => `

                <div class="memory-list-item">

                    <span class="memory-bullet"></span>

                    <div>

                        <strong>
                            ${item.name}
                        </strong>

                        <p>
                            ${item.mission}
                        </p>

                    </div>

                </div>

            `)
            .join("");


    }

    catch(error) {

        console.error(
            "Memory loading failed",
            error
        );


        workspace.innerHTML += `

            <div class="command-error">

                <div class="eyebrow">
                    MEMORY ERROR
                </div>

                <h2>
                    Unable to load memory system
                </h2>

                <p>
                    ${error.message}
                </p>

            </div>

        `;

    }

}


window.loadMemory =
    loadMemory;
