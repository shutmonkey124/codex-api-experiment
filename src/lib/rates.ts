import type { Currency, RateSnapshot } from "./model.ts";

export const RATE_CACHE_PREFIX = "elsewhere.rates.v1.";
export const RATE_TTL = 6 * 60 * 60 * 1000;

export function validateRates(
  value: unknown,
  base: Currency,
  now = Date.now(),
): RateSnapshot {
  if (!value || typeof value !== "object")
    throw new Error("The exchange-rate service returned an invalid response.");
  const data = value as Record<string, unknown>;
  const rates = data[base.toLowerCase()];
  if (
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    !Number.isFinite(Date.parse(data.date)) ||
    new Date(`${data.date}T00:00:00Z`).toISOString().slice(0, 10) !== data.date ||
    !rates ||
    typeof rates !== "object" ||
    Array.isArray(rates)
  ) {
    throw new Error("The exchange-rate service returned an invalid response.");
  }
  const entries = Object.entries(rates).filter(
    ([code, rate]) =>
      /^[a-z]{3}$/.test(code) &&
      typeof rate === "number" &&
      Number.isFinite(rate) &&
      rate > 0,
  );
  const valid = Object.fromEntries(entries) as Record<string, number>;
  if (valid[base.toLowerCase()] !== 1 || entries.length < 20)
    throw new Error("The exchange-rate response is incomplete.");
  return { base, date: data.date, fetchedAt: now, rates: valid };
}

export async function fetchRates(
  base: Currency,
  signal?: AbortSignal,
): Promise<RateSnapshot> {
  const code = base.toLowerCase();
  const urls = [`/api/rates/${code}`];
  for (const url of urls) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const timeout = AbortSignal.timeout(23_000);
      const response = await fetch(url, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        cache: "no-cache",
      });
      if (!response.ok)
        throw new Error(`Exchange-rate service returned ${response.status}.`);
      return validateRates(await response.json(), base);
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  throw new Error(
    "We couldn’t refresh exchange rates. Check your connection and try again.",
  );
}

export function readCachedRates(base: Currency): RateSnapshot | null {
  try {
    const raw = localStorage.getItem(RATE_CACHE_PREFIX + base);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      data.base !== base ||
      typeof data.fetchedAt !== "number" ||
      data.fetchedAt > Date.now() + 60_000
    )
      return null;
    return validateRates(
      { date: data.date, [base.toLowerCase()]: data.rates },
      base,
      data.fetchedAt,
    );
  } catch {
    return null;
  }
}

export function rateIsOld(snapshot: RateSnapshot, now = Date.now()): boolean {
  return now - Date.parse(`${snapshot.date}T00:00:00Z`) > 3 * 86_400_000;
}
