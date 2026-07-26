# JARVIS OS

Your personal AI operating system. Download, configure, and vibe-code your way to a system that thinks like you.

## Quick Start

1. **Clone this template**
   ```bash
   git clone <this-repo> my-jarvis-os
   cd my-jarvis-os
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start JARVIS**
   ```bash
   npm start
   ```

5. **Open the Command Center**
   - Browser: `http://localhost:3000`
   - Mobile: Same URL from your phone on the same network

## What You Get

- **Command Center** — Your morning dashboard. See what needs your attention.
- **Agent Hub** — Modular agents that research, discover, and prepare work for your approval.
- **Approval System** — Nothing goes out without your say-so. Review, approve, or deny.
- **CRM Pipeline** — Manage prospects from discovery to outreach. Google Sheets or any database.
- **Market Pulse** — Scan the web for opportunities matching your business in your area.
- **Web Research** — Search engines, website scraping, content extraction.
- **Prospect Enrichment** — Find emails, phone numbers, executive names from websites.
- **Contact Form Detection** — Auto-detect and submit to website contact forms.

## Customization

This template is a foundation. Use [opencode](https://opencode.ai) to vibe-code your way to a tailored system:

### Connect an LLM (Optional)

JARVIS works without an LLM using local rule-based logic. To add AI intelligence, set your provider in `.env`:

```env
# Choose one:
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key-here

# Or OpenAI:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your-key-here

# Or Anthropic:
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your-key-here

# Or run locally with Ollama:
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
```

### Connect a CRM (Optional)

CRM connection is optional. JARVIS works standalone as a pipeline. To connect Google Sheets:

1. Create a Google Cloud project with Sheets API enabled
2. Download OAuth credentials to `~/.jarvis/credentials/`
3. Add your spreadsheet ID to `.env`

Or use the built-in approval queue without any external CRM.

### Customize Agents

- `backend/agents/` — Each agent is a module. Modify existing ones or create new ones.
- `backend/routes/` — API endpoints. Add routes for your specific needs.
- `backend/services/` — Business logic. Customize for your workflows.

### Personalize the UI

- `frontend/index.html` — Main layout and sidebar navigation
- `frontend/css/jarvis.css` — All styles (dark theme, mobile-first)
- `frontend/js/` — Modular JavaScript for each panel

## Architecture

```
jarvis-os/
├── backend/
│   ├── agents/          # Autonomous agents (Market Pulse, etc.)
│   ├── routes/          # API endpoints (auth, approvals, agent hub)
│   ├── services/        # Business logic (web research, email, enrichment)
│   ├── config/          # Configuration and environment
│   ├── governance/      # Approval system
│   ├── auth/            # Authentication (sessions, roles)
│   ├── brain/           # Activity logging
│   ├── storage/         # JSON file persistence
│   └── server.js        # Express server
├── frontend/
│   ├── index.html       # Command Center UI
│   ├── js/              # JavaScript modules
│   └── css/             # Styles
└── data/                # Runtime data (created automatically)
```

## License

JARVIS OS is dual-licensed:

- **AGPL v3** (free) — self-host, modify, distribute under copyleft terms
- **Commercial License** (paid) — use in proprietary products or offer as SaaS

See [LICENSE](./LICENSE) for full AGPL v3 terms and [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) for commercial licensing details.

## The JARVIS Philosophy

1. **Human in the loop** — AI prepares, you approve. Always.
2. **Modular agents** — Each agent does one thing well. Compose them.
3. **Persistent memory** — JARVIS remembers context across sessions.
4. **Mobile-first** — Access from anywhere. Your AI, your pocket.
5. **Local-first** — Data stays on your machine. You own everything.

## Next Steps

After setup, use opencode to:
1. Define your target market and geography
2. Customize the Market Pulse agent for your industry
3. Set up email outreach (Gmail, Outlook, or any SMTP)
4. Build new agents for your specific needs
5. Connect your CRM or use the built-in pipeline

The template is your foundation. opencode is your tool. Build something that thinks like you.
