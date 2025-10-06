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
    if (!server) {
      console.error(`[MCP] Server ${id} not found`)
      throw new Error(`MCP server not found: ${id}`)
    }

    if (server.status === 'running') {
      console.log(`[MCP] Server ${server.name} already running`)
      return true
    }

    try {
      console.log(`[MCP] Starting server ${server.name} with command: ${server.command} ${server.args.join(' ')}`)
      
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
        console.log(`[MCP] Server ${server.name} exited with code ${code}`)
      })

      serverProcess.on('error', (error: Error) => {
        server.status = 'error'
        server.updatedAt = new Date()
        server.process = undefined
        console.error(`[MCP] Server ${server.name} spawn error:`, error)
      })

      // Log stdout and stderr
      serverProcess.stdout?.on('data', (data: Buffer) => {
        console.log(`[${server.name}] ${data.toString().trim()}`)
      })

      serverProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`[${server.name} stderr] ${data.toString().trim()}`)
      })

      console.log(`[MCP] Server ${server.name} started successfully`)
      return true
    } catch (error) {
      console.error(`[MCP] Failed to start server ${server.name}:`, error)
      server.status = 'error'
      server.updatedAt = new Date()
      throw error
    }
  }

  async stopServer(id: string): Promise<boolean> {
    const server = this.servers.get(id)
    if (!server) {
      console.error(`[MCP] Server ${id} not found`)
      return false
    }

    if (server.status !== 'running' || !server.process) {
      console.log(`[MCP] Server ${server.name} already stopped`)
      server.status = 'stopped'
      server.process = undefined
      return true
    }

    try {
      console.log(`[MCP] Stopping server ${server.name}...`)
      
      return new Promise((resolve) => {
        const process = server.process!
        
        // Set up timeout for force kill
        const timeout = setTimeout(() => {
          console.log(`[MCP] Force killing ${server.name} after timeout`)
          try {
            process.kill('SIGKILL')
          } catch (e) {
            console.error(`[MCP] Error force killing:`, e)
          }
          server.status = 'stopped'
          server.process = undefined
          resolve(true)
        }, 5000)

        // Listen for exit
        process.once('exit', () => {
          clearTimeout(timeout)
          server.status = 'stopped'
          server.process = undefined
          console.log(`[MCP] Server ${server.name} stopped successfully`)
          resolve(true)
        })

        // Send termination signal
        try {
          process.kill('SIGTERM')
        } catch (e) {
          clearTimeout(timeout)
          console.error(`[MCP] Error sending SIGTERM:`, e)
          server.status = 'stopped'
          server.process = undefined
          resolve(false)
        }
      })
    } catch (error) {
      console.error(`[MCP] Failed to stop server ${server.name}:`, error)
      server.status = 'stopped'
      server.process = undefined
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

      // Use MCP communication to get tools from the server
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

      // Execute tool via MCP communication
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
