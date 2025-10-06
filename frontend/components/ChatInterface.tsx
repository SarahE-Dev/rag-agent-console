'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Send, Bot, Mic, MicOff, Volume2, Play, Square, AlertTriangle, RotateCcw } from 'lucide-react'
import { TypewriterText } from './TypewriterText'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface VoiceSettings {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed: number
  model: 'tts-1' | 'tts-1-hd'
  language?: string
  systemPrompt?: string
}

interface ChatSettings {
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'claude-3-sonnet' | 'claude-3-haiku'
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
  ragPipeline?: string
  voiceSettings?: VoiceSettings
  chatSettings?: ChatSettings
  status: 'configured' | 'ready' | 'running' | 'error'
  createdAt: string
  updatedAt: string
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [agents, setAgents] = useState<AiAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Load agents on component mount
  useEffect(() => {
    loadAgents()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (response.ok) {
        const data = await response.json()
        // Filter for text/chat agents only
        const textAgents = data.filter((agent: AiAgent) => agent.type === 'chat')
        setAgents(textAgents)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedAgent) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Keep only the last 6 messages (3 exchanges) to avoid context length issues
      const maxHistoryMessages = 6
      const recentMessages = messages.slice(-maxHistoryMessages)
      
      const response = await fetch(`/api/agents/${selectedAgent}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...recentMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: input }]
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        setTypingMessageId(aiMessage.id)
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your message.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        setTypingMessageId(aiMessage.id)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      setTypingMessageId(aiMessage.id)
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await handleAudioTranscription(audioBlob)

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleAudioTranscription = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const response = await fetch('/api/agents/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setInput(data.transcription)
      } else {
        console.error('Failed to transcribe audio')
      }
    } catch (error) {
      console.error('Failed to transcribe audio:', error)
    }
  }

  const playAudioResponse = async (text: string) => {
    if (!selectedAgent || !isAgentRunning) return

    try {
      const response = await fetch(`/api/agents/${selectedAgent}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        audio.play()
      } else {
        console.error('Failed to synthesize speech:', await response.text())
      }
    } catch (error) {
      console.error('Failed to play audio response:', error)
    }
  }

  const toggleAgentStatus = async () => {
    if (!selectedAgent) return

    try {
      const endpoint = isAgentRunning ? 'stop' : 'start'
      const response = await fetch(`/api/agents/${selectedAgent}/${endpoint}`, {
        method: 'POST',
      })

      if (response.ok) {
        await loadAgents() // Refresh agent list to get updated status
      } else {
        console.error(`Failed to ${endpoint} agent:`, await response.text())
      }
    } catch (error) {
      console.error(`Failed to toggle agent status:`, error)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setInput('')
    setTypingMessageId(null)
  }

  const getAgentTypeIcon = (type: string) => {
    return type === 'voice' ? <Mic className="w-4 h-4" /> : <Bot className="w-4 h-4" />
  }

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent)
  const isVoiceAgent = selectedAgentData?.type === 'voice'
  const isAgentRunning = selectedAgentData?.status === 'running'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Chat Interface
          </CardTitle>
          <CardDescription>
            Test your configured AI agents in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[300px] cyber-input border-neon-cyan/50">
                  <SelectValue placeholder="Select Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2 font-mono">
                        {getAgentTypeIcon(agent.type)}
                        {agent.name}
                        <Badge
                          variant={agent.status === 'running' ? 'default' : 'secondary'}
                          className={`ml-auto ${agent.status === 'running' ? 'animate-glow' : ''}`}
                        >
                          {agent.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAgentData && (
                <>
                  <Badge
                    variant={selectedAgentData.status === 'running' ? 'default' : 'secondary'}
                    className={`font-mono ${selectedAgentData.status === 'running' ? 'animate-pulse' : ''}`}
                  >
                    {selectedAgentData.type} agent
                  </Badge>
                  {selectedAgentData.chatSettings?.systemPrompt && (
                    <div className="text-xs text-muted-foreground max-w-xs truncate" title={selectedAgentData.chatSettings.systemPrompt}>
                      Prompt: {selectedAgentData.chatSettings.systemPrompt.substring(0, 30)}...
                    </div>
                  )}

                  <Button
                    onClick={toggleAgentStatus}
                    variant={isAgentRunning ? 'destructive' : 'default'}
                    size="sm"
                    className="font-mono"
                  >
                    {isAgentRunning ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </>
                    )}
                  </Button>

                  {!isAgentRunning && (
                    <div className="flex items-center gap-2 text-neon-pink font-mono text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Agent not running - start it to use AI features
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="cyber-card border-border/70 rounded-lg h-96 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 font-mono">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-primary animate-float opacity-50" />
                  <p className="text-lg">No messages yet.</p>
                  <p className="text-sm mt-2">Select an agent and start chatting!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex animate-slide-in-up ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 font-mono border transition-all duration-300 hover:scale-[1.02] ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border-neon-cyan/50 shadow-neon-cyan hover:shadow-lg'
                          : 'bg-card/90 border-primary/40 hover:border-primary/60 shadow-lg'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {message.role === 'assistant' && typingMessageId === message.id ? (
                          <div className="flex-1">
                            <TypewriterText
                              text={message.content}
                              speed={15}
                              className="text-sm leading-relaxed font-medium"
                              onComplete={() => setTypingMessageId(null)}
                            />
                          </div>
                        ) : (
                          <div className="flex-1">
                            <TypewriterText
                              text={message.content}
                              speed={0} // Instant render for completed messages
                              className="text-sm leading-relaxed font-medium"
                            />
                          </div>
                        )}
                        {message.role === 'assistant' && isVoiceAgent && typingMessageId !== message.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudioResponse(message.content)}
                            className="h-7 w-7 p-0 hover:bg-primary/20 transition-all"
                          >
                            <Volume2 className="w-4 h-4 text-neon-cyan animate-pulse" />
                          </Button>
                        )}
                      </div>
                      <span className="text-xs opacity-70 mt-2 block font-mono text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start animate-slide-in-up">
                  <div className="bg-card/90 border border-primary/50 rounded-lg px-4 py-3 max-w-[70%] shadow-neon-purple animate-glow">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-neon-cyan border-t-transparent"></div>
                      <span className="text-sm font-mono text-neon-cyan font-semibold">Processing neural response...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-3 mt-2">
              <Input
                placeholder={isAgentRunning ? "▸ Enter command sequence..." : "Start agent to begin chatting..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={!selectedAgent || isLoading || !isAgentRunning}
                className="flex-1 cyber-input font-mono text-base"
              />
              {messages.length > 0 && (
                <Button
                  onClick={clearConversation}
                  variant="outline"
                  size="lg"
                  className="hover:shadow-neon-pink transition-all duration-300 border-neon-pink/50"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              )}
              {isVoiceAgent && isAgentRunning && (
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "outline"}
                  disabled={!selectedAgent || isLoading || !isAgentRunning}
                  size="lg"
                  className={`font-mono transition-all duration-300 ${isRecording ? 'animate-pulse shadow-neon-pink border-neon-pink/50' : 'hover:shadow-neon-purple hover:border-primary/50'}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || !selectedAgent || isLoading || !isAgentRunning}
                size="lg"
                className="neon-button font-bold px-6"
                title={!isAgentRunning ? "Start the agent first" : ""}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

