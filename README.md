# 🔮 AI Agent Configurator

> **NEURAL NETWORK CONFIGURATION TERMINAL** - A cyberpunk-themed interface for configuring MCP servers and RAG pipelines for AI voice and chat agents.

**Features:**
- ⚡ **MCP Server Management** - Configure and monitor Model Context Protocol servers
- 🧠 **RAG Pipeline Builder** - Upload documents, create vector stores, and retrieve context
- 🤖 **AI Agent Configuration** - Set up voice and chat agents with custom prompts
- 🎙️ **Voice Integration** - Hold-to-talk speech-to-text and text-to-speech capabilities
- 💬 **Real-time Chat** - Test agents with live conversation interface
- 📝 **Markdown Support** - Rich text formatting in AI responses
- ⌨️ **Typing Animation** - Cool typewriter effect for responses
- 🎨 **Gradient Scrollbars** - Cyberpunk-styled scrollbars throughout the app
- 🔍 **Fuzzy Search** - Handles transcription errors (e.g., "Sarah Chin" → "Sarah Chen")
- 🗄️ **Database Persistence** - PostgreSQL with Prisma ORM and ChromaDB vector storage

**Cyberpunk Theme:** Stunning matrix background with neon glows, animated scan lines, floating cards, and optimal text contrast for readability.

## Features

- **✅ MCP Server Management**: Configure, start, stop, and monitor MCP servers
- **✅ RAG Configuration**: Upload files/documents, auto-process into embeddings, create vector stores
- **✅ AI Agent Configuration**: Create voice and chat agents with custom system prompts
- **✅ Chat Interface**: Test your configured agents in real-time with RAG context
- **✅ Voice Interface**: Dedicated voice chat with hold-to-talk functionality
- **✅ Fuzzy Name Matching**: Handles transcription errors for names and common terms

## Project Structure

```
agents/
├── frontend/              # Next.js React application (TypeScript + Tailwind)
├── backend/               # Express.js API server (TypeScript + Prisma)
├── shared/                # Shared types and utilities
├── uploads/               # Uploaded files for RAG processing
├── test_speakers.csv      # Sample data file for testing
├── setup.sh               # Automated setup script
├── start-backend.sh       # Backend startup script
├── start-frontend.sh      # Frontend startup script
├── setup-database.sh      # Database setup automation
└── prisma/                # Database schema and migrations
```

## Quick Start

### Prerequisites

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **PostgreSQL** (with pgvector extension)
- **ChromaDB** (for vector storage)
- **OpenAI API Key** ([platform.openai.com](https://platform.openai.com/))

### Automated Setup (Recommended)

```bash
# Run the automated setup script
./setup.sh
```

This will:
- Install all dependencies
- Set up PostgreSQL database with pgvector
- Install and start ChromaDB
- Configure environment variables
- Build the application

### Manual Setup

1. **Install Dependencies:**
```bash
cd frontend && npm install
cd ../backend && npm install
```

2. **Set up Database:**
```bash
# Install PostgreSQL and pgvector
sudo apt install postgresql postgresql-16-pgvector

# Run database setup script
./setup-database.sh
```

3. **Configure Environment:**
Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL="postgresql://ai_agents_user:your_password@localhost:5432/ai_agents_db"
FRONTEND_URL=http://localhost:3000
```

4. **Start Services:**
```bash
# Terminal 1: Start ChromaDB
chroma run --host localhost --port 8000

# Terminal 2: Start Backend
./start-backend.sh

# Terminal 3: Start Frontend
./start-frontend.sh
```

5. **Open Browser:** http://localhost:3000

## API Endpoints

### AI Agents
- `GET /api/agents` - List all AI agents
- `POST /api/agents` - Create a new AI agent
- `GET /api/agents/:id` - Get a specific AI agent
- `PUT /api/agents/:id` - Update an AI agent
- `DELETE /api/agents/:id` - Delete an AI agent
- `POST /api/agents/:id/chat` - Send chat message to agent
- `POST /api/agents/transcribe` - Transcribe audio to text
- `POST /api/agents/:id/speak` - Generate speech from text
- `GET /api/agents/:id/debug` - Debug agent RAG setup

### RAG (Retrieval-Augmented Generation)
- `GET /api/rag/datasources` - List all data sources
- `POST /api/rag/datasources` - Create a new data source
- `GET /api/rag/datasources/:id` - Get a specific data source
- `PUT /api/rag/datasources/:id` - Update a data source
- `DELETE /api/rag/datasources/:id` - Delete a data source
- `POST /api/rag/datasources/:id/retry` - Retry failed data source processing
- `POST /api/rag/upload` - Upload files for RAG processing
- `GET /api/rag/vectorstores` - List all vector stores
- `GET /api/rag/vectorstores/:id` - Get a specific vector store
- `PUT /api/rag/vectorstores/:id` - Update a vector store
- `DELETE /api/rag/vectorstores/:id` - Delete a vector store
- `GET /api/rag/vectorstores/:id/stats` - Get vector store statistics
- `GET /api/rag/vectorstores/:id/peek` - Debug: Peek at vector store contents

### MCP Servers
- `GET /api/mcp/servers` - List all MCP servers
- `POST /api/mcp/servers` - Create a new MCP server
- `GET /api/mcp/servers/:id` - Get a specific MCP server
- `PUT /api/mcp/servers/:id` - Update a MCP server
- `DELETE /api/mcp/servers/:id` - Delete a MCP server
- `POST /api/mcp/servers/:id/start` - Start a MCP server
- `POST /api/mcp/servers/:id/stop` - Stop a MCP server
- `GET /api/mcp/servers/:id/status` - Get MCP server status

## How It Works

### RAG Pipeline Flow
1. **Upload Documents**: Files are uploaded via `/api/rag/upload`
2. **Auto-Processing**: Files are parsed, chunked, and embedded using OpenAI
3. **Vector Storage**: Embeddings stored in ChromaDB collections (`rag_datastore_{id}`)
4. **Context Retrieval**: Agents query vector stores using semantic + fuzzy search
5. **AI Response**: Context injected into system prompts for accurate responses

### Fuzzy Name Matching
- **Transcription Errors**: Handles "Chen" → "Chin", "Rodriguez" → "Rodrigues"
- **Levenshtein Distance**: Measures edit distance for similarity scoring
- **Hybrid Search**: Combines semantic embeddings with fuzzy text matching
- **Fallback Strategy**: If semantic search fails, fuzzy matching takes over

### Voice Chat Flow
1. **Hold to Talk**: Mouse down to record, mouse up to send
2. **Auto-Transcription**: Audio sent to OpenAI Whisper
3. **Fuzzy Matching**: Transcription corrected for common errors
4. **RAG Context**: Relevant documents retrieved from vector stores
5. **AI Response**: Generated with context and custom system prompt
6. **Auto-Speech**: Response converted to speech and played immediately

## Development

### Tech Stack

**Frontend:**
- **Next.js 14** with TypeScript and App Router
- **Tailwind CSS** with custom cyberpunk theme
- **Radix UI** components for accessibility
- **React Markdown** for rich text rendering
- **Web Audio API** for voice recording/playback

**Backend:**
- **Express.js** with TypeScript
- **Prisma ORM** for PostgreSQL integration
- **OpenAI API** for LLM, embeddings, TTS, and STT
- **ChromaDB** for vector storage and retrieval
- **Multer** for file uploads
- **WebSocket** for real-time updates

**Database:**
- **PostgreSQL** with pgvector extension
- **ChromaDB** for dedicated vector operations
- **Prisma** schema for type safety

### Database Commands

```bash
# Generate Prisma client
cd backend && npx prisma generate

# Run migrations
npx prisma db push

# View database in browser
npx prisma studio

# Reset database (WARNING: destroys data)
npx prisma db reset
```

### Key Features Implemented

- ✅ **Full RAG Pipeline**: Document upload → chunking → embedding → vector storage → retrieval
- ✅ **Fuzzy Name Matching**: Handles transcription errors with Levenshtein distance
- ✅ **Voice Chat Interface**: Hold-to-talk with auto-transcription and speech synthesis
- ✅ **Database Persistence**: PostgreSQL + ChromaDB with Prisma ORM
- ✅ **Real-time Status**: WebSocket updates for processing status
- ✅ **Cyberpunk UI**: Matrix theme with animations and gradient effects
- ✅ **Type Safety**: Full TypeScript coverage with shared interfaces

## Testing

### Sample Data
- `test_speakers.csv`: Contains speaker information for testing RAG
- Upload this file to test the complete RAG pipeline
- Query with "who is sarah chen" or "tell me about michael rodriguez"

### API Testing
```bash
# Test agent chat
curl -X POST http://localhost:3001/api/agents/{agent_id}/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'

# Test fuzzy matching
curl -X POST http://localhost:3001/api/agents/{agent_id}/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"who is sarah chin"}]}'
```

## Troubleshooting

### Common Issues

**"Vector store not found"**
- Ensure ChromaDB is running: `chroma run --host localhost --port 8000`
- Check backend logs for initialization errors
- Restart backend after ChromaDB startup

**"OpenAI API key not found"**
- Verify `OPENAI_API_KEY` in `backend/.env`
- Check API key validity at platform.openai.com
- Ensure .env is in backend directory

**"Database connection failed"**
- Run `./setup-database.sh` to set up PostgreSQL
- Check DATABASE_URL in backend/.env
- Ensure PostgreSQL service is running

**Voice chat not working**
- Check browser permissions for microphone
- Verify OpenAI API key has TTS/STT access
- Test with smaller audio files first

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with proper TypeScript types
4. Test thoroughly (upload files, create agents, test chat)
5. Submit a pull request with a clear description

## License

MIT License - See LICENSE file for details

