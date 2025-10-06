import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import { McpServerService } from './mcpServerService'
import { RagService } from './ragService'
import { DatabaseService } from './databaseService'

export interface VoiceSettings {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed: number
  model: 'tts-1' | 'tts-1-hd'
  language?: string
  systemPrompt?: string
}

export interface ChatSettings {
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'claude-3-sonnet' | 'claude-3-haiku'
  temperature: number
  maxTokens: number
  systemPrompt?: string
  functions?: string[]
}

export interface AiAgent {
  id: string
  name: string
  description: string
  type: 'voice' | 'chat'
  mcpServers: string[] // IDs of MCP servers
  vectorStores: string[] // IDs of vector stores this agent can access
  voiceSettings?: VoiceSettings
  chatSettings?: ChatSettings
  status: 'configured' | 'ready' | 'running' | 'error'
  createdAt: Date
  updatedAt: Date
}

export class AgentService {
  private agents: Map<string, AiAgent> = new Map()
  private openai: OpenAI | null = null
  private mcpService: McpServerService
  private ragService: RagService
  private dbService: DatabaseService

  constructor(mcpService: McpServerService, ragService: RagService, dbService: DatabaseService) {
    this.mcpService = mcpService
    this.ragService = ragService
    this.dbService = dbService
    this.loadAgentsFromDatabase()
  }

  private async loadAgentsFromDatabase() {
    try {
      const dbAgents = await this.dbService.getAllAiAgents()
      for (const agent of dbAgents) {
        // Type assertion to ensure proper typing
        const typedAgent: AiAgent = {
          ...agent,
          type: agent.type as 'voice' | 'chat',
          status: agent.status as 'configured' | 'ready' | 'running' | 'error',
          voiceSettings: agent.voiceSettings ? agent.voiceSettings as unknown as VoiceSettings : undefined,
          chatSettings: agent.chatSettings as unknown as ChatSettings,
          vectorStores: agent.vectorStores && agent.vectorStores.length > 0 ? agent.vectorStores : ['default-chromadb'],
        }
        this.agents.set(agent.id, typedAgent)
      }
      // Clean up references to non-existent vector stores
      for (const agent of this.agents.values()) {
        if (agent.vectorStores && agent.vectorStores.length > 0) {
          const validVectorStores = agent.vectorStores.filter(storeId => {
            const exists = this.ragService.getVectorStore(storeId)
            if (!exists) {
              console.log(`🧹 Removed reference to deleted vector store ${storeId} from agent ${agent.name}`)
            }
            return exists
          })
          if (validVectorStores.length !== agent.vectorStores.length) {
            agent.vectorStores = validVectorStores
            // Update in database
            try {
              await this.dbService.updateAiAgent(agent.id, { vectorStores: agent.vectorStores })
            } catch (error) {
              console.error(`Failed to update agent ${agent.name} after vector store cleanup:`, error)
            }
          }
        }
      }

      console.log(`Loaded ${dbAgents.length} agents from database`)
    } catch (error) {
      console.error('Failed to load agents from database:', error)
    }
  }

  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.')
      }
      this.openai = new OpenAI({ apiKey })
    }
    return this.openai
  }

  async createAgent(data: Omit<AiAgent, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AiAgent> {
    const id = uuidv4()
    const agent: AiAgent = {
      id,
      ...data,
      status: 'configured',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to database
    await this.dbService.createAiAgent(agent)

    // Store in memory
    this.agents.set(id, agent)
    return agent
  }

  async getAgents(): Promise<AiAgent[]> {
    return Array.from(this.agents.values())
  }

  async getAgent(id: string): Promise<AiAgent | null> {
    return this.agents.get(id) || null
  }

  async updateAgent(id: string, updates: Partial<AiAgent>): Promise<AiAgent | null> {
    const agent = this.agents.get(id)
    if (!agent) return null

    const updated = { ...agent, ...updates, updatedAt: new Date() }

    // Save to database
    await this.dbService.updateAiAgent(id, updated)

    // Update in memory
    this.agents.set(id, updated)
    return updated
  }

  async deleteAgent(id: string): Promise<boolean> {
    // Delete from database
    await this.dbService.deleteAiAgent(id)

    // Delete from memory
    return this.agents.delete(id)
  }

  async startAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id)
    if (!agent) return false

    if (agent.status === 'running') return true

    try {
      agent.status = 'running'
      agent.updatedAt = new Date()
      return true
    } catch (error) {
      agent.status = 'error'
      agent.updatedAt = new Date()
      console.error('Failed to start agent:', error)
      return false
    }
  }

  async stopAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id)
    if (!agent) return false

    if (agent.status !== 'running') return true

    try {
      agent.status = 'ready'
      agent.updatedAt = new Date()
      return true
    } catch (error) {
      agent.status = 'error'
      agent.updatedAt = new Date()
      console.error('Failed to stop agent:', error)
      return false
    }
  }

  async getAgentStatus(id: string): Promise<{ status: string } | null> {
    const agent = this.agents.get(id)
    if (!agent) return null

    return { status: agent.status }
  }

  // Voice synthesis methods
  async synthesizeSpeech(agentId: string, text: string): Promise<Buffer | null> {
    const agent = this.agents.get(agentId)
    if (!agent || agent.type !== 'voice' || !agent.voiceSettings) return null

    if (agent.status !== 'running') {
      throw new Error('Agent is not running. Please start the agent first.')
    }

    try {
      const voiceSettings = agent.voiceSettings!

      const mp3 = await this.getOpenAIClient().audio.speech.create({
        model: voiceSettings.model,
        voice: voiceSettings.voice,
        input: text,
        speed: voiceSettings.speed,
      })

      const buffer = Buffer.from(await mp3.arrayBuffer())
      console.log(`Synthesized speech for agent ${agent.name}: ${text.substring(0, 50)}... (${buffer.length} bytes)`)
      return buffer
    } catch (error) {
      console.error('Failed to synthesize speech:', error)
      throw error
    }
  }

  // Chat completion methods
  async generateChatResponse(agentId: string, messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>): Promise<string | null> {
    const agent = this.agents.get(agentId)
    if (!agent || !agent.chatSettings) {
      console.log(`❌ Agent ${agentId} not found or missing chat settings`)
      return null
    }

    if (agent.status !== 'running') {
      console.log(`⚠️ Agent ${agent.name} status: ${agent.status}`)
      return 'Agent is not running. Please start the agent first.'
    }

    console.log(`🚀 Processing chat request for agent: ${agent.name} (${agentId})`)

    try {
      const chatSettings = agent.chatSettings!

      // Prepare messages with system prompt if configured
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      // Add system prompt - prioritize voice prompt for voice agents
      let systemPrompt = chatSettings.systemPrompt
      if (agent.type === 'voice' && agent.voiceSettings?.systemPrompt) {
        systemPrompt = agent.voiceSettings.systemPrompt
      }

      // Add RAG context retrieval from agent's vector stores
      let ragContext = ''
      console.log(`🤖 Agent ${agent.name} has vector stores:`, agent.vectorStores)
      if (agent.vectorStores && agent.vectorStores.length > 0) {
        const lastMessage = messages[messages.length - 1]
        console.log(`🔍 Query: "${lastMessage.content}"`)
        let allContextChunks: Array<{content: string, source: string, dataSourceId: string}> = []
        for (const vectorStoreId of agent.vectorStores) {
          console.log(`📚 Searching vector store: ${vectorStoreId}`)

          // Check if vector store exists and is ready
          const vectorStore = this.ragService.getVectorStore(vectorStoreId)
          if (!vectorStore) {
            console.warn(`❌ Vector store ${vectorStoreId} not found`)
            continue
          }
          if (vectorStore.status !== 'ready') {
            console.warn(`⚠️ Vector store ${vectorStoreId} status: ${vectorStore.status}`)
            continue
          }

          try {
            console.log(`🔎 About to call retrieveContext for vector store ${vectorStoreId}`)
            const contextChunks = await this.ragService.retrieveContext(lastMessage.content, vectorStoreId)
            console.log(`📄 Retrieved ${contextChunks.length} chunks from ${vectorStoreId}`)
            if (contextChunks.length > 0) {
              console.log('Sample chunk:', contextChunks[0].content.substring(0, 100) + '...')
            } else {
              console.log(`⚠️ No chunks retrieved from ${vectorStoreId} - check debug logs above`)
            }
            allContextChunks.push(...contextChunks)
          } catch (error) {
            console.warn(`Failed to retrieve context from vector store ${vectorStoreId}:`, error)
          }
        }
        if (allContextChunks.length > 0) {
          // Group context by data source for better organization
          const contextBySource = new Map<string, Array<{content: string, source: string}>>()

          for (const chunk of allContextChunks) {
            if (!contextBySource.has(chunk.dataSourceId)) {
              contextBySource.set(chunk.dataSourceId, [])
            }
            contextBySource.get(chunk.dataSourceId)!.push({
              content: chunk.content,
              source: chunk.source
            })
          }

          // Build labeled context
          const contextSections: string[] = []
          for (const [dataSourceId, chunks] of contextBySource.entries()) {
            const dataSource = this.ragService.getDataSource(dataSourceId)
            const sourceName = dataSource ? dataSource.name : `Data Source ${dataSourceId}`

            const chunkTexts = chunks.map(chunk => chunk.content).join('\n\n')
            contextSections.push(`From "${sourceName}":\n${chunkTexts}`)
          }

          ragContext = `\n\nRelevant information from your knowledge sources:\n\n${contextSections.join('\n\n---\n\n')}`
          console.log(`Retrieved ${allContextChunks.length} context chunks from ${contextBySource.size} sources for agent ${agent.name}`)
          console.log('🎯 RAG Context added to prompt:', ragContext.substring(0, 200) + '...')
        }
      }

      if (systemPrompt || ragContext) {
        chatMessages.push({
          role: 'system',
          content: `${systemPrompt || ''}${ragContext}`
        })
      }

      // Add conversation history with trimming to avoid context length errors
      // Keep only the last N messages to stay within token limits
      const maxHistoryMessages = 10 // Keep last 10 messages (5 exchanges)
      const trimmedMessages = messages.slice(-maxHistoryMessages)
      
      chatMessages.push(...trimmedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[])

      // Get available tools for this agent
      const availableTools: OpenAI.Chat.Completions.ChatCompletionTool[] = []
      const toolToServerMap = new Map<string, string>() // Map tool name to server ID

      // Dynamically load tools from all assigned MCP servers
      if (agent.mcpServers && agent.mcpServers.length > 0) {
        console.log(`🔧 Loading tools for agent ${agent.name} from ${agent.mcpServers.length} MCP servers`)

        for (const serverId of agent.mcpServers) {
          try {
            const mcpTools = await this.mcpService.getServerTools(serverId)
            console.log(`📦 Found ${mcpTools.length} tools from server ${serverId}`)

            for (const tool of mcpTools) {
              // Convert MCP tool format to OpenAI function format
              availableTools.push({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description || '',
                  parameters: tool.inputSchema || { type: 'object', properties: {} }
                }
              })

              // Map tool name to server ID for execution
              toolToServerMap.set(tool.name, serverId)
              console.log(`  ✅ Added tool: ${tool.name}`)
            }
          } catch (error) {
            console.error(`❌ Failed to load tools from server ${serverId}:`, error)
          }
        }

        console.log(`📍 Total tools available: ${availableTools.length}`)
      }

      console.log(`🤖 Creating completion with ${availableTools.length} tools`)

      const completion = await this.getOpenAIClient().chat.completions.create({
        model: chatSettings.model,
        messages: chatMessages,
        temperature: chatSettings.temperature,
        max_tokens: chatSettings.maxTokens,
        tools: availableTools.length > 0 ? availableTools : undefined,
        tool_choice: availableTools.length > 0 ? 'auto' : undefined,
      })

      console.log(`🤖 Generated completion:`, {
        hasChoices: !!completion.choices,
        choiceCount: completion.choices?.length,
        hasMessage: !!completion.choices?.[0]?.message,
        messageContent: completion.choices?.[0]?.message?.content?.substring(0, 100),
        hasToolCalls: !!completion.choices?.[0]?.message?.tool_calls
      })

      // Handle tool calls if any
      const toolCalls = completion.choices[0]?.message?.tool_calls
      console.log(`🤖 Tool calls:`, toolCalls)

      if (toolCalls && toolCalls.length > 0) {
        // Execute MCP tools and get results
        const toolResults: string[] = []
        for (const toolCall of toolCalls) {
          try {
            // Type guard to ensure we have a function tool call
            if ('function' in toolCall && toolCall.function) {
              const toolName = toolCall.function.name
              const args = JSON.parse(toolCall.function.arguments || '{}')

              console.log(`[TOOL] Executing ${toolName} with args:`, args)

              let result: string

              // Look up which server provides this tool
              const serverId = toolToServerMap.get(toolName)
              
              if (!serverId) {
                console.error(`[TOOL] No server found for tool: ${toolName}`)
                result = `Error: Tool "${toolName}" is not registered with any MCP server.`
              } else {
                try {
                  console.log(`[TOOL] Calling MCP server ${serverId} for tool: ${toolName}`)
                  result = await this.mcpService.executeTool(serverId, toolName, args)
                  
                  // Log the result (handle both string and object responses)
                  const resultPreview = typeof result === 'string' 
                    ? result.substring(0, 200) 
                    : JSON.stringify(result).substring(0, 200)
                  console.log(`[TOOL] Result from ${toolName}:`, resultPreview)
                } catch (error) {
                  console.error(`[TOOL] Error calling MCP server:`, error)
                  result = `Error executing tool "${toolName}": ${error}. Please ensure the MCP server is running and configured.`
                }
              }

              toolResults.push(`${toolName} result: ${result}`)
            } else {
              console.error('Unsupported tool call type:', toolCall)
              toolResults.push(`Unsupported tool call: ${JSON.stringify(toolCall)}`)
            }
          } catch (error) {
            console.error('Failed to execute tool:', error)
            toolResults.push(`Tool execution failed: ${error}`)
          }
        }

        // Generate final response with tool results
        // First, add the assistant's message with tool calls
        const assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
          role: 'assistant',
          content: null,
          tool_calls: toolCalls
        }

        // Then add tool result messages
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = toolCalls.map((toolCall, index) => ({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: toolResults[index] || 'No result'
        }))

        const finalCompletion = await this.getOpenAIClient().chat.completions.create({
          model: chatSettings.model,
          messages: [...chatMessages, assistantMessage, ...toolMessages],
          temperature: chatSettings.temperature,
          max_tokens: chatSettings.maxTokens,
        })

        const finalResponse = finalCompletion.choices[0]?.message?.content
        console.log(`Generated chat response with MCP tools for agent ${agent.name}: ${finalResponse?.substring(0, 100)}...`)
        return finalResponse || 'I used some tools but couldn\'t generate a final response.'
      }

      const response = completion.choices[0]?.message?.content
      console.log(`Generated chat response for agent ${agent.name}: ${response?.substring(0, 100)}...`)
      return response || 'I apologize, but I couldn\'t generate a response.'
    } catch (error) {
      console.error('Failed to generate chat response:', error)
      return 'I\'m sorry, I encountered an error while processing your request.'
    }
  }

  // Speech recognition methods
  async transcribeAudio(audioData: Buffer): Promise<string | null> {
    try {
      const transcription = await this.getOpenAIClient().audio.transcriptions.create({
        file: new File([audioData], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: 'en', // Could be made configurable per agent
      })

      const text = transcription.text
      console.log(`Transcribed audio (${audioData.length} bytes): "${text}"`)
      return text
    } catch (error) {
      console.error('Failed to transcribe audio:', error)
      throw error
    }
  }
}
