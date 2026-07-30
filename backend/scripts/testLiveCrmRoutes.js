require("../config/loadEnvironment");

const express =
    require("express");

const crmRouter =
    require("../routes/crm");

async function main() {
    const app =
        express();

    app.use(
        express.json()
    );

    app.use(
        "/api/crm",
        crmRouter
    );

    const server =
        await new Promise(resolve => {
            const active =
                app.listen(
                    0,
                    "127.0.0.1",
                    () => resolve(active)
                );
        });

    const address =
        server.address();

    const baseUrl =
        `http://127.0.0.1:${address.port}`;

    try {
        const checks = [
            {
                path:
                    "/api/crm/live/status",
                expectedStatus:
                    200
            },
            {
                path:
                    "/api/crm/live/prospects?limit=2",
                expectedStatus:
                    200
            },
            {
                path:
                    "/api/crm/live/customers?limit=2",
                expectedStatus:
                    200
            },
            {
                path:
                    "/api/crm/live/not-a-sheet",
                expectedStatus:
                    400
            }
        ];

        for (const check of checks) {
            const response =
                await fetch(
                    `${baseUrl}${check.path}`
                );

            const payload =
                await response.json();

            if (
                response.status !==
                check.expectedStatus
            ) {
                throw new Error(
                    `${check.path} returned ${response.status}: ${JSON.stringify(payload)}`
                );
            }

            console.log(
                `PASS ${response.status} ${check.path}`
            );

            if (
                payload.entity &&
                payload.data
            ) {
                console.log(
                    `  entity=${payload.entity} total=${payload.total} count=${payload.count}`
                );
            }

            if (
                payload.spreadsheet
                    ?.title
            ) {
                console.log(
                    `  spreadsheet=${payload.spreadsheet.title}`
                );
            }
        }

        console.log(
            "\nCRM-004 LIVE ROUTE TEST PASSED"
        );
    } finally {
        await new Promise(
            (resolve, reject) => {
                server.close(error => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            }
        );
    }
}

main().catch(error => {
    console.error(
        "\nCRM-004 LIVE ROUTE TEST FAILED:",
        error.message
    );

    process.exitCode = 1;
});
