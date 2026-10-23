import {
  CURRENCIES,
  type Currency,
  type RateSnapshot,
} from "../src/lib/model.ts";
import { validateRates } from "../src/lib/rates.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<Currency, RateSnapshot>();
const inFlight = new Map<Currency, Promise<RateSnapshot>>();

export async function getRates(base: Currency): Promise<RateSnapshot> {
  const cached = cache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;
  const pending = inFlight.get(base);
  if (pending) return pending;
  const request = (async () => {
    const code = base.toLowerCase();
    const urls = [
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`,
      `https://latest.currency-api.pages.dev/v1/currencies/${code}.json`,
    ];
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) continue;
        const snapshot = validateRates(await response.json(), base);
        cache.set(base, snapshot);
        return snapshot;
      } catch {
        /* Try the documented secondary host; keep TLS verification enabled. */
      }
    }
    throw new Error("The exchange-rate provider is unavailable.");
  })();
  inFlight.set(base, request);
  try {
    return await request;
  } finally {
    inFlight.delete(base);
  }
}

export async function ratesMiddleware(
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) {
    next();
    return;
  }
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  const match = /^\/api\/rates\/([a-zA-Z]{3})$/.exec(url.pathname);
  if (!match || !CURRENCIES.some(([code]) => code === match[1].toUpperCase())) {
    response
      .writeHead(404)
      .end(
        JSON.stringify({
          error: "Unknown exchange-rate endpoint or unsupported currency.",
        }),
      );
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response
      .writeHead(405)
      .end(JSON.stringify({ error: "Use GET for exchange rates." }));
    return;
  }
  try {
    const base = match[1].toUpperCase() as Currency;
    const snapshot = await getRates(base);
    response.setHeader("Cache-Control", "public, max-age=300");
    response
      .writeHead(200)
      .end(
        request.method === "HEAD"
          ? undefined
          : JSON.stringify({
              date: snapshot.date,
              [base.toLowerCase()]: snapshot.rates,
            }),
      );
  } catch {
    response.setHeader("Cache-Control", "no-store");
    response
      .writeHead(502)
      .end(
        JSON.stringify({
          error:
            "We couldn’t refresh exchange rates. Your saved plans are unaffected. Try again shortly.",
        }),
      );
  }
}
