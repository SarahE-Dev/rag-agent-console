#!/bin/bash

# Start Backend Server
echo "🚀 Starting AI Agent Configurator Backend..."
echo ""

cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ No .env file found!"
    echo "   Please create backend/.env with your configuration"
    echo "   See SETUP.md for details"
    exit 1
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "📦 Backend not built yet. Building now..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed"
        exit 1
    fi
    echo "✅ Build complete"
    echo ""
fi

echo "Starting backend server on port 3001..."
npm start

