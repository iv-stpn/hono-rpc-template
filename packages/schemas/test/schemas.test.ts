import { describe, expect, it } from "vitest";
import { authSchema, PASSWORD_MIN } from "../src/auth";
import { TITLE_MAX, todoTitleSchema, todoUpdateSchema } from "../src/todos";

describe("authSchema", () => {
  it("lowercases the email", () => {
    const parsed = authSchema.safeParse({ email: "USER@Example.COM", password: "password123" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    expect(authSchema.safeParse({ email: "not-an-email", password: "password123" }).success).toBe(false);
  });

  it("rejects a password shorter than PASSWORD_MIN", () => {
    expect(authSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
    expect(PASSWORD_MIN).toBe(8);
  });
});

describe("todoTitleSchema", () => {
  it("trims the title", () => {
    const parsed = todoTitleSchema.safeParse({ title: "  buy milk  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.title).toBe("buy milk");
  });

  it("rejects an empty title", () => {
    expect(todoTitleSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a title longer than TITLE_MAX", () => {
    expect(todoTitleSchema.safeParse({ title: "x".repeat(TITLE_MAX + 1) }).success).toBe(false);
    expect(todoTitleSchema.safeParse({ title: "x".repeat(TITLE_MAX) }).success).toBe(true);
  });
});

describe("todoUpdateSchema", () => {
  it("accepts a title-only update and trims it", () => {
    const parsed = todoUpdateSchema.safeParse({ title: "  edited  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.title).toBe("edited");
  });

  it("accepts a done-only update", () => {
    expect(todoUpdateSchema.safeParse({ done: true }).success).toBe(true);
  });

  it("rejects an update with no fields", () => {
    const parsed = todoUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
