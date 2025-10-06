'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Mic, MicOff, Volume2, Square, AlertTriangle, Play, Pause, RotateCcw } from 'lucide-react'
import { TypewriterText } from './TypewriterText'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string
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

export function VoiceChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [agents, setAgents] = useState<AiAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: 'error' | 'success' | 'info'
  } | null>(null)
  const [isHoldRecording, setIsHoldRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)

  const showNotification = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

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
        // Filter for voice agents only
        const voiceAgents = data.filter((agent: AiAgent) => agent.type === 'voice')
        setAgents(voiceAgents)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedAgent) return

    const selectedAgentData = agents.find(agent => agent.id === selectedAgent)
    if (!selectedAgentData || selectedAgentData.status !== 'running') {
      showNotification('Please select and start a voice agent first.', 'error')
      return
    }

    const messageContent = input // Store the content before clearing
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
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
          messages: [...recentMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: messageContent }]
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Start playing audio immediately
        playAudioResponse(data.response)

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        setTypingMessageId(aiMessage.id)
      } else {
        const errorText = await response.text()
        console.error('Chat API error:', response.status, errorText)
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error (${response.status}): ${errorText || 'Unknown error'}`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        setTypingMessageId(aiMessage.id)
        showNotification('Failed to send message. Check console for details.', 'error')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      showNotification('Network error. Please check your connection.', 'error')
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      setTypingMessageId(aiMessage.id)
    } finally {
      setIsLoading(false)
    }
  }

  const startHoldRecording = async () => {
    const selectedAgentData = agents.find(agent => agent.id === selectedAgent)
    if (!selectedAgentData || selectedAgentData.status !== 'running') {
      showNotification('Please select and start a voice agent first.', 'error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      recordingStartTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const recordingDuration = recordingStartTimeRef.current
          ? Date.now() - recordingStartTimeRef.current
          : 0

        setIsRecording(false)
        setIsHoldRecording(false)
        recordingStartTimeRef.current = null

        // Check if recording is long enough (at least 0.5 seconds)
        if (recordingDuration < 500) {
          showNotification('Recording too short. Please hold the button for at least 0.5 seconds.', 'error')
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop())
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })

        if (audioBlob.size > 44) { // Basic check for audio data
          await handleAudioTranscription(audioBlob)
        } else {
          showNotification('No audio data recorded. Please try again.', 'error')
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsHoldRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      showNotification('Failed to access microphone. Please check permissions.', 'error')
      recordingStartTimeRef.current = null
    }
  }

  const stopHoldRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
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
        const transcribedText = data.transcription

        // Send immediately without delay
        const messageContent = transcribedText
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: messageContent,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)
        showNotification('Audio transcribed! Sending message...', 'success')

        // Send to agent (voice agents will use their voice-specific prompt)
        // Keep only the last 6 messages (3 exchanges) to avoid context length issues
        const maxHistoryMessages = 6
        const recentMessages = messages.slice(-maxHistoryMessages)
        
        fetch(`/api/agents/${selectedAgent}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...recentMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: messageContent }]
          }),
        }).then(async (response) => {
          if (response.ok) {
            const data = await response.json()

            // Start playing audio immediately
            playAudioResponse(data.response)

            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])
            setTypingMessageId(aiMessage.id)
          } else {
            const errorText = await response.text()
            console.error('Chat API error:', response.status, errorText)
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Sorry, I encountered an error (${response.status}): ${errorText || 'Unknown error'}`,
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])
            setTypingMessageId(aiMessage.id)
            showNotification('Failed to send message. Check console for details.', 'error')
          }
        }).catch((error) => {
          console.error('Failed to send message:', error)
          showNotification('Network error. Please check your connection.', 'error')
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, I encountered a network error. Please try again.',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          setTypingMessageId(aiMessage.id)
        }).finally(() => {
          setIsLoading(false)
        })
      } else {
        const errorText = await response.text()
        console.error('Transcription API error:', response.status, errorText)
        showNotification(`Failed to transcribe audio (${response.status}). Please try again.`, 'error')
      }
    } catch (error) {
      console.error('Failed to transcribe audio:', error)
      showNotification('Network error during transcription. Please try again.', 'error')
    }
  }

  const playAudioResponse = async (text: string) => {
    if (!selectedAgent) return

    try {
      // Show notification that audio is being generated
      showNotification('🎵 Generating audio...', 'info')
      setIsPlaying(true)
      
      const response = await fetch(`/api/agents/${selectedAgent}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        audio.onended = () => {
          setIsPlaying(false)
          currentAudioRef.current = null
          URL.revokeObjectURL(audioUrl) // Clean up
        }

        audio.onerror = () => {
          setIsPlaying(false)
          currentAudioRef.current = null
          URL.revokeObjectURL(audioUrl) // Clean up
        }

        // Start playing as soon as possible
        audio.play().catch(err => {
          console.error('Audio playback failed:', err)
          setIsPlaying(false)
          currentAudioRef.current = null
        })
      } else {
        console.error('Failed to synthesize speech:', await response.text())
        setIsPlaying(false)
      }
    } catch (error) {
      console.error('Failed to play audio response:', error)
      setIsPlaying(false)
    }
  }

  const stopAudioPlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
      setIsPlaying(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setInput('')
    setTypingMessageId(null)
    stopAudioPlayback()
  }

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-neon-cyan" />
            Voice Chat Interface
          </CardTitle>
          <CardDescription>
            Have natural voice conversations with your AI agents using speech-to-text and text-to-speech.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Notification */}
            {notification && (
              <div className={`p-3 rounded-lg border text-sm font-medium ${
                notification.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : notification.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {notification.message}
              </div>
            )}

            <div className="flex gap-4 items-center">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[300px] cyber-input border-neon-cyan/50">
                  <SelectValue placeholder="Select Voice Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2 font-mono">
                        <Mic className="w-4 h-4" />
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
                    Voice Agent
                  </Badge>
                  {selectedAgentData.voiceSettings?.systemPrompt && (
                    <div className="text-xs text-muted-foreground max-w-xs truncate" title={selectedAgentData.voiceSettings.systemPrompt}>
                      Prompt: {selectedAgentData.voiceSettings.systemPrompt.substring(0, 30)}...
                    </div>
                  )}
                </>
              )}

              {selectedAgentData?.status !== 'running' && selectedAgent && (
                <div className="flex items-center gap-2 text-neon-pink font-mono text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Start the agent to use voice features
                </div>
              )}
            </div>

            {/* Voice Control Panel */}
            <div className="border border-neon-cyan/30 rounded-lg p-6 bg-card/50">
              <div className="flex items-center justify-center gap-6">
                {/* Voice Recording Button */}
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      startHoldRecording()
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault()
                      stopHoldRecording()
                    }}
                    onMouseLeave={(e) => {
                      e.preventDefault()
                      if (isHoldRecording) stopHoldRecording()
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      startHoldRecording()
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      stopHoldRecording()
                    }}
                    disabled={!selectedAgent || isLoading || selectedAgentData?.status !== 'running'}
                    className={`w-20 h-20 rounded-full p-0 border-2 transition-all duration-300 ${
                      isRecording
                        ? 'bg-red-600 border-red-400 shadow-neon-pink animate-pulse'
                        : 'hover:shadow-neon-cyan hover:scale-105'
                    }`}
                    variant={isRecording ? 'destructive' : 'default'}
                  >
                    <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-primary-foreground'}`} />
                  </Button>
                  <span className="text-sm font-mono text-center">
                    {isRecording ? '🎤 Listening... Release when done' : '🎤 Hold to Record & Send'}
                  </span>
                </div>

                {/* Audio Playback Controls */}
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={isPlaying ? stopAudioPlayback : () => {
                      const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')
                      if (lastAssistantMessage) {
                        playAudioResponse(lastAssistantMessage.content)
                      }
                    }}
                    variant="outline"
                    size="lg"
                    disabled={!selectedAgent || isLoading || messages.filter(m => m.role === 'assistant').length === 0}
                    className="w-20 h-20 rounded-full hover:shadow-neon-purple transition-all duration-300"
                  >
                    {isPlaying ? <Square className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
                  </Button>
                  <span className="text-sm font-mono text-center">
                    {isPlaying ? 'Playing' : 'Replay Last'}
                  </span>
                </div>

                {/* Clear Conversation */}
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={clearConversation}
                    variant="outline"
                    size="lg"
                    className="w-20 h-20 rounded-full hover:shadow-neon-pink transition-all duration-300"
                  >
                    <RotateCcw className="w-8 h-8" />
                  </Button>
                  <span className="text-sm font-mono text-center">
                    Clear Chat
                  </span>
                </div>
              </div>

            </div>

            {/* Text Input (Optional) */}
            <div className="flex gap-3">
              <Input
                placeholder="💬 Type a message or use voice..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={!selectedAgent || isLoading || selectedAgentData?.status !== 'running'}
                className="flex-1 cyber-input font-mono text-base"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || !selectedAgent || isLoading || selectedAgentData?.status !== 'running'}
                size="lg"
                className="neon-button font-bold px-6"
              >
                Send
              </Button>
            </div>

            {/* Conversation History */}
            <div className="cyber-card border-border/70 rounded-lg h-80 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 font-mono">
                  <Mic className="w-16 h-16 mx-auto mb-4 text-primary animate-float opacity-50" />
                  <p className="text-lg">Voice Conversation</p>
                  <p className="text-sm mt-2">Start speaking or type to begin your conversation</p>
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
                          ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border-neon-cyan/50 shadow-neon-cyan'
                          : 'bg-card/90 border-primary/40 shadow-lg'
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
                              speed={0}
                              className="text-sm leading-relaxed font-medium"
                            />
                          </div>
                        )}
                        {message.role === 'assistant' && typingMessageId !== message.id && selectedAgentData?.status === 'running' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudioResponse(message.content)}
                            disabled={isPlaying}
                            className="h-7 w-7 p-0 hover:bg-primary/20 transition-all"
                          >
                            <Volume2 className="w-4 h-4 text-neon-cyan" />
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
                      <span className="text-sm font-mono text-neon-cyan font-semibold">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
