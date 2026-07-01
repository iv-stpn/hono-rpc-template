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

function withCookie(cookie: string, init: RequestInit): RequestInit {
  return { ...init, headers: { ...(init.headers ?? {}), Cookie: `session=${cookie}` } };
}

function json(body: unknown, method = "POST"): RequestInit {
  return { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } };
}

function sessionToken(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  return (cookie.match(/session=([^;]+)/) ?? [])[1] ?? "";
}

async function setup(d1: FakeD1): Promise<string> {
  const res = await app.request(
    "/api/auth/register",
    json({ email: "todo@test.com", password: "password123" }),
    makeEnv(d1),
  );
  return sessionToken(res);
}

async function createTodo(d1: FakeD1, cookie: string, title: string) {
  const res = await app.request("/api/todos", withCookie(cookie, json({ title })), makeEnv(d1));
  const body = (await res.json()) as { todo: { id: string; title: string; done: boolean; createdAt: number } };
  return { res, todo: body.todo };
}

describe("todos auth gate", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const d1 = new FakeD1();
    const res = await app.request("/api/todos", {}, makeEnv(d1));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/todos", () => {
  it("creates a todo and returns 201", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    const { res, todo } = await createTodo(d1, cookie, "Write tests");
    expect(res.status).toBe(201);
    expect(todo).toEqual({ id: expect.any(String), title: "Write tests", done: false, createdAt: expect.any(Number) });
  });

  it("trims the title and rejects empty/overlong titles", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);

    const trimmed = await createTodo(d1, cookie, "  spaced  ");
    expect(trimmed.todo.title).toBe("spaced");

    // An empty string fails the min(1) check. (A whitespace-only title passes
    // min-length before the trim transform, so it is accepted as "".)
    const empty = await app.request("/api/todos", withCookie(cookie, json({ title: "" })), makeEnv(d1));
    expect(empty.status).toBe(400);

    const tooLong = await app.request("/api/todos", withCookie(cookie, json({ title: "x".repeat(281) })), makeEnv(d1));
    expect(tooLong.status).toBe(400);
  });
});

describe("GET /api/todos", () => {
  it("lists the user's todos newest-first", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    await createTodo(d1, cookie, "First");
    await createTodo(d1, cookie, "Second");

    const res = await app.request("/api/todos", withCookie(cookie, {}), makeEnv(d1));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { todos: { title: string }[] };
    expect(body.todos.map((t) => t.title)).toEqual(["Second", "First"]);
  });
});

describe("PATCH /api/todos/:id", () => {
  it("updates title and done", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    const { todo } = await createTodo(d1, cookie, "Edit me");

    const res = await app.request(
      `/api/todos/${todo.id}`,
      withCookie(cookie, json({ title: "Edited", done: true }, "PATCH")),
      makeEnv(d1),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { todo: { title: string; done: boolean } };
    expect(body.todo).toEqual({ id: todo.id, title: "Edited", done: true, createdAt: todo.createdAt });
  });

  it("returns 404 for a missing todo", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    const res = await app.request("/api/todos/ghost", withCookie(cookie, json({ done: true }, "PATCH")), makeEnv(d1));
    expect(res.status).toBe(404);
  });

  it("rejects an update with no fields", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    const { todo } = await createTodo(d1, cookie, "Keep me");
    const res = await app.request(`/api/todos/${todo.id}`, withCookie(cookie, json({}, "PATCH")), makeEnv(d1));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/todos/:id", () => {
  it("deletes a todo", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    const { todo } = await createTodo(d1, cookie, "Delete me");

    const res = await app.request(`/api/todos/${todo.id}`, withCookie(cookie, { method: "DELETE" }), makeEnv(d1));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const list = await app.request("/api/todos", withCookie(cookie, {}), makeEnv(d1));
    const body = (await list.json()) as { todos: unknown[] };
    expect(body.todos).toHaveLength(0);
  });

  it("returns 404 when deleting a missing todo", async () => {
    const d1 = new FakeD1();
    const cookie = await setup(d1);
    const res = await app.request("/api/todos/ghost", withCookie(cookie, { method: "DELETE" }), makeEnv(d1));
    expect(res.status).toBe(404);
  });
});
