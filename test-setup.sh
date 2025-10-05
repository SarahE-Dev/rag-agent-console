#!/bin/bash

# Test Setup Script for AI Agent Configurator
echo "🧪 Testing AI Agent Configurator Setup..."
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check Node.js
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi
echo "✅ Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm --version)"
echo ""

# Check if backend is built
echo "🔨 Checking backend build..."
cd backend
if [ ! -d "dist" ]; then
    echo "❌ Backend not built. Building now..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Backend build failed"
        exit 1
    fi
    echo "✅ Backend built successfully"
else
    echo "✅ Backend already built"
fi
cd ..
echo ""

# Check if .env exists
echo "🔑 Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env not found"
    echo ""
    echo "Please create backend/.env with:"
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo "PORT=3001"
    echo "NODE_ENV=development"
    echo "FRONTEND_URL=http://localhost:3000"
    echo ""
    exit 1
else
    echo "✅ backend/.env exists"
fi

# Check if OpenAI key is set
if grep -q "your_openai_api_key_here" backend/.env; then
    echo "⚠️  OpenAI API key not configured in backend/.env"
    echo "   Please replace 'your_openai_api_key_here' with your actual key"
    echo "   Get your key at: https://platform.openai.com/api-keys"
    echo ""
else
    echo "✅ OpenAI API key appears to be configured"
fi
echo ""

# Check package installations
echo "📦 Checking package installations..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "❌ Frontend node_modules missing"
    exit 1
fi
echo "✅ Frontend packages installed"

cd ../backend
if [ ! -d "node_modules" ]; then
    echo "❌ Backend node_modules missing"
    exit 1
fi
echo "✅ Backend packages installed"
cd ..
echo ""

# Check required directories
echo "📁 Checking required directories..."
dirs=("mcp-servers" "rag-configs" "backend/data")
for dir in "${dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Missing directory: $dir"
        mkdir -p "$dir"
        echo "✅ Created $dir"
    else
        echo "✅ $dir exists"
    fi
done
echo ""

# Summary
echo "========================================"
echo "📋 Setup Test Results:"
echo "========================================"
echo ""
echo "✅ Node.js installed"
echo "✅ npm installed"
echo "✅ Backend built"
echo "✅ Environment file exists"
echo "✅ Frontend packages installed"
echo "✅ Backend packages installed"
echo "✅ Required directories exist"
echo ""

if grep -q "your_openai_api_key_here" backend/.env; then
    echo "⚠️  ACTION REQUIRED:"
    echo "   Configure your OpenAI API key in backend/.env"
    echo "   Get your key at: https://platform.openai.com/api-keys"
    echo ""
fi

echo "🚀 Ready to start!"
echo ""
echo "1. Configure OpenAI API key if not done"
echo "2. Start backend: ./start-backend.sh"
echo "3. Start frontend: ./start-frontend.sh"
echo "4. Open http://localhost:3000"
echo ""
echo "📖 See SETUP.md for detailed instructions"
echo "📖 See AGENT_STATUS.md for agent functionality details"
echo ""
