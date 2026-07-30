console.log("JARVIS navigation module loaded");

function triggerDashboardLoad() {
    if (typeof window.loadCommandCenter === "function") {
        window.loadCommandCenter();
    }
}

function loadModule(moduleName, initialTab) {

    const workspace = document.getElementById("conversation");
    const pageTitle = document.getElementById("pageTitle");

    if (!workspace || !pageTitle) {
        console.error("JARVIS navigation targets not found.");
        return;
    }

    document.querySelectorAll(".nav-button, #mobileNav button").forEach(button => {
        button.classList.remove("active");
    });

    document.querySelectorAll(`[data-module="${moduleName}"]`).forEach(button => {
        button.classList.add("active");
    });

    if (moduleName === "dashboard") {
        workspace.innerHTML = `
            <div id="dashboardRoot">
                <div class="command-center-loading">
                    <div class="eyebrow">JARVIS OS</div>
                    <h2>Loading dashboard</h2>
                    <p>Synchronizing live intelligence...</p>
                </div>
            </div>
        `;
    } else {
        workspace.innerHTML = `
            <div id="dashboardRoot">
                <div class="command-center-loading">
                    <div class="eyebrow">JARVIS OS</div>
                    <h2>Loading ${moduleName.replace("-", " ")}</h2>
                    <p>Synchronizing live intelligence...</p>
                </div>
            </div>
        `;
    }

    switch (moduleName) {

        case "dashboard":

            pageTitle.textContent = "Executive Command Center";
            triggerDashboardLoad();

            break;


        case "executive":

            pageTitle.textContent = "Executive Intelligence";

            if (window.loadExecutive) {
                window.loadExecutive();
            }

            break;

        case "chat":
            pageTitle.textContent = "Ask JARVIS";
            if (typeof window.showJarvisConversation === "function") {
                window.showJarvisConversation();
            }
            break;


        case "chief":

            pageTitle.textContent = "Chief of Staff";

            if (window.loadChiefOfStaff) {
                window.loadChiefOfStaff();
            }

            break;


        case "mission":

            pageTitle.textContent = "Daily Mission";

            if (window.loadMission) {
                window.loadMission();
            }

            break;


        case "agents":

            pageTitle.textContent = "Agent Network";

            if (window.loadAgents) {
                window.loadAgents();
            }

            break;

        case "agent-hub":

            pageTitle.textContent = "Agent Hub";

            if (window.loadAgentHub) window.loadAgentHub(initialTab);

            break;

        case "production-agents":

            pageTitle.textContent = "Agent Operations";

            if (window.loadProductionAgents) {
                window.loadProductionAgents();
            }

            break;


        case "ventures":

            pageTitle.textContent = "AVOs";

            if (window.loadVentures) {
                window.loadVentures();
            } else {
                workspace.innerHTML = `
                    <div class="command-error">
                        <div class="eyebrow">AVOS UNAVAILABLE</div>
                        <h2>JARVIS AVO module not loaded</h2>
                        <p>The AVO intelligence module could not be initialized.</p>
                    </div>
                `;
            }

            break;


        case "memory":

            pageTitle.textContent = "JARVIS Memory";

            if (window.loadMemory) {
                window.loadMemory();
            }

            break;

        case "activity":
            pageTitle.textContent = "Activity & Context";
            if (window.loadActivity) window.loadActivity();
            break;


        case "crm":
            pageTitle.textContent = "Multi-AVO CRM";
            if (typeof window.renderCrmWorkspace === "function") {
                window.renderCrmWorkspace(workspace);
            } else {
                workspace.innerHTML = `
                    <section class="jarvis-crm-message is-error">
                        <strong>CRM workspace failed to load.</strong>
                        <span>Refresh the Command Center and try again.</span>
                    </section>
                `;
            }
            break;
        case "opportunities":
            pageTitle.textContent = "Opportunity Portfolio";
            if (typeof window.loadOpportunities === "function") window.loadOpportunities();
            break;
        case "releases":
            pageTitle.textContent = "Development & Releases";
            if (typeof window.loadReleases === "function") {
                window.loadReleases();
            }
            break;
        case "settings":

            pageTitle.textContent = "System Settings";

            if (typeof window.loadSettings === "function") window.loadSettings();

            break;
        case "mobile":
            pageTitle.textContent = "Mobile Access";
            if (typeof window.loadMobile === "function") window.loadMobile();
            break;
        case "voice":
            pageTitle.textContent = "Voice & iPhone";
            if (typeof window.loadVoice === "function") window.loadVoice();
            break;
        case "operations":
            pageTitle.textContent = "Autonomy Control";
            if (typeof window.loadOperations === "function") window.loadOperations();
            break;
        case "readiness":
            pageTitle.textContent = "Readiness & Revenue Pilot";
            if (typeof window.loadReadiness === "function") window.loadReadiness();
            break;

        case "social":
            pageTitle.textContent = "Social Media";
            if (typeof window.loadSocialFeed === "function") window.loadSocialFeed();
            break;

        case "scheduler":
            pageTitle.textContent = "Agent Scheduler";
            if (typeof window.loadScheduler === "function") window.loadScheduler();
            break;

        case "avo-ideas":
            pageTitle.textContent = "AVO Ideas";
            if (typeof window.loadAvoIdeas === "function") window.loadAvoIdeas();
            break;

        case "wallet":
            pageTitle.textContent = "Revenue Wallet";
            if (typeof window.loadWallet === "function") window.loadWallet();
            break;

        default:

            loadModule("dashboard");

            break;
    }
}


window.loadModule = loadModule;

function handleNavClick(e) {
    const btn = e.target.closest("[data-module]");
    if (!btn) return;
    const module = btn.dataset.module;
    if (module && typeof loadModule === "function") loadModule(module);
}

document.getElementById("mainNavigation")?.addEventListener("click", handleNavClick);
document.getElementById("mobileNav")?.addEventListener("click", handleNavClick);

window.addEventListener("DOMContentLoaded", () => {

    setTimeout(() => {

        loadModule("dashboard");

    }, 100);

});
