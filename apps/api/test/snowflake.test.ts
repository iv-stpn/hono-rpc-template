import { describe, expect, it } from "vitest";
import { generateSnowflake, getSnowflakeTimestamp, parseSnowflake } from "../src/snowflake";

describe("generateSnowflake", () => {
  it("produces a numeric string", () => {
    const id = generateSnowflake();
    expect(id).toMatch(/^\d+$/);
  });

  it("generates unique IDs across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateSnowflake()));
    expect(ids.size).toBe(1000);
  });

  it("encodes the supplied worker id", () => {
    const id = generateSnowflake(42);
    expect(parseSnowflake(id).workerId).toBe(42n);
  });

  it("rejects worker ids outside the 0–1023 range", () => {
    expect(() => generateSnowflake(-1)).toThrow();
    expect(() => generateSnowflake(1024)).toThrow();
  });

  it("parses back to a timestamp consistent with getSnowflakeTimestamp", () => {
    const id = generateSnowflake(7);
    const parsed = parseSnowflake(id);
    expect(parsed.date.getTime()).toBe(getSnowflakeTimestamp(id).getTime());
    expect(parsed.workerId).toBe(7n);
    expect(parsed.sequence).toBeGreaterThanOrEqual(0n);
    expect(parsed.sequence).toBeLessThanOrEqual(4095n);
  });
});
