import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "../../src/hooks/useQuery";
import { useQueryStore } from "../../src/store/queryStore";

beforeEach(() => useQueryStore.setState({ entries: {} }));

describe("useQuery", () => {
  it("fetches and exposes the data", async () => {
    const fetcher = vi.fn(async () => "hello");
    const { result } = renderHook(() => useQuery({ queryKey: ["k"], queryFn: fetcher }));

    await waitFor(() => expect(result.current.data).toBe("hello"));
    expect(result.current.isFetching).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves a fresh cache without refetching within staleTime", async () => {
    const fetcher = vi.fn(async () => "cached");
    const first = renderHook(() => useQuery({ queryKey: ["c"], queryFn: fetcher, staleTime: 10_000 }));
    await waitFor(() => expect(first.result.current.data).toBe("cached"));

    const second = renderHook(() => useQuery({ queryKey: ["c"], queryFn: fetcher, staleTime: 10_000 }));
    await waitFor(() => expect(second.result.current.data).toBe("cached"));

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetch() forces a new request", async () => {
    let count = 0;
    const fetcher = async () => `data${count++}`;
    const { result } = renderHook(() => useQuery({ queryKey: ["r"], queryFn: fetcher }));

    await waitFor(() => expect(result.current.data).toBe("data0"));
    await result.current.refetch();
    await waitFor(() => expect(result.current.data).toBe("data1"));
  });

  it("surfaces fetch errors", async () => {
    const fetcher = async () => {
      throw new Error("nope");
    };
    const { result } = renderHook(() => useQuery({ queryKey: ["e"], queryFn: fetcher, retryCount: 0 }));

    await waitFor(() => expect(result.current.error?.message).toBe("nope"));
    expect(result.current.data).toBeUndefined();
  });
});
