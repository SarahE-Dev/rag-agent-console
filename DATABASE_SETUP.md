# Database Setup Guide

## **🎯 Database Architecture Overview**

Your AI Agents Platform now supports **PostgreSQL with Prisma ORM** for robust, scalable data persistence.

### **Database Stack:**
- **PostgreSQL** - Primary database with vector extensions
- **Prisma ORM** - Type-safe database operations
- **ChromaDB** - Vector storage for embeddings (separate service)

---

## **📋 Prerequisites**

### **1. Install PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (with Homebrew)
brew install postgresql
brew services start postgresql

# Windows - Download from postgresql.org
```

### **2. Install pgvector Extension**
First, install the pgvector extension system-wide:

**Ubuntu/Debian:**
```bash
# Install pgvector
sudo apt update
sudo apt install postgresql-16-pgvector

# Or build from source if not available
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**macOS:**
```bash
brew install pgvector
```

**Windows:**
Download from: https://github.com/pgvector/pgvector/releases

### **3. Create Database and User**
```sql
-- Connect to PostgreSQL as postgres user
sudo -u postgres psql

-- Create a new user (choose your own password)
CREATE USER ai_agents_user WITH PASSWORD 'your_secure_password_here';
ALTER USER ai_agents_user CREATEDB;

-- Create the database
CREATE DATABASE ai_agents_db OWNER ai_agents_user;
\c ai_agents_db;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ai_agents_db TO ai_agents_user;
GRANT ALL ON SCHEMA public TO ai_agents_user;

\q
```

**If you get "role already exists" error:**
```sql
-- Drop existing user if needed
DROP USER IF EXISTS ai_agents_user;
-- Then recreate as above
```

**If you get "extension vector is not available":**
- Make sure pgvector is properly installed (see step 2 above)
- Check PostgreSQL version: `SELECT version();`
- Restart PostgreSQL: `sudo systemctl restart postgresql`

### **4. Update Environment Variables**
In your `.env` file, update the DATABASE_URL with your actual credentials:
```env
# Replace 'ai_agents_user' and 'secure_password_here' with your actual values
DATABASE_URL="postgresql://ai_agents_user:secure_password_here@localhost:5432/ai_agents_db?schema=public"
```

### **5. Install ChromaDB (Vector Database)**

**Option 1: Using pipx (Recommended)**
```bash
# Install pipx if not already installed
sudo apt install pipx
pipx ensurepath

# Install chromadb in isolated environment
pipx install chromadb

# Run ChromaDB server
chroma run --host localhost --port 8000
```

**Option 2: Using Python virtual environment**
```bash
# Create virtual environment
python3 -m venv ~/chroma-env
source ~/chroma-env/bin/activate

# Install chromadb
pip install chromadb

# Run ChromaDB server
chroma run --host localhost --port 8000
```

**Option 3: System-wide installation (not recommended)**
```bash
# Override system package management (risky)
pip install chromadb --break-system-packages

# Run ChromaDB server
chroma run --host localhost --port 8000
```

**Verification:**
```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat
# Should return: {"status":"ok"}
```

---

## **⚙️ Configuration**

### **1. Environment Setup**
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_agents_db?schema=public"
OPENAI_API_KEY="your-openai-api-key-here"
CHROMA_URL="http://localhost:8000"
ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

### **2. Database Migration**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Alternative: Push schema directly (for development)
npm run db:push
```

### **3. Seed Initial Data (Optional)**
Create sample MCP servers, embedding models, etc.
```bash
npm run db:seed
```

---

## **🗄️ Database Schema Overview**

### **Core Tables:**
- **`ai_agents`** - AI agent configurations
- **`mcp_servers`** - MCP server definitions
- **`rag_pipelines`** - RAG pipeline configurations
- **`rag_data_sources`** - Document sources for RAG
- **`rag_embedding_models`** - Embedding model configs
- **`rag_vector_stores`** - Vector database configs
- **`conversation_sessions`** - Chat session tracking
- **`conversation_messages`** - Message history
- **`api_keys`** - Encrypted API key storage
- **`system_settings`** - Application settings

### **Key Features:**
- ✅ **Full-text search** on conversations
- ✅ **Vector embeddings** support via pgvector
- ✅ **JSON storage** for flexible configurations
- ✅ **Encrypted API keys**
- ✅ **Audit trails** with timestamps
- ✅ **Relationship management** between entities

---

## **🚀 Development Workflow**

### **Database Management Commands:**
```bash
# View database in browser
npm run db:studio

# Reset database (WARNING: destroys all data)
npm run db:reset

# Generate types after schema changes
npm run db:generate

# Apply schema changes
npm run db:migrate
```

### **Data Migration Strategy:**
```typescript
// Example: Migrate from in-memory to database
const agents = await memoryService.getAllAgents()
for (const agent of agents) {
  await dbService.createAiAgent(agent)
}
```

---

## **🔒 Security Considerations**

### **API Key Encryption:**
```typescript
// API keys are encrypted before storage
const encryptedKey = encrypt(apiKey, process.env.ENCRYPTION_KEY)
await dbService.setSetting('openai_api_key', encryptedKey, 'encrypted')
```

### **Database Permissions:**
```sql
-- Create restricted user for application
CREATE USER ai_agents_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ai_agents_db TO ai_agents_user;
GRANT USAGE ON SCHEMA public TO ai_agents_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ai_agents_user;
```

---

## **📊 Performance Optimizations**

### **Indexing Strategy:**
- **Full-text search** on conversation content
- **GIN indexes** for JSON fields
- **Vector indexes** for embeddings
- **Composite indexes** for common queries

### **Query Optimization:**
```typescript
// Efficient conversation loading with pagination
const messages = await db.conversationMessage.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'desc' },
  take: 50,
  skip: page * 50
})
```

---

## **🔄 Backup & Recovery**

### **Automated Backups:**
```bash
# Daily backup script
pg_dump ai_agents_db > backup_$(date +%Y%m%d).sql

# Restore from backup
psql ai_agents_db < backup_20241201.sql
```

### **ChromaDB Backup:**
```bash
# ChromaDB persistence is automatic
# Data stored in ./chroma_data directory
```

---

## **📈 Scaling Considerations**

### **Read Replicas:**
```env
DATABASE_URL_READ="postgresql://user:pass@replica:5432/ai_agents_db"
```

### **Connection Pooling:**
```typescript
// Prisma handles connection pooling automatically
// Configure pool size in DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

### **Vector Database Scaling:**
- **ChromaDB** → **Pinecone** for production
- **Local** → **Distributed** vector stores
- **In-memory** → **Persistent** storage

---

## **🧪 Testing the Database Setup**

### **Health Check:**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"healthy","database":"connected"}
```

### **Sample Data Creation:**
```bash
# Create a sample agent via API
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "Database test agent",
    "type": "chat",
    "chatSettings": {
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 2048
    }
  }'
```

---

## **🎯 Production Deployment**

### **Environment Variables:**
```env
NODE_ENV="production"
DATABASE_URL="postgresql://prod_user:secure_pass@prod_host:5432/ai_agents_prod"
REDIS_URL="redis://prod_cache:6379"
```

### **Monitoring:**
```bash
# Database monitoring
pg_stat_activity;
pg_stat_user_tables;

# Application metrics
# Add Prometheus/Grafana for monitoring
```

---

## **❓ Troubleshooting**

### **Common Issues:**

**"Can't connect to database"**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U username -d ai_agents_db
```

**"Migration failed"**
```bash
# Reset and retry
npm run db:reset
npm run db:migrate
```

**"ChromaDB connection failed"**
```bash
# Check ChromaDB logs
chroma run --host 0.0.0.0 --port 8000 --log-level DEBUG
```

---

## **📚 Next Steps**

1. **Run the setup**: Follow the steps above to get your database running
2. **Migrate existing data**: Move any in-memory data to the database
3. **Test thoroughly**: Create agents, MCP servers, and RAG pipelines
4. **Monitor performance**: Set up logging and metrics
5. **Plan scaling**: Consider read replicas and connection pooling

Your AI Agents Platform now has enterprise-grade persistence! 🚀
