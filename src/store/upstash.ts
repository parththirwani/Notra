import { Redis } from "@upstash/redis";
import { Message } from "@/types/chat";

const redis = Redis.fromEnv();

const CACHE_TTL = 5 * 60; 

export class RedisStore {
  private static instance: RedisStore;

  static getInstance() {
    if (!RedisStore.instance) {
      RedisStore.instance = new RedisStore();
      if (process.env.NODE_ENV === 'development') {
        console.log("[RedisStore] Instance created with Upstash");
      }
    }
    return RedisStore.instance;
  }

  async add(conversationId: string, message: Message): Promise<Message[]> {
    const key = `chat:${conversationId}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] Adding message to conversation: ${conversationId}, role: ${message.role}, hasImage: ${!!message.image}`);
    }

    // Get existing messages from cache
    const cached = await redis.get<Message[]>(key);
    let messages: Message[] = [];

    if (cached) {
      messages = cached;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RedisStore] Found ${messages.length} existing messages in cache`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RedisStore] No cache found for ${conversationId}`);
      }
    }

    // Add new message
    messages.push(message);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] Message added. New count: ${messages.length}`);
    }

    // Store back in Redis with TTL
    await redis.setex(key, CACHE_TTL, messages);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] Messages cached for ${conversationId} with TTL: ${CACHE_TTL}s`);
    }

    return messages;
  }

  async get(conversationId: string): Promise<Message[]> {
    const key = `chat:${conversationId}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] Retrieving messages for conversation: ${conversationId}`);
    }

    const cached = await redis.get<Message[]>(key);

    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RedisStore] Found ${cached.length} cached messages`);
      }
      // Extend TTL on access
      await redis.expire(key, CACHE_TTL);
      return cached;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] No cache found for ${conversationId}`);
    }
    return [];
  }

  async delete(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] Deleting messages for conversation: ${conversationId}`);
    }

    const result = await redis.del(key);

    if (process.env.NODE_ENV === 'development') {
      if (result === 1) {
        console.log(`[RedisStore] Successfully deleted cache for ${conversationId}`);
      } else {
        console.log(`[RedisStore] No cache found to delete for ${conversationId}`);
      }
    }
  }

  async clearCache(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;
    await redis.del(key);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RedisStore] Cache cleared for ${conversationId}`);
    }
  }
}