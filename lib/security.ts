import { NextResponse, type NextRequest } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function sanitizeText(input: unknown, maxLength = 2000) {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeHtml(input: unknown) {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

export function rateLimit(request: NextRequest, namespace = "api") {
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60);
  const limit = Number(process.env.RATE_LIMIT_MAX || 80);
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  const key = `${namespace}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000
    });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowSeconds * 1000 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}

export function rateLimited(request: NextRequest, namespace?: string) {
  const result = rateLimit(request, namespace);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "请求过于频繁，请稍后再试。"
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000))
      }
    }
  );
}
