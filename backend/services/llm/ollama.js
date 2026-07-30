const OLLAMA_LOCAL_BASE = "http://127.0.0.1:11434";
const OLLAMA_CLOUD_BASE = "https://api.ollama.cloud/v1";

function getCloudApiKey() {
    return process.env.OLLAMA_API_KEY || null;
}

function getLocalModel() {
    return process.env.JARVIS_LLM_MODEL_LOCAL || "llama3.2:3b";
}

function getCloudModel() {
    return process.env.JARVIS_LLM_MODEL_CLOUD || "gpt-oss:120b-cloud";
}

function isLocalAvailable() {
    return process.env.JARVIS_OLLAMA_LOCAL !== "false";
}

function isCloudAvailable() {
    return !!getCloudApiKey();
}

function buildOllamaTools(tools) {
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
    const ollamaMessages = [
        { role: "system", content: systemPrompt }
    ];
    for (const msg of messages) {
        ollamaMessages.push({
            role: msg.role,
            content: msg.content
        });
    }
    return ollamaMessages;
}

function extractText(data) {
    if (data.message && data.message.content) {
        return data.message.content;
    }
    if (data.choices && data.choices[0]) {
        return data.choices[0].message?.content || "";
    }
    return "";
}

function extractToolCalls(data) {
    const toolCalls = [];

    if (data.message && data.message.tool_calls) {
        for (const tc of data.message.tool_calls) {
            toolCalls.push({
                id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: tc.function?.name || tc.name,
                arguments: tc.function?.arguments || tc.arguments || {}
            });
        }
    }

    if (data.choices && data.choices[0]?.message?.tool_calls) {
        for (const tc of data.choices[0].message.tool_calls) {
            toolCalls.push({
                id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: tc.function?.name,
                arguments: tc.function?.arguments || {}
            });
        }
    }

    return toolCalls;
}

function mapFinishReason(data) {
    if (data.done) return "stop";
    if (data.choices && data.choices[0]) {
        const reason = data.choices[0].finish_reason;
        if (reason === "stop") return "stop";
        if (reason === "length") return "length";
        if (reason === "tool_calls") return "tool_calls";
    }
    return "stop";
}

async function callLocal({ systemPrompt, messages, tools }) {
    const url = `${OLLAMA_LOCAL_BASE}/api/chat`;
    const model = getLocalModel();

    const requestBody = {
        model,
        messages: buildMessages(systemPrompt, messages),
        stream: false,
        options: {
            temperature: 0.7,
            num_predict: 4096
        }
    };

    if (tools && tools.length) {
        requestBody.tools = buildOllamaTools(tools);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Ollama local ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json();
        return {
            text: extractText(data),
            toolCalls: extractToolCalls(data),
            finishReason: mapFinishReason(data),
            provider: "ollama-local",
            model
        };
    } finally {
        clearTimeout(timer);
    }
}

async function callCloud({ systemPrompt, messages, tools }) {
    const apiKey = getCloudApiKey();
    if (!apiKey) throw new Error("OLLAMA_API_KEY required for cloud fallback");

    const url = `${OLLAMA_CLOUD_BASE}/chat/completions`;
    const model = getCloudModel();

    const requestBody = {
        model,
        messages: buildMessages(systemPrompt, messages),
        temperature: 0.7,
        max_tokens: 4096
    };

    if (tools && tools.length) {
        requestBody.tools = buildOllamaTools(tools);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Ollama Cloud ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json();
        return {
            text: extractText(data),
            toolCalls: extractToolCalls(data),
            finishReason: mapFinishReason(data),
            provider: "ollama-cloud",
            model
        };
    } finally {
        clearTimeout(timer);
    }
}

async function complete({ systemPrompt, messages, tools, context }) {
    let lastError = null;

    if (isLocalAvailable()) {
        try {
            return await callLocal({ systemPrompt, messages, tools });
        } catch (error) {
            console.warn("Ollama local failed, trying cloud:", error.message);
            lastError = error;
        }
    }

    if (isCloudAvailable()) {
        try {
            return await callCloud({ systemPrompt, messages, tools });
        } catch (error) {
            console.warn("Ollama cloud failed:", error.message);
            lastError = error;
        }
    }

    throw lastError || new Error("No Ollama backend available (local and cloud both failed or unconfigured)");
}

function status() {
    const localAvailable = isLocalAvailable();
    const cloudAvailable = isCloudAvailable();
    return {
        provider: "ollama",
        localAvailable,
        cloudAvailable,
        localModel: getLocalModel(),
        cloudModel: cloudAvailable ? getCloudModel() : null,
        localBase: localAvailable ? OLLAMA_LOCAL_BASE : null,
        cloudConfigured: cloudAvailable
    };
}

module.exports = { complete, status, callLocal, callCloud };
