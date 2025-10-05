import { PrismaClient } from '@prisma/client'

export class DatabaseService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    })
  }

  // Test method to ensure Prisma is working
  async testConnection() {
    return this.prisma.$connect()
  }

  // MCP Server operations
  async createMcpServer(data: any) {
    return this.prisma.mcpServer.create({ data })
  }

  async getMcpServer(id: string) {
    return this.prisma.mcpServer.findUnique({ where: { id } })
  }

  async getAllMcpServers() {
    return this.prisma.mcpServer.findMany()
  }

  async updateMcpServer(id: string, data: any) {
    return this.prisma.mcpServer.update({ where: { id }, data })
  }

  async deleteMcpServer(id: string) {
    return this.prisma.mcpServer.delete({ where: { id } })
  }

  // RAG operations
  async createRagDataSource(data: any) {
    return this.prisma.ragDataSource.create({ data })
  }

  async getRagDataSource(id: string) {
    return this.prisma.ragDataSource.findUnique({ where: { id } })
  }

  async getAllRagDataSources() {
    return this.prisma.ragDataSource.findMany()
  }

  async updateRagDataSource(id: string, data: any) {
    return this.prisma.ragDataSource.update({ where: { id }, data })
  }

  async deleteRagDataSource(id: string) {
    return this.prisma.ragDataSource.delete({ where: { id } })
  }

  async createRagEmbeddingModel(data: any) {
    return this.prisma.ragEmbeddingModel.create({ data })
  }

  async getRagEmbeddingModel(id: string) {
    return this.prisma.ragEmbeddingModel.findUnique({ where: { id } })
  }

  async getAllRagEmbeddingModels() {
    return this.prisma.ragEmbeddingModel.findMany()
  }

  async createRagVectorStore(data: any) {
    return this.prisma.ragVectorStore.create({ data })
  }

  async getRagVectorStore(id: string) {
    return this.prisma.ragVectorStore.findUnique({ where: { id } })
  }

  async getAllRagVectorStores() {
    return this.prisma.ragVectorStore.findMany()
  }

  async createRagPipeline(data: any) {
    return this.prisma.ragPipeline.create({ data })
  }

  async getRagPipeline(id: string) {
    return this.prisma.ragPipeline.findUnique({ where: { id } })
  }

  async getAllRagPipelines() {
    return this.prisma.ragPipeline.findMany()
  }

  async updateRagPipeline(id: string, data: any) {
    return this.prisma.ragPipeline.update({ where: { id }, data })
  }

  async deleteRagPipeline(id: string) {
    return this.prisma.ragPipeline.delete({ where: { id } })
  }

  // AI Agent operations
  async createAiAgent(data: any) {
    return this.prisma.aiAgent.create({ data })
  }

  async getAiAgent(id: string) {
    return this.prisma.aiAgent.findUnique({ where: { id } })
  }

  async getAllAiAgents() {
    return this.prisma.aiAgent.findMany()
  }

  async updateAiAgent(id: string, data: any) {
    return this.prisma.aiAgent.update({ where: { id }, data })
  }

  async deleteAiAgent(id: string) {
    return this.prisma.aiAgent.delete({ where: { id } })
  }

  // Conversation operations
  async createConversationSession(data: any) {
    return this.prisma.conversationSession.create({ data })
  }

  async createConversationMessage(data: any) {
    return this.prisma.conversationMessage.create({ data })
  }

  async getConversationMessages(sessionId: string) {
    return this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    })
  }

  // Settings operations
  async getSetting(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } })
    return setting?.value
  }

  async setSetting(key: string, value: string, type: string = 'string') {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, type },
      create: { key, value, type }
    })
  }

  // Health check
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'healthy', database: 'connected' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
      return { status: 'unhealthy', database: 'disconnected', error: errorMessage }
    }
  }

  // Cleanup
  async disconnect() {
    await this.prisma.$disconnect()
  }
}
