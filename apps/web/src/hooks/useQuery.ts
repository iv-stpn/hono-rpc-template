// Minimal cached query hook backed by the Zustand query store. Concurrent mounts of the
// same key share a single in-flight request; results are cached and reused across
// unmount/remount within `staleTime`. Does not background-refetch on focus — staleness
// plus mutation invalidation cover freshness.
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { serializeQueryKey, useQueryStore } from "../store/queryStore";

type UseQueryOptions<T> = {
  queryKey: readonly (string | number)[];
  queryFn: () => Promise<T>;
  /** When false, the query will not run automatically. Defaults to true. */
  enabled?: boolean;
  /** Ms within which a cached result is served without refetching. Defaults to 30s. */
  staleTime?: number;
  /**
   * Maximum number of automatic retries after a failure before giving up.
   * Defaults to 3. Set to 0 to disable automatic retries entirely.
   * Manual `refetch()` calls always reset the counter.
   */
  retryCount?: number;
  /**
   * When set, an error toast with this message is surfaced whenever the query
   * errors, re-toasting only when the error identity changes.
   */
  errorMessage?: string;
};

export type UseQueryResult<T> = {
  data: T | undefined;
  error: Error | undefined;
  /** True when there is no cached data yet and a request is in flight. */
  isLoading: boolean;
  /** True whenever a request is in flight (including background refetch). */
  isFetching: boolean;
  refetch: () => Promise<T | undefined>;
};

const DEFAULT_STALE_TIME = 30_000;
const DEFAULT_RETRY_COUNT = 3;

export function useQuery<T>(options: UseQueryOptions<T>): UseQueryResult<T> {
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime = DEFAULT_STALE_TIME,
    retryCount = DEFAULT_RETRY_COUNT,
    errorMessage,
  } = options;

  const key = serializeQueryKey(queryKey);
  // Subscribe only to this key's slice so unrelated cache writes don't re-render.
  const entry = useQueryStore((state) => state.entries[key]);
  const fetchEntry = useQueryStore((state) => state.fetch);
  // Keep the latest fetcher in a ref so effect deps stay stable.
  const fetcherRef = useRef(queryFn);
  fetcherRef.current = queryFn;

  const [manualError, setManualError] = useState<Error | undefined>(undefined);

  // Track consecutive automatic failures to cap retries and prevent infinite loops.
  const failureCountRef = useRef(0);
  const lastKeyRef = useRef(key);

  // Reset failure count when the query key changes.
  if (lastKeyRef.current !== key) {
    lastKeyRef.current = key;
    failureCountRef.current = 0;
  }

  const isStale = entry?.fetchedAt === undefined || Date.now() - entry.fetchedAt > staleTime;

  useEffect(() => {
    if (!enabled) return;
    if (entry?.inflight) return; // already fetching
    if (entry?.status === "success" && !isStale) return; // fresh cache
    if (entry?.status === "error" && failureCountRef.current >= retryCount) return; // retry limit reached
    void fetchEntry(key, () => fetcherRef.current()).catch((error: Error) => {
      // Errors are surfaced via the store entry; swallow here to avoid unhandled rejection.
      failureCountRef.current += 1;
      setManualError(error);
    });
  }, [enabled, key, entry?.inflight, entry?.status, isStale, fetchEntry, retryCount]);

  const refetch = useCallback(async (): Promise<T | undefined> => {
    // Manual refetch resets the failure counter so the user can always retry.
    failureCountRef.current = 0;
    try {
      return await fetchEntry(key, () => fetcherRef.current());
    } catch (error) {
      // `fetch` already normalizes thrown values to Error, but guard here too so a
      // non-Error rejection can't slip through as a miscast (mirrors queryStore).
      failureCountRef.current += 1;
      setManualError(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }, [key, fetchEntry]);

  const isFetching = entry?.status === "pending";
  const isLoading = isFetching && entry?.data === undefined;
  const error = entry?.error ?? manualError;

  // Surface an error toast when requested, re-toasting only when the error
  // identity changes.
  useEffect(() => {
    if (!errorMessage || !error) return;
    toast.error(errorMessage);
  }, [error, errorMessage]);

  return {
    data: entry?.data as T | undefined,
    error,
    isLoading,
    isFetching,
    refetch,
  };
}
