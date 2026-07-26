# Screenshots

To capture screenshots for the landing page, run the JARVIS OS app locally and use your browser's screenshot tool.

## Required screenshots:

### 1. Command Center (`command-center.png`)
- URL: `http://localhost:3000`
- Size: 1200x800
- Shows: Morning briefing, pending approvals, agent network, system health

### 2. Agent Hub (`agent-hub.png`)
- URL: `http://localhost:3000` → Click "Agent Hub" in sidebar
- Size: 1200x800
- Shows: Market Pulse panel, approval cards, agent registry

### 3. Pricing Page (`pricing.png`)
- URL: `http://localhost:3000/pricing.html`
- Size: 1200x800
- Shows: 3-tier pricing grid

### 4. Terminal Setup (`terminal.png`)
- Use macOS Screenshot (Cmd+Shift+4) on Terminal running:
  ```
  cd jarvis-os-template/backend
  npm install
  cp .env.example .env
  npm start
  ```
- Shows: The 4-command setup process

### 5. Mobile View (`mobile.png`)
- Open `http://localhost:3000` on your phone
- Screenshot: The responsive mobile layout

## Tips:
- Use dark mode on your Mac
- Full-width browser window (not too tall)
- Avoid showing personal data in the CRM
- The Agent Hub with a few approval items looks best

After taking screenshots, save them to `public/assets/` and update the landing page `<img>` tags to reference them.
