# JARVIS OS — Setup Guide

*No coding required. Follow these steps and you will have JARVIS running on your computer in about 10 minutes.*

---

## What You Need

| Tool | Where to Get It | Why You Need It |
|------|----------------|-----------------|
| **A Mac computer** | You already have one | JARVIS runs on macOS (Apple Silicon or Intel) |
| **Node.js** | [nodejs.org](https://nodejs.org) (click the big green "LTS" button) | The engine that runs JARVIS |
| **A text editor** | [VSCode](https://code.visualstudio.com) (free, recommended) or just use TextEdit | To edit your settings file |
| **A terminal app** | Built into your Mac (Terminal.app in Applications/Utilities) | To start JARVIS |

### Optional — Makes JARVIS Smarter

| Tool | Where to Get It | What It Does |
|------|----------------|--------------|
| **An AI API key** | [Google AI Studio](https://aistudio.google.com/apikey) (free tier available) | Lets JARVIS think, write, and reason |
| **A Lemon Squeezy account** | [lemonsqueezy.com](https://app.lemonsqueezy.com/register) (free) | Lets you sell products through JARVIS |

---

## Step 1: Download JARVIS

1. Open **Safari** (or Chrome) on your Mac
2. Go to `https://jarvis-os-template.vercel.app`
3. Click the **Download Free** button
4. A `.zip` file will download — double-click it to unzip
5. Move the unzipped folder to your **Desktop** and rename it to whatever you like (e.g., `My-JARVIS`)

---

## Step 2: Install Node.js

1. Go to [nodejs.org](https://nodejs.org)
2. Click the big green button that says **LTS** (this is the stable version)
3. The download starts automatically — open the downloaded `.pkg` file
4. Click through the installer (default settings are fine)
5. When it finishes, **restart your Mac** (important!)

**To verify it worked:**
- Open **Terminal** (press `Cmd+Space`, type "Terminal", press Enter)
- Type `node --version` and press Enter
- You should see something like `v22.x.x` — if you see a number, it worked

---

## Step 3: Open JARVIS in Terminal

1. Open **Terminal**
2. Type `cd Desktop` and press Enter
3. If you named your folder `My-JARVIS`, type `cd "My-JARVIS"` and press Enter
   *(If you named it something else, use that name instead)*
4. Type `ls` and press Enter — you should see files like `SETUP.md`, `README.md`, `backend/`, `frontend/`, `public/`

---

## Step 4: Configure Your Settings

1. Open the JARVIS folder in **Finder** (or open it with VSCode if you installed it)
2. Find the file called **`.env.example`** inside the `backend/` folder
3. **Duplicate it** and rename the copy to **`.env`** (just `.env`, no other name)
4. Open `.env` in a text editor

### The Bare Minimum — Just Your Name

Find the line that says:

```
# JARVIS_OWNER_NAME=
```

Remove the `#` and add your name:

```
JARVIS_OWNER_NAME=Your Name
```

*(If you want, you can also add an AI key — uncomment `LLM_API_KEY=` and paste your Google AI Studio key.)*

5. **Save the file** and close it

---

## Step 5: Install Dependencies

Back in **Terminal**, make sure you are still in your JARVIS folder (the one with `backend/` in it).

Type these commands **one at a time**, pressing Enter after each:

```
cd backend
npm install
```

This will take 30–90 seconds. You will see some scrolling text — that is normal. When it finishes, you will see your cursor back at a `$` prompt.

---

## Step 6: Start JARVIS

Still in Terminal, type:

```
npm start
```

You should see:

```
=== JARVIS ROUTE LOADED ===
Discovery Agent: scanning environment...
[discoveryAgent] ╔═══════════════════════════════════════╗
[discoveryAgent] ║       JARVIS OS DISCOVERY AGENT        ║
[discoveryAgent] ╚═══════════════════════════════════════╝
✓ JARVIS OS is running on http://localhost:3000
```

**JARVIS IS NOW RUNNING!** Keep this Terminal window open.

---

## Step 7: Open JARVIS in Your Browser

1. Open **Safari** (or Chrome)
2. Go to `http://localhost:3000`
3. You should see the JARVIS OS interface

The first time you visit, the Discovery Agent will scan your computer and set things up automatically.

---

## Everyday Use

- **To start JARVIS**: Open Terminal, run the commands from Steps 3 and 6
- **To stop JARVIS**: Press `Ctrl+C` in the Terminal window
- **To access JARVIS**: Open `http://localhost:3000` in your browser

---

## Need Help?

- Check the `README.md` file in the JARVIS folder
- Open an issue on GitHub: `https://github.com/stevesimo41/jarvis-os-template/issues`

---

## Troubleshooting

| Problem | Likely Fix |
|---------|-----------|
| `node: command not found` | Node.js was not installed. Go back to Step 2. |
| `npm install` fails | Restart your Mac and try again. Make sure you are in the `backend/` folder. |
| Browser shows "Cannot GET /" | Make sure the Terminal is still running JARVIS (Step 6). |
| Port already in use | Edit your `.env` file and add `PORT=3001` (or any number), then restart. |
