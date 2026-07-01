import { describe, expect, it } from "vitest";
import { errorMessage } from "../src/api";

describe("errorMessage", () => {
  it("extracts the { error } string from a JSON body", async () => {
    const res = new Response(JSON.stringify({ error: "Something went wrong" }));
    expect(await errorMessage(res, "fallback")).toBe("Something went wrong");
  });

  it("falls back when the body has no error field", async () => {
    const res = new Response(JSON.stringify({ other: "x" }));
    expect(await errorMessage(res, "fallback")).toBe("fallback");
  });

  it("falls back on a non-JSON body", async () => {
    const res = new Response("not json");
    expect(await errorMessage(res, "fallback")).toBe("fallback");
  });
});
