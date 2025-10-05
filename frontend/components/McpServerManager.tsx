'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, Play, Square, Settings, Trash2 } from 'lucide-react'

interface McpServer {
  id: string
  name: string
  description: string
  command: string
  args: string[]
  env: Record<string, string>
  status: 'stopped' | 'running' | 'error'
}

export function McpServerManager() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newServer, setNewServer] = useState({
    name: '',
    description: '',
    command: '',
    args: '',
    env: '',
  })

  // Load servers from backend
  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers')
      if (response.ok) {
        const data = await response.json()
        setServers(data)
      }
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error)
    }
  }

  const handleCreateServer = async () => {
    try {
      const serverData = {
        ...newServer,
        args: newServer.args.split(',').map(arg => arg.trim()),
        env: newServer.env.split('\n').reduce((acc, line) => {
          const [key, value] = line.split('=')
          if (key && value) acc[key.trim()] = value.trim()
          return acc
        }, {} as Record<string, string>),
      }

      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewServer({ name: '', description: '', command: '', args: '', env: '' })
        fetchServers()
      }
    } catch (error) {
      console.error('Failed to create MCP server:', error)
    }
  }

  const handleStartServer = async (serverId: string) => {
    try {
      await fetch(`/api/mcp/servers/${serverId}/start`, { method: 'POST' })
      fetchServers()
    } catch (error) {
      console.error('Failed to start MCP server:', error)
    }
  }

  const handleStopServer = async (serverId: string) => {
    try {
      await fetch(`/api/mcp/servers/${serverId}/stop`, { method: 'POST' })
      fetchServers()
    } catch (error) {
      console.error('Failed to stop MCP server:', error)
    }
  }

  const handleDeleteServer = async (serverId: string) => {
    try {
      await fetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' })
      fetchServers()
    } catch (error) {
      console.error('Failed to delete MCP server:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500">Running</Badge>
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">MCP Servers</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-neon-cyan to-neon-purple text-black font-bold hover:scale-105 transition-all duration-300 shadow-neon-cyan">
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create MCP Server</DialogTitle>
              <DialogDescription>
                Configure a new Model Context Protocol server for your AI agents.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={newServer.name}
                  onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea
                  id="description"
                  value={newServer.description}
                  onChange={(e) => setNewServer(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="command" className="text-right">Command</Label>
                <Input
                  id="command"
                  value={newServer.command}
                  onChange={(e) => setNewServer(prev => ({ ...prev, command: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="args" className="text-right">Args</Label>
                <Input
                  id="args"
                  placeholder="arg1, arg2, arg3"
                  value={newServer.args}
                  onChange={(e) => setNewServer(prev => ({ ...prev, args: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="env" className="text-right">Environment</Label>
                <Textarea
                  id="env"
                  placeholder="KEY1=value1&#10;KEY2=value2"
                  value={newServer.env}
                  onChange={(e) => setNewServer(prev => ({ ...prev, env: e.target.value }))}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateServer}>Create Server</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {servers.map((server) => (
          <Card key={server.id} className="group hover:animate-float">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-mono text-neon-cyan">{server.name}</CardTitle>
                <CardDescription className="font-mono text-xs">// {server.description} //</CardDescription>
              </div>
              <div className="status-indicator">
                {getStatusBadge(server.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Command: {server.command}</p>
                  <p>Args: {server.args.join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  {server.status === 'stopped' ? (
                    <Button size="sm" className="bg-neon-green hover:bg-neon-green/80 text-black font-bold" onClick={() => handleStartServer(server.id)}>
                      <Play className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-neon-pink hover:bg-neon-pink/20" onClick={() => handleStopServer(server.id)}>
                      <Square className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="cyber">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" className="shadow-neon-pink" onClick={() => handleDeleteServer(server.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {servers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No MCP servers configured yet. Click "Add Server" to get started.
          </div>
        )}
      </div>
    </div>
  )
}

