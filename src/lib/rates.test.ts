import { afterEach, describe, expect, it, vi } from "vitest";
import { CURRENCIES } from "./model";
import { fetchRates, rateIsOld, validateRates } from "./rates";

const response = () => ({
  date: "2026-10-23",
  usd: Object.fromEntries(
    CURRENCIES.map(([code]) => [code.toLowerCase(), code === "EUR" ? 0.9 : 1]),
  ),
});
afterEach(() => vi.unstubAllGlobals());

describe("exchange-rate trust and recovery", () => {
  it("validates real provider response shape and filters non-finite rates", () => {
    const data = response();
    data.usd.xxx = NaN;
    data.usd.abc = -1;
    const snapshot = validateRates(data, "USD");
    expect(snapshot.rates.eur).toBe(0.9);
    expect(snapshot.rates.xxx).toBeUndefined();
    expect(snapshot.rates.abc).toBeUndefined();
  });
  it("rejects partial responses, wrong bases, and invalid identity rates", () => {
    expect(() => validateRates({ ...response(), date: "2026-02-30" }, "USD")).toThrow();
    expect(() =>
      validateRates({ date: "2026-10-23", usd: { usd: 1, eur: 0.9 } }, "USD"),
    ).toThrow();
    expect(() => validateRates(response(), "EUR")).toThrow();
    expect(() =>
      validateRates({ ...response(), date: "no date" }, "USD"),
    ).toThrow();
    const data = response();
    data.usd.usd = 2;
    expect(() => validateRates(data, "USD")).toThrow();
  });
  it("requests rates through the same-origin backend", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(response())));
    vi.stubGlobal("fetch", mock);
    const result = await fetchRates("USD");
    expect(result.rates.eur).toBe(0.9);
    expect(mock.mock.calls[0][0]).toBe("/api/rates/usd");
  });
  it("rejects a malformed successful response", async () => {
    const mock = vi.fn().mockResolvedValueOnce(new Response('{"wrong":true}'));
    vi.stubGlobal("fetch", mock);
    await expect(fetchRates("USD")).rejects.toThrow("couldn’t refresh");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("reports a complete outage instead of inventing rates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable")),
    );
    await expect(fetchRates("USD")).rejects.toThrow("couldn’t refresh");
  });
  it("does not retry after the caller aborts", async () => {
    const controller = new AbortController();
    controller.abort();
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    await expect(fetchRates("USD", controller.signal)).rejects.toHaveProperty(
      "name",
      "AbortError",
    );
    expect(mock).not.toHaveBeenCalled();
  });
  it("identifies stale provider dates independently of cache fetch time", () => {
    const snapshot = validateRates(response(), "USD");
    expect(rateIsOld(snapshot, Date.parse("2026-10-24T00:00:00Z"))).toBe(false);
    expect(rateIsOld(snapshot, Date.parse("2026-10-27T00:00:00Z"))).toBe(true);
  });
});
