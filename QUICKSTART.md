# ⚡ Quick Start Guide

## 🎯 Automated Setup (Recommended)

Run the automated setup script from the project root:

```bash
cd /home/sarah-eatherly/Desktop/agents
./setup.sh
```

This script will:
- ✅ Install all Node.js dependencies
- ✅ Set up PostgreSQL database with pgvector extension
- ✅ Install and configure ChromaDB
- ✅ Create necessary directories
- ✅ Generate environment configuration
- ✅ Build the application

**What you'll need to provide:**
1. **OpenAI API Key** (get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
2. **System Password** (for PostgreSQL setup)

## 🚀 Starting the Application

After setup completes, start the application:

### Option A: Use Helper Scripts
```bash
# Terminal 1: Start ChromaDB (Vector Database)
chroma run --host localhost --port 8000

# Terminal 2: Start Backend
./start-backend.sh

# Terminal 3: Start Frontend
./start-frontend.sh
```

### Option B: Manual Start
```bash
# Terminal 1: ChromaDB
chroma run --host localhost --port 8000

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

## 🌐 Access the Application

Open your browser to: **http://localhost:3000**

## ✅ Test the Complete System

1. **Upload Sample Data:**
   - Go to "RAG Setup" → "Data Sources"
   - Click "Add Data Source" → "Upload File"
   - Select `test_speakers.csv` from the project root
   - Wait for processing to complete (shows "ready" status)

2. **Create an Agent:**
   - Go to "AI Agent Configuration"
   - Create a "Voice Agent" with a descriptive name
   - Select the vector store that was created from your upload
   - Add a custom system prompt (optional)

3. **Test Voice Chat:**
   - Switch to "AI Agent Interfaces" → "Voice Chat"
   - Select your created agent
   - **Hold mouse button to record** → say "who is sarah chen"
   - **Release to send** → should respond with correct information

4. **Test Fuzzy Matching:**
   - Try saying "who is sarah chin" (transcription error)
   - Should still find "Sarah Chen" and provide correct info

## 🔑 Required API Keys

You need an **OpenAI API Key** for:
- 🤖 AI chat responses (GPT-4)
- 🎤 Speech-to-text transcription (Whisper)
- 🔊 Text-to-speech synthesis (TTS)
- 🧠 Document embeddings for RAG

**Get your key:** https://platform.openai.com/api-keys

**Add to backend/.env:**
```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

## 🐛 Quick Troubleshooting

### "Port already in use"
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

### "ChromaDB connection failed"
```bash
# Install ChromaDB if missing
pipx install chromadb

# Start ChromaDB
chroma run --host localhost --port 8000
```

### "Database connection failed"
```bash
# Run database setup
./setup-database.sh

# Or check PostgreSQL status
sudo systemctl status postgresql
```

### "OpenAI API errors"
- Verify key starts with `sk-`
- Check credits at platform.openai.com
- Ensure key has access to GPT-4, Whisper, and TTS

## 📊 System Status Check

**All systems should show active (colored dots):**
- 🔵 Frontend (Next.js)
- 🔵 Backend (Express)
- 🔵 Database (PostgreSQL)
- 🔵 Vector Store (ChromaDB)
- 🔵 AI Services (OpenAI)

## 🎯 What You Can Do Now

✅ **Upload Documents** - PDF, CSV, JSON, TXT, DOCX, MD files
✅ **Create Vector Stores** - Auto-generated from your uploads
✅ **Configure AI Agents** - Voice and chat agents with custom prompts
✅ **Test Voice Chat** - Hold-to-talk with fuzzy name matching
✅ **Real-time RAG** - Context-aware AI responses
✅ **Manage Everything** - Full CRUD for all components

## 📖 Full Documentation

- **[README.md](./README.md)** - Complete feature overview
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database configuration
- **[AGENT_STATUS.md](./AGENT_STATUS.md)** - Agent status explanations

