import {
  CATEGORIES,
  type Currency,
  type Expense,
  type RateSnapshot,
  type Trip,
  nights,
} from "./model";

export function digits(currency: Currency): number {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

// Work in integer minor units. Round at the currency boundary, then add integers.
export function toMinor(value: string, currency: Currency): number {
  const decimals = digits(currency);
  const [whole, fraction = ""] = value.split(".");
  const kept = fraction.padEnd(decimals, "0").slice(0, decimals);
  const roundUp = Number(fraction[decimals] ?? "0") >= 5 ? 1 : 0;
  return Number(whole) * 10 ** decimals + Number(kept || "0") + roundUp;
}

export function money(
  minor: number,
  currency: Currency,
  compact = false,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    ...(compact ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}),
  }).format(minor / 10 ** digits(currency));
}

export function decimal(minor: number, currency: Currency): string {
  return (minor / 10 ** digits(currency)).toFixed(digits(currency));
}

export function multiplier(expense: Expense, trip: Trip): number {
  const periods =
    expense.frequency === "night"
      ? nights(trip)
      : expense.frequency === "day"
        ? nights(trip) + 1
        : 1;
  return periods * (expense.perPerson ? trip.travelers : 1);
}

export function localTotal(expense: Expense, trip: Trip): number {
  return toMinor(expense.amount, expense.currency) * multiplier(expense, trip);
}

export function convertedTotal(
  expense: Expense,
  trip: Trip,
  snapshot: RateSnapshot | null,
): number | null {
  const local = localTotal(expense, trip);
  if (expense.currency === trip.homeCurrency || local === 0)
    return local === 0 ? 0 : local;
  const rate =
    snapshot?.base === trip.homeCurrency
      ? snapshot.rates[expense.currency.toLowerCase()]
      : undefined;
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  return Math.round(
    (local / 10 ** digits(expense.currency) / rate) *
      10 ** digits(trip.homeCurrency),
  );
}

export function summarize(trip: Trip, snapshot: RateSnapshot | null) {
  const rows = trip.expenses.map((expense) => ({
    expense,
    home: convertedTotal(expense, trip, snapshot),
  }));
  const missing = rows
    .filter((row) => row.home === null)
    .map((row) => row.expense.currency);
  const subtotal = rows.reduce((sum, row) => sum + (row.home ?? 0), 0);
  const booked = rows
    .filter((row) => row.expense.booked)
    .reduce((sum, row) => sum + (row.home ?? 0), 0);
  const estimated = subtotal - booked;
  const buffer = Math.round((estimated * trip.bufferPercent) / 100);
  const total = subtotal + buffer;
  const budget = toMinor(trip.budget, trip.homeCurrency);
  const calculationError =
    rows.some((row) => row.home !== null && !Number.isSafeInteger(row.home)) ||
    ![subtotal, booked, estimated, buffer, total, budget].every(Number.isSafeInteger)
      ? "This plan is too large to calculate precisely. Reduce a cost, the stay length, or the group size."
      : null;
  const complete = !missing.length && !calculationError;
  const categories = CATEGORIES.map((category) => ({
    category,
    total: rows
      .filter((row) => row.expense.category === category)
      .reduce((sum, row) => sum + (row.home ?? 0), 0),
  }));
  return {
    rows,
    missing: [...new Set(missing)],
    complete,
    calculationError,
    subtotal,
    booked,
    estimated,
    buffer,
    total,
    budget,
    remaining: budget - total,
    perPerson: Math.round(total / trip.travelers),
    perPersonDay: Math.round(total / trip.travelers / (nights(trip) + 1)),
    categories,
  };
}

export function costDescription(expense: Expense, trip: Trip): string {
  const count = expense.frequency === "night" ? nights(trip) : nights(trip) + 1;
  const period =
    expense.frequency === "once"
      ? "one-off"
      : `${count} ${expense.frequency}${count === 1 ? "" : "s"}`;
  return `${money(toMinor(expense.amount, expense.currency), expense.currency)} × ${period}${expense.perPerson ? ` × ${trip.travelers} ${trip.travelers === 1 ? "person" : "people"}` : " · shared"}`;
}
