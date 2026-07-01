import { describe, expect, it } from "vitest";
import app from "../../src";
import type { Env } from "../../src/types";
import { FakeD1, fakeRateLimiter } from "../fakeD1";

function makeEnv(d1: FakeD1): Env {
  return {
    DB: d1 as unknown as Env["DB"],
    RATE_LIMITER: fakeRateLimiter() as unknown as Env["RATE_LIMITER"],
    WEB_ORIGIN: "http://localhost:5173",
  };
}

function json(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } };
}

function sessionToken(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  return (cookie.match(/session=([^;]+)/) ?? [])[1] ?? "";
}

async function register(d1: FakeD1, email = "user@test.com", password = "password123") {
  const res = await app.request("/api/auth/register", json({ email, password }), makeEnv(d1));
  return { res, token: sessionToken(res) };
}

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await app.request("/api/health", {}, makeEnv(new FakeD1()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("POST /api/auth/register", () => {
  it("creates a user, starts a session, and returns 201", async () => {
    const d1 = new FakeD1();
    const { res, token } = await register(d1);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ user: { id: expect.any(String), email: "user@test.com" } });
    expect(token).toBeTruthy();
    expect(d1.tables.users).toHaveLength(1);
    expect(d1.tables.sessions).toHaveLength(1);
  });

  it("rejects a duplicate email with 409", async () => {
    const d1 = new FakeD1();
    await register(d1, "dup@test.com");
    const { res } = await register(d1, "dup@test.com");
    expect(res.status).toBe(409);
  });

  it("lowercases the email and rejects an invalid one", async () => {
    const d1 = new FakeD1();
    const { res } = await register(d1, "not-an-email", "password123");
    expect(res.status).toBe(400);
  });

  it("rejects a too-short password", async () => {
    const d1 = new FakeD1();
    const { res } = await register(d1, "short@test.com", "short");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("authenticates with the correct password", async () => {
    const d1 = new FakeD1();
    await register(d1, "login@test.com", "password123");
    const res = await app.request(
      "/api/auth/login",
      json({ email: "login@test.com", password: "password123" }),
      makeEnv(d1),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: expect.any(String), email: "login@test.com" } });
    expect(sessionToken(res)).toBeTruthy();
  });

  it("rejects a wrong password with 401", async () => {
    const d1 = new FakeD1();
    await register(d1, "login@test.com", "password123");
    const res = await app.request(
      "/api/auth/login",
      json({ email: "login@test.com", password: "wrongpassword" }),
      makeEnv(d1),
    );
    expect(res.status).toBe(401);
  });

  it("rejects an unknown user with 401", async () => {
    const d1 = new FakeD1();
    const res = await app.request(
      "/api/auth/login",
      json({ email: "ghost@test.com", password: "password123" }),
      makeEnv(d1),
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a session", async () => {
    const res = await app.request("/api/auth/me", {}, makeEnv(new FakeD1()));
    expect(res.status).toBe(401);
  });

  it("returns the current user with a valid session", async () => {
    const d1 = new FakeD1();
    const { token } = await register(d1, "me@test.com");
    const res = await app.request("/api/auth/me", { headers: { Cookie: `session=${token}` } }, makeEnv(d1));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: expect.any(String), email: "me@test.com" } });
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session", async () => {
    const d1 = new FakeD1();
    const { token } = await register(d1, "out@test.com");
    expect(d1.tables.sessions).toHaveLength(1);
    const res = await app.request(
      "/api/auth/logout",
      { method: "POST", headers: { Cookie: `session=${token}` } },
      makeEnv(d1),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(d1.tables.sessions).toHaveLength(0);
  });
});
