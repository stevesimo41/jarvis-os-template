(function () {
    const STORAGE_KEY = "jarvis.conversation.v1";
    const MAX_STORED_MESSAGES = 24;

    const state = {
        messages: loadHistory(),
        provider: "checking",
        model: "",
        busy: false
    };

    function loadHistory() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(value)
                ? value
                    .filter(item => item && ["user", "assistant"].includes(item.role))
                    .map(item => ({
                        role: item.role,
                        content: String(item.content || "").slice(0, 8000),
                        agent: item.agent || null,
                        toolsUsed: item.toolsUsed || []
                    }))
                    .filter(item => item.content)
                    .slice(-MAX_STORED_MESSAGES)
                : [];
        } catch (_error) {
            return [];
        }
    }

    function saveHistory() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state.messages.slice(-MAX_STORED_MESSAGES))
        );
    }

    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    }

    function renderText(value) {
        return escapeHtml(value).replace(/\n/g, "<br>");
    }

    function agentBadge(agent, toolsUsed) {
        if (!agent && (!toolsUsed || !toolsUsed.length)) return "";
        const parts = [];
        if (agent) parts.push(`<span class="chat-agent-badge">Agent: ${escapeHtml(agent)}</span>`);
        if (toolsUsed && toolsUsed.length) parts.push(`<span class="chat-tools-badge">Tools: ${toolsUsed.length} used</span>`);
        return `<div class="chat-metadata">${parts.join("")}</div>`;
    }

    function conversationMarkup() {
        const providerClass = ["openai", "gemini", "local", "offline"].includes(state.provider)
            ? state.provider
            : "checking";
        const messages = state.messages.length
            ? state.messages.map(message => `
                <article class="chat-message chat-${message.role}">
                    <div class="chat-role">${message.role === "user" ? "STEVE" : "JARVIS"}</div>
                    ${message.role === "assistant" ? agentBadge(message.agent, message.toolsUsed) : ""}
                    <div class="chat-content">${renderText(message.content)}</div>
                </article>
            `).join("")
            : `
                <div class="chat-welcome">
                    <div class="eyebrow">CONVERSATIONAL JARVIS</div>
                    <h1>What are we working through?</h1>
                    <p>I can discuss your priorities, ventures, CRM, decisions, and releases. I have tools to search the web, query your CRM, and coordinate your agents.</p>
                </div>
            `;

        return `
            <section class="jarvis-chat">
                <header class="chat-toolbar">
                    <div>
                        <span class="chat-provider ${providerClass}">${escapeHtml(state.provider)}</span>
                        <span class="chat-model">${escapeHtml(state.model)}</span>
                    </div>
                    <button type="button" class="chat-clear" onclick="clearJarvisConversation()">Clear private history</button>
                </header>
                <div class="chat-thread" id="jarvisChatThread">${messages}</div>
                <footer class="chat-privacy">History stays in this browser. Credentials are never included. Actions require approval.</footer>
            </section>
        `;
    }

    function showConversation() {
        const workspace = document.getElementById("conversation");
        const title = document.getElementById("pageTitle");
        if (!workspace) return;
        if (title) title.textContent = "Ask JARVIS";
        workspace.innerHTML = conversationMarkup();
        requestAnimationFrame(() => {
            const thread = document.getElementById("jarvisChatThread");
            if (thread) thread.scrollTop = thread.scrollHeight;
        });
    }

    async function loadConversationStatus() {
        try {
            const response = await fetch("/api/jarvis/conversation/status");
            const payload = await response.json();
            if (!response.ok || !payload.ok) return;
            state.provider = payload.data.provider;
            state.model = payload.data.model;
            if (document.querySelector(".jarvis-chat")) showConversation();
        } catch (_error) {
            state.provider = "offline";
        }
    }

    async function progressiveAssistantRender(text, agent, toolsUsed) {
        state.messages.push({ role: "assistant", content: "", agent: agent || null, toolsUsed: toolsUsed || [] });
        showConversation();
        const target = state.messages[state.messages.length - 1];
        const increment = Math.max(2, Math.ceil(text.length / 80));
        for (let index = 0; index < text.length; index += increment) {
            target.content = text.slice(0, index + increment);
            const content = document.querySelector(".chat-message:last-child .chat-content");
            if (content) content.innerHTML = renderText(target.content);
            await new Promise(resolve => setTimeout(resolve, 8));
        }
        target.content = text;
        saveHistory();
        window.dispatchEvent(new CustomEvent("jarvis:response", { detail: text }));
    }

    async function askJarvisChat() {
        const input = document.getElementById("command");
        const button = document.getElementById("sendCommand");
        const command = input?.value.trim();
        if (!command || state.busy) return;

        state.busy = true;
        input.value = "";
        input.disabled = true;
        button.disabled = true;
        button.textContent = "THINKING";
        state.messages.push({ role: "user", content: command });
        saveHistory();
        showConversation();

        try {
            const response = await fetch("/api/jarvis/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: state.messages })
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || "JARVIS did not respond.");
            }
            state.provider = payload.data.provider;
            state.model = payload.data.model;
            await progressiveAssistantRender(
                payload.data.response,
                payload.data.agent,
                payload.data.toolsUsed
            );
        } catch (error) {
            state.messages.push({
                role: "assistant",
                content: `I couldn't complete that response: ${error.message}`
            });
            saveHistory();
        } finally {
            state.busy = false;
            input.disabled = false;
            button.disabled = false;
            button.textContent = "SEND";
            showConversation();
            input.focus();
        }
    }

    function clearJarvisConversation() {
        state.messages = [];
        localStorage.removeItem(STORAGE_KEY);
        showConversation();
    }

    window.askJarvisChat = askJarvisChat;
    window.showJarvisConversation = showConversation;
    window.clearJarvisConversation = clearJarvisConversation;
    window.addEventListener("DOMContentLoaded", () => {
        loadConversationStatus();
        document.getElementById("command")?.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                askJarvisChat();
            }
        });
    });
}());
