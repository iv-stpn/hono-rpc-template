import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeQueryKey, useQueryStore } from "../../src/store/queryStore";

beforeEach(() => useQueryStore.setState({ entries: {} }));

describe("serializeQueryKey", () => {
  it("JSON-stringifies the key array", () => {
    expect(serializeQueryKey(["todos", 1])).toBe('["todos",1]');
  });
});

describe("fetch", () => {
  it("caches a successful result and returns the data", async () => {
    const fetcher = vi.fn(async () => "data");
    const key = serializeQueryKey(["k"]);
    const data = await useQueryStore.getState().fetch(key, fetcher);
    expect(data).toBe("data");
    const entry = useQueryStore.getState().entries[key];
    expect(entry.status).toBe("success");
    expect(entry.data).toBe("data");
    expect(entry.fetchedAt).toBeTypeOf("number");
  });

  it("stores the error and rethrows on failure", async () => {
    const fetcher = async () => {
      throw new Error("boom");
    };
    const key = serializeQueryKey(["err"]);
    await expect(useQueryStore.getState().fetch(key, fetcher)).rejects.toThrow("boom");
    const entry = useQueryStore.getState().entries[key];
    expect(entry.status).toBe("error");
    expect(entry.error?.message).toBe("boom");
  });

  it("dedupes concurrent fetches of the same key to one fetcher call", async () => {
    const fetcher = vi.fn(async () => {
      await Promise.resolve();
      return "shared";
    });
    const key = serializeQueryKey(["dedup"]);
    const [a, b] = await Promise.all([
      useQueryStore.getState().fetch(key, fetcher),
      useQueryStore.getState().fetch(key, fetcher),
    ]);
    expect(a).toBe("shared");
    expect(b).toBe("shared");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("invalidate / invalidatePrefix", () => {
  it("marks a single key stale (fetchedAt undefined)", async () => {
    const key = serializeQueryKey(["todos"]);
    await useQueryStore.getState().fetch(key, async () => "x");
    expect(useQueryStore.getState().entries[key].fetchedAt).toBeTypeOf("number");
    useQueryStore.getState().invalidate(key);
    expect(useQueryStore.getState().entries[key].fetchedAt).toBeUndefined();
  });

  it("marks every key with a matching prefix stale", async () => {
    const k1 = serializeQueryKey(["todos", "list"]);
    const k2 = serializeQueryKey(["todos", "detail", 1]);
    const k3 = serializeQueryKey(["users", "me"]);
    await Promise.all([
      useQueryStore.getState().fetch(k1, async () => 1),
      useQueryStore.getState().fetch(k2, async () => 2),
      useQueryStore.getState().fetch(k3, async () => 3),
    ]);
    useQueryStore.getState().invalidatePrefix(["todos"]);
    expect(useQueryStore.getState().entries[k1].fetchedAt).toBeUndefined();
    expect(useQueryStore.getState().entries[k2].fetchedAt).toBeUndefined();
    expect(useQueryStore.getState().entries[k3].fetchedAt).toBeTypeOf("number");
  });
});

describe("setData / updateData / remove", () => {
  it("setData writes a fresh success entry", () => {
    const key = serializeQueryKey(["s"]);
    useQueryStore.getState().setData(key, "v");
    expect(useQueryStore.getState().entries[key]).toMatchObject({ data: "v", status: "success" });
  });

  it("updateData mutates from the previous value", () => {
    const key = serializeQueryKey(["u"]);
    useQueryStore.getState().setData(key, 1);
    useQueryStore.getState().updateData(key, (prev) => (prev ?? 0) + 1);
    expect(useQueryStore.getState().entries[key].data).toBe(2);
  });

  it("remove drops the entry", () => {
    const key = serializeQueryKey(["r"]);
    useQueryStore.getState().setData(key, "v");
    useQueryStore.getState().remove(key);
    expect(useQueryStore.getState().entries[key]).toBeUndefined();
  });
});
