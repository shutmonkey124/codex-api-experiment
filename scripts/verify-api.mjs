import assert from "node:assert/strict";
import { CURRENCIES } from "../src/lib/model.ts";

const root = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api";
async function get(path) {
  const response = await fetch(root + path, {
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200, path);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "*",
    "Browser CORS must be enabled",
  );
  return response.json();
}
const usd = await get("@latest/v1/currencies/usd.json");
const eur = await get("@latest/v1/currencies/eur.json");
const names = await get("@latest/v1/currencies.json");
assert.match(usd.date, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(usd.usd.usd, 1);
assert.equal(eur.eur.eur, 1);
assert.ok(Object.keys(usd.usd).length > 150);
assert.ok(usd.usd.eur > 0 && usd.usd.jpy > 0 && usd.usd.kwd > 0);
for (const [code] of CURRENCIES) {
  assert.ok(
    Number.isFinite(usd.usd[code.toLowerCase()]) &&
      usd.usd[code.toLowerCase()] > 0,
    `${code} must have a usable reference rate`,
  );
}
assert.equal(names.usd, "US Dollar");
if (usd.date === eur.date)
  assert.ok(
    Math.abs(usd.usd.eur * eur.eur.usd - 1) < 0.001,
    "Same-date reciprocal rates must agree",
  );
const historical = await get("@2025-01-15/v1/currencies/usd.json");
assert.equal(historical.date, "2025-01-15");
assert.ok(historical.usd.eur > 0);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      providerDate: usd.date,
      supportedRates: Object.keys(usd.usd).length,
      USD_EUR: usd.usd.eur,
      EUR_USD: eur.eur.usd,
      historicalDate: historical.date,
      cors: "verified",
      status: "passed",
      note: "Real HTTPS requests. No fixtures or mocked responses.",
    },
    null,
    2,
  ),
);
