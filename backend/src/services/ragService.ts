import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import * as path from 'path'
const pdf = require('pdf-parse')
import mammoth from 'mammoth'
import { OpenAIEmbeddings } from '@langchain/openai'
import { ChromaClient, Collection } from 'chromadb'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

export interface DataSource {
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
  lastIndexed?: Date
  createdAt: Date
  updatedAt: Date
}


export interface VectorStore {
  id: string
  name: string
  provider: 'chromadb' | 'pinecone' | 'weaviate' | 'qdrant' | 'local'
  host?: string
  port?: number
  apiKey?: string
  indexName?: string
  status: 'configured' | 'ready' | 'error'
  vectorCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface RagPipeline {
  id: string
  name: string
  description: string
  dataSources: string[] // IDs of data sources
  vectorStore: string // ID of vector store
  chunkSize: number
  chunkOverlap: number
  status: 'configured' | 'processing' | 'ready' | 'error'
  documentCount?: number
  lastProcessed?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  content: string
  metadata: any
}

// Singleton pattern for RagService
let ragServiceInstance: RagService | null = null

export class RagService {
  private dataSources: Map<string, DataSource> = new Map()
  private vectorStores: Map<string, VectorStore> = new Map()
  private pipelines: Map<string, RagPipeline> = new Map()
  private chromaClient: ChromaClient
  private embeddings: OpenAIEmbeddings | null = null
  private databaseService: any

  constructor(databaseService: any) {
    this.databaseService = databaseService
    this.chromaClient = new ChromaClient({
      host: 'localhost',
      port: 8000
    })
  }

  // Singleton getter
  static getInstance(databaseService?: any): RagService {
    if (!ragServiceInstance) {
      if (!databaseService) {
        throw new Error('DatabaseService required for RagService initialization')
      }
      ragServiceInstance = new RagService(databaseService)
      // Initialize with existing data from database
      ragServiceInstance.initializeFromDatabase()
    }
    return ragServiceInstance
  }

  private async initializeFromDatabase() {
    try {
      // Load existing data sources from database
      const dataSources = await this.loadDataSourcesFromDatabase()
      for (const source of dataSources) {
        this.dataSources.set(source.id, source)

        // If data source is ready, recreate its vector store
        if (source.status === 'ready') {
          const vectorStoreId = `datastore_${source.id}`
          const vectorStore: VectorStore = {
            id: vectorStoreId,
            name: source.name,
            provider: 'chromadb',
            host: 'localhost',
            port: 8000,
            status: 'ready', // Assume ready if data source is ready
            vectorCount: source.documentCount || 0,
            createdAt: source.createdAt,
            updatedAt: source.updatedAt,
          }
          this.vectorStores.set(vectorStoreId, vectorStore)
          console.log(`📦 Restored vector store ${vectorStoreId} for data source ${source.name}`)
        }
      }

      console.log(`🚀 RagService initialized with ${this.dataSources.size} data sources and ${this.vectorStores.size} vector stores`)
    } catch (error) {
      console.error('Failed to initialize RagService from database:', error)
    }
  }

  private async loadDataSourcesFromDatabase(): Promise<DataSource[]> {
    try {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      const dbSources = await prisma.ragDataSource.findMany()
      await prisma.$disconnect()

      return dbSources.map((source: any) => ({
        id: source.id,
        name: source.name,
        type: source.type as 'file' | 'directory' | 'url' | 'database' | 'api',
        path: source.path || undefined,
        url: source.url || undefined,
        connectionString: source.connectionString || undefined,
        apiKey: source.apiKey || undefined,
        headers: source.headers as Record<string, string> || undefined,
        status: source.status as 'configured' | 'processing' | 'ready' | 'error',
        documentCount: source.documentCount || undefined,
        lastIndexed: source.lastIndexed || undefined,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      }))
    } catch (error) {
      console.error('Failed to load data sources from database:', error)
      return []
    }
  }


  private getEmbeddings(): OpenAIEmbeddings {
    if (!this.embeddings) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.')
      }
      this.embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey })
    }
    return this.embeddings
  }

  // Data Sources
  async createDataSource(data: Omit<DataSource, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<DataSource> {
    const id = uuidv4()
    const dataSource: DataSource = {
      id,
      ...data,
      status: 'configured',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to database
    try {
      await this.databaseService.createRagDataSource({
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        path: dataSource.path,
        url: dataSource.url,
        connectionString: dataSource.connectionString,
        apiKey: dataSource.apiKey,
        headers: dataSource.headers,
        status: dataSource.status,
        documentCount: dataSource.documentCount,
        lastIndexed: dataSource.lastIndexed,
        createdAt: dataSource.createdAt,
        updatedAt: dataSource.updatedAt,
      })
    } catch (error) {
      console.error('Failed to save data source to database:', error)
      throw error
    }

    this.dataSources.set(id, dataSource)

    // Auto-process the data source immediately (async, don't block response)
    setTimeout(() => this.autoProcessDataSource(id), 100)

    return dataSource
  }

  private async autoProcessDataSource(sourceId: string) {
    try {
      const source = this.dataSources.get(sourceId)
      if (!source || source.status === 'ready') return

      source.status = 'processing'
      source.updatedAt = new Date()

      // Create a vector store for this data source
      const vectorStoreId = `datastore_${sourceId}`
      const vectorStore: VectorStore = {
        id: vectorStoreId,
        name: source.name,
        provider: 'chromadb',
        host: 'localhost',
        port: 8000,
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.vectorStores.set(vectorStoreId, vectorStore)

      // Load and process the data
      console.log(`🔄 Processing data source "${source.name}"...`)
      const documents = await this.loadDocuments([sourceId])
      console.log(`   📄 Loaded ${documents.length} documents from ${source.path}`)

      const chunks = await this.chunkDocuments(documents)
      console.log(`   ✂️  Created ${chunks.length} text chunks for embedding`)

      const embeddings = await this.generateEmbeddings(chunks)
      console.log(`   🧠 Generated ${embeddings.length} embeddings using OpenAI`)

      // Store in the data source's vector store
      await this.storeEmbeddings(embeddings, vectorStoreId)

      // Update source status
      source.status = 'ready'
      source.documentCount = chunks.length
      source.lastIndexed = new Date()
      source.updatedAt = new Date()

      // Save updated data source to database
      try {
        await this.databaseService.updateRagDataSource(source.id, {
          status: source.status,
          documentCount: source.documentCount,
          lastIndexed: source.lastIndexed,
          updatedAt: source.updatedAt,
        })
      } catch (error) {
        console.error('Failed to update data source in database:', error)
      }

      console.log(`✅ SUCCESS: Data source "${source.name}" processed!`)
      console.log(`   - Vector Store ID: ${vectorStoreId}`)
      console.log(`   - Chunks created: ${chunks.length}`)
      console.log(`   - Embeddings generated: ${embeddings.length}`)
      console.log(`   - ChromaDB collection: rag_${vectorStoreId}`)

    } catch (error) {
      const source = this.dataSources.get(sourceId)
      if (source) {
        source.status = 'error'
        source.updatedAt = new Date()

        // Save error status to database
        try {
          await this.databaseService.updateRagDataSource(source.id, {
            status: source.status,
            updatedAt: source.updatedAt,
          })
        } catch (dbError) {
          console.error('Failed to update data source error status in database:', dbError)
        }
      }
      console.error(`Failed to auto-process data source ${sourceId}:`, error)
    }
  }

  async retryDataSourceProcessing(sourceId: string): Promise<boolean> {
    const source = this.dataSources.get(sourceId)
    if (!source) return false

    // Reset status to configured so it will be processed again
    source.status = 'configured'
    source.updatedAt = new Date()

    // Trigger auto-processing
    setTimeout(() => this.autoProcessDataSource(sourceId), 100)

    return true
  }

  getDataSource(id: string): DataSource | null {
    return this.dataSources.get(id) || null
  }

  getVectorStore(id: string): VectorStore | null {
    return this.vectorStores.get(id) || null
  }

  getChromaClient(): ChromaClient {
    return this.chromaClient
  }

  async getDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSources.values())
  }

  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource | null> {
    const dataSource = this.dataSources.get(id)
    if (!dataSource) return null

    const updated = { ...dataSource, ...updates, updatedAt: new Date() }
    this.dataSources.set(id, updated)
    return updated
  }

  async deleteDataSource(id: string): Promise<boolean> {
    return this.dataSources.delete(id)
  }


  // Vector Stores
  async createVectorStore(data: Omit<VectorStore, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<VectorStore> {
    const id = uuidv4()
    const store: VectorStore = {
      id,
      ...data,
      status: 'configured',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.vectorStores.set(id, store)
    return store
  }

  async getVectorStores(): Promise<VectorStore[]> {
    return Array.from(this.vectorStores.values())
  }

  async updateVectorStore(id: string, updates: Partial<VectorStore>): Promise<VectorStore | null> {
    const store = this.vectorStores.get(id)
    if (!store) return null

    const updated = { ...store, ...updates, updatedAt: new Date() }
    this.vectorStores.set(id, updated)
    return updated
  }

  async deleteVectorStore(id: string): Promise<boolean> {
    return this.vectorStores.delete(id)
  }


  // Document Processing Methods
  private async loadDocuments(dataSourceIds: string[]): Promise<Document[]> {
    const documents: Document[] = []

    for (const dataSourceId of dataSourceIds) {
      const dataSource = this.dataSources.get(dataSourceId)
      if (!dataSource) continue

      try {
        switch (dataSource.type) {
          case 'file':
            if (dataSource.path) {
              const content = await this.loadFile(dataSource.path)
              documents.push({
                id: uuidv4(),
                content,
                metadata: {
                  source: dataSource.path,
                  dataSourceId,
                  type: 'file'
                }
              })
            }
            break
          case 'directory':
            if (dataSource.path) {
              const files = await this.loadDirectory(dataSource.path)
              for (const file of files) {
                const content = await this.loadFile(file)
                documents.push({
                  id: uuidv4(),
                  content,
                  metadata: {
                    source: file,
                    dataSourceId,
                    type: 'file'
                  }
                })
              }
            }
            break
          // TODO: Implement URL, database, and API data sources
          default:
            console.log(`Data source type ${dataSource.type} not yet implemented`)
        }
      } catch (error) {
        console.error(`Failed to load data source ${dataSourceId}:`, error)
      }
    }

    return documents
  }

  private async loadFile(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase()

    switch (ext) {
      case '.txt':
        return fs.readFileSync(filePath, 'utf-8')
      case '.pdf':
        const pdfBuffer = fs.readFileSync(filePath)
        const pdfData = await pdf(pdfBuffer)
        return pdfData.text
      case '.docx':
        const docxBuffer = fs.readFileSync(filePath)
        const docxResult = await mammoth.extractRawText({ buffer: docxBuffer })
        return docxResult.value
      case '.csv':
        return await this.parseCSV(filePath)
      case '.json':
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return this.flattenJSON(jsonData, path.basename(filePath))
      case '.md':
        return fs.readFileSync(filePath, 'utf-8')
      default:
        throw new Error(`Unsupported file type: ${ext}`)
    }
  }

  private async loadDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // Recursively load subdirectories
        files.push(...await this.loadDirectory(fullPath))
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath).toLowerCase()
        if (['.txt', '.pdf', '.docx', '.csv', '.json', '.md'].includes(ext)) {
          files.push(fullPath)
        }
      }
    }

    return files
  }

  private async parseCSV(filePath: string): Promise<string> {
    const csv = require('csv-parser')
    const fs = require('fs')
    const results: any[] = []

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          // Convert CSV data to readable text format
          const text = results.map((row, index) =>
            `Row ${index + 1}: ${Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')}`
          ).join('\n')
          resolve(text)
        })
        .on('error', reject)
    })
  }

  private flattenJSON(obj: any, filename: string, prefix = ''): string {
    const parts: string[] = []

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        parts.push(this.flattenJSON(value, filename, newKey))
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            parts.push(this.flattenJSON(item, filename, `${newKey}[${index}]`))
          } else {
            parts.push(`${newKey}[${index}]: ${item}`)
          }
        })
      } else {
        parts.push(`${newKey}: ${value}`)
      }
    }

    return parts.join('\n')
  }

  private async chunkDocuments(documents: Document[]): Promise<Document[]> {
    const chunks: Document[] = []

    for (const doc of documents) {
      const docChunks = await this.smartChunkDocument(doc)
      chunks.push(...docChunks)
    }

    return chunks
  }

  private async smartChunkDocument(doc: Document): Promise<Document[]> {
    const chunks: Document[] = []
    const content = doc.content
    const ext = doc.metadata.source ? path.extname(doc.metadata.source).toLowerCase() : ''

    // Different chunking strategies based on file type
    if (ext === '.csv') {
      // For CSV, try to keep related rows together
      const lines = content.split('\n')
      const chunkSize = 10 // 10 rows per chunk
      for (let i = 0; i < lines.length; i += chunkSize) {
        const chunkLines = lines.slice(i, i + chunkSize)
        chunks.push({
          id: uuidv4(),
          content: chunkLines.join('\n'),
          metadata: {
            ...doc.metadata,
            parentId: doc.id,
            chunkType: 'csv_rows',
            startRow: i,
            endRow: Math.min(i + chunkSize - 1, lines.length - 1)
          }
        })
      }
    } else if (ext === '.json') {
      // For JSON, try to preserve object structure
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800, // Smaller chunks for structured data
        chunkOverlap: 100,
        separators: ['\n', '.', ' ', '']
      })
      const splitDocs = await textSplitter.splitText(content)
      for (const chunk of splitDocs) {
        chunks.push({
          id: uuidv4(),
          content: chunk,
          metadata: {
            ...doc.metadata,
            parentId: doc.id,
            chunkType: 'json_properties'
          }
        })
      }
    } else {
      // Default chunking for text documents
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '.', ' ', '']
      })
      const splitDocs = await textSplitter.splitText(content)
      for (const chunk of splitDocs) {
        chunks.push({
          id: uuidv4(),
          content: chunk,
          metadata: {
            ...doc.metadata,
            parentId: doc.id,
            chunkType: 'text_paragraphs'
          }
        })
      }
    }

    return chunks
  }

  private async generateEmbeddings(chunks: Document[]): Promise<Array<{ id: string; embedding: number[]; metadata: any; content: string }>> {
    if (chunks.length === 0) return []

    const embeddings = this.getEmbeddings()
    const results: Array<{ id: string; embedding: number[]; metadata: any; content: string }> = []

    // Optimized batch processing with retry logic
    const batchSize = 50 // Increased batch size for better efficiency
    const maxRetries = 3

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const texts = batch.map(chunk => chunk.content)

      let retryCount = 0
      let success = false

      while (retryCount < maxRetries && !success) {
        try {
          const vectors = await embeddings.embedDocuments(texts)

          for (let j = 0; j < batch.length; j++) {
            results.push({
              id: batch[j].id,
              embedding: vectors[j],
              metadata: batch[j].metadata,
              content: batch[j].content
            })
          }
          success = true
        } catch (error) {
          retryCount++
          console.warn(`Embedding batch ${i / batchSize + 1} failed (attempt ${retryCount}/${maxRetries}):`, error)

          if (retryCount < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          }
        }
      }

      if (!success) {
        console.error(`Failed to embed batch ${i / batchSize + 1} after ${maxRetries} attempts`)
      }
    }

    console.log(`Generated ${results.length}/${chunks.length} embeddings successfully`)
    return results
  }

  private async storeEmbeddings(embeddings: Array<{ id: string; embedding: number[]; metadata: any; content: string }>, vectorStoreId: string): Promise<void> {
    const vectorStore = this.vectorStores.get(vectorStoreId)
    if (!vectorStore || vectorStore.status !== 'ready') {
      throw new Error('Vector store not ready')
    }

    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name: `rag_${vectorStoreId}`
      })

      // Prepare data for ChromaDB
      const ids = embeddings.map(e => e.id)
      const documents = embeddings.map(e => e.content)
      const vectors = embeddings.map(e => e.embedding)
      const metadatas = embeddings.map(e => e.metadata)

      await collection.add({
        ids,
        documents,
        embeddings: vectors,
        metadatas
      })

      // Update vector count in the vector store
      vectorStore.vectorCount = embeddings.length
      vectorStore.updatedAt = new Date()

      console.log(`Stored ${embeddings.length} embeddings in vector store ${vectorStoreId}`)
    } catch (error) {
      console.error('Failed to store embeddings:', error)
      throw error
    }
  }

  async peekCollection(vectorStoreId: string): Promise<any> {
    try {
      const collection = await this.chromaClient.getCollection({
        name: `rag_${vectorStoreId}`
      })

      const count = await collection.count()
      console.log(`🔍 Peeking collection "rag_${vectorStoreId}": ${count} documents`)

      if (count > 0) {
        // Get first few documents
        const result = await collection.get({
          limit: 3,
          include: ['documents', 'metadatas']
        })

        console.log(`📄 Sample documents:`)
        if (result.documents) {
          result.documents.forEach((doc, i) => {
            if (doc !== null) {
              console.log(`  ${i+1}: ${String(doc).substring(0, 150)}...`)
            } else {
              console.log(`  ${i+1}: (null document)`)
            }
          })
        }

        if (result.metadatas) {
          console.log(`📊 Sample metadata:`)
          result.metadatas.forEach((meta, i) => {
            console.log(`  ${i+1}: ${JSON.stringify(meta).substring(0, 100)}...`)
          })
        }

        return {
          count,
          documents: result.documents,
          metadatas: result.metadatas
        }
      }

      return { count, documents: [], metadatas: [] }
    } catch (error) {
      console.error(`Failed to peek collection rag_${vectorStoreId}:`, error)
      throw error
    }
  }

  // Fuzzy string matching for transcription errors
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Check if query contains potential transcription errors for names
  private findPotentialNameMatches(query: string, documents: string[]): Array<{doc: string, score: number, index: number}> {
    const queryLower = query.toLowerCase()
    const matches: Array<{doc: string, score: number, index: number}> = []

    // Common name transcription errors
    const nameReplacements: { [key: string]: string[] } = {
      'chen': ['chin', 'chan', 'cheng', 'chine'],
      'zhang': ['chang', 'zhang', 'zhan'],
      'wang': ['wang', 'wong', 'wahng'],
      'li': ['lee', 'li', 'ly'],
      'liu': ['liu', 'lew', 'loo'],
      'yang': ['yang', 'yong', 'yaang'],
      'huang': ['huang', 'hwang', 'wahng'],
      'zhou': ['zhou', 'joe', 'jou'],
      'wu': ['wu', 'woo', 'woo'],
      'xu': ['xu', 'shu', 'su'],
      'sun': ['sun', 'soon', 'son'],
      'ma': ['ma', 'mah', 'mar'],
      'hu': ['hu', 'who', 'hoo'],
      'guo': ['guo', 'goo', 'gwo'],
      'lin': ['lin', 'lynn', 'leen'],
      'he': ['he', 'her', 'hee'],
      'gao': ['gao', 'gow', 'gau'],
      'zheng': ['zheng', 'jung', 'jung'],
      'shi': ['shi', 'she', 'shee'],
      'perez': ['perez', 'peres', 'perez'],
      'garcia': ['garcia', 'garsha', 'garcia'],
      'rodriguez': ['rodriguez', 'rodriques', 'rodriges'],
      'gonzalez': ['gonzalez', 'gonzales', 'gonzalez'],
      'lopez': ['lopez', 'lopes', 'lopez'],
      'martinez': ['martinez', 'martines', 'martinez'],
      'sanchez': ['sanchez', 'sanches', 'sanchez'],
      'ramirez': ['ramirez', 'ramires', 'ramirez'],
      'torres': ['torres', 'tores', 'torres'],
      'flores': ['flores', 'floress', 'flores'],
      'rivera': ['rivera', 'riviera', 'rivera'],
      'gomez': ['gomez', 'gomes', 'gomez'],
      'diaz': ['diaz', 'dias', 'diaz'],
      'morales': ['morales', 'moralez', 'morales'],
      'ortiz': ['ortiz', 'ortis', 'ortiz'],
      'gutierrez': ['gutierrez', 'gutieres', 'gutierrez'],
      'chavez': ['chavez', 'chaves', 'chavez'],
      'ramos': ['ramos', 'ramoss', 'ramos'],
      'hernandez': ['hernandez', 'ernandez', 'hernandez'],
      'jimenez': ['jimenez', 'jimines', 'jimenez'],
      'mendoza': ['mendoza', 'mendosa', 'mendoza'],
      'ruiz': ['ruiz', 'ruez', 'ruiz'],
      'aguilar': ['aguilar', 'aguillar', 'aguilar'],
      'medina': ['medina', 'medinah', 'medina'],
      'castillo': ['castillo', 'castiloo', 'castillo'],
      'santiago': ['santiago', 'santiango', 'santiago']
    }

    documents.forEach((doc, index) => {
      const docLower = doc.toLowerCase()
      let bestScore = 0

      // Check for fuzzy name matches
      for (const [correct, variations] of Object.entries(nameReplacements)) {
        const allVariants = [correct, ...variations]

        for (const variant of allVariants) {
          if (queryLower.includes(variant)) {
            // If query contains a name variant, check if doc contains the correct version
            for (const correctVariant of allVariants) {
              if (docLower.includes(correctVariant)) {
                // Calculate fuzzy match score based on edit distance
                const distance = this.levenshteinDistance(variant, correctVariant)
                const maxLength = Math.max(variant.length, correctVariant.length)
                const score = 1 - (distance / maxLength) // Higher score = better match

                if (score > 0.6 && score > bestScore) { // Threshold for good matches
                  bestScore = score
                }
              }
            }
          }
        }
      }

      // Also check for direct fuzzy matching of the entire query
      const distance = this.levenshteinDistance(queryLower, docLower.substring(0, Math.min(100, docLower.length)))
      const maxLength = Math.max(queryLower.length, docLower.substring(0, 100).length)
      const fuzzyScore = 1 - (distance / maxLength)

      if (fuzzyScore > 0.7) { // Very close match
        bestScore = Math.max(bestScore, fuzzyScore)
      }

      if (bestScore > 0.5) {
        matches.push({ doc, score: bestScore, index })
      }
    })

    return matches.sort((a, b) => b.score - a.score) // Sort by score descending
  }

  async retrieveContext(query: string, vectorStoreId: string): Promise<Array<{content: string, source: string, dataSourceId: string}>> {
    try {
      const vectorStore = this.vectorStores.get(vectorStoreId)
      if (!vectorStore || vectorStore.status !== 'ready') {
        console.warn(`Vector store ${vectorStoreId} not found or not ready`)
        return []
      }

      const collection = await this.chromaClient.getCollection({
        name: `rag_${vectorStoreId}`
      })

      // Check collection count
      const count = await collection.count()
      console.log(`📚 Collection "${`rag_${vectorStoreId}`}" contains ${count} documents`)

      const embeddings = this.getEmbeddings()
      const queryEmbedding = await embeddings.embedQuery(query)

      // First try semantic search
      const semanticResults = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5, // Get more results for filtering
        include: ['documents', 'metadatas', 'distances']
      })

      console.log(`🔍 Query embedding generated for "${query}"`)
      console.log(`📊 Semantic search got ${semanticResults.documents?.[0]?.length || 0} results`)

      let contexts: Array<{content: string, source: string, dataSourceId: string}> = []

      // Process semantic results
      if (semanticResults.documents && semanticResults.documents[0] && semanticResults.metadatas && semanticResults.metadatas[0]) {
        for (let i = 0; i < semanticResults.documents[0].length; i++) {
          const doc = semanticResults.documents[0][i]
          const metadata = semanticResults.metadatas[0][i]
          const distance = semanticResults.distances?.[0]?.[i]

          if (typeof doc === 'string' && metadata && (distance === null || distance < 0.8)) { // Filter out very dissimilar results
            contexts.push({
              content: doc,
              source: String(metadata.source || 'Unknown source'),
              dataSourceId: String(metadata.dataSourceId || vectorStoreId)
            })
          }
        }
      }

      // If semantic search didn't return good results, try fuzzy matching
      if (contexts.length === 0) {
        console.log(`🔍 Semantic search returned no results, trying fuzzy matching...`)

        // Get all documents from the collection for fuzzy matching
        const allDocs = await collection.get({
          limit: 100, // Limit to prevent excessive processing
          include: ['documents', 'metadatas']
        })

        if (allDocs.documents) {
          const docStrings = allDocs.documents.filter((d): d is string => typeof d === 'string')
          const fuzzyMatches = this.findPotentialNameMatches(query, docStrings)

          console.log(`🎯 Found ${fuzzyMatches.length} fuzzy matches for "${query}"`)

          for (const match of fuzzyMatches.slice(0, 3)) { // Take top 3 fuzzy matches
            const metadata = allDocs.metadatas?.[match.index]
            if (metadata) {
              contexts.push({
                content: match.doc,
                source: String(metadata.source || 'Unknown source'),
                dataSourceId: String(metadata.dataSourceId || vectorStoreId)
              })
              console.log(`🎯 Fuzzy match: "${match.doc.substring(0, 100)}..." (score: ${match.score.toFixed(2)})`)
            }
          }
        }
      }

      if (semanticResults.distances && semanticResults.distances[0]) {
        console.log(`📏 Semantic distances: ${semanticResults.distances[0].filter((d): d is number => d !== null).map((d: number) => d.toFixed(4)).join(', ')}`)
      }

      console.log(`📄 Retrieved ${contexts.length} context chunks from vector store ${vectorStoreId} (${vectorStore.name})`)
      return contexts
    } catch (error) {
      console.error(`Failed to retrieve context from vector store ${vectorStoreId}:`, error)
      return []
    }
  }
}
