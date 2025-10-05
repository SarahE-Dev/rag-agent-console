'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { McpServerManager } from '@/components/McpServerManager'
import { RagConfigurator } from '@/components/RagConfigurator'
import { AgentConfigurator } from '@/components/AgentConfigurator'
import { ChatInterface } from '@/components/ChatInterface'
import { VoiceChatInterface } from '@/components/VoiceChatInterface'
import { Settings, Server, Database, Bot, MessageSquare, Zap, Cpu, Brain } from 'lucide-react'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('mcp')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Add a small delay for the entrance animation
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const tabIcons = {
    mcp: <Server className="w-4 h-4 animate-pulse" />,
    rag: <Database className="w-4 h-4 animate-pulse" />,
    agents: <Bot className="w-4 h-4 animate-pulse" />,
    chat: <MessageSquare className="w-4 h-4 animate-pulse" />,
  }

  const tabTitles = {
    mcp: 'MCP Servers',
    rag: 'RAG Setup',
    agents: 'AI Agents',
    chat: 'Chat Test',
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="container mx-auto p-6 relative z-10">
        {/* Header */}
        <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center mb-6">
            <h1 className="text-6xl font-bold text-gradient mb-4 animate-float">
              <Zap className="inline w-12 h-12 mr-4 text-neon-cyan animate-glow" />
              AI Agent Configurator
              <Brain className="inline w-12 h-12 ml-4 text-neon-purple animate-glow" />
            </h1>
            <p className="text-muted-foreground text-xl font-mono">
              // Neural Network Configuration Terminal //
            </p>
            <div className="mt-4 h-1 w-3/4 mx-auto bg-gradient-to-r from-transparent via-neon-cyan via-neon-pink to-transparent rounded-full animate-pulse"></div>
          </div>

          <div className="flex justify-center gap-6 mb-6">
            <div className="cyber-card p-5 border border-neon-cyan/40 hover:border-neon-cyan/60 transition-all duration-300">
              <Cpu className="w-7 h-7 text-neon-cyan mx-auto mb-2 animate-pulse" />
              <div className="text-xs text-center font-mono text-neon-cyan font-semibold">SYSTEMS ONLINE</div>
            </div>
            <div className="cyber-card p-5 border border-neon-pink/40 hover:border-neon-pink/60 transition-all duration-300">
              <Zap className="w-7 h-7 text-neon-pink mx-auto mb-2 animate-pulse" />
              <div className="text-xs text-center font-mono text-neon-pink font-semibold">NEURAL LINK</div>
            </div>
            <div className="cyber-card p-5 border border-neon-purple/40 hover:border-neon-purple/60 transition-all duration-300">
              <Brain className="w-7 h-7 text-neon-purple mx-auto mb-2 animate-pulse" />
              <div className="text-xs text-center font-mono text-neon-purple font-semibold">AI MATRIX</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 cyber-card border-gradient">
              {Object.entries(tabTitles).map(([value, title]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="cyber-tab flex items-center gap-2 font-mono text-sm"
                >
                  {tabIcons[value as keyof typeof tabIcons]}
                  {title}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="mcp" className="mt-6 animate-slide-in-up">
              <Card className="cyber-card border-gradient">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                    <Server className="w-7 h-7 text-neon-cyan animate-glow" />
                    <span className="text-gradient">MCP Server Management</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/90 font-mono text-sm">
                    <span className="text-neon-cyan">//</span> Configure and manage Model Context Protocol servers <span className="text-neon-cyan">//</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <McpServerManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rag" className="mt-6 animate-slide-in-up">
              <Card className="cyber-card border-gradient">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                    <Database className="w-7 h-7 text-neon-purple animate-glow" />
                    <span className="text-gradient">RAG Configuration</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/90 font-mono text-sm">
                    <span className="text-neon-purple">//</span> Set up Retrieval-Augmented Generation pipelines <span className="text-neon-purple">//</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RagConfigurator />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agents" className="mt-6 animate-slide-in-up">
              <Card className="cyber-card border-gradient">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                    <Bot className="w-7 h-7 text-neon-pink animate-glow" />
                    <span className="text-gradient">AI Agent Configuration</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/90 font-mono text-sm">
                    <span className="text-neon-pink">//</span> Configure voice and chat agents with neural networks <span className="text-neon-pink">//</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AgentConfigurator />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="mt-6 animate-slide-in-up">
              <Card className="cyber-card border-gradient">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                    <MessageSquare className="w-7 h-7 text-neon-purple animate-glow" />
                    <span className="text-gradient">AI Agent Interfaces</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/90 font-mono text-sm">
                    <span className="text-neon-purple">//</span> Choose between voice and text conversation modes <span className="text-neon-purple">//</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="text" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Text Chat
                      </TabsTrigger>
                      <TabsTrigger value="voice" className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        Voice Chat
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text">
                      <ChatInterface />
                    </TabsContent>

                    <TabsContent value="voice">
                      <VoiceChatInterface />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className={`mt-12 text-center transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="border-gradient">
            <div className="bg-card p-6 rounded-md">
              <div className="flex items-center justify-center gap-6 text-sm font-mono">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-neon-cyan rounded-full shadow-neon-cyan"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-neon-cyan rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-neon-cyan font-semibold">NEURAL NETWORK ACTIVE</span>
                </div>
                <div className="h-4 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-neon-pink rounded-full shadow-neon-pink"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-neon-pink rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-neon-pink font-semibold">SYSTEM STATUS: OPERATIONAL</span>
                </div>
                <div className="h-4 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-neon-purple rounded-full shadow-neon-purple"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-neon-purple rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-neon-purple font-semibold">AI READY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

