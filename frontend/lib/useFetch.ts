"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

type State<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  slow: boolean;
};

const NETWORK_FAILED = new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");

/**
 * Tiny data hook for client pages. Re-fetches when `key` changes, aborts
 * in-flight requests, and exposes `slow` after 4s so pages can show the
 * "Waking up the server" hint under the skeleton.
 */
export function useFetch<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true, slow: false });
  const fetcherRef = useRef(fetcher);
  const controllerRef = useRef<AbortController | null>(null);

  // Fetchers close over props; refresh the ref after each render so a fetch
  // always runs the latest version. Assigning in an effect keeps refs out of render.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const attempt = useCallback(async () => {
    // Abort whatever is still in flight so only the latest response wins.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({ ...prev, error: null, loading: true, slow: false }));
    const slowTimer = setTimeout(() => setState((prev) => ({ ...prev, slow: true })), 4000);
    try {
      const data = await fetcherRef.current(controller.signal);
      setState({ data, error: null, loading: false, slow: false });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        data: null,
        error: err instanceof ApiError ? err : NETWORK_FAILED,
        loading: false,
        slow: false,
      });
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  useEffect(() => {
    // Data fetching keyed on `key`; resetting the loading flag here is cache
    // invalidation, not the cascading render this rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    attempt();
    return () => controllerRef.current?.abort();
  }, [key, attempt]);

  const reload = useCallback(() => attempt(), [attempt]);

  return { ...state, reload };
}
