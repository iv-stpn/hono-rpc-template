// Worker entrypoint. Mounts auth + todo routes under /api and exports the
// app type for the typed RPC client.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter, rateLimitPresets } from "./middleware/rate-limiter";
import { authRoutes } from "./routes/auth";
import { todoRoutes } from "./routes/todos";
import type { Env, Variables } from "./types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// The web app runs on a separate origin, so allow credentialed CORS. With
// credentials the response cannot use "*"; reflect the configured web origin
// (WEB_ORIGIN), falling back to the Vite dev server.
app.use("/api/*", (c, next) =>
  cors({
    origin: c.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })(c, next),
);

// Apply rate limiting to all API routes
// Standard rate limit: 100 requests per minute per IP
app.use("/api/*", rateLimiter(rateLimitPresets.standard));

const routes = app
  .get("/api/health", (c) => c.json({ ok: true }))
  .route("/api/auth", authRoutes)
  .route("/api/todos", todoRoutes);

export type AppType = typeof routes;
export default app;

// Export the Durable Object class for rate limiting
export { RateLimiterDO } from "./durable-objects/rate-limiter";
