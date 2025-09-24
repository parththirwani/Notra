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
    
    // Get existing messages from cache only (don't reload from DB)
    const cached = await redis.get(key);
    let messages: Message[] = [];
    
    if (cached) {
      messages = JSON.parse(cached);
      console.log(`[RedisStore] Found ${messages.length} existing messages in cache`);
    } else {
      // If no cache, load from DB first
      console.log(`[RedisStore] No cache found. Loading from database for ${conversationId}`);
      const dbMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
      
      messages = dbMessages.map((m) => ({
        id: m.id,
        content: m.content,
        role: m.role,
        timestamp: m.createdAt.toISOString(),
      }));
      console.log(`[RedisStore] Loaded ${messages.length} messages from database`);
    }
    
    // Add new message
    messages.push(message);
    console.log(`[RedisStore] Message added. New count: ${messages.length}`);
    
    // Store back in Redis with TTL
    await redis.setex(key, CACHE_TTL, JSON.stringify(messages));
    console.log(`[RedisStore] Messages cached in Redis for ${conversationId} with TTL: ${CACHE_TTL}s`);
    
    return messages;
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
    }
    
    return messages;
  }

  async delete(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;
    console.log(`[RedisStore] Deleting messages for conversation: ${conversationId}`);
    
    const result = await redis.del(key);
    
    if (result === 1) {
      console.log(`[RedisStore] Successfully deleted cache for ${conversationId}`);
    } else {
      console.log(`[RedisStore] No cache found to delete for ${conversationId}`);
    }
  }

  // New method: Clear cache to force reload from DB
  async clearCache(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;
    await redis.del(key);
    console.log(`[RedisStore] Cache cleared for ${conversationId}`);
  }
}