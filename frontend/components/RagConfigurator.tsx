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
import { Plus, Database, Cpu, Settings, Play, Trash2, Edit, FileText, Globe, HardDrive, RotateCcw } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  type: 'file' | 'directory' | 'url' | 'database' | 'api'
  path?: string
  url?: string
  connectionString?: string
  apiKey?: string
  headers?: Record<string, string>
  status: 'configured' | 'processing' | 'ready' | 'error'
  documentCount?: number
  lastIndexed?: string
  createdAt: string
  updatedAt: string
}


interface VectorStore {
  id: string
  name: string
  provider: 'chromadb' | 'pinecone' | 'weaviate' | 'qdrant' | 'local'
  host?: string
  port?: number
  apiKey?: string
  indexName?: string
  status: 'configured' | 'ready' | 'error'
  vectorCount?: number
  createdAt: string
  updatedAt: string
}


export function RagConfigurator() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([])
  const [activeTab, setActiveTab] = useState('datasources')

  // Dialog states
  const [isDataSourceDialogOpen, setIsDataSourceDialogOpen] = useState(false)
  const [isVectorStoreDialogOpen, setIsVectorStoreDialogOpen] = useState(false)
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null)
  const [editingVectorStore, setEditingVectorStore] = useState<VectorStore | null>(null)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean
    item: DataSource | VectorStore | null
    type: 'datasource' | 'vectorstore' | null
  }>({ isOpen: false, item: null, type: null })

  // Form states
  const [newDataSource, setNewDataSource] = useState({
    name: '',
    type: 'file' as 'file' | 'directory' | 'url' | 'database' | 'api',
    path: '',
    url: '',
    connectionString: '',
    apiKey: '',
    headers: '',
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Loading states
  const [isCreatingDataSource, setIsCreatingDataSource] = useState(false)
  const [isCreatingVectorStore, setIsCreatingVectorStore] = useState(false)
  const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null)
  const [isUpdatingItem, setIsUpdatingItem] = useState<string | null>(null)
  const [processingDataSourceId, setProcessingDataSourceId] = useState<string | null>(null)

  const [newVectorStore, setNewVectorStore] = useState({
    name: '',
    provider: 'chromadb' as 'chromadb' | 'pinecone' | 'weaviate' | 'qdrant' | 'local',
    host: '',
    port: 8000,
    apiKey: '',
    indexName: '',
  })

  // Load data on component mount
  useEffect(() => {
    loadDataSources()
    loadVectorStores()
  }, [])

  // Listen for vector store creation events
  useEffect(() => {
    const handleVectorStoreCreated = () => {
      loadDataSources()
      loadVectorStores()
    }

    window.addEventListener('vectorStoreCreated', handleVectorStoreCreated)

    return () => {
      window.removeEventListener('vectorStoreCreated', handleVectorStoreCreated)
    }
  }, [])

  // Reset editing state when dialogs close
  useEffect(() => {
    if (!isDataSourceDialogOpen) {
      setEditingDataSource(null)
    }
  }, [isDataSourceDialogOpen])

  useEffect(() => {
    if (!isVectorStoreDialogOpen) {
      setEditingVectorStore(null)
    }
  }, [isVectorStoreDialogOpen])

  const loadDataSources = async () => {
    try {
      const response = await fetch('/api/rag/datasources')
      if (response.ok) {
        const data = await response.json()
        setDataSources(data)
      }
    } catch (error) {
      console.error('Failed to load data sources:', error)
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


  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }

  const handleCreateOrUpdateDataSource = async () => {
    if (!newDataSource.name.trim()) return

    setIsCreatingDataSource(true)
    let createdDataSourceId: string | null = null

    try {
      if ((newDataSource.type === 'file' || newDataSource.type === 'directory') && selectedFiles.length > 0) {
        // Upload files - this will auto-create data source and process it
        const result = await uploadFiles(selectedFiles, newDataSource.name, newDataSource.type)
        if (result && result.dataSource) {
          createdDataSourceId = result.dataSource.id
          setProcessingDataSourceId(createdDataSourceId)
        }
      } else {
        // Handle other data source types (URL, database, API)
        const data = {
          ...newDataSource,
          headers: newDataSource.headers ? JSON.parse(newDataSource.headers) : undefined,
        }

        const response = await fetch('/api/rag/datasources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error('Failed to save data source')
        }

        const result = await response.json()
        createdDataSourceId = result.id
        setProcessingDataSourceId(createdDataSourceId)
      }

      // Poll for processing completion
      if (createdDataSourceId) {
        await pollProcessingStatus(createdDataSourceId)
      }

      // Refresh the data after successful creation
      loadDataSources()
      loadVectorStores()

      // Success - close dialog and reset form
      setIsDataSourceDialogOpen(false)
      setEditingDataSource(null)
      setNewDataSource({
        name: '',
        type: 'file',
        path: '',
        url: '',
        connectionString: '',
        apiKey: '',
        headers: '',
      })
      setSelectedFiles([])
      setProcessingDataSourceId(null)

    } catch (error) {
      console.error('Failed to create/update data source:', error)
      setProcessingDataSourceId(null)
      // Keep dialog open on error
    } finally {
      setIsCreatingDataSource(false)
    }
  }

  const pollProcessingStatus = async (dataSourceId: string): Promise<void> => {
    const maxPolls = 60 // 60 seconds max
    let polls = 0

    while (polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Poll every second

      try {
        const response = await fetch('/api/rag/datasources')
        if (response.ok) {
          const dataSources = await response.json()
          const dataSource = dataSources.find((ds: any) => ds.id === dataSourceId)

          if (dataSource) {
            if (dataSource.status === 'ready') {
              // Success! Get the new vector store and notify other components
              const vectorStoresResponse = await fetch('/api/rag/vectorstores')
              if (vectorStoresResponse.ok) {
                const allVectorStores = await vectorStoresResponse.json()
                const newVectorStore = allVectorStores.find((vs: any) => vs.id === `datastore_${dataSourceId}`)

                if (newVectorStore) {
                  // Notify other components with the new vector store data
                  window.dispatchEvent(new CustomEvent('vectorStoreCreated', {
                    detail: { vectorStore: newVectorStore }
                  }))
                }
              }

              return
            } else if (dataSource.status === 'error') {
              throw new Error('Processing failed')
            }
            // Still processing, continue polling
          }
        }
      } catch (error) {
        console.error('Error polling status:', error)
        throw error
      }

      polls++
    }

    throw new Error('Processing timed out')
  }

  const uploadFiles = async (files: File[], dataSourceName: string, type: 'file' | 'directory') => {
    let lastResult: any = null

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', type === 'file' ? dataSourceName : `${dataSourceName}/${file.name}`)
      formData.append('type', type)

      const response = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to upload ${file.name}: ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      console.log(`Uploaded ${file.name}:`, result)
      lastResult = result
    }

    return lastResult
  }



  const handleCreateOrUpdateVectorStore = async () => {
    if (!newVectorStore.name.trim()) return

    setIsCreatingVectorStore(true)
    try {
      const method = editingVectorStore ? 'PUT' : 'POST'
      const url = editingVectorStore ? `/api/rag/vectorstores/${editingVectorStore.id}` : '/api/rag/vectorstores'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVectorStore),
      })

      if (response.ok) {
        setIsVectorStoreDialogOpen(false)
        setEditingVectorStore(null)
        setNewVectorStore({
          name: '',
          provider: 'chromadb',
          host: '',
          port: 8000,
          apiKey: '',
          indexName: '',
        })
        loadVectorStores()
      }
    } catch (error) {
      console.error('Failed to create/update vector store:', error)
    } finally {
      setIsCreatingVectorStore(false)
    }
  }

  const handleEditDataSource = (source: DataSource) => {
    setEditingDataSource(source)
    setNewDataSource({
      name: source.name,
      type: source.type,
      path: source.path || '',
      url: source.url || '',
      connectionString: source.connectionString || '',
      apiKey: source.apiKey || '',
      headers: source.headers ? JSON.stringify(source.headers, null, 2) : '',
    })
    setIsDataSourceDialogOpen(true)
  }

  const handleEditVectorStore = (store: VectorStore) => {
    setEditingVectorStore(store)
    setNewVectorStore({
      name: store.name,
      provider: store.provider,
      host: store.host || '',
      port: store.port || 8000,
      apiKey: store.apiKey || '',
      indexName: store.indexName || '',
    })
    setIsVectorStoreDialogOpen(true)
  }

  const handleDeleteItem = (item: DataSource | VectorStore, type: 'datasource' | 'vectorstore') => {
    setDeleteConfirmDialog({ isOpen: true, item, type })
  }

  const confirmDeleteItem = async () => {
    if (!deleteConfirmDialog.item || !deleteConfirmDialog.type) return

    setIsDeletingItem(deleteConfirmDialog.item.id)
    try {
      const endpoint = deleteConfirmDialog.type === 'datasource' ? 'datasources' : 'vectorstores'
      const response = await fetch(`/api/rag/${endpoint}/${deleteConfirmDialog.item.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadDataSources()
        loadVectorStores()
        setDeleteConfirmDialog({ isOpen: false, item: null, type: null })
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    } finally {
      setIsDeletingItem(null)
    }
  }



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-500">Ready</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-yellow-500">Processing</Badge>
      case 'configured':
        return <Badge variant="secondary">Configured</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDataSourceIcon = (type: string) => {
    switch (type) {
      case 'file':
      case 'directory':
        return <FileText className="w-4 h-4" />
      case 'url':
        return <Globe className="w-4 h-4" />
      case 'database':
      case 'api':
        return <HardDrive className="w-4 h-4" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="datasources" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Sources
          </TabsTrigger>
          <TabsTrigger value="vectorstores" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Vector Stores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datasources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Data Sources
                <Dialog open={isDataSourceDialogOpen} onOpenChange={setIsDataSourceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Source
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-[425px]"
                    onPointerDownOutside={!!processingDataSourceId ? (e) => e.preventDefault() : undefined}
                    onEscapeKeyDown={!!processingDataSourceId ? (e) => e.preventDefault() : undefined}
                  >
                    <DialogHeader>
                      <DialogTitle>
                        {editingDataSource ? 'Edit Data Source' : 'Create Data Source'}
                        {processingDataSourceId && (
                          <span className="ml-2 text-sm text-blue-400">(Processing...)</span>
                        )}
                      </DialogTitle>
                      <DialogDescription>
                        {editingDataSource
                          ? 'Update the configuration of your data source.'
                          : processingDataSourceId
                            ? 'Your data source is being processed. This dialog will close automatically when complete.'
                            : 'Configure a data source for your RAG pipeline.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ds-name" className="text-right">Name</Label>
                        <Input
                          id="ds-name"
                          value={newDataSource.name}
                          onChange={(e) => setNewDataSource(prev => ({ ...prev, name: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ds-type" className="text-right">Type</Label>
                        <Select value={newDataSource.type} onValueChange={(value: any) => setNewDataSource(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="file">File</SelectItem>
                            <SelectItem value="directory">Directory</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newDataSource.type === 'file' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="ds-file" className="text-right">File</Label>
                          <div className="col-span-3">
                            <Input
                              id="ds-file"
                              type="file"
                              multiple
                              accept=".txt,.pdf,.docx,.csv,.json,.md"
                              onChange={(e) => handleFileSelect(e.target.files)}
                              className="cursor-pointer"
                            />
                            {selectedFiles.length > 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Selected: {selectedFiles.map(f => f.name).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {newDataSource.type === 'directory' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="ds-directory" className="text-right">Directory</Label>
                          <div className="col-span-3">
                            <Input
                              id="ds-directory"
                              type="file"
                              onChange={(e) => handleFileSelect(e.target.files)}
                              className="cursor-pointer"
                            />
                            {selectedFiles.length > 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Selected: {selectedFiles.length} files in directory
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {newDataSource.type === 'url' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="ds-url" className="text-right">URL</Label>
                          <Input
                            id="ds-url"
                            value={newDataSource.url}
                            onChange={(e) => setNewDataSource(prev => ({ ...prev, url: e.target.value }))}
                            className="col-span-3"
                          />
                        </div>
                      )}
                      {(newDataSource.type === 'database' || newDataSource.type === 'api') && (
                        <>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ds-conn" className="text-right">Connection</Label>
                            <Input
                              id="ds-conn"
                              value={newDataSource.connectionString}
                              onChange={(e) => setNewDataSource(prev => ({ ...prev, connectionString: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ds-key" className="text-right">API Key</Label>
                            <Input
                              id="ds-key"
                              value={newDataSource.apiKey}
                              onChange={(e) => setNewDataSource(prev => ({ ...prev, apiKey: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateOrUpdateDataSource}
                        disabled={isCreatingDataSource || !!processingDataSourceId || !newDataSource.name.trim()}
                      >
                        {processingDataSourceId ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Processing data...
                          </>
                        ) : isCreatingDataSource ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            {editingDataSource ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingDataSource ? 'Update Source' : 'Create Source'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Upload files and documents to create vector stores. Each data source becomes a searchable knowledge base for your AI agents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {dataSources.map((source) => (
                  <Card key={source.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getDataSourceIcon(source.type)}
                          <div className="flex-1">
                            <h4 className="font-semibold">{source.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{source.type}</p>
                            {source.documentCount && (
                              <p className="text-xs text-muted-foreground">
                                {source.documentCount} chunks • {source.lastIndexed && `Indexed ${new Date(source.lastIndexed).toLocaleDateString()}`}
                              </p>
                            )}
                            {source.status === 'processing' && (
                              <p className="text-xs text-blue-400">
                                Processing embeddings...
                              </p>
                            )}
                            {source.status === 'ready' && (
                              <div>
                                <p className="text-xs text-green-400">
                                  ✓ Vector store ready ({source.documentCount || 0} chunks)
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID: datastore_{source.id.substring(0, 8)}...
                                </p>
                              </div>
                            )}
                            {source.status === 'error' && (
                              <p className="text-xs text-red-400">
                                ❌ Processing failed - check backend logs
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(source.status)}
                          {source.status === 'processing' && processingDataSourceId === source.id && (
                            <span className="text-xs text-blue-400">Processing...</span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditDataSource(source)}
                            disabled={source.status === 'processing' || processingDataSourceId === source.id}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem(source, 'datasource')}
                            disabled={isDeletingItem === source.id || source.status === 'processing' || processingDataSourceId === source.id}
                          >
                            {isDeletingItem === source.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {dataSources.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No data sources yet. Add files, directories, or documents to provide AI context.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="vectorstores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Vector Stores
                <Dialog open={isVectorStoreDialogOpen} onOpenChange={setIsVectorStoreDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Store
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{editingVectorStore ? 'Edit Vector Store' : 'Create Vector Store'}</DialogTitle>
                      <DialogDescription>
                        {editingVectorStore
                          ? 'Update the configuration of your vector store.'
                          : 'Configure a vector database for storing embeddings.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vs-name" className="text-right">Name</Label>
                        <Input
                          id="vs-name"
                          value={newVectorStore.name}
                          onChange={(e) => setNewVectorStore(prev => ({ ...prev, name: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vs-provider" className="text-right">Provider</Label>
                        <Select value={newVectorStore.provider} onValueChange={(value: any) => setNewVectorStore(prev => ({ ...prev, provider: value }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chromadb">ChromaDB</SelectItem>
                            <SelectItem value="pinecone">Pinecone</SelectItem>
                            <SelectItem value="weaviate">Weaviate</SelectItem>
                            <SelectItem value="qdrant">Qdrant</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vs-host" className="text-right">Host</Label>
                        <Input
                          id="vs-host"
                          value={newVectorStore.host}
                          onChange={(e) => setNewVectorStore(prev => ({ ...prev, host: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vs-port" className="text-right">Port</Label>
                        <Input
                          id="vs-port"
                          type="number"
                          value={newVectorStore.port}
                          onChange={(e) => setNewVectorStore(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vs-key" className="text-right">API Key</Label>
                        <Input
                          id="vs-key"
                          value={newVectorStore.apiKey}
                          onChange={(e) => setNewVectorStore(prev => ({ ...prev, apiKey: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateOrUpdateVectorStore}
                        disabled={isCreatingVectorStore || !newVectorStore.name.trim()}
                      >
                        {isCreatingVectorStore ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            {editingVectorStore ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingVectorStore ? 'Update Store' : 'Create Store'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                View and manage vector stores created from your data sources. Agents select specific vector stores to access relevant information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {vectorStores.map((store) => (
                  <Card key={store.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{store.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{store.provider}</p>
                          {store.vectorCount && (
                            <p className="text-xs text-muted-foreground">{store.vectorCount} vectors</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(store.status)}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditVectorStore(store)}
                            disabled={isDeletingItem === store.id}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem(store, 'vectorstore')}
                            disabled={isDeletingItem === store.id}
                          >
                            {isDeletingItem === store.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {vectorStores.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No additional vector stores. The default ChromaDB store is automatically available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Delete Confirmation Dialog */}
    <Dialog
      open={deleteConfirmDialog.isOpen}
      onOpenChange={(open) => setDeleteConfirmDialog({ isOpen: open, item: null, type: null })}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <Trash2 className="w-5 h-5" />
            Delete {deleteConfirmDialog.type === 'datasource' ? 'Data Source' : 'Vector Store'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This action cannot be undone. This will permanently delete the{' '}
            {deleteConfirmDialog.type === 'datasource' ? 'data source' : 'vector store'}{' '}
            and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        {deleteConfirmDialog.item && (
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                {deleteConfirmDialog.type === 'datasource' ? (
                  <FileText className="w-5 h-5 text-blue-500" />
                ) : (
                  <Database className="w-5 h-5 text-purple-500" />
                )}
                <div>
                  <p className="font-semibold text-foreground">{deleteConfirmDialog.item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {deleteConfirmDialog.type === 'datasource'
                      ? `Type: ${(deleteConfirmDialog.item as DataSource).type}`
                      : `Provider: ${(deleteConfirmDialog.item as VectorStore).provider}`
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400 font-medium">
                ⚠️ Warning: {deleteConfirmDialog.type === 'datasource'
                  ? 'All associated vector stores and embeddings will be deleted.'
                  : 'All stored vectors and search capabilities will be lost.'
                }
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmDialog({ isOpen: false, item: null, type: null })}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteItem}
            disabled={isDeletingItem !== null}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeletingItem ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {deleteConfirmDialog.type === 'datasource' ? 'Data Source' : 'Vector Store'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  )
}

