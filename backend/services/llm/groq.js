const API_BASE = "https://api.groq.com/openai/v1";

function getApiKey() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY is required for the Groq provider. Get one free at https://console.groq.com");
    return key;
}

function getModel() {
    return process.env.JARVIS_GROQ_MODEL || "llama-3.1-8b-instant";
}

function buildTools(tools) {
    if (!tools || !tools.length) return undefined;
    return tools.map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}

function buildMessages(systemPrompt, messages) {
    const result = [];
    if (systemPrompt) {
        result.push({ role: "system", content: systemPrompt });
    }
    for (const msg of messages) {
        result.push({ role: msg.role, content: msg.content });
    }
    return result;
}

function extractText(payload) {
    const choice = (payload.choices || [])[0];
    if (!choice) return "";
    return (choice.message?.content || "").trim();
}

function extractToolCalls(payload) {
    const choice = (payload.choices || [])[0];
    const calls = choice?.message?.tool_calls || [];
    return calls.map(call => ({
        id: call.id || `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: call.function?.name || "unknown",
        arguments: typeof call.function?.arguments === "string"
            ? JSON.parse(call.function.arguments || "{}")
            : call.function?.arguments || {}
    }));
}

function mapFinishReason(payload) {
    const choice = (payload.choices || [])[0];
    const reason = choice?.finish_reason;
    if (reason === "stop") return "stop";
    if (reason === "length") return "length";
    if (reason === "tool_calls") return "tool_calls";
    return reason || "stop";
}

async function complete({ systemPrompt, messages, tools, context }) {
    const apiKey = getApiKey();
    const model = getModel();
    const url = `${API_BASE}/chat/completions`;

    const requestBody = {
        model,
        messages: buildMessages(systemPrompt, messages),
        max_tokens: 4096,
        temperature: 0.7,
        stream: false
    };

    if (tools && tools.length) {
        requestBody.tools = buildTools(tools);
    }

    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            if (!response.ok) {
                const body = await response.text();
                if (response.status === 429 && attempt < MAX_RETRIES) {
                    const retryAfter = parseInt(response.headers.get("Retry-After") || "10", 10);
                    lastError = new Error(`Groq rate limited, retrying in ${retryAfter}s (attempt ${attempt}/${MAX_RETRIES})`);
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }
                throw new Error(`Groq API ${response.status}: ${body.slice(0, 200)}`);
            }

            const payload = await response.json();
            return {
                text: extractText(payload),
                toolCalls: extractToolCalls(payload),
                finishReason: mapFinishReason(payload),
                provider: "groq",
                model: payload.model || model
            };
        } finally {
            clearTimeout(timer);
        }
    }

    if (lastError && lastError.message.includes("rate limited")) {
        try { require("../alertService").record("groq429"); } catch {}
    }
    throw lastError || new Error("Groq provider failed after retries");
}

module.exports = { complete };
