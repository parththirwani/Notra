import Redis from "ioredis";
import { Message } from "@/types/chat";

const CACHE_TTL = 5 * 60; // 5 minutes

// Singleton Redis client
const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("error", (err) => {
  console.error("[RedisStore] Connection error:", err.message);
});

export class RedisStore {
  private static instance: RedisStore;

  static getInstance() {
    if (!RedisStore.instance) {
      RedisStore.instance = new RedisStore();
      if (process.env.NODE_ENV === "development") {
        console.log("[RedisStore] Instance created with ioredis");
      }
    }
    return RedisStore.instance;
  }

  async add(conversationId: string, message: Message): Promise<Message[]> {
    const key = `chat:${conversationId}`;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[RedisStore] Adding message to conversation: ${conversationId}, role: ${message.role}, hasImage: ${!!message.image}`
      );
    }

    const raw = await redis.get(key);
    let messages: Message[] = [];

    if (raw) {
      try {
        messages = JSON.parse(raw) as Message[];
      } catch {
        messages = [];
      }
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[RedisStore] Found ${messages.length} existing messages in cache`
        );
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log(`[RedisStore] No cache found for ${conversationId}`);
      }
    }

    messages.push(message);

    if (process.env.NODE_ENV === "development") {
      console.log(`[RedisStore] Message added. New count: ${messages.length}`);
    }

    await redis.setex(key, CACHE_TTL, JSON.stringify(messages));

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[RedisStore] Messages cached for ${conversationId} with TTL: ${CACHE_TTL}s`
      );
    }

    return messages;
  }

  async get(conversationId: string): Promise<Message[]> {
    const key = `chat:${conversationId}`;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[RedisStore] Retrieving messages for conversation: ${conversationId}`
      );
    }

    const raw = await redis.get(key);

    if (raw) {
      try {
        const messages = JSON.parse(raw) as Message[];
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[RedisStore] Found ${messages.length} cached messages`
          );
        }
        // Extend TTL on access
        await redis.expire(key, CACHE_TTL);
        return messages;
      } catch {
        return [];
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[RedisStore] No cache found for ${conversationId}`);
    }
    return [];
  }

  async delete(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[RedisStore] Deleting messages for conversation: ${conversationId}`
      );
    }

    const result = await redis.del(key);

    if (process.env.NODE_ENV === "development") {
      if (result === 1) {
        console.log(
          `[RedisStore] Successfully deleted cache for ${conversationId}`
        );
      } else {
        console.log(
          `[RedisStore] No cache found to delete for ${conversationId}`
        );
      }
    }
  }

  async clearCache(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;
    await redis.del(key);

    if (process.env.NODE_ENV === "development") {
      console.log(`[RedisStore] Cache cleared for ${conversationId}`);
    }
  }
}