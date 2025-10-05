import { Router } from 'express'
import { AgentService } from '../services/agentService'
import { McpServerService } from '../services/mcpServerService'
import { RagService } from '../services/ragService'
import { DatabaseService } from '../services/databaseService'
import multer from 'multer'

const router = Router()
const dbService = new DatabaseService()
const mcpService = new McpServerService(dbService)
const ragService = RagService.getInstance(dbService)
const agentService = new AgentService(mcpService, ragService, dbService)
const upload = multer({ storage: multer.memoryStorage() })

// GET /api/agents - List all AI agents
router.get('/', async (req, res) => {
  try {
    const agents = await agentService.getAgents()
    res.json(agents)
  } catch (error) {
    console.error('Error fetching AI agents:', error)
    res.status(500).json({ error: 'Failed to fetch AI agents' })
  }
})

// POST /api/agents - Create a new AI agent
router.post('/', async (req, res) => {
  try {
    const agent = await agentService.createAgent(req.body)
    res.status(201).json(agent)
  } catch (error) {
    console.error('Error creating AI agent:', error)
    res.status(500).json({ error: 'Failed to create AI agent' })
  }
})

// GET /api/agents/:id - Get a specific AI agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await agentService.getAgent(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'AI agent not found' })
    }
    res.json(agent)
  } catch (error) {
    console.error('Error fetching AI agent:', error)
    res.status(500).json({ error: 'Failed to fetch AI agent' })
  }
})

// GET /api/agents/:id/debug - Debug agent configuration
router.get('/:id/debug', async (req, res) => {
  try {
    const agent = await agentService.getAgent(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const debugInfo = {
      agentId: agent.id,
      agentName: agent.name,
      status: agent.status,
      vectorStores: agent.vectorStores || [],
      vectorStoreDetails: agent.vectorStores?.map(vsId => ({
        id: vsId,
        exists: !!ragService.getVectorStore(vsId),
        status: ragService.getVectorStore(vsId)?.status,
        vectorCount: ragService.getVectorStore(vsId)?.vectorCount
      })) || []
    }

    res.json(debugInfo)
  } catch (error) {
    console.error('Error debugging agent:', error)
    res.status(500).json({ error: 'Failed to debug agent' })
  }
})

// PUT /api/agents/:id - Update an AI agent
router.put('/:id', async (req, res) => {
  try {
    const agent = await agentService.updateAgent(req.params.id, req.body)
    if (!agent) {
      return res.status(404).json({ error: 'AI agent not found' })
    }
    res.json(agent)
  } catch (error) {
    console.error('Error updating AI agent:', error)
    res.status(500).json({ error: 'Failed to update AI agent' })
  }
})

// DELETE /api/agents/:id - Delete an AI agent
router.delete('/:id', async (req, res) => {
  try {
    const success = await agentService.deleteAgent(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'AI agent not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting AI agent:', error)
    res.status(500).json({ error: 'Failed to delete AI agent' })
  }
})

// POST /api/agents/:id/start - Start an AI agent
router.post('/:id/start', async (req, res) => {
  try {
    const success = await agentService.startAgent(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'AI agent not found' })
    }
    res.json({ status: 'running' })
  } catch (error) {
    console.error('Error starting AI agent:', error)
    res.status(500).json({ error: 'Failed to start AI agent' })
  }
})

// POST /api/agents/:id/stop - Stop an AI agent
router.post('/:id/stop', async (req, res) => {
  try {
    const success = await agentService.stopAgent(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'AI agent not found' })
    }
    res.json({ status: 'stopped' })
  } catch (error) {
    console.error('Error stopping AI agent:', error)
    res.status(500).json({ error: 'Failed to stop AI agent' })
  }
})

// GET /api/agents/:id/status - Get AI agent status
router.get('/:id/status', async (req, res) => {
  try {
    const status = await agentService.getAgentStatus(req.params.id)
    if (!status) {
      return res.status(404).json({ error: 'AI agent not found' })
    }
    res.json(status)
  } catch (error) {
    console.error('Error fetching AI agent status:', error)
    res.status(500).json({ error: 'Failed to fetch AI agent status' })
  }
})

// POST /api/agents/:id/chat - Send chat message to agent
router.post('/:id/chat', async (req, res) => {
  try {
    // Accept either 'message' (string) or 'messages' (array)
    let messages = req.body.messages
    if (!messages && req.body.message) {
      // Convert single message to messages array
      messages = [{ role: 'user', content: req.body.message }]
    }
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: missing message or messages' })
    }

    const response = await agentService.generateChatResponse(req.params.id, messages)
    if (response === null) {
      return res.status(400).json({ error: 'Agent not configured for chat or not found' })
    }
    res.json({ response })
  } catch (error) {
    console.error('Error generating chat response:', error)
    res.status(500).json({ error: 'Failed to generate chat response' })
  }
})

// POST /api/agents/:id/speak - Generate speech from text
router.post('/:id/speak', async (req, res) => {
  try {
    const { text } = req.body
    const audioData = await agentService.synthesizeSpeech(req.params.id, text)
    if (!audioData) {
      return res.status(400).json({ error: 'Agent not configured for voice or not found' })
    }
    res.set('Content-Type', 'audio/mpeg')
    res.send(audioData)
  } catch (error) {
    console.error('Error synthesizing speech:', error)
    res.status(500).json({ error: 'Failed to synthesize speech' })
  }
})

// POST /api/agents/transcribe - Transcribe audio to text
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }
    const transcription = await agentService.transcribeAudio(req.file.buffer)
    if (!transcription) {
      return res.status(500).json({ error: 'Failed to transcribe audio' })
    }
    res.json({ transcription })
  } catch (error) {
    console.error('Error transcribing audio:', error)
    res.status(500).json({ error: 'Failed to transcribe audio' })
  }
})

export { router as agentRoutes }

