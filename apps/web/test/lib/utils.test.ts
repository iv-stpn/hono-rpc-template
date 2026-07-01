import { describe, expect, it } from "vitest";
import { cn } from "../../src/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes via twMerge", () => {
    expect(cn("p-1", "p-2")).toBe("p-2");
  });

  it("drops falsy values via clsx", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});
