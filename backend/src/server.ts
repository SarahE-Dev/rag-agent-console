import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import WebSocket from 'ws'
import { createServer } from 'http'
import dotenv from 'dotenv'

import { mcpRoutes } from './routes/mcp'
import { ragRoutes } from './routes/rag'
import { agentRoutes } from './routes/agents'
import { chatRoutes } from './routes/chat'

dotenv.config()

const app = express()
const server = createServer(app)
const wss = new WebSocket.Server({ server })

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/mcp', mcpRoutes)
app.use('/api/rag', ragRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/chat', chatRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// WebSocket handling for real-time updates
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected to WebSocket')

  ws.on('message', (message: WebSocket.RawData) => {
    console.log('Received:', message.toString())
  })

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket')
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
  })
})

export { wss }
