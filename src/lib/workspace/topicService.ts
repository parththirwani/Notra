/**
 * src/lib/workspace/topicService.ts
 *
 * Finds an existing WorkspaceTopic for a user that is semantically similar
 * to the given name (cosine similarity ≥ SIMILARITY_THRESHOLD), or creates
 * a new one.
 */

import { prisma } from "@/lib/prisma/client";
import { embedText, cosineSimilarity } from "@/lib/ai/embeddings";

const SIMILARITY_THRESHOLD = 0.85;

export async function findOrCreateTopic(
  userId: string,
  topicName: string
): Promise<string> {
  // 1. Embed the incoming topic name
  const newEmbedding = await embedText(topicName);

  // 2. Pull all existing topics for this user (with their embeddings)
  const existingTopics = await prisma.workspaceTopic.findMany({
    where: { userId },
    select: { id: true, name: true, embedding: true },
  });

  // 3. Find the best match above threshold
  let bestId: string | null = null;
  let bestScore = 0;

  for (const topic of existingTopics) {
    if (!topic.embedding || topic.embedding.length === 0) continue;
    const score = cosineSimilarity(newEmbedding, topic.embedding);
    if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestId = topic.id;
    }
  }

  if (bestId) {
    // Update the topic name to the most recent one (optional — keeps it fresh)
    await prisma.workspaceTopic.update({
      where: { id: bestId },
      data: { updatedAt: new Date() },
    });
    return bestId;
  }

  // 4. No match — create a new topic
  const created = await prisma.workspaceTopic.create({
    data: {
      userId,
      name: topicName,
      embedding: newEmbedding,
    },
  });

  return created.id;
}