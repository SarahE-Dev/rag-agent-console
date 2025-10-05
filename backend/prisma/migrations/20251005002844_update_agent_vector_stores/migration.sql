/*
  Warnings:

  - You are about to drop the column `ragPipeline` on the `ai_agents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_agents" DROP COLUMN "ragPipeline",
ADD COLUMN     "vectorStores" TEXT[];
