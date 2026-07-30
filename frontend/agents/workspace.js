console.log("Workspace module loaded");


async function openAgent(agentId) {

    const workspace =
        document.getElementById("conversation");


    try {

        const response =
            await fetch(
                `/api/workspaces/${agentId}`
            );


        const data =
            await response.json();


        workspace.innerHTML = `

        <div class="agent-workspace">

            <h2>${data.title}</h2>


            <h3>Current Objective</h3>

            <p>
            ${data.objective}
            </p>


            <h3>Action Plan</h3>

            <ul>

            ${
                data.actions
                .map(action =>
                    `<li>${action}</li>`
                )
                .join("")
            }

            </ul>


            <button 
class="run-agent"
onclick="runAgent('${agentId}')">

${data.button}

</button>


            <h3>Command</h3>

            <textarea
            placeholder="Command this agent..."
            ></textarea>


        </div>

        `;


    }

    catch(error){

        console.error(
            "Unable to load workspace",
            error
        );

    }

}
async function runAgent(agentId) {

    const workspace =
        document.getElementById("conversation");


    workspace.innerHTML += `

    <div class="agent-response">

        <h3>JARVIS Processing...</h3>

        <p>
        Running ${agentId} analysis.
        </p>

    </div>

    `;


    try {

        const response =
            await fetch(
                "/api/agents/run",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        agent: agentId
                    })
                }
            );


        const data =
            await response.json();


        workspace.innerHTML += `

        <div class="agent-result">

            <h3>
            ${data.agent}
            </h3>

            <p>
            ${data.result}
            </p>


            <h4>
            Findings
            </h4>


            <ul>

            ${
                data.findings
                ?
                data.findings
                .map(item =>
                    `<li>${item}</li>`
                )
                .join("")
                :
                ""
            }

            </ul>
<h4>
Recommendations
</h4>

<ul>

${
    data.recommendations
    ?
    data.recommendations
    .map(item =>
        `<li>${item}</li>`
    )
    .join("")
    :
    ""
}

</ul>

        </div>

        `;


    }

    catch(error){

        console.error(
            "Agent execution failed",
            error
        );

    }

}

