# MCP Servers Setup Guide

This guide shows you how to add MCP servers to your AI agents app for Google Maps and SMS functionality.

## 🚀 Quick Start - Using Existing Servers

### Option 1: Use Official MCP Servers (Recommended)

Many services already have official MCP server implementations:

#### Google Maps
```bash
# Clone the official Google Maps MCP server
git clone https://github.com/modelcontextprotocol/servers-archived.git
cd servers-archived/src/google-maps

# Install dependencies
npm install

# Build
npm run build

# Set environment variable
export GOOGLE_MAPS_API_KEY=your_api_key_here

# Add to your app UI:
# Name: Google Maps
# Command: node
# Args: /path/to/servers-archived/src/google-maps/dist/index.js
# Environment: GOOGLE_MAPS_API_KEY=your_api_key_here
```

#### GitHub Integration
```bash
# Use official GitHub MCP server
git clone https://github.com/github/github-mcp-server.git
cd github-mcp-server

npm install
npm run build

# Add to your app:
# Name: GitHub
# Command: node
# Args: dist/index.js
# Environment: GITHUB_PERSONAL_ACCESS_TOKEN=your_token
```

### Option 2: Use Community Servers

From the [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) list:

#### Email Integration
```bash
# AgentMail - Create inboxes on the fly
npm install -g @agentmail/toolkit
# Add to your app UI with appropriate config
```

#### Database Querying
```bash
# AnyQuery - SQL queries across 40+ apps
# Download from: https://github.com/julien040/anyquery
```

## 🛠️ Creating Custom MCP Servers

### Step 1: Create Server Structure

```bash
mkdir mcp-servers/my-service
cd mcp-servers/my-service
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node ts-node
```

### Step 2: Create TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Step 3: Implement MCP Server

```typescript
// src/index.ts
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";

// Define your tools
const MY_TOOL: Tool = {
  name: "my_tool",
  description: "What my tool does",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string", description: "Parameter description" }
    },
    required: ["param"]
  }
};

// Implement tool handler
async function handleMyTool(param: string) {
  // Your tool logic here
  return {
    content: [{ type: "text", text: `Result: ${param}` }],
    isError: false
  };
}

// Create server
const server = new Server(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [MY_TOOL]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "my_tool") {
    const { param } = request.params.arguments as { param: string };
    return await handleMyTool(param);
  }
  return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
});

// Run server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("My MCP Server running");
}

runServer().catch(console.error);
```

### Step 4: Build and Run

```bash
npm run build
npm start
```

### Step 5: Add to Your App UI

In your MCP Servers tab:
- **Name**: My Custom Service
- **Command**: node
- **Args**: /path/to/your/mcp-servers/my-service/dist/index.js
- **Environment**: API_KEY=your_key (if needed)

## 📱 Specific Examples

### Google Maps Server (Ready to Use)

I've created a complete Google Maps MCP server for you. To use it:

1. **Get API Key**: Visit [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable APIs**: Geocoding, Places, Distance Matrix, Directions, Elevation
3. **Install**: `cd mcp-servers/google-maps-server && npm install && npm run build`
4. **Configure in App**:
   - Name: Google Maps
   - Command: node
   - Args: mcp-servers/google-maps-server/dist/index.js
   - Environment: `GOOGLE_MAPS_API_KEY=your_key_here`

**Tools Available:**
- `maps_geocode` - Address → coordinates
- `maps_reverse_geocode` - Coordinates → address
- `maps_search_places` - Find restaurants, hotels, etc.
- `maps_place_details` - Get place info, reviews, hours
- `maps_distance_matrix` - Travel time/distance
- `maps_directions` - Turn-by-turn directions
- `maps_elevation` - Elevation data

### Twilio SMS Server (Ready to Use)

For texting functionality:

1. **Get Twilio Account**: [twilio.com](https://twilio.com)
2. **Install**: `cd mcp-servers/twilio-sms-server && npm install && npm run build`
3. **Configure in App**:
   - Name: SMS Service
   - Command: node
   - Args: mcp-servers/twilio-sms-server/dist/index.js
   - Environment:
     ```
     TWILIO_ACCOUNT_SID=your_sid
     TWILIO_AUTH_TOKEN=your_token
     TWILIO_FROM_NUMBER=+1234567890
     ```

**Tools Available:**
- `send_sms` - Send text messages
- `list_sms_messages` - View recent messages
- `get_sms_message` - Get message details

## 🤖 Using MCP Servers with Agents

1. **Configure Server**: Add MCP server in your app UI
2. **Start Server**: Click the play button ▶️
3. **Create Agent**: In Agent Configurator, select the MCP server
4. **Test**: Use voice/chat interface - agent will automatically use tools when needed

Example: With Google Maps server assigned to an agent, try:
> "Find Italian restaurants near Central Park and get directions to the best one"

The agent will:
1. Use `maps_search_places` to find restaurants
2. Use `maps_place_details` to get reviews/ratings
3. Use `maps_directions` to provide directions

## 🔧 Troubleshooting

### Server Won't Start
- Check environment variables are set
- Verify API keys are valid
- Check console logs for errors

### Tools Not Available
- Ensure server is running (green status)
- Check server logs for connection errors
- Verify tool names match between server and client

### API Errors
- Check API rate limits
- Verify API keys have correct permissions
- Check network connectivity

## 📚 Additional Resources

- [Official MCP Documentation](https://modelcontextprotocol.io/)
- [Awesome MCP Servers List](https://github.com/punkpeye/awesome-mcp-servers)
- [MCP SDK Reference](https://github.com/modelcontextprotocol/typescript-sdk)

The key insight: **You write the MCP server code once, then just configure it in your app UI. The MCP protocol handles the rest automatically!**
