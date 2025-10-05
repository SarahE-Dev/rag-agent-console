import { spawn, ChildProcess } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'

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
    const server = this.servers.get(id)
    if (!server || server.status !== 'running') return []

    // Return cached tools if available
    if (server.tools) return server.tools

    try {
      // For now, return mock tools - in a real implementation, you'd:
      // 1. Send JSON-RPC "tools/list" request to the MCP server
      // 2. Parse the response and return actual tools
      // 3. Cache the tools for future use

      const mockTools: McpTool[] = [
        {
          name: 'search_web',
          description: 'Search the web for information',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
          }
        },
        {
          name: 'get_weather',
          description: 'Get current weather information',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City or location' }
            },
            required: ['location']
          }
        },
        {
          name: 'calculate',
          description: 'Perform mathematical calculations',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'Mathematical expression' }
            },
            required: ['expression']
          }
        }
      ]

      server.tools = mockTools
      return mockTools
    } catch (error) {
      console.error(`Failed to get tools from MCP server ${server.name}:`, error)
      return []
    }
  }

  async executeTool(serverId: string, toolName: string, args: any): Promise<any> {
    const server = this.servers.get(serverId)
    if (!server || server.status !== 'running') {
      throw new Error('MCP server not running')
    }

    try {
      // Mock tool execution - in a real implementation, you'd:
      // 1. Send JSON-RPC "tools/call" request to the MCP server
      // 2. Pass the tool name and arguments
      // 3. Return the tool's response

      switch (toolName) {
        case 'search_web':
          return { result: `Mock search results for: ${args.query}` }
        case 'get_weather':
          return { result: `Mock weather for ${args.location}: 72°F, Sunny` }
        case 'calculate':
          return { result: `Mock calculation result for: ${args.expression} = 42` }
        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      console.error(`Failed to execute tool ${toolName} on server ${server.name}:`, error)
      throw error
    }
  }

  async getServerStatus(id: string): Promise<{ status: string } | null> {
    const server = this.servers.get(id)
    if (!server) return null

    return { status: server.status }
  }
}
