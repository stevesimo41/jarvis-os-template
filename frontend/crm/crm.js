(function () {
    "use strict";

    window.renderCrmWorkspace = async function (root) {
        if (!root) {
            throw new Error(
                "renderCrmWorkspace requires a root element."
            );
        }

        if (!sessionStorage.getItem("jarvis.authToken")) {
            try {
                const r = await fetch("/api/auth/auto-login", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceName: "JARVIS auto" })
                });
                if (r.ok) {
                    const d = await r.json();
                    if (d?.data?.token) sessionStorage.setItem("jarvis.authToken", d.data.token);
                }
            } catch (e) {}
        }

        window.JarvisCrmState.reset(root);
        window.JarvisCrmWorkspace.loadData();
    };
})();
