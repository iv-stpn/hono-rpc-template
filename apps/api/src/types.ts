/// <reference types="@cloudflare/workers-types" />
import type { User } from "@app/utils";

export interface Env {
  DB: D1Database;
  // Origin of the web app, used for credentialed CORS. Set per environment.
  WEB_ORIGIN?: string;
  // Durable Object namespace for rate limiting
  RATE_LIMITER: DurableObjectNamespace;
}

// The authenticated user carried on the request context.
export type SessionUser = User;

// Variables attached to the Hono context after auth middleware runs.
export interface Variables {
  user: SessionUser;
}
