#!/bin/bash

echo "🚀 AI Agents Platform - Database Setup Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}Error: This script should not be run as root${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Installing pgvector extension...${NC}"

# Install pgvector
if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    sudo apt update
    if sudo apt install -y postgresql-16-pgvector; then
        echo -e "${GREEN}✓ pgvector installed successfully${NC}"
    else
        echo -e "${YELLOW}Package installation failed, trying to build from source...${NC}"

        # Build from source
        cd /tmp
        if [ ! -d "pgvector" ]; then
            git clone https://github.com/pgvector/pgvector.git
        fi
        cd pgvector
        make clean
        make
        sudo make install
        cd -
        echo -e "${GREEN}✓ pgvector built and installed from source${NC}"
    fi
elif command -v brew &> /dev/null; then
    # macOS
    brew install pgvector
    echo -e "${GREEN}✓ pgvector installed with Homebrew${NC}"
else
    echo -e "${RED}Error: Unsupported package manager. Please install pgvector manually.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: Restarting PostgreSQL...${NC}"
sudo systemctl restart postgresql
sleep 2

echo -e "${YELLOW}Step 3: Setting up database and user...${NC}"

# Database setup - use current user for simplicity
DB_USER=$(whoami)
DB_NAME="ai_agents_db"

# Create database if it doesn't exist
if sudo -u postgres psql -l | grep -q "$DB_NAME"; then
    echo -e "${YELLOW}Database $DB_NAME already exists${NC}"
else
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER \"$DB_USER\";" 2>/dev/null || \
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME OWNER \"$DB_USER\";"
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Grant permissions to current user (with error handling)
echo "Granting permissions to user: $DB_USER"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON SCHEMA public TO \"$DB_USER\";" 2>/dev/null || echo "Warning: Could not grant schema privileges"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO \"$DB_USER\";" 2>/dev/null || echo "Warning: Could not grant database privileges"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO \"$DB_USER\";" 2>/dev/null || echo "Warning: Could not grant table privileges"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO \"$DB_USER\";" 2>/dev/null || echo "Warning: Could not grant sequence privileges"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"$DB_USER\";" 2>/dev/null || echo "Warning: Could not set default table privileges"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"$DB_USER\";" 2>/dev/null || echo "Warning: Could not set default sequence privileges"

echo -e "${YELLOW}Step 4: Enabling PostgreSQL extensions...${NC}"

# Enable extensions
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Vector extension enabled${NC}"
else
    echo -e "${RED}✗ Failed to enable vector extension${NC}"
    echo "Please check PostgreSQL logs and ensure pgvector is properly installed"
    exit 1
fi

sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ pg_trgm extension enabled${NC}"
else
    echo -e "${RED}✗ Failed to enable pg_trgm extension${NC}"
fi

echo -e "${YELLOW}Step 5: Setting up environment file...${NC}"

# Create .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ Created .env file from template${NC}"
fi

# Update DATABASE_URL in .env file (no password needed for peer auth)
if [ -f "backend/.env" ]; then
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://$DB_USER@localhost:5432/$DB_NAME?schema=public\"|" backend/.env
    echo -e "${GREEN}✓ Updated DATABASE_URL in .env file (using peer authentication)${NC}"
fi

echo -e "${YELLOW}Step 6: Installing ChromaDB...${NC}"

# Try to install ChromaDB
if command -v pipx &> /dev/null; then
    echo "Installing ChromaDB with pipx..."
    pipx install chromadb
    CHROMA_INSTALLED=true
elif python3 -m venv --help &> /dev/null; then
    echo "Creating virtual environment for ChromaDB..."
    python3 -m venv ~/chroma-env
    source ~/chroma-env/bin/activate
    pip install chromadb
    CHROMA_INSTALLED=true
    echo "ChromaDB installed in virtual environment: ~/chroma-env"
    echo "To run ChromaDB: source ~/chroma-env/bin/activate && chroma run --host localhost --port 8000"
else
    echo -e "${YELLOW}Could not install ChromaDB automatically. Please install manually:${NC}"
    echo "Option 1 (recommended): sudo apt install pipx && pipx install chromadb"
    echo "Option 2: python3 -m venv ~/chroma-env && source ~/chroma-env/bin/activate && pip install chromadb"
fi

if [ "$CHROMA_INSTALLED" = true ]; then
    echo -e "${GREEN}✓ ChromaDB installed successfully${NC}"

    # Try to start ChromaDB in background
    echo "Starting ChromaDB server..."
    if command -v chroma &> /dev/null; then
        chroma run --host localhost --port 8000 &
        CHROMA_PID=$!
        sleep 3

        # Test if ChromaDB is running
        if curl -s http://localhost:8000/api/v1/heartbeat | grep -q '"status":"ok"'; then
            echo -e "${GREEN}✓ ChromaDB server started successfully${NC}"
        else
            echo -e "${YELLOW}ChromaDB server may not be running. Start it manually:${NC}"
            echo "chroma run --host localhost --port 8000"
        fi
    fi
fi

echo -e "${YELLOW}Step 7: Testing database connection...${NC}"

# Test connection
cd backend
if npm run db:generate 2>/dev/null; then
    echo -e "${GREEN}✓ Prisma client generated successfully${NC}"
else
    echo -e "${RED}✗ Failed to generate Prisma client${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "Database Details:"
echo "  User: $DB_USER (current system user)"
echo "  Authentication: Peer (no password needed)"
echo "  Database: $DB_NAME"
echo "  Host: localhost:5432"
echo ""
echo "Next steps:"
echo "1. Make sure ChromaDB is running: chroma run --host localhost --port 8000"
echo "2. Run the backend: cd backend && npm run dev"
echo "3. Run the frontend: cd ../frontend && npm run dev"
echo ""
echo -e "${YELLOW}✅ Using peer authentication - no password needed!${NC}"
