'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Slider } from '@/components/ui/Slider'
import { Plus, Bot, Mic, MessageSquare, Play, Square, Trash2, Edit } from 'lucide-react'

interface McpServer {
  id: string
  name: string
  status: string
}

interface VectorStore {
  id: string
  name: string
  status: string
  vectorCount?: number
}

interface VoiceSettings {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed: number
  model: 'tts-1' | 'tts-1-hd'
  language?: string
  systemPrompt?: string
}

interface ChatSettings {
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'claude-3-sonnet' | 'claude-3-haiku'
  temperature: number
  maxTokens: number
  systemPrompt?: string
  functions?: string[]
}

interface AiAgent {
  id: string
  name: string
  description: string
  type: 'voice' | 'chat'
  mcpServers: string[]
  vectorStores: string[]
  voiceSettings?: VoiceSettings
  chatSettings?: ChatSettings
  status: 'configured' | 'ready' | 'running' | 'error'
  createdAt: string
  updatedAt: string
}

interface NewAgentState {
  name: string
  description: string
  type: 'voice' | 'chat'
  mcpServers: string[]
  vectorStores: string[]
  voiceSettings: VoiceSettings
  chatSettings: ChatSettings
}

export function AgentConfigurator() {
  const [agents, setAgents] = useState<AiAgent[]>([])
  const [mcpServers, setMcpServers] = useState<McpServer[]>([])
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([])
  const [activeTab, setActiveTab] = useState('voice')

  // Dialog states
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean
    agent: AiAgent | null
  }>({ isOpen: false, agent: null })

  // Form states
  const [newAgent, setNewAgent] = useState<NewAgentState>({
    name: '',
    description: '',
    type: 'voice',
    mcpServers: [],
    vectorStores: [],
    voiceSettings: {
      voice: 'alloy',
      speed: 1.0,
      model: 'tts-1',
      language: 'en',
      systemPrompt: 'You are a helpful voice assistant. Keep your responses conversational and natural, as if speaking to someone. Be concise but informative.',
    },
    chatSettings: {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: '',
      functions: [],
    },
  })

  // Load data on component mount
  useEffect(() => {
    loadAgents()
    loadMcpServers()
    loadVectorStores()
  }, [])

  // Add new vector stores directly when they're created
  useEffect(() => {
    const handleVectorStoreCreated = (event: CustomEvent) => {
      console.log('New vector store created:', event.detail.vectorStore)
      setVectorStores(prev => {
        // Check if this vector store already exists
        const exists = prev.some(vs => vs.id === event.detail.vectorStore.id)
        if (!exists) {
          return [...prev, event.detail.vectorStore]
        }
        return prev
      })
    }

    window.addEventListener('vectorStoreCreated', handleVectorStoreCreated as EventListener)

    return () => {
      window.removeEventListener('vectorStoreCreated', handleVectorStoreCreated as EventListener)
    }
  }, [])

  // Reset editing state when dialog closes
  useEffect(() => {
    if (!isAgentDialogOpen) {
      setEditingAgent(null)
    }
  }, [isAgentDialogOpen])

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const loadMcpServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers')
      if (response.ok) {
        const data = await response.json()
        setMcpServers(data)
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error)
    }
  }

  const loadVectorStores = async () => {
    try {
      const response = await fetch('/api/rag/vectorstores')
      if (response.ok) {
        const data = await response.json()
        setVectorStores(data)
      }
    } catch (error) {
      console.error('Failed to load vector stores:', error)
    }
  }

  const handleCreateOrUpdateAgent = async () => {
    try {
      // For voice agents, copy the voice system prompt to chat settings
      let chatSettings = newAgent.chatSettings
      if (newAgent.type === 'voice' && newAgent.voiceSettings?.systemPrompt && !chatSettings.systemPrompt) {
        chatSettings = {
          ...chatSettings,
          systemPrompt: newAgent.voiceSettings.systemPrompt
        }
      }

      const agentData = {
        ...newAgent,
        voiceSettings: newAgent.type === 'voice' ? newAgent.voiceSettings : undefined,
        // All agents get chat settings for basic chat functionality
        chatSettings: chatSettings,
        vectorStores: newAgent.vectorStores,
      }

      const method = editingAgent ? 'PUT' : 'POST'
      const url = editingAgent ? `/api/agents/${editingAgent.id}` : '/api/agents'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      })

      if (response.ok) {
        setIsAgentDialogOpen(false)
        setEditingAgent(null)
        setNewAgent({
          name: '',
          description: '',
          type: 'voice',
          mcpServers: [],
          vectorStores: [],
          voiceSettings: {
            voice: 'alloy',
            speed: 1.0,
            model: 'tts-1',
            language: 'en',
            systemPrompt: 'You are a helpful voice assistant. Keep your responses conversational and natural, as if speaking to someone. Be concise but informative.',
          },
          chatSettings: {
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 1000,
            systemPrompt: '',
            functions: [],
          },
        })
        loadAgents()
      }
    } catch (error) {
      console.error(`Failed to ${editingAgent ? 'update' : 'create'} agent:`, error)
    }
  }

  const handleEditAgent = (agent: AiAgent) => {
    setEditingAgent(agent)
    setNewAgent({
      name: agent.name,
      description: agent.description,
      type: agent.type,
      mcpServers: agent.mcpServers,
      vectorStores: agent.vectorStores || [],
      voiceSettings: {
        voice: agent.voiceSettings?.voice || 'alloy',
        speed: agent.voiceSettings?.speed || 1.0,
        model: agent.voiceSettings?.model || 'tts-1',
        language: agent.voiceSettings?.language || 'en',
        systemPrompt: agent.voiceSettings?.systemPrompt || 'You are a helpful voice assistant. Keep your responses conversational and natural, as if speaking to someone. Be concise but informative.',
      },
      chatSettings: {
        model: agent.chatSettings?.model || 'gpt-4o',
        temperature: agent.chatSettings?.temperature || 0.7,
        maxTokens: agent.chatSettings?.maxTokens || 1000,
        systemPrompt: agent.chatSettings?.systemPrompt || '',
        functions: agent.chatSettings?.functions || [],
      },
    })
    setIsAgentDialogOpen(true)
  }

  const handleDeleteAgent = (agent: AiAgent) => {
    setDeleteConfirmDialog({ isOpen: true, agent })
  }

  const confirmDeleteAgent = async () => {
    if (!deleteConfirmDialog.agent) return

    try {
      const response = await fetch(`/api/agents/${deleteConfirmDialog.agent.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadAgents()
        setDeleteConfirmDialog({ isOpen: false, agent: null })
      }
    } catch (error) {
      console.error('Failed to delete agent:', error)
    }
  }

  const handleStartAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/start`, { method: 'POST' })
      loadAgents()
    } catch (error) {
      console.error('Failed to start agent:', error)
    }
  }

  const handleStopAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/stop`, { method: 'POST' })
      loadAgents()
    } catch (error) {
      console.error('Failed to stop agent:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500">Running</Badge>
      case 'ready':
        return <Badge variant="default" className="bg-blue-500">Ready</Badge>
      case 'configured':
        return <Badge variant="secondary">Configured</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const voiceAgents = agents.filter(agent => agent.type === 'voice')
  const chatAgents = agents.filter(agent => agent.type === 'chat')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">AI Agents</h3>
        <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAgent ? 'Edit AI Agent' : 'Create AI Agent'}</DialogTitle>
              <DialogDescription>
                {editingAgent
                  ? 'Update the configuration of your AI agent.'
                  : 'Configure a new AI agent with voice or chat capabilities.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agent-name" className="text-right">Name</Label>
                <Input
                  id="agent-name"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agent-desc" className="text-right">Description</Label>
                <Textarea
                  id="agent-desc"
                  value={newAgent.description}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agent-type" className="text-right">Type</Label>
                <Select value={newAgent.type} onValueChange={(value: any) => setNewAgent(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice">Voice Agent</SelectItem>
                    <SelectItem value="chat">Chat Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agent-mcp" className="text-right">MCP Servers</Label>
                <Select value={newAgent.mcpServers.join(',')} onValueChange={(value) => setNewAgent(prev => ({ ...prev, mcpServers: value.split(',').filter(Boolean) }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select MCP servers" />
                  </SelectTrigger>
                  <SelectContent>
                    {mcpServers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agent-rag" className="text-right">Vector Stores</Label>
                <Select value={newAgent.vectorStores.join(',')} onValueChange={(value) => setNewAgent(prev => ({ ...prev, vectorStores: value.split(',').filter(Boolean) }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select vector stores containing your data" />
                  </SelectTrigger>
                  <SelectContent>
                    {vectorStores.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No vector stores available. Upload and process data sources first.</div>
                    ) : (
                      vectorStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name} ({store.vectorCount || 0} vectors)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {newAgent.type === 'voice' && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">Voice Settings</h4>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="voice-voice" className="text-right">Voice</Label>
                    <Select value={newAgent.voiceSettings.voice} onValueChange={(value: any) => setNewAgent(prev => ({
                      ...prev,
                      voiceSettings: { ...prev.voiceSettings, voice: value }
                    }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy</SelectItem>
                        <SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="fable">Fable</SelectItem>
                        <SelectItem value="onyx">Onyx</SelectItem>
                        <SelectItem value="nova">Nova</SelectItem>
                        <SelectItem value="shimmer">Shimmer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="voice-speed" className="text-right">Speed</Label>
                    <div className="col-span-3">
                      <Slider
                        value={[newAgent.voiceSettings.speed]}
                        onValueChange={(value) => setNewAgent(prev => ({
                          ...prev,
                          voiceSettings: { ...prev.voiceSettings, speed: value[0] }
                        }))}
                        max={2.0}
                        min={0.5}
                        step={0.1}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{newAgent.voiceSettings.speed}x</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="voice-model" className="text-right">Model</Label>
                    <Select value={newAgent.voiceSettings.model} onValueChange={(value: any) => setNewAgent(prev => ({
                      ...prev,
                      voiceSettings: { ...prev.voiceSettings, model: value }
                    }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tts-1">TTS-1</SelectItem>
                        <SelectItem value="tts-1-hd">TTS-1-HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="voice-prompt" className="text-right">Voice Prompt</Label>
                    <Textarea
                      id="voice-prompt"
                      value={newAgent.voiceSettings.systemPrompt}
                      onChange={(e) => setNewAgent(prev => ({
                        ...prev,
                        voiceSettings: { ...prev.voiceSettings, systemPrompt: e.target.value }
                      }))}
                      className="col-span-3"
                      placeholder="You are a helpful voice assistant. Keep responses conversational and natural..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Chat Settings {newAgent.type === 'voice' && '(Required for voice agents)'}</h4>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chat-model" className="text-right">Model</Label>
                    <Select value={newAgent.chatSettings.model} onValueChange={(value: any) => setNewAgent(prev => ({
                      ...prev,
                      chatSettings: { ...prev.chatSettings, model: value }
                    }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (16K context)</SelectItem>
                        <SelectItem value="gpt-4">GPT-4 (8K context)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo (128K context)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (128K context) - Recommended</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chat-temp" className="text-right">Temperature</Label>
                    <div className="col-span-3">
                      <Slider
                        value={[newAgent.chatSettings.temperature]}
                        onValueChange={(value) => setNewAgent(prev => ({
                          ...prev,
                          chatSettings: { ...prev.chatSettings, temperature: value[0] }
                        }))}
                        max={2.0}
                        min={0.0}
                        step={0.1}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{newAgent.chatSettings.temperature}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chat-tokens" className="text-right">Max Tokens</Label>
                    <Input
                      id="chat-tokens"
                      type="number"
                      value={newAgent.chatSettings.maxTokens}
                      onChange={(e) => setNewAgent(prev => ({
                        ...prev,
                        chatSettings: { ...prev.chatSettings, maxTokens: parseInt(e.target.value) }
                      }))}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chat-prompt" className="text-right">
                      System Prompt
                      {newAgent.type === 'voice' && newAgent.voiceSettings?.systemPrompt && !newAgent.chatSettings.systemPrompt && (
                        <span className="text-xs text-cyan-400 block">(Will copy from voice prompt)</span>
                      )}
                    </Label>
                    <Textarea
                      id="chat-prompt"
                      value={newAgent.chatSettings.systemPrompt}
                      onChange={(e) => setNewAgent(prev => ({
                        ...prev,
                        chatSettings: { ...prev.chatSettings, systemPrompt: e.target.value }
                      }))}
                      className="col-span-3"
                      placeholder={newAgent.type === 'voice' ? "Leave empty to use voice system prompt..." : "You are a helpful AI assistant..."}
                    />
                  </div>
                </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrUpdateAgent}>
                {editingAgent ? 'Update Agent' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmDialog.isOpen}
          onOpenChange={(open) => setDeleteConfirmDialog({ isOpen: open, agent: null })}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <Trash2 className="w-5 h-5" />
                Delete AI Agent
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This action cannot be undone. This will permanently delete the AI agent
                and remove all associated configurations.
              </DialogDescription>
            </DialogHeader>

            {deleteConfirmDialog.agent && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    {deleteConfirmDialog.agent.type === 'voice' ? (
                      <Mic className="w-5 h-5 text-blue-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{deleteConfirmDialog.agent.name}</p>
                      <p className="text-sm text-muted-foreground">{deleteConfirmDialog.agent.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-medium">
                    ⚠️ Warning: All conversation history and configurations will be lost.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmDialog({ isOpen: false, agent: null })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteAgent}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Voice Agents ({voiceAgents.length})
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat Agents ({chatAgents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="mt-6">
          <div className="grid gap-4">
            {voiceAgents.map((agent) => (
              <Card key={agent.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mic className="w-6 h-6 text-blue-500" />
                      <div>
                        <h4 className="font-semibold">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {agent.mcpServers.length} MCP servers
                          </span>
                          {agent.vectorStores && agent.vectorStores.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Vector Stores: {agent.vectorStores.length} store{agent.vectorStores.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(agent.status)}
                      {agent.status === 'running' ? (
                        <Button size="sm" variant="outline" onClick={() => handleStopAgent(agent.id)}>
                          <Square className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleStartAgent(agent.id)}>
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEditAgent(agent)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteAgent(agent)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {voiceAgents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No voice agents configured. Create agents with speech-to-text and text-to-speech capabilities.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <div className="grid gap-4">
            {chatAgents.map((agent) => (
              <Card key={agent.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-6 h-6 text-green-500" />
                      <div>
                        <h4 className="font-semibold">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {agent.chatSettings?.model || 'No model'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {agent.mcpServers.length} MCP servers
                          </span>
                          {agent.vectorStores && agent.vectorStores.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Vector Stores: {agent.vectorStores.length} store{agent.vectorStores.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(agent.status)}
                      {agent.status === 'running' ? (
                        <Button size="sm" variant="outline" onClick={() => handleStopAgent(agent.id)}>
                          <Square className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleStartAgent(agent.id)}>
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEditAgent(agent)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteAgent(agent)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {chatAgents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No chat agents configured. Create conversational AI agents with your MCP servers and RAG pipelines.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

