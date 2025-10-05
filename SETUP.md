# 🚀 Complete Setup Guide - AI Agent Configurator

This comprehensive guide will get your full AI Agent Configurator system up and running with RAG, voice chat, fuzzy matching, and database persistence.

## 📋 Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **PostgreSQL** with pgvector extension (for database and vector storage)
- **ChromaDB** (for dedicated vector operations)
- **OpenAI API Key** with access to GPT-4, Whisper, and TTS
- **System administrator access** (for database setup)

### 🛠️ System Requirements

- **OS:** Linux, macOS, or Windows
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 2GB free space for dependencies and data
- **Network:** Internet connection for OpenAI API calls

## 🔧 Step-by-Step Setup

### **🎯 Option 1: Automated Setup (Recommended)**

Run the all-in-one setup script:

```bash
cd /home/sarah-eatherly/Desktop/agents
./setup.sh
```

**What the script does:**
- ✅ Installs all Node.js dependencies
- ✅ Sets up PostgreSQL with pgvector extension
- ✅ Installs ChromaDB via pipx
- ✅ Creates necessary directories
- ✅ Generates `.env` template
- ✅ Builds the application

**You'll need to provide:**
1. **OpenAI API Key** (get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
2. **System Password** (for PostgreSQL setup)

### **🎯 Option 2: Manual Setup**

#### **1. Install Dependencies**
```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

#### **2. Set up Database**
```bash
# Install PostgreSQL and pgvector
sudo apt update
sudo apt install postgresql postgresql-16-pgvector

# Run database setup script
./setup-database.sh
```

#### **3. Install ChromaDB**
```bash
# Install pipx if needed
sudo apt install pipx
pipx ensurepath

# Install ChromaDB
pipx install chromadb
```

#### **4. Configure Environment**
Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
DATABASE_URL="postgresql://ai_agents_user:your_password@localhost:5432/ai_agents_db"
FRONTEND_URL=http://localhost:3000
```

#### **5. Build and Start**

**Terminal 1 - ChromaDB:**
```bash
chroma run --host localhost --port 8000
```

**Terminal 2 - Backend:**
```bash
./start-backend.sh
# Or: cd backend && npm run dev
```

**Terminal 3 - Frontend:**
```bash
./start-frontend.sh
# Or: cd frontend && npm run dev
```

### **6. Open the Application**

Navigate to: **http://localhost:3000**

You should see the cyberpunk-themed dashboard with all systems ready! 🎉

## 🧪 Testing the Complete System

### **Phase 1: Test Data Upload & Processing**

1. **Upload Sample Data:**
   - Go to **"RAG Setup"** → **"Data Sources"**
   - Click **"Add Data Source"** → **"Upload File"**
   - Select `test_speakers.csv` from project root
   - Wait for **"ready"** status (processing happens automatically)

2. **Verify Processing:**
   - Check backend logs for: `✅ SUCCESS: Data source processed!`
   - Vector store should appear in **"Vector Stores"** tab
   - Status should show document count and vector count

### **Phase 2: Test Agent Configuration**

1. **Create Voice Agent:**
   - Go to **"AI Agent Configuration"**
   - Click **"Add AI Agent"** → Select **"Voice Agent"**
   - Name: "Test Voice Agent"
   - Select vector store from uploaded data
   - System Prompt: *"You are a helpful voice assistant..."*

2. **Create Chat Agent:**
   - Same process, select **"Chat Agent"**
   - Test both agent types

### **Phase 3: Test Voice Chat**

1. **Switch to Voice Interface:**
   - Go to **"AI Agent Interfaces"** → **"Voice Chat"**
   - Select your voice agent

2. **Test Basic Voice Chat:**
   - **Hold mouse button** → Say *"Hello, who are you?"*
   - **Release** → Should respond and auto-play audio

3. **Test RAG Context:**
   - **Hold** → Say *"Who is Sarah Chen?"*
   - **Release** → Should provide correct speaker information

4. **Test Fuzzy Matching:**
   - **Hold** → Say *"Tell me about Sarah Chin"* (transcription error)
   - **Release** → Should still find "Sarah Chen" data

### **Phase 4: Test Chat Interface**

1. **Switch to Chat:**
   - Go to **"AI Agent Interfaces"** → **"Chat Chat"**
   - Select your chat agent

2. **Test Text Chat:**
   - Type: *"michael rodriguez"*
   - Should respond with professor information
   - Test fuzzy: *"michael rodriges"* → Should still work

### **Phase 5: Test MCP Servers**

1. **Add MCP Server:**
   - Go to **"MCP Servers"**
   - Click **"Add MCP Server"**
   - Fill with test configuration
   - Try start/stop functionality

### **Phase 6: Verify All Features**

- ✅ **File Upload**: Multiple formats (CSV, PDF, TXT, etc.)
- ✅ **Auto-Processing**: Background embedding generation
- ✅ **Vector Stores**: Auto-created from data sources
- ✅ **Agent Selection**: Multiple vector stores per agent
- ✅ **Voice Recognition**: Hold-to-talk with auto-send
- ✅ **Speech Synthesis**: Immediate audio playback
- ✅ **Fuzzy Matching**: Name transcription error handling
- ✅ **Real-time Status**: Processing indicators and updates
- ✅ **Database Persistence**: Data survives restarts

## 🐛 Troubleshooting

### **🔴 Critical Issues**

#### **"Vector store not found"**
```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# If not running, start it
chroma run --host localhost --port 8000

# Restart backend after ChromaDB starts
cd backend && npm run dev
```

#### **"Database connection failed"**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Run database setup
./setup-database.sh

# Test connection
psql -h localhost -U ai_agents_user -d ai_agents_db
```

#### **"OpenAI API key not found"**
- Verify key in `backend/.env` starts with `sk-`
- Check key validity at [platform.openai.com](https://platform.openai.com)
- Ensure key has access to GPT-4, Whisper, and TTS
- Test with: `curl -H "Authorization: Bearer YOUR_KEY" https://api.openai.com/v1/models`

### **🟡 Common Issues**

#### **Port Already in Use**

If you get "Port 3000 is already in use":
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
# Or use a different port
PORT=3001 npm run dev
```

If backend port 3001 is in use:
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

### Missing Dependencies

If you get module not found errors:
```bash
cd frontend
npm install --force

cd ../backend
npm install --force
```

### OpenAI API Errors

- Make sure your API key is valid
- Check you have credits available at [platform.openai.com/usage](https://platform.openai.com/usage)
- Verify the key is correctly set in `backend/.env`

### Build Errors

If TypeScript build fails:
```bash
cd backend
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

If frontend build fails:
```bash
cd frontend
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### CORS Errors

Make sure:
- Backend is running on port 3001
- Frontend is running on port 3000
- `FRONTEND_URL=http://localhost:3000` is set in backend/.env

## 📊 Default Ports

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Backend WebSocket**: ws://localhost:3001

## 🔑 API Keys You Might Need

### Required
- **OpenAI API Key** - For LLM functionality
  - Get it at: https://platform.openai.com/api-keys

### Optional (for advanced features)
- **Anthropic API Key** - For Claude models
- **Cohere API Key** - For Cohere embeddings
- **Pinecone API Key** - For hosted vector database

## 🎨 What You Can Do

Once everything is running, you can:

✅ **Manage MCP Servers** - Create, configure, start/stop MCP servers
✅ **Build RAG Pipelines** - Set up data sources and vector stores
✅ **Create AI Agents** - Configure voice and chat agents
✅ **Test in Real-Time** - Chat with your configured agents
✅ **Monitor Status** - See system status in the footer

## 📚 Next Steps

1. Read the [README.md](./README.md) for more details
2. Check out the API endpoints documentation
3. Explore the example configurations in `mcp-servers/` and `rag-configs/`
4. Customize the cyberpunk theme in `frontend/app/globals.css`

## 💡 Tips

- Use **Chrome/Edge** for best experience
- Enable **hardware acceleration** for smooth animations
- Check the browser console for any errors
- Backend logs will show in the terminal

## 🆘 Still Need Help?

If you're stuck:
1. Check the terminal logs for errors
2. Open browser DevTools (F12) and check the Console
3. Make sure all dependencies are installed
4. Verify your .env file is configured correctly
5. Try restarting both servers

---

**🎉 Enjoy your AI Agent Configurator!**

