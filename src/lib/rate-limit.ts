import { NextRequest, NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'anonymous';

  const now = Date.now();
  const record = rateLimit.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= limit) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    record.count++;
  } else {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
  }

  // Cleanup old entries
  if (rateLimit.size > 10000) {
    for (const [key, value] of rateLimit.entries()) {
      if (now > value.resetAt) {
        rateLimit.delete(key);
      }
    }
  }

  return null;
}