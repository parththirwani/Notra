import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Simple in-process sliding-window rate limiter.
 *
 * NOTE: This only works correctly in single-process deployments (e.g. local dev
 * or a single serverless instance). For multi-instance production deployments,
 * replace this with a Redis-backed implementation (e.g. Upstash Rate Limit).
 */
const store = new Map<string, RateLimitRecord>();

/** Periodically purge expired entries to prevent memory growth. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 min
let lastCleanup = Date.now();

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of store.entries()) {
    if (now >= record.resetAt) store.delete(key);
  }
}

function getClientId(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

/**
 * Returns a 429 NextResponse if `clientId` has exceeded `limit` requests
 * within `windowMs` milliseconds, otherwise returns `null`.
 */
export async function checkRateLimit(
  request: NextRequest,
  limit = 20,
  windowMs = 60_000
): Promise<NextResponse | null> {
  const now = Date.now();
  maybeCleanup(now);

  const clientId = getClientId(request);
  const record = store.get(clientId);

  if (record && now < record.resetAt) {
    if (record.count >= limit) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((record.resetAt - now) / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(record.resetAt / 1000)),
          },
        }
      );
    }
    record.count++;
  } else {
    store.set(clientId, { count: 1, resetAt: now + windowMs });
  }

  return null;
}