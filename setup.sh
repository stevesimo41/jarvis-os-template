#!/bin/bash
# JARVIS OS Template Setup
# Run this after cloning the template

set -e

echo "=== JARVIS OS Setup ==="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ required. Found: $(node -v)"
    exit 1
fi

echo "Node.js: $(node -v) ✓"

# Install dependencies
echo ""
echo "Installing dependencies..."
cd backend && npm install
cd ..

# Create .env if not exists
if [ ! -f backend/.env ]; then
    echo ""
    echo "Creating .env from template..."
    cp backend/.env.example backend/.env

    # Generate tokens
    OWNER_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
    OPERATOR_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
    VIEWER_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")

    sed -i '' "s|generate-one-with-command-above|$OWNER_TOKEN|g" backend/.env
    # Replace the second occurrence for operator
    sed -i '' "0,/generate-one-with-command-above/s|generate-one-with-command-above|$OPERATOR_TOKEN|" backend/.env
    # Replace the third for viewer
    sed -i '' "0,/generate-one-with-command-above/s|generate-one-with-command-above|$VIEWER_TOKEN|" backend/.env

    echo ".env created with generated auth tokens ✓"
else
    echo ".env already exists ✓"
fi

# Create data directories
mkdir -p backend/data/governance
mkdir -p backend/data/agents
echo '[]' > backend/data/governance/approvals.json
echo '{"findings":[],"runs":[],"lastRunAt":null,"totalRuns":0}' > backend/data/agents/market-pulse-state.json

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your API keys"
echo "  2. Run: cd backend && npm start"
echo "  3. Open: http://localhost:3000"
echo ""
echo "Use opencode to customize your JARVIS:"
echo "  - Configure ventures in backend/config/ventures.json"
echo "  - Add agents in backend/agents/"
echo "  - Customize the UI in frontend/"
echo ""
