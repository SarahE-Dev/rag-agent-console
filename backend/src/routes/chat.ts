import { Router } from 'express'

const router = Router()

// Placeholder chat routes
router.post('/message', (req, res) => {
  const { message, agentId } = req.body
  res.json({
    message: `Echo: ${message}`,
    agentId,
    timestamp: new Date().toISOString()
  })
})

export { router as chatRoutes }

