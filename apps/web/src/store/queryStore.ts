// Tiny query cache backed by Zustand. Holds one entry per serialized query key
// and dedupes concurrent fetches of the same key behind a single in-flight
// promise. Powers the useQuery hook; mutations invalidate keys here to trigger
// background refetches.
import { create } from "zustand";

/** Serializes a query key (array of strings/numbers) into a stable string cache key. */
export function serializeQueryKey(queryKey: readonly (string | number)[]): string {
  return JSON.stringify(queryKey);
}

/** Parses a serialized query key back into its array form. */
function parseQueryKey(key: string): (string | number)[] {
  return JSON.parse(key) as (string | number)[];
}

/** True if `keyParts` starts with `prefix` (i.e. every prefix element matches positionally). */
function keyHasPrefix(keyParts: (string | number)[], prefix: readonly (string | number)[]): boolean {
  if (keyParts.length < prefix.length) return false;
  return prefix.every((part, index) => keyParts[index] === part);
}

export type QueryStatus = "idle" | "pending" | "success" | "error";

type CacheEntry = {
  data?: unknown;
  error?: Error;
  status: QueryStatus;
  /** Epoch millis of the last successful fetch; undefined means never fetched. */
  fetchedAt?: number;
  /** In-flight request, used to dedup concurrent callers of the same key. */
  inflight?: Promise<unknown>;
};

type QueryState = {
  entries: Record<string, CacheEntry>;
  fetch: <T>(key: string, fetcher: () => Promise<T>) => Promise<T>;
  invalidate: (key: string) => void;
  /** Marks stale every entry whose key starts with `prefix` (e.g. all `['todos', *]` variants). */
  invalidatePrefix: (prefix: readonly (string | number)[]) => void;
  setData: <T>(key: string, data: T) => void;
  /** Updates a cached entry in place via an updater function (for optimistic mutations). */
  updateData: <T>(key: string, updater: (prev: T | undefined) => T) => void;
  remove: (key: string) => void;
};

export const useQueryStore = create<QueryState>((set, get) => ({
  entries: {},

  fetch: <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const existing = get().entries[key];
    if (existing?.inflight) return existing.inflight as Promise<T>;

    const inflight = (async () => {
      try {
        const data = await fetcher();
        set((state) => ({
          entries: {
            ...state.entries,
            [key]: { data, status: "success", error: undefined, fetchedAt: Date.now() },
          },
        }));
        return data;
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        set((state) => {
          const previous = state.entries[key];
          return {
            entries: {
              ...state.entries,
              [key]: {
                data: previous?.data,
                status: "error",
                error: normalized,
                fetchedAt: previous?.fetchedAt,
              },
            },
          };
        });
        throw normalized;
      }
    })();

    // Mark pending and record the in-flight promise so concurrent callers dedup.
    set((state) => {
      const previous = state.entries[key];
      return {
        entries: {
          ...state.entries,
          [key]: {
            data: previous?.data,
            status: "pending",
            error: undefined,
            fetchedAt: previous?.fetchedAt,
            inflight,
          },
        },
      };
    });

    // Clear the in-flight marker once settled so future calls can refetch.
    // Use then(onFulfilled, onRejected) rather than finally() so the cleanup
    // promise resolves even when the fetch rejects — otherwise a failed fetch
    // surfaces as an unhandled rejection (finally() passes rejections through).
    const clearInflight = () => {
      set((state) => {
        const current = state.entries[key];
        if (!current) return state;
        return { entries: { ...state.entries, [key]: { ...current, inflight: undefined } } };
      });
    };
    inflight.then(clearInflight, clearInflight);

    return inflight;
  },

  invalidate: (key: string) =>
    set((state) => {
      const current = state.entries[key];
      if (!current) return state;
      return { entries: { ...state.entries, [key]: { ...current, fetchedAt: undefined } } };
    }),

  invalidatePrefix: (prefix: readonly (string | number)[]) =>
    set((state) => {
      let changed = false;
      const next: Record<string, CacheEntry> = {};
      for (const [key, entry] of Object.entries(state.entries)) {
        if (keyHasPrefix(parseQueryKey(key), prefix)) {
          next[key] = { ...entry, fetchedAt: undefined };
          changed = true;
        } else {
          next[key] = entry;
        }
      }
      return changed ? { entries: next } : state;
    }),

  setData: <T>(key: string, data: T) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [key]: { data, status: "success", error: undefined, fetchedAt: Date.now() },
      },
    })),

  updateData: <T>(key: string, updater: (prev: T | undefined) => T) =>
    set((state) => {
      const current = state.entries[key];
      const next = updater(current?.data as T | undefined);
      return {
        entries: {
          ...state.entries,
          [key]: { data: next, status: "success", error: undefined, fetchedAt: Date.now() },
        },
      };
    }),

  remove: (key: string) =>
    set((state) => {
      const rest = { ...state.entries };
      delete rest[key];
      return { entries: rest };
    }),
}));
