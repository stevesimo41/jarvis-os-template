(function () {
    let recognition = null;
    let speakResponses = false;
    function supportedRecognition() { return window.SpeechRecognition || window.webkitSpeechRecognition; }
    function startVoice() {
        const Recognition = supportedRecognition();
        if (!Recognition) return alert("Voice recognition is not supported by this browser. You can still type to JARVIS or use Apple Shortcuts.");
        recognition = new Recognition(); recognition.lang = "en-US"; recognition.interimResults = false; recognition.continuous = false;
        recognition.onresult = event => { const input = document.getElementById("command"); input.value = event.results[0][0].transcript; input.focus(); };
        recognition.start();
    }
    function speak(text) { if (!speakResponses || !("speechSynthesis" in window)) return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(String(text).slice(0, 4000))); }
    function loadVoice() {
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = `<section class="voice-center"><header><div class="eyebrow">JARVIS OS / VOICE & IPHONE</div><h1>Voice Assistant</h1><p>Push to talk, optional spoken responses, and secure Apple Shortcut contracts.</p></header><div class="voice-actions"><button id="voiceTalk">PUSH TO TALK</button><button id="voiceSpeak">SPOKEN RESPONSES: ${speakResponses ? "ON" : "OFF"}</button></div><article><h2>Apple integrations</h2><p>Ask JARVIS · Daily Brief · Capture Idea · Review Approvals · Stop Automation</p><p>Siri, Shortcuts, Spotlight, widgets, and the Action button use authenticated endpoints. Voice never bypasses confirmation or approval.</p></article><p class="voice-boundary">Browser microphone permission is opt-in. Audio is processed by the device/browser voice service and is not stored by JARVIS.</p></section>`;
        document.getElementById("voiceTalk").onclick = startVoice;
        document.getElementById("voiceSpeak").onclick = () => { speakResponses = !speakResponses; loadVoice(); };
    }
    window.addEventListener("jarvis:response", event => speak(event.detail));
    window.JarvisVoice = { start: startVoice, speak };
    window.loadVoice = loadVoice;
}());
