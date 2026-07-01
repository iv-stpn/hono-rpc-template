// Auth routes: register, login, logout, and the current-user lookup.

import { authSchema } from "@app/schemas/auth";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createSession, destroySession, requireAuth } from "../auth";
import { hashPassword, newId, verifyPassword } from "../crypto";
import { rateLimiter, rateLimitPresets } from "../middleware/rate-limiter";
import type { Env, Variables } from "../types";

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  .post("/register", rateLimiter(rateLimitPresets.auth), zValidator("json", authSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return c.json({ error: "Email already registered" }, 409);

    const id = newId();
    const password_hash = await hashPassword(password);
    await c.env.DB.prepare("INSERT INTO users (id, email, password, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, email, password_hash, Date.now())
      .run();
    await createSession(c, id);
    return c.json({ user: { id, email } }, 201);
  })
  .post("/login", rateLimiter(rateLimitPresets.auth), zValidator("json", authSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const row = await c.env.DB.prepare("SELECT id, email, password FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string; email: string; password: string }>();
    if (!row || !(await verifyPassword(password, row.password))) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    await createSession(c, row.id);
    return c.json({ user: { id: row.id, email: row.email } });
  })
  .post("/logout", async (c) => {
    await destroySession(c);
    return c.json({ ok: true });
  })
  .get("/me", requireAuth, (c) => {
    return c.json({ user: c.get("user") });
  });
