# Google Maps MCP Server Setup Guide

This guide walks you through setting up and using the Google Maps MCP (Model Context Protocol) server with your AI agents.

## Prerequisites

- Google Maps API Key (get one from [Google Cloud Console](https://console.cloud.google.com/))
- Node.js installed
- Your agents platform running (backend + frontend)

## Step 1: Get Your Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Directions API**
   - **Geocoding API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key (you'll need this in Step 3)
6. **Important:** Restrict your API key:
   - Set Application restrictions (HTTP referrers for web, or IP addresses for server)
   - Set API restrictions to only the APIs listed above

## Step 2: Add the MCP Server in the UI

1. Open your agents platform in the browser (typically `http://localhost:3000`)
2. Navigate to the **MCP Servers** section
3. Click **"Add Server"**
4. Fill in the following details:

   **Name:** `Google Maps`
   
   **Description:** `Google Maps integration for location search, directions, and geocoding`
   
   **Command:** `node`
   
   **Args:** `mcp-servers/google-maps-official/dist/index.js`
   
   **Environment Variables:**
   ```json
   {
     "GOOGLE_MAPS_API_KEY": "your-api-key-here"
   }
   ```
   
   Replace `your-api-key-here` with your actual Google Maps API key from Step 1.

5. Click **"Create"**

## Step 3: Start the MCP Server

1. In the MCP Servers list, find your **Google Maps** server
2. Click the **cyan play button** (▶️) to start it
3. Wait 2-3 seconds for the server to initialize
4. The status should change to **"running"**
5. You should see in the backend logs:
   ```
   [MCP] Starting server Google Maps with command: node mcp-servers/google-maps-official/dist/index.js
   [MCP] Server Google Maps started successfully
   [Google maps stderr] Google Maps MCP Server running on stdio
   ```

## Step 4: Assign the MCP Server to an Agent

1. Go to the **Agents** section
2. Select or create an agent
3. In the agent configuration, find **"MCP Servers"**
4. Select **"Google Maps"** from the available servers
5. Save the agent configuration

## Step 5: Test the Integration

Start a chat with your agent and ask location-related questions:

**Example queries:**
- "Find restaurants near Times Square, New York"
- "What's good to eat in Charlotte, TN?"
- "Get me directions from Central Park to Brooklyn Bridge"
- "Search for coffee shops near my location" (you'll need to provide a location)

## Available Tools

Once the Google Maps MCP server is running and assigned to your agent, the following tools are automatically available:

### 1. **search_nearby**
Search for nearby places based on location.

**Parameters:**
- `center` (required): Object with `value` (address or coordinates) and `isCoordinates` (boolean)
- `keyword` (optional): Search keyword (e.g., "restaurant", "cafe", "hotel")
- `radius` (optional): Search radius in meters (default: 1000)
- `openNow` (optional): Only show places currently open (default: false)
- `minRating` (optional): Minimum rating 0-5

**Example:** "Find Italian restaurants within 2 miles of downtown Seattle"

### 2. **maps_directions**
Get detailed turn-by-turn navigation directions.

**Parameters:**
- `origin` (required): Starting point address or coordinates
- `destination` (required): Destination address or coordinates
- `mode` (optional): Travel mode - `driving`, `walking`, `bicycling`, or `transit` (default: driving)
- `departure_time` (optional): ISO string format
- `arrival_time` (optional): ISO string format

**Example:** "Get walking directions from the Eiffel Tower to the Louvre Museum"

## Troubleshooting

### Server shows "running" but agent can't use tools

**Solution:** Restart both the MCP server and the backend:
1. Click stop (⏹️) on the MCP server
2. Wait 2 seconds
3. Click play (▶️) to start it again
4. Test with your agent

### "MCP server not found or not running" error

**Causes:**
- The MCP server wasn't started (click the play button)
- The backend restarted and lost the process state (restart the MCP server)
- Wrong server ID in agent configuration

**Solution:**
1. Verify the server status shows "running" in the UI
2. Check backend logs for: `[MCP] Server Google Maps started successfully`
3. If not running, click the play button

### API key errors

**Error:** `GOOGLE_MAPS_API_KEY is not set`

**Solution:**
1. Edit the MCP server configuration
2. Ensure the environment variable is set correctly:
   ```json
   {
     "GOOGLE_MAPS_API_KEY": "AIza..."
   }
   ```
3. Stop and restart the server

### Rate limiting or quota errors

**Error:** `You have exceeded your request quota`

**Solutions:**
- Check your [Google Cloud Console quota](https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/quotas)
- Enable billing on your Google Cloud project
- Request a quota increase if needed

## How It Works

1. **Tool Discovery:** When you assign the Google Maps MCP server to an agent, the agent automatically discovers all available tools (search_nearby, maps_directions, etc.)

2. **Dynamic Execution:** When you chat with the agent:
   - The agent analyzes your query
   - If it needs location data, it calls the appropriate tool
   - The MCP server communicates with Google Maps API
   - Results are formatted and returned to the agent
   - The agent incorporates the real data into its response

3. **Shared Instance:** All agents share the same MCP server instance, so you only need to start it once for all agents that use it.

## Cost Considerations

Google Maps APIs have free tiers but can incur costs:
- **Maps JavaScript API:** $7 per 1,000 requests after free tier
- **Places API:** $17 per 1,000 requests (Text Search)
- **Directions API:** $5 per 1,000 requests
- **Geocoding API:** $5 per 1,000 requests

**Free tier:** $200 monthly credit (covers ~28,500 free map loads)

Monitor your usage in the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).

## Security Best Practices

1. **Never commit API keys to git**
   - API keys are stored in the database
   - Don't share your database exports publicly

2. **Restrict your API key**
   - Set application restrictions (IP addresses or HTTP referrers)
   - Set API restrictions to only the Google Maps APIs you need

3. **Monitor usage**
   - Set up billing alerts in Google Cloud Console
   - Review API usage regularly

4. **Rotate keys periodically**
   - Generate new keys every 90 days
   - Delete old keys after rotation

## Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify your API key is valid and has the correct permissions
3. Ensure all required Google Maps APIs are enabled
4. Test your API key directly with curl to rule out configuration issues

---

**Last Updated:** October 2025

