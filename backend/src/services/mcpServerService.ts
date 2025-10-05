import { spawn, ChildProcess } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { DatabaseService } from './databaseService'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: any
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface McpTool {
  name: string
  description: string
  inputSchema: any
}

export interface McpServer {
  id: string
  name: string
  description: string
  command: string
  args: string[]
  env: Record<string, string>
  status: 'stopped' | 'running' | 'error'
  process?: ChildProcess
  tools?: McpTool[]
  createdAt: Date
  updatedAt: Date
}

export class McpServerService {
  private servers: Map<string, McpServer> = new Map()
  private dbService: DatabaseService
  private requestId = 0

  constructor(dbService: DatabaseService) {
    this.dbService = dbService
    this.loadServersFromDatabase()
  }

  private async sendJsonRpcRequest(server: McpServer, method: string, params?: any): Promise<any> {
    if (!server.process || server.status !== 'running') {
      throw new Error('MCP server not running')
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    }

    const requestJson = JSON.stringify(request) + '\n'

    console.log(`[MCP ${server.name}] Sending request:`, requestJson.trim())

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP server request timeout'))
      }, 10000) // 10 second timeout

      let responseBuffer = ''

      const onData = (data: Buffer) => {
        const chunk = data.toString()
        console.log(`[MCP ${server.name}] Received chunk:`, chunk.trim())

        responseBuffer += chunk

        // Look for complete JSON objects (basic approach)
        const startBrace = responseBuffer.indexOf('{')
        const endBrace = responseBuffer.lastIndexOf('}')

        if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
          const jsonCandidate = responseBuffer.substring(startBrace, endBrace + 1)

          try {
            const response: JsonRpcResponse = JSON.parse(jsonCandidate)
            console.log(`[MCP ${server.name}] Parsed response:`, response)

            if (response.id === request.id) {
              clearTimeout(timeout)
              server.process!.stdout!.off('data', onData)

              if (response.error) {
                reject(new Error(`MCP server error: ${response.error.message}`))
              } else {
                resolve(response.result)
              }
              return
            }
          } catch (e) {
            console.log(`[MCP ${server.name}] Failed to parse JSON:`, (e as Error).message)
          }
        }
      }

      server.process!.stdout!.on('data', onData)
      server.process!.stdin!.write(requestJson)
    })
  }

  private async sendJsonRpcNotification(server: McpServer, method: string, params?: any): Promise<void> {
    if (!server.process || server.status !== 'running') {
      throw new Error('MCP server not running')
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    }

    const notificationJson = JSON.stringify(notification) + '\n'
    console.log(`[MCP ${server.name}] Sending notification:`, notificationJson.trim())
    server.process!.stdin!.write(notificationJson)
  }

  private async loadServersFromDatabase() {
    try {
      const dbServers = await this.dbService.getAllMcpServers()
      for (const server of dbServers) {
        // Convert database format to service format
        const typedServer: McpServer = {
          id: server.id,
          name: server.name || '',
          description: server.description || '',
          command: server.command || '',
          args: Array.isArray(server.args) ? server.args as string[] : [],
          env: (server.env && typeof server.env === 'object') ? server.env as Record<string, string> : {},
          status: 'stopped', // Always start as stopped
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
        }
        this.servers.set(server.id, typedServer)
      }
      console.log(`Loaded ${dbServers.length} MCP servers from database`)
    } catch (error) {
      console.error('Failed to load MCP servers from database:', error)
    }
  }

  async getAllServers(): Promise<McpServer[]> {
    return Array.from(this.servers.values()).map(server => ({
      ...server,
      process: undefined // Don't expose process object in API responses
    }))
  }

  async getServer(id: string): Promise<McpServer | null> {
    const server = this.servers.get(id)
    if (!server) return null

    const { process, ...serverWithoutProcess } = server
    return serverWithoutProcess
  }

  async createServer(serverData: Omit<McpServer, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<McpServer> {
    const id = uuidv4()
    const server: McpServer = {
      id,
      ...serverData,
      status: 'stopped',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to database
    await this.dbService.createMcpServer(server)

    // Store in memory
    this.servers.set(id, server)
    const result = await this.getServer(id)
    return result as McpServer
  }

  async updateServer(id: string, serverData: Partial<McpServer>): Promise<McpServer | null> {
    const existingServer = this.servers.get(id)
    if (!existingServer) return null

    const updatedServer: McpServer = {
      ...existingServer,
      ...serverData,
      updatedAt: new Date(),
    }

    // If the server is running, stop it before updating
    if (existingServer.status === 'running') {
      await this.stopServer(id)
    }

    // Save to database
    await this.dbService.updateMcpServer(id, updatedServer)

    // Update in memory
    this.servers.set(id, updatedServer)
    const result = await this.getServer(id)
    return result as McpServer
  }

  async deleteServer(id: string): Promise<boolean> {
    const server = this.servers.get(id)
    if (!server) return false

    // Stop the server if it's running
    if (server.status === 'running') {
      await this.stopServer(id)
    }

    // Delete from database
    await this.dbService.deleteMcpServer(id)

    // Delete from memory
    return this.servers.delete(id)
  }

  async startServer(id: string): Promise<boolean> {
    const server = this.servers.get(id)
    if (!server) return false

    if (server.status === 'running') return true

    try {
      const serverProcess = spawn(server.command, server.args, {
        env: { ...process.env, ...server.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: require('path').resolve(process.cwd(), '..'), // Run from project root, not backend/
      })

      server.process = serverProcess
      server.status = 'running'
      server.updatedAt = new Date()

      serverProcess.on('exit', (code: number | null) => {
        server.status = code === 0 ? 'stopped' : 'error'
        server.updatedAt = new Date()
        server.process = undefined
        console.log(`MCP server ${server.name} exited with code ${code}`)
      })

      serverProcess.on('error', (error: Error) => {
        server.status = 'error'
        server.updatedAt = new Date()
        server.process = undefined
        console.error(`MCP server ${server.name} error:`, error)
      })

      // Log stdout and stderr
      serverProcess.stdout?.on('data', (data: Buffer) => {
        console.log(`[${server.name}] ${data.toString().trim()}`)
      })

      serverProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`[${server.name}] ${data.toString().trim()}`)
      })

      return true
    } catch (error) {
      console.error(`Failed to start MCP server ${server.name}:`, error)
      server.status = 'error'
      server.updatedAt = new Date()
      return false
    }
  }

  async stopServer(id: string): Promise<boolean> {
    const server = this.servers.get(id)
    if (!server) return false

    if (server.status !== 'running' || !server.process) return true

    try {
      server.process.kill('SIGTERM')

      // Wait for the process to exit or timeout after 5 seconds
      const timeout = setTimeout(() => {
        if (server.process) {
          server.process.kill('SIGKILL')
        }
      }, 5000)

      return new Promise((resolve) => {
        const checkExit = () => {
          if (server.status === 'stopped') {
            clearTimeout(timeout)
            resolve(true)
          } else {
            setTimeout(checkExit, 100)
          }
        }
        checkExit()
      })
    } catch (error) {
      console.error(`Failed to stop MCP server ${server.name}:`, error)
      return false
    }
  }

  async getServerTools(id: string): Promise<McpTool[]> {
    try {
      const server = this.servers.get(id)
      if (!server || server.status !== 'running') {
        console.log(`[MCP] Server ${id} not found or not running`)
        return []
      }

      // Return cached tools if available
      if (server.tools) {
        console.log(`[MCP ${server.name}] Returning cached tools:`, server.tools.length)
        return server.tools
      }

      console.log(`[MCP ${server.name}] Getting tools...`)

      // For now, return hardcoded Google Maps tools to test the agent service
      // TODO: Implement proper MCP communication
      if (server.name === 'Google maps') {
        const googleMapsTools: McpTool[] = [
          {
            name: 'maps_search_places',
            description: 'Search for places using Google Places API',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                location: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' }
                  },
                  description: 'Optional center point for the search'
                },
                radius: { type: 'number', description: 'Search radius in meters (max 50000)' }
              },
              required: ['query']
            }
          },
          {
            name: 'maps_geocode',
            description: 'Convert an address into geographic coordinates',
            inputSchema: {
              type: 'object',
              properties: {
                address: { type: 'string', description: 'The address to geocode' }
              },
              required: ['address']
            }
          },
          {
            name: 'maps_directions',
            description: 'Get directions between two points',
            inputSchema: {
              type: 'object',
              properties: {
                origin: { type: 'string', description: 'Starting point address or coordinates' },
                destination: { type: 'string', description: 'Ending point address or coordinates' },
                mode: {
                  type: 'string',
                  description: 'Travel mode (driving, walking, bicycling, transit)',
                  enum: ['driving', 'walking', 'bicycling', 'transit']
                }
              },
              required: ['origin', 'destination']
            }
          }
        ]

        console.log(`[MCP ${server.name}] Returning hardcoded Google Maps tools:`, googleMapsTools.map(t => t.name))

        // Cache the tools
        server.tools = googleMapsTools
        return googleMapsTools
      }

      // Fallback: try MCP communication
      try {
        // Send JSON-RPC "tools/list" request to get available tools
        console.log(`[MCP ${server.name}] Sending tools/list request...`)
        const result = await this.sendJsonRpcRequest(server, 'tools/list')
        console.log(`[MCP ${server.name}] Tools/list response:`, result)

        if (result && result.tools && Array.isArray(result.tools)) {
          // Convert MCP tool format to our internal format
          const tools: McpTool[] = result.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema || {}
          }))

          console.log(`[MCP ${server.name}] Parsed tools:`, tools.map(t => t.name))

          // Cache the tools
          server.tools = tools
          return tools
        }
      } catch (mcpError) {
        console.log(`[MCP ${server.name}] MCP communication failed, using empty tools:`, (mcpError as Error).message)
      }

      console.log(`[MCP ${server.name}] No tools available`)
      return []
    } catch (error) {
      console.error(`Failed to get tools from MCP server ${id}:`, error)
      return []
    }
  }

  async executeTool(serverId: string, toolName: string, args: any): Promise<any> {
    try {
      const server = this.servers.get(serverId)
      if (!server || server.status !== 'running') {
        throw new Error(`MCP server ${serverId} not running`)
      }

      console.log(`[MCP ${server.name}] Executing tool ${toolName} with args:`, args)

      // For now, return mock results for Google Maps tools to test the agent service
      // TODO: Implement proper MCP tool execution
      if (server.name === 'Google maps') {
        switch (toolName) {
          case 'maps_search_places':
            return `Found several places matching "${args.query}" near ${args.location ? `(${args.location.latitude}, ${args.location.longitude})` : 'Central Park'}. Here are some results: 1. Joe's Pizza - Italian restaurant, 4.2 stars, 123 Main St. 2. Central Park Deli - American cuisine, 4.0 stars, 456 Park Ave. 3. Garden Café - Healthy options, 4.5 stars, 789 Broadway.`
          case 'maps_geocode':
            return `Geocoded "${args.address}": Location: (40.7829, -73.9654), Formatted Address: ${args.address}, New York, NY, USA`
          case 'maps_directions':
            return `Directions from "${args.origin}" to "${args.destination}" via ${args.mode || 'driving'}: 1. Start at ${args.origin}. 2. Head north on Broadway for 0.5 miles. 3. Turn right onto Central Park West. 4. Continue for 0.3 miles. 5. Arrive at ${args.destination}. Total distance: 0.8 miles, Estimated time: 5 minutes.`
          default:
            throw new Error(`Unknown tool: ${toolName}`)
        }
      }

      // Fallback: try MCP communication
      try {
        const result = await this.sendJsonRpcRequest(server, 'tools/call', {
          name: toolName,
          arguments: args
        })

        console.log(`[MCP ${server.name}] Tool ${toolName} result:`, result)
        return result
      } catch (mcpError) {
        console.log(`[MCP ${server.name}] MCP tool execution failed:`, (mcpError as Error).message)
        throw new Error(`Tool execution failed: ${toolName}`)
      }
    } catch (error) {
      console.error(`Failed to execute tool ${toolName} on server ${serverId}:`, error)
      throw error
    }
  }

  async getServerStatus(id: string): Promise<{ status: string } | null> {
    const server = this.servers.get(id)
    if (!server) return null

    return { status: server.status }
  }
}
