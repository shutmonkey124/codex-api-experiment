import { useCallback, useEffect, useState } from "react";
import type { Currency, RateSnapshot } from "./model";
import {
  fetchRates,
  RATE_CACHE_PREFIX,
  RATE_TTL,
  rateIsOld,
  readCachedRates,
} from "./rates";

export function useRates(base: Currency) {
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(() =>
    readCachedRates(base),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCachedRates(base);
    setSnapshot(cached);
    setError(null);
    if (
      refreshCount === 0 &&
      cached &&
      Date.now() - cached.fetchedAt < RATE_TTL &&
      !rateIsOld(cached)
    ) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    fetchRates(base, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSnapshot(data);
        try {
          localStorage.setItem(RATE_CACHE_PREFIX + base, JSON.stringify(data));
        } catch {
          /* The live response still works. */
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Exchange rates are unavailable.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, refreshCount]);

  return {
    snapshot: snapshot?.base === base ? snapshot : null,
    loading,
    error,
    refresh,
  };
}
