import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createSession, destroySession, requireAuth } from "../src/auth";
import type { Env } from "../src/types";
import { FakeD1, fakeRateLimiter } from "./fakeD1";

function makeEnv(d1: FakeD1): Env {
  return { DB: d1 as unknown as Env["DB"], RATE_LIMITER: fakeRateLimiter() as unknown as Env["RATE_LIMITER"] };
}

// Tiny app exposing the helpers behind routes so we can drive them with
// `app.request(..., env)` and inspect cookies/responses end-to-end.
function makeApp() {
  return new Hono<{ Bindings: Env }>()
    .post("/session/:userId", async (c) => {
      await createSession(c, c.req.param("userId"));
      return c.json({ ok: true });
    })
    .post("/logout", async (c) => {
      await destroySession(c);
      return c.json({ ok: true });
    })
    .get("/me", requireAuth, (c) => c.json({ user: c.get("user") }));
}

function sessionToken(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  return (cookie.match(/session=([^;]+)/) ?? [])[1] ?? "";
}

describe("createSession / requireAuth", () => {
  it("sets a session cookie that authenticates subsequent requests", async () => {
    const d1 = new FakeD1();
    d1.tables.users.push({ id: "u1", email: "a@b.com", password: "x", created_at: 0 });
    const app = makeApp();

    const res = await app.request("/session/u1", { method: "POST" }, makeEnv(d1));
    expect(res.status).toBe(200);
    const token = sessionToken(res);
    expect(token).toBeTruthy();
    // A session row was persisted.
    expect(d1.tables.sessions).toHaveLength(1);
    expect(d1.tables.sessions[0].user_id).toBe("u1");

    const me = await app.request("/me", { headers: { Cookie: `session=${token}` } }, makeEnv(d1));
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ user: { id: "u1", email: "a@b.com" } });
  });

  it("returns 401 when no session cookie is present", async () => {
    const app = makeApp();
    const res = await app.request("/me", {}, makeEnv(new FakeD1()));
    expect(res.status).toBe(401);
  });

  it("returns 401 and deletes an expired session", async () => {
    const d1 = new FakeD1();
    d1.tables.users.push({ id: "u1", email: "a@b.com", password: "x", created_at: 0 });
    d1.tables.sessions.push({ id: "stale", user_id: "u1", expires_at: Date.now() - 1000, created_at: 0 });
    const app = makeApp();

    const res = await app.request("/me", { headers: { Cookie: "session=stale" } }, makeEnv(d1));
    expect(res.status).toBe(401);
    // Expired session is lazily cleaned up on lookup.
    expect(d1.tables.sessions).toHaveLength(0);
  });

  it("destroySession removes the session row and clears the cookie", async () => {
    const d1 = new FakeD1();
    d1.tables.sessions.push({ id: "tok", user_id: "u1", expires_at: Date.now() + 9999, created_at: 0 });
    const app = makeApp();

    const res = await app.request("/logout", { method: "POST", headers: { Cookie: "session=tok" } }, makeEnv(d1));
    expect(res.status).toBe(200);
    expect(d1.tables.sessions).toHaveLength(0);
    // Cookie is cleared via Set-Cookie with an empty/max-age-0 value.
    expect(res.headers.get("set-cookie")).toContain("session=");
  });
});
