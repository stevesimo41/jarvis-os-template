/* =============================================
   JARVIS OS TEMPLATE — NAVIGATION MODULE
   Simplified for template: Command Center, Agent Hub, CRM, Ask JARVIS, Settings
   ============================================= */

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

    document.querySelectorAll(".nav-button").forEach(function (button) {
        button.classList.remove("active");
    });

    var activeButton = Array.from(
        document.querySelectorAll(".nav-button")
    ).find(function (button) {
        return button.getAttribute("onclick") && button.getAttribute("onclick").includes("'" + moduleName + "'");
    });

    if (activeButton) {
        activeButton.classList.add("active");
    }

    if (moduleName === "dashboard") {
        workspace.innerHTML = '<div id="dashboardRoot"><div class="command-center-loading"><div class="eyebrow">JARVIS OS</div><h2>Loading dashboard</h2><p>Synchronizing live intelligence...</p></div></div>';
    } else {
        workspace.innerHTML = '<div class="command-center-loading"><div class="eyebrow">JARVIS OS</div><h2>Loading ' + moduleName.replace("-", " ") + '</h2><p>Synchronizing live intelligence...</p></div>';
    }

    switch (moduleName) {

        case "dashboard":
            pageTitle.textContent = "Executive Command Center";
            triggerDashboardLoad();
            break;

        case "chat":
            pageTitle.textContent = "Ask JARVIS";
            if (typeof window.showJarvisConversation === "function") {
                window.showJarvisConversation();
            } else {
                workspace.innerHTML = '<div class="module-shell"><div class="command-hero"><div class="command-hero-main"><div class="eyebrow">JARVIS OS / ASK JARVIS</div><h1>Ask JARVIS</h1><p>Chat with your AI operating system. Type a question or command below.</p></div></div><div class="command-section"><div class="command-section-header"><div><div class="eyebrow">CONVERSATION</div><h2>What would you like to ask?</h2></div></div><div class="empty-state">Connect your JARVIS backend and add chat/chat.js to enable conversational AI.</div></div></div>';
            }
            break;

        case "agent-hub":
            pageTitle.textContent = "Agent Hub";
            if (window.loadAgentHub) window.loadAgentHub(initialTab);
            break;

        case "crm":
            pageTitle.textContent = "CRM";
            if (typeof window.loadCrmPanel === "function") {
                window.loadCrmPanel();
            } else {
                workspace.innerHTML = '<div class="module-shell"><div class="command-hero"><div class="command-hero-main"><div class="eyebrow">JARVIS OS / CRM</div><h1>Your CRM</h1><p>Connect your existing CRM database, or use JARVIS as your standalone pipeline.</p></div></div><div class="command-section"><div class="command-section-header"><div><div class="eyebrow">CRM INTEGRATION</div><h2>Pipeline Overview</h2></div></div><div class="crm-generic"><article class="crm-connect-info"><h3>Supported Integrations</h3><ul><li>Google Sheets</li><li>Airtable (via API)</li><li>Any SQL database</li><li>CSV import</li></ul><p class="crm-note">Connection is optional. JARVIS works standalone without a CRM.</p></article><article class="crm-headers-preview"><h3>Example Pipeline Columns</h3><table style="width:100%;border-collapse:collapse;margin-top:8px;"><tr style="background:#1a1f2e;"><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Name</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Email</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Phone</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Website</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">City</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Status</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Last Contact</th><th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Notes</th></tr><tr><td style="padding:8px;border-bottom:1px solid #222;">Acme Corp</td><td style="padding:8px;border-bottom:1px solid #222;">info@acme.com</td><td style="padding:8px;border-bottom:1px solid #222;">(614) 555-0123</td><td style="padding:8px;border-bottom:1px solid #222;">acme.com</td><td style="padding:8px;border-bottom:1px solid #222;">Columbus</td><td style="padding:8px;border-bottom:1px solid #222;">Not Touched</td><td style="padding:8px;border-bottom:1px solid #222;">\u2014</td><td style="padding:8px;border-bottom:1px solid #222;">High fit score</td></tr></table></article></div></div></div></div>';
            }
            break;

        case "settings":
            pageTitle.textContent = "System Settings";
            if (typeof window.loadSettings === "function") {
                window.loadSettings();
            } else {
                workspace.innerHTML = '<div class="module-shell"><div class="command-hero"><div class="command-hero-main"><div class="eyebrow">JARVIS OS / SETTINGS</div><h1>System Settings</h1><p>Configure your JARVIS operating system preferences.</p></div></div><div class="command-section"><div class="command-section-header"><div><div class="eyebrow">CONFIGURATION</div><h2>Settings</h2></div></div><div class="empty-state">Settings module not loaded. Add settings/settings.js to configure.</div></div></div>';
            }
            break;

        default:
            loadModule("dashboard");
            break;
    }
}

window.loadModule = loadModule;

window.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        loadModule("dashboard");
    }, 100);
});
