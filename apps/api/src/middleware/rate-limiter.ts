import type { Context, MiddlewareHandler } from "hono";
import type { Env, Variables } from "../types";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum number of requests per window
  keyGenerator?: (c: Context<{ Bindings: Env; Variables: Variables }>) => string;
  handler?: (c: Context<{ Bindings: Env; Variables: Variables }>) => Response | Promise<Response>;
}

/**
 * Rate limiting middleware using Cloudflare Durable Objects for distributed state
 * @param config Rate limit configuration
 * @returns Middleware handler
 */
export function rateLimiter(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => {
      // Default: use IP address from CF-Connecting-IP header (Cloudflare provides this)
      return c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";
    },
    handler = (c) => {
      return c.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again later.`,
        },
        429,
      );
    },
  } = config;

  return async (c, next) => {
    const key = keyGenerator(c);

    // Get the Durable Object instance for this key
    const id = c.env.RATE_LIMITER.idFromName(key);
    const stub = c.env.RATE_LIMITER.get(id);

    // Check rate limit by calling the Durable Object
    const url = new URL("https://dummy.com");
    url.searchParams.set("action", "check");
    url.searchParams.set("windowMs", windowMs.toString());
    url.searchParams.set("maxRequests", maxRequests.toString());

    const response = await stub.fetch(url.toString());
    const result = await response.json<{
      allowed: boolean;
      limit: number;
      remaining: number;
      reset: number;
    }>();

    // Set rate limit headers
    c.header("X-RateLimit-Limit", result.limit.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", new Date(result.reset).toISOString());

    if (!result.allowed) {
      const now = Date.now();
      const retryAfter = Math.ceil((result.reset - now) / 1000);
      c.header("Retry-After", retryAfter.toString());
      return handler(c);
    }

    return next();
  };
}

/**
 * Preset configurations for common rate limiting scenarios
 */
export const rateLimitPresets = {
  // Strict: 10 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Standard: 100 requests per minute
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Relaxed: 1000 requests per minute
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
  // Authentication endpoints: 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
};
