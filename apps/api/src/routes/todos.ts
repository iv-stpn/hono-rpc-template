// Todo CRUD routes. All require a valid session; todos are scoped to the user.

import { todoTitleSchema, todoUpdateSchema } from "@app/schemas/todos";
import type { Todo } from "@app/utils/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../auth";
import { newId } from "../crypto";
import type { Env, Variables } from "../types";

interface TodoRow {
  id: string;
  title: string;
  done: number;
  created_at: number;
}

function toTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, done: row.done === 1, createdAt: row.created_at };
}

export const todoRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use("*", requireAuth)
  .get("/", async (c) => {
    const user = c.get("user");
    const { results } = await c.env.DB.prepare(
      "SELECT id, title, done, created_at FROM todos WHERE user_id = ? ORDER BY created_at DESC",
    )
      .bind(user.id)
      .all<TodoRow>();
    return c.json({ todos: results.map(toTodo) });
  })
  .post("/", zValidator("json", todoTitleSchema), async (c) => {
    const user = c.get("user");
    const { title } = c.req.valid("json");
    const id = newId();
    const now = Date.now();
    await c.env.DB.prepare("INSERT INTO todos (id, user_id, title, done, created_at) VALUES (?, ?, ?, 0, ?)")
      .bind(id, user.id, title, now)
      .run();
    return c.json({ todo: { id, title, done: false, createdAt: now } }, 201);
  })
  .patch("/:id", zValidator("json", todoUpdateSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const update = c.req.valid("json");

    const existing = await c.env.DB.prepare(
      "SELECT id, title, done, created_at FROM todos WHERE id = ? AND user_id = ?",
    )
      .bind(id, user.id)
      .first<TodoRow>();
    if (!existing) return c.json({ error: "Todo not found" }, 404);

    const title = update.title ?? existing.title;
    const done = update.done ?? existing.done === 1;
    await c.env.DB.prepare("UPDATE todos SET title = ?, done = ? WHERE id = ? AND user_id = ?")
      .bind(title, done ? 1 : 0, id, user.id)
      .run();
    return c.json({ todo: { id, title, done, createdAt: existing.created_at } });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const res = await c.env.DB.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    if (!res.meta.changes) return c.json({ error: "Todo not found" }, 404);
    return c.json({ ok: true });
  });
