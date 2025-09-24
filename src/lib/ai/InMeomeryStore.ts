import { PrismaClient, MessageRole } from '@prisma/client';
import Redis from 'ioredis';
import { Message } from '@/types/chat';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380'); 
const prisma = new PrismaClient();
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

export class RedisStore {
  private static instance: RedisStore;

  static getInstance() {
    if (!RedisStore.instance) {
      RedisStore.instance = new RedisStore();
      console.log('[RedisStore] Instance created');
    }
    return RedisStore.instance;
  }

  async add(conversationId: string, message: Message): Promise<Message[]> {
    const key = `chat:${conversationId}`;
    console.log(`[RedisStore] Adding message to conversation: ${conversationId}, role: ${message.role}`);
    
    // Get existing messages (loads from DB if not in Redis)
    const messages = await this.get(conversationId);
    console.log(`[RedisStore] Current message count for ${conversationId}: ${messages.length}`);
    
    // Add new message
    messages.push(message);
    console.log(`[RedisStore] Message added. New count: ${messages.length}`);
    
    // Store back in Redis with TTL
    await redis.setex(key, CACHE_TTL, JSON.stringify(messages));
    console.log(`[RedisStore] Messages cached in Redis for ${conversationId} with TTL: ${CACHE_TTL}s`);
    
    return messages; // Return updated messages
  }

  async get(conversationId: string): Promise<Message[]> {
    const key = `chat:${conversationId}`;
    console.log(`[RedisStore] Retrieving messages for conversation: ${conversationId}`);
    
    // Try to get from Redis first
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`[RedisStore] Messages found in Redis cache for ${conversationId}`);
      // Extend TTL on access
      await redis.expire(key, CACHE_TTL);
      console.log(`[RedisStore] TTL extended for ${conversationId}`);
      const messages = JSON.parse(cached);
      console.log(`[RedisStore] Returning ${messages.length} cached messages`);
      return messages;
    }
    
    // Not in Redis, load from database
    console.log(`[RedisStore] No cache found. Loading conversation ${conversationId} from database`);
    const dbMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`[RedisStore] Loaded ${dbMessages.length} messages from database for ${conversationId}`);
    
    const messages: Message[] = dbMessages.map((m) => ({
      id: m.id,
      content: m.content,
      role: m.role,
      timestamp: m.createdAt.toISOString(),
    }));
    
    // Cache in Redis
    if (messages.length > 0) {
      await redis.setex(key, CACHE_TTL, JSON.stringify(messages));
      console.log(`[RedisStore] ${messages.length} messages cached in Redis for ${conversationId}`);
    } else {
      console.log(`[RedisStore] No messages to cache for ${conversationId}`);
    }
    
    return messages;
  }
}
