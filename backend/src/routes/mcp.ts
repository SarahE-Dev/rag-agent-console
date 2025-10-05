import { Router } from 'express'
import { McpServerService } from '../services/mcpServerService'
import { DatabaseService } from '../services/databaseService'

const router = Router()
const dbService = new DatabaseService()
const mcpService = new McpServerService(dbService)

// GET /api/mcp/servers - List all MCP servers
router.get('/servers', async (req, res) => {
  try {
    const servers = await mcpService.getAllServers()
    res.json(servers)
  } catch (error) {
    console.error('Error fetching MCP servers:', error)
    res.status(500).json({ error: 'Failed to fetch MCP servers' })
  }
})

// POST /api/mcp/servers - Create a new MCP server
router.post('/servers', async (req, res) => {
  try {
    const serverData = req.body
    const server = await mcpService.createServer(serverData)
    res.status(201).json(server)
  } catch (error) {
    console.error('Error creating MCP server:', error)
    res.status(500).json({ error: 'Failed to create MCP server' })
  }
})

// GET /api/mcp/servers/:id - Get a specific MCP server
router.get('/servers/:id', async (req, res) => {
  try {
    const server = await mcpService.getServer(req.params.id)
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' })
    }
    res.json(server)
  } catch (error) {
    console.error('Error fetching MCP server:', error)
    res.status(500).json({ error: 'Failed to fetch MCP server' })
  }
})

// PUT /api/mcp/servers/:id - Update a MCP server
router.put('/servers/:id', async (req, res) => {
  try {
    const serverData = req.body
    const server = await mcpService.updateServer(req.params.id, serverData)
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' })
    }
    res.json(server)
  } catch (error) {
    console.error('Error updating MCP server:', error)
    res.status(500).json({ error: 'Failed to update MCP server' })
  }
})

// GET /api/mcp/servers/:id/tools - Get tools from a MCP server
router.get('/servers/:id/tools', async (req, res) => {
  try {
    const tools = await mcpService.getServerTools(req.params.id)
    res.json(tools)
  } catch (error) {
    console.error('Error getting MCP server tools:', error)
    res.status(500).json({ error: 'Failed to get MCP server tools' })
  }
})

// POST /api/mcp/servers/:id/tools/:toolName - Execute a tool on a MCP server
router.post('/servers/:id/tools/:toolName', async (req, res) => {
  try {
    const result = await mcpService.executeTool(req.params.id, req.params.toolName, req.body)
    res.json(result)
  } catch (error) {
    console.error('Error executing MCP tool:', error)
    res.status(500).json({ error: 'Failed to execute MCP tool' })
  }
})

// DELETE /api/mcp/servers/:id - Delete a MCP server
router.delete('/servers/:id', async (req, res) => {
  try {
    const success = await mcpService.deleteServer(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'MCP server not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting MCP server:', error)
    res.status(500).json({ error: 'Failed to delete MCP server' })
  }
})

// POST /api/mcp/servers/:id/start - Start a MCP server
router.post('/servers/:id/start', async (req, res) => {
  try {
    const success = await mcpService.startServer(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'MCP server not found' })
    }
    res.json({ status: 'running' })
  } catch (error) {
    console.error('Error starting MCP server:', error)
    res.status(500).json({ error: 'Failed to start MCP server' })
  }
})

// POST /api/mcp/servers/:id/stop - Stop a MCP server
router.post('/servers/:id/stop', async (req, res) => {
  try {
    const success = await mcpService.stopServer(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'MCP server not found' })
    }
    res.json({ status: 'stopped' })
  } catch (error) {
    console.error('Error stopping MCP server:', error)
    res.status(500).json({ error: 'Failed to stop MCP server' })
  }
})

// GET /api/mcp/servers/:id/status - Get MCP server status
router.get('/servers/:id/status', async (req, res) => {
  try {
    const status = await mcpService.getServerStatus(req.params.id)
    if (!status) {
      return res.status(404).json({ error: 'MCP server not found' })
    }
    res.json(status)
  } catch (error) {
    console.error('Error fetching MCP server status:', error)
    res.status(500).json({ error: 'Failed to fetch MCP server status' })
  }
})

export { router as mcpRoutes }

