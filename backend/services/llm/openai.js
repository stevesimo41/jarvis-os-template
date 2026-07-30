const DEFAULT_MODEL = "gpt-4o-mini";
const API_BASE = "https://api.openai.com/v1";

function getApiKey() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is required for the OpenAI provider");
    return key;
}

function getModel() {
    return process.env.JARVIS_OPENAI_MODEL || DEFAULT_MODEL;
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

function buildInput(messages) {
    return messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

function extractText(payload) {
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
        return payload.output_text.trim();
    }
    return (payload.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text" && item.text)
        .map(item => item.text)
        .join("\n")
        .trim();
}

function extractToolCalls(payload) {
    const calls = [];
    for (const item of (payload.output || [])) {
        if (item.type === "function_call") {
            calls.push({
                id: item.call_id || `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: item.name,
                arguments: typeof item.arguments === "string"
                    ? JSON.parse(item.arguments || "{}")
                    : item.arguments || {}
            });
        }
    }
    return calls;
}

function mapFinishReason(payload) {
    const item = (payload.output || [])[0];
    if (item?.type === "function_call") return "tool_calls";
    return payload.incomplete_details ? "length" : "stop";
}

async function complete({ systemPrompt, messages, tools, context }) {
    const apiKey = getApiKey();
    const model = getModel();
    const url = `${API_BASE}/responses`;

    const requestBody = {
        model,
        instructions: systemPrompt,
        input: buildInput(messages),
        reasoning: { effort: "low" },
        text: { verbosity: "medium" },
        max_output_tokens: 4096,
        store: false
    };

    if (tools && tools.length) {
        requestBody.tools = buildTools(tools);
    }

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
            throw new Error(`OpenAI API ${response.status}: ${body.slice(0, 200)}`);
        }

        const payload = await response.json();
        return {
            text: extractText(payload),
            toolCalls: extractToolCalls(payload),
            finishReason: mapFinishReason(payload),
            provider: "openai",
            model: payload.model || model
        };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { complete };
