import { describe, expect, it } from "vitest";
import { hashPassword, newId, newToken, verifyPassword } from "../src/crypto";

describe("newToken", () => {
  it("returns a 64-character hex string (32 random bytes)", () => {
    expect(newToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces distinct tokens", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toBe(b);
  });
});

describe("newId", () => {
  it("returns a parseable snowflake string", () => {
    expect(newId()).toMatch(/^\d+$/);
  });
});

// hashPassword/verifyPassword run against the argon2 stub from test/setup.ts,
// which encodes the password into the hash — enough to confirm the wiring and
// the accept/reject branches without paying for real Argon2 in CI.
describe("hashPassword / verifyPassword (stubbed argon2)", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).toContain("$argon2id$");
    await expect(verifyPassword("hunter2", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("hunter2");
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("returns false instead of throwing on a corrupt stored hash", async () => {
    await expect(verifyPassword("x", "not-a-valid-hash")).resolves.toBe(false);
  });
});
