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
    echo ".env created ✓"
else
    echo ".env already exists ✓"
fi

# Initialize data directories
echo ""
echo "Initializing data directories..."
mkdir -p backend/data/governance
mkdir -p backend/data/agents
mkdir -p backend/data/crm
mkdir -p backend/data/learning
mkdir -p backend/data/activity
mkdir -p backend/data/auth

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your API keys (optional)"
echo "  2. Run: cd backend && npm start"
echo "  3. Open: http://localhost:3000"
echo ""
echo "Use opencode to customize your JARVIS:"
echo "  - Configure agents in backend/agents/"
echo "  - Customize the UI in frontend/"
echo ""
