// Session lookup + auth middleware. Sessions are opaque tokens stored in D1
// and carried in an httpOnly cookie.

import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { newToken } from "./crypto";
import type { Env, SessionUser, Variables } from "./types";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// All helpers share the worker's full context env so they can be called from
// any handler without invariance mismatches on `Variables`.
type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

export async function createSession(c: Ctx, userId: string): Promise<void> {
  const token = newToken();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, expiresAt, now)
    .run();
  // The web app is a separate origin, so the cookie must be sent cross-site.
  // Cross-site cookies require SameSite=None, which in turn requires Secure —
  // but a Secure cookie over plain HTTP is dropped by the browser, so the
  // session would never persist in dev (http://localhost). Derive both from
  // the request scheme: HTTPS gets None+Secure (prod), HTTP gets Lax (dev,
  // where the web app and API share the localhost site so Lax is still sent).
  const isHttps = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroySession(c: Ctx): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

async function resolveUser(c: Ctx): Promise<SessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare(
    `SELECT u.id as id, u.email as email, s.expires_at as expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
  )
    .bind(token)
    .first<{ id: string; email: string; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email };
}

// Requires a valid session; sets `user` in context or returns 401.
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const user = await resolveUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
});

export { resolveUser };
