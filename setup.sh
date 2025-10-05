#!/bin/bash

# AI Agent Configurator - Quick Setup Script
echo "🔮 AI Agent Configurator - Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p mcp-servers rag-configs backend/data
echo "✅ Directories created"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend dependency installation failed"
    exit 1
fi
echo "✅ Frontend dependencies installed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd ../backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed"
    exit 1
fi
echo "✅ Backend dependencies installed"
echo ""

# Install shared dependencies
if [ -f "../shared/package.json" ]; then
    echo "📦 Installing shared dependencies..."
    cd ../shared
    npm install
    if [ $? -ne 0 ]; then
        echo "⚠️  Shared dependency installation failed (non-critical)"
    else
        echo "✅ Shared dependencies installed"
    fi
    echo ""
    cd ..
else
    cd ..
fi

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  No .env file found in backend/"
    echo ""
    echo "Creating backend/.env file..."
    cat > backend/.env << 'EOF'
# Backend Server Configuration
PORT=3001
NODE_ENV=development

# OpenAI API Configuration (REQUIRED - Add your key!)
OPENAI_API_KEY=your_openai_api_key_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Storage Configuration
DATA_DIR=./data
MCP_SERVERS_DIR=../mcp-servers
RAG_CONFIGS_DIR=../rag-configs
EOF
    echo "✅ Created backend/.env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your OpenAI API key!"
    echo "   Get your key at: https://platform.openai.com/api-keys"
    echo ""
fi

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi
echo "✅ Backend built successfully"
echo ""

cd ..

# Setup complete
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Edit backend/.env and add your OpenAI API key"
echo "   nano backend/.env"
echo ""
echo "2. Start the backend server (Terminal 1):"
echo "   cd backend && npm start"
echo ""
echo "3. Start the frontend dev server (Terminal 2):"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "📚 For detailed instructions, see SETUP.md"
echo ""

