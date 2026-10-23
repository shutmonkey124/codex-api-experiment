import { describe, expect, it } from "vitest";
import {
  createTrip,
  nights,
  type Expense,
  type RateSnapshot,
  type Trip,
} from "./model";
import {
  convertedTotal,
  decimal,
  digits,
  localTotal,
  money,
  multiplier,
  summarize,
  toMinor,
} from "./money";

const rates: RateSnapshot = {
  base: "USD",
  date: "2026-10-23",
  fetchedAt: 0,
  rates: { usd: 1, eur: 0.8, jpy: 150, kwd: 0.3 },
};
const trip = (overrides: Partial<Trip> = {}): Trip => ({
  ...createTrip(),
  name: "A real trip",
  destination: "Lisbon",
  startDate: "2026-03-27",
  endDate: "2026-03-31",
  ...overrides,
});
const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "stay",
  name: "Stay",
  amount: "100",
  currency: "EUR",
  category: "stay",
  frequency: "night",
  perPerson: false,
  booked: false,
  ...overrides,
});

describe("trip arithmetic", () => {
  it("counts nights without DST or local timezone drift", () => {
    expect(nights(trip())).toBe(4);
    expect(
      nights(trip({ startDate: "2028-02-28", endDate: "2028-03-01" })),
    ).toBe(2);
  });
  it("scales per-night and per-person prices, then converts once per row", () => {
    const item = expense({ perPerson: true });
    expect(multiplier(item, trip())).toBe(8);
    expect(localTotal(item, trip())).toBe(80000);
    expect(convertedTotal(item, trip(), rates)).toBe(100000);
  });
  it("includes both arrival and departure for daily costs", () => {
    expect(
      multiplier(expense({ frequency: "day", perPerson: true }), trip()),
    ).toBe(10);
  });
  it("supports same-day trips with zero nights and one travel day", () => {
    const day = trip({ endDate: "2026-03-27" });
    expect(multiplier(expense(), day)).toBe(0);
    expect(multiplier(expense({ frequency: "day" }), day)).toBe(1);
    expect(convertedTotal(expense(), day, null)).toBe(0);
  });
  it("adds a contingency to estimates and excludes booked costs", () => {
    const plan = trip({
      expenses: [
        expense(),
        expense({
          id: "flight",
          amount: "180",
          currency: "USD",
          category: "transport",
          frequency: "once",
          perPerson: true,
          booked: true,
        }),
      ],
    });
    const result = summarize(plan, rates);
    expect(result.complete).toBe(true);
    expect(result.subtotal).toBe(86000);
    expect(result.booked).toBe(36000);
    expect(result.buffer).toBe(5000);
    expect(result.total).toBe(91000);
    expect(result.remaining).toBe(69000);
    expect(result.perPerson).toBe(45500);
    expect(result.perPersonDay).toBe(9100);
  });
  it("never substitutes a guessed 1:1 foreign rate", () => {
    expect(convertedTotal(expense(), trip(), null)).toBeNull();
    expect(summarize(trip({ expenses: [expense()] }), null).complete).toBe(
      false,
    );
    expect(
      summarize(trip({ expenses: [expense()] }), { ...rates, base: "EUR" })
        .missing,
    ).toEqual(["EUR"]);
  });
  it("calculates same-currency plans without a network connection", () => {
    const result = summarize(
      trip({ expenses: [expense({ currency: "USD", frequency: "once" })] }),
      null,
    );
    expect(result.complete).toBe(true);
    expect(result.total).toBe(11000);
  });
  it("shows over-budget plans and permits a zero buffer", () => {
    const result = summarize(
      trip({ expenses: [expense()], budget: "100", bufferPercent: 0 }),
      rates,
    );
    expect(result.total).toBe(50000);
    expect(result.remaining).toBe(-40000);
  });
  it("quantifies one more night including the extra travel day and buffer", () => {
    const expenses = [
      expense(),
      expense({
        id: "food",
        amount: "20",
        currency: "USD",
        category: "food",
        frequency: "day",
        perPerson: true,
      }),
    ];
    const before = summarize(trip({ expenses }), rates);
    const after = summarize(trip({ expenses, endDate: "2026-04-01" }), rates);
    expect(after.total - before.total).toBe(18150); // ($125 stay + $40 food) × 1.1
  });
});

describe("money boundaries", () => {
  it("withholds totals that exceed safe integer precision", () => {
    const plan = trip({ expenses: [expense()] });
    const result = summarize(plan, { ...rates, rates: { usd: 1, eur: 1e-15 } });
    expect(result.complete).toBe(false);
    expect(result.calculationError).toContain("too large to calculate precisely");
  });
  it("rounds decimal strings without binary-float cent loss", () => {
    expect(toMinor("1.005", "USD")).toBe(101);
    expect(toMinor("0.29", "USD")).toBe(29);
    expect(toMinor("99.999", "USD")).toBe(10000);
    expect(toMinor("0", "USD")).toBe(0);
  });
  it("respects currencies with zero and three decimal places", () => {
    expect(digits("JPY")).toBe(0);
    expect(digits("KWD")).toBe(3);
    expect(toMinor("100.5", "JPY")).toBe(101);
    expect(toMinor("1.025", "KWD")).toBe(1025);
    expect(decimal(1025, "KWD")).toBe("1.025");
    expect(money(100, "JPY")).toBe("¥100");
  });
  it("converts JPY integer units to USD cents", () => {
    expect(
      convertedTotal(
        expense({ currency: "JPY", amount: "1500", frequency: "once" }),
        trip(),
        rates,
      ),
    ).toBe(1000);
  });
});
