import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENCIES } from "../src/lib/model";

const data = () => ({
  date: "2026-10-23",
  usd: Object.fromEntries(
    CURRENCIES.map(([code]) => [code.toLowerCase(), code === "EUR" ? 0.9 : 1]),
  ),
});
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("server rate retrieval", () => {
  it("retrieves, validates, and caches a provider response", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(data())));
    vi.stubGlobal("fetch", mock);
    const { getRates } = await import("./rates");
    const first = await getRates("USD");
    expect(first.rates.eur).toBe(0.9);
    expect((await getRates("USD")).date).toBe("2026-10-23");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("uses the documented fallback when the primary fails", async () => {
    const mock = vi
      .fn()
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify(data())));
    vi.stubGlobal("fetch", mock);
    const { getRates } = await import("./rates");
    expect((await getRates("USD")).base).toBe("USD");
    expect(mock.mock.calls[1][0]).toBe(
      "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
    );
  });
  it("coalesces concurrent requests for a single currency", async () => {
    const mock = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify(data())));
    vi.stubGlobal("fetch", mock);
    const { getRates } = await import("./rates");
    const result = await Promise.all([
      getRates("USD"),
      getRates("USD"),
      getRates("USD"),
    ]);
    expect(result).toHaveLength(3);
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("rejects a provider outage and does not cache the failure", async () => {
    const mock = vi.fn().mockRejectedValue(new Error("unavailable"));
    vi.stubGlobal("fetch", mock);
    const { getRates } = await import("./rates");
    await expect(getRates("USD")).rejects.toThrow("unavailable");
    mock.mockResolvedValue(new Response(JSON.stringify(data())));
    expect((await getRates("USD")).base).toBe("USD");
  });
});
