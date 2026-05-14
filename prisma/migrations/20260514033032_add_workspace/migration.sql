-- CreateEnum
CREATE TYPE "WorkspaceItemType" AS ENUM ('mcq', 'quiz', 'flashcard');

-- CreateTable
CREATE TABLE "workspace_topics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "type" "WorkspaceItemType" NOT NULL,
    "content" JSONB NOT NULL,
    "sourceConversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_topics_userId_idx" ON "workspace_topics"("userId");

-- CreateIndex
CREATE INDEX "workspace_items_userId_topicId_idx" ON "workspace_items"("userId", "topicId");

-- CreateIndex
CREATE INDEX "workspace_items_userId_type_idx" ON "workspace_items"("userId", "type");

-- AddForeignKey
ALTER TABLE "workspace_topics" ADD CONSTRAINT "workspace_topics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_items" ADD CONSTRAINT "workspace_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_items" ADD CONSTRAINT "workspace_items_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "workspace_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
