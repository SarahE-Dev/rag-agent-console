import { Router } from 'express'
import { RagService } from '../services/ragService'
import { DatabaseService } from '../services/databaseService'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()
const dbService = new DatabaseService()
const ragService = RagService.getInstance(dbService)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.docx', '.csv', '.json', '.md']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${ext} not supported`))
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// Data Sources
router.get('/datasources', async (req, res) => {
  try {
    const dataSources = await ragService.getDataSources()
    res.json(dataSources)
  } catch (error) {
    console.error('Error fetching data sources:', error)
    res.status(500).json({ error: 'Failed to fetch data sources' })
  }
})

// GET /api/rag/vectorstores/:id/peek - Debug endpoint to peek at vector store contents
router.get('/vectorstores/:id/peek', async (req, res) => {
  try {
    const { id } = req.params
    const data = await ragService.peekCollection(id)
    res.json(data)
  } catch (error) {
    console.error('Error peeking vector store:', error)
    res.status(500).json({ error: 'Failed to peek vector store' })
  }
})

router.post('/datasources', async (req, res) => {
  try {
    const dataSource = await ragService.createDataSource(req.body)
    res.status(201).json(dataSource)
  } catch (error) {
    console.error('Error creating data source:', error)
    res.status(500).json({ error: 'Failed to create data source' })
  }
})

router.get('/datasources/:id', async (req, res) => {
  try {
    const dataSource = await ragService.getDataSource(req.params.id)
    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' })
    }
    res.json(dataSource)
  } catch (error) {
    console.error('Error fetching data source:', error)
    res.status(500).json({ error: 'Failed to fetch data source' })
  }
})

router.put('/datasources/:id', async (req, res) => {
  try {
    const dataSource = await ragService.updateDataSource(req.params.id, req.body)
    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' })
    }
    res.json(dataSource)
  } catch (error) {
    console.error('Error updating data source:', error)
    res.status(500).json({ error: 'Failed to update data source' })
  }
})

// PUT /api/rag/datasources/:id - Update data source
router.put('/datasources/:id', async (req, res) => {
  try {
    const dataSource = await ragService.updateDataSource(req.params.id, req.body)
    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' })
    }
    res.json(dataSource)
  } catch (error) {
    console.error('Error updating data source:', error)
    res.status(500).json({ error: 'Failed to update data source' })
  }
})

router.delete('/datasources/:id', async (req, res) => {
  try {
    const success = await ragService.deleteDataSource(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Data source not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting data source:', error)
    res.status(500).json({ error: 'Failed to delete data source' })
  }
})

// POST /api/rag/datasources/:id/retry - Retry processing a data source
router.post('/datasources/:id/retry', async (req, res) => {
  try {
    const success = await ragService.retryDataSourceProcessing(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Data source not found' })
    }
    res.json({ message: 'Data source processing retried' })
  } catch (error) {
    console.error('Failed to retry data source processing:', error)
    res.status(500).json({ error: 'Failed to retry data source processing' })
  }
})

// GET /api/rag/vectorstores/:id/stats - Get vector store statistics
router.get('/vectorstores/:id/stats', async (req, res) => {
  try {
    const vectorStore = ragService.getVectorStore(req.params.id)
    if (!vectorStore) {
      return res.status(404).json({ error: 'Vector store not found' })
    }

    // Try to get actual count from ChromaDB
    try {
      const collection = await ragService.getChromaClient().getCollection({
        name: `rag_${req.params.id}`
      })
      const count = await collection.count()
      vectorStore.vectorCount = count
    } catch (error) {
      console.warn('Could not get vector count from ChromaDB:', error)
    }

    res.json({
      id: vectorStore.id,
      name: vectorStore.name,
      status: vectorStore.status,
      vectorCount: vectorStore.vectorCount || 0,
      createdAt: vectorStore.createdAt,
      updatedAt: vectorStore.updatedAt
    })
  } catch (error) {
    console.error('Failed to get vector store stats:', error)
    res.status(500).json({ error: 'Failed to get vector store stats' })
  }
})


// Vector Stores
router.get('/vectorstores', async (req, res) => {
  try {
    const stores = await ragService.getVectorStores()
    res.json(stores)
  } catch (error) {
    console.error('Error fetching vector stores:', error)
    res.status(500).json({ error: 'Failed to fetch vector stores' })
  }
})

router.post('/vectorstores', async (req, res) => {
  try {
    const store = await ragService.createVectorStore(req.body)
    res.status(201).json(store)
  } catch (error) {
    console.error('Error creating vector store:', error)
    res.status(500).json({ error: 'Failed to create vector store' })
  }
})

router.get('/vectorstores/:id', async (req, res) => {
  try {
    const store = await ragService.getVectorStore(req.params.id)
    if (!store) {
      return res.status(404).json({ error: 'Vector store not found' })
    }
    res.json(store)
  } catch (error) {
    console.error('Error fetching vector store:', error)
    res.status(500).json({ error: 'Failed to fetch vector store' })
  }
})

router.put('/vectorstores/:id', async (req, res) => {
  try {
    const store = await ragService.updateVectorStore(req.params.id, req.body)
    if (!store) {
      return res.status(404).json({ error: 'Vector store not found' })
    }
    res.json(store)
  } catch (error) {
    console.error('Error updating vector store:', error)
    res.status(500).json({ error: 'Failed to update vector store' })
  }
})

router.delete('/vectorstores/:id', async (req, res) => {
  try {
    const success = await ragService.deleteVectorStore(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Vector store not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting vector store:', error)
    res.status(500).json({ error: 'Failed to delete vector store' })
  }
})


// File Upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { name, type } = req.body
    const filePath = req.file.path

    console.log('File uploaded:', {
      originalName: req.file.originalname,
      path: filePath,
      size: req.file.size
    })

    // Create data source from uploaded file
    const dataSource = await ragService.createDataSource({
      name: name || path.basename(req.file.originalname, path.extname(req.file.originalname)),
      type: type || 'file',
      path: filePath
    })

    console.log('Data source created:', dataSource)

    res.status(201).json({
      message: 'File uploaded and data source created',
      dataSource,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        path: filePath
      }
    })
  } catch (error) {
    console.error('File upload error:', error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

export { router as ragRoutes }

