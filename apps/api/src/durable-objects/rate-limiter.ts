// Durable Object for distributed rate limiting across Cloudflare Workers
// Each unique key (typically IP address) gets its own DO instance with persistent state

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiterDO {
  private storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "check") {
      const windowMs = parseInt(url.searchParams.get("windowMs") || "60000", 10);
      const maxRequests = parseInt(url.searchParams.get("maxRequests") || "100", 10);

      const result = await this.checkRateLimit(windowMs, maxRequests);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Invalid action", { status: 400 });
  }

  private async checkRateLimit(
    windowMs: number,
    maxRequests: number,
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    let entry = await this.storage.get<RateLimitEntry>("entry");

    // If no entry exists or the window has expired, create a new one
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      await this.storage.put("entry", entry);

      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: entry.resetTime,
      };
    }

    // Increment the request count
    entry.count++;
    await this.storage.put("entry", entry);

    // Check if rate limit is exceeded
    const allowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);

    return {
      allowed,
      limit: maxRequests,
      remaining,
      reset: entry.resetTime,
    };
  }

  // Automatically clean up old entries after window expires
  async alarm(): Promise<void> {
    await this.storage.deleteAll();
  }
}
