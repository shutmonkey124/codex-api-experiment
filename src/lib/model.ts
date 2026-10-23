export const CURRENCIES = [
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["GBP", "British pound"],
  ["AUD", "Australian dollar"],
  ["CAD", "Canadian dollar"],
  ["CHF", "Swiss franc"],
  ["JPY", "Japanese yen"],
  ["CNY", "Chinese yuan"],
  ["HKD", "Hong Kong dollar"],
  ["NZD", "New Zealand dollar"],
  ["SGD", "Singapore dollar"],
  ["THB", "Thai baht"],
  ["INR", "Indian rupee"],
  ["IDR", "Indonesian rupiah"],
  ["KRW", "South Korean won"],
  ["VND", "Vietnamese dong"],
  ["MYR", "Malaysian ringgit"],
  ["PHP", "Philippine peso"],
  ["MXN", "Mexican peso"],
  ["BRL", "Brazilian real"],
  ["ARS", "Argentine peso"],
  ["CLP", "Chilean peso"],
  ["COP", "Colombian peso"],
  ["PEN", "Peruvian sol"],
  ["ZAR", "South African rand"],
  ["MAD", "Moroccan dirham"],
  ["EGP", "Egyptian pound"],
  ["TRY", "Turkish lira"],
  ["AED", "UAE dirham"],
  ["SAR", "Saudi riyal"],
  ["ILS", "Israeli shekel"],
  ["NOK", "Norwegian krone"],
  ["SEK", "Swedish krona"],
  ["DKK", "Danish krone"],
  ["PLN", "Polish złoty"],
  ["CZK", "Czech koruna"],
  ["HUF", "Hungarian forint"],
  ["RON", "Romanian leu"],
  ["ISK", "Icelandic króna"],
  ["TWD", "Taiwan dollar"],
  ["KWD", "Kuwaiti dinar"],
  ["BHD", "Bahraini dinar"],
] as const;

export type Currency = (typeof CURRENCIES)[number][0];
export const CATEGORIES = [
  "stay",
  "transport",
  "food",
  "experiences",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABELS: Record<Category, string> = {
  stay: "Places to stay",
  transport: "Getting around",
  food: "Food & drink",
  experiences: "Experiences",
  other: "The little extras",
};
export type Frequency = "once" | "night" | "day";

export interface Expense {
  id: string;
  name: string;
  amount: string;
  currency: Currency;
  category: Category;
  frequency: Frequency;
  perPerson: boolean;
  booked: boolean;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  homeCurrency: Currency;
  localCurrency: Currency;
  budget: string;
  bufferPercent: number;
  expenses: Expense[];
  isExample: boolean;
}

export interface Workspace {
  version: 1;
  plans: Trip[];
  selectedId: string;
}

export interface RateSnapshot {
  base: Currency;
  date: string;
  fetchedAt: number;
  rates: Record<string, number>;
}

export const MAX_PLANS = 20;
export const MAX_EXPENSES = 200;
export const MAX_NIGHTS = 365;
export const id = () => crypto.randomUUID();
export const isCurrency = (value: unknown): value is Currency =>
  typeof value === "string" && CURRENCIES.some(([code]) => code === value);

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function nights(trip: Pick<Trip, "startDate" | "endDate">): number {
  return Math.round(
    (Date.parse(`${trip.endDate}T00:00:00Z`) -
      Date.parse(`${trip.startDate}T00:00:00Z`)) /
      86_400_000,
  );
}

export function createTrip(): Trip {
  const startDate = addDays(today(), 30);
  return {
    id: id(),
    name: "",
    destination: "",
    startDate,
    endDate: addDays(startDate, 4),
    travelers: 2,
    homeCurrency: "USD",
    localCurrency: "EUR",
    budget: "1600",
    bufferPercent: 10,
    expenses: [],
    isExample: false,
  };
}

export function createExample(): Trip {
  const trip = createTrip();
  const expense = (
    name: string,
    amount: string,
    currency: Currency,
    category: Category,
    frequency: Frequency,
    perPerson = false,
    booked = false,
  ): Expense => ({
    id: id(),
    name,
    amount,
    currency,
    category,
    frequency,
    perPerson,
    booked,
  });
  return {
    ...trip,
    name: "Lisbon, at our own pace",
    destination: "Lisbon, Portugal",
    isExample: true,
    expenses: [
      expense("A sunny little apartment", "92", "EUR", "stay", "night"),
      expense(
        "Flights to Lisbon",
        "180",
        "USD",
        "transport",
        "once",
        true,
        true,
      ),
      expense("Long lunches & late dinners", "24", "EUR", "food", "day", true),
      expense("Pastéis & coffee stops", "5", "EUR", "food", "day", true),
      expense(
        "Trams, trains & getting lost",
        "7",
        "EUR",
        "transport",
        "day",
        true,
      ),
      expense("A day out in Sintra", "32", "EUR", "experiences", "once", true),
      expense("Airport transfers", "26", "EUR", "transport", "once"),
    ],
  };
}

export function createWorkspace(): Workspace {
  const sample = createExample();
  return { version: 1, plans: [sample], selectedId: sample.id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function text(value: unknown, max: number): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}

function validAmount(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{1,9}(\.\d{1,3})?$/.test(value) &&
    Number(value) <= 10_000_000
  );
}

export function validateTrip(value: unknown): Trip {
  if (
    !isRecord(value) ||
    !text(value.id, 100) ||
    !text(value.name, 80) ||
    !text(value.destination, 80) ||
    !validDate(value.startDate) ||
    !validDate(value.endDate) ||
    !Number.isInteger(value.travelers) ||
    Number(value.travelers) < 1 ||
    Number(value.travelers) > 50 ||
    !isCurrency(value.homeCurrency) ||
    !isCurrency(value.localCurrency) ||
    !validAmount(value.budget) ||
    !Number.isInteger(value.bufferPercent) ||
    Number(value.bufferPercent) < 0 ||
    Number(value.bufferPercent) > 30 ||
    !Array.isArray(value.expenses) ||
    value.expenses.length > MAX_EXPENSES ||
    typeof value.isExample !== "boolean"
  ) {
    throw new Error(
      "This plan has missing or invalid details. Check the dates, currencies, and amounts.",
    );
  }
  const trip = value as unknown as Trip;
  if (nights(trip) < 0 || nights(trip) > MAX_NIGHTS)
    throw new Error("A trip must last between 1 and 366 days.");
  const expenseIds = new Set<string>();
  for (const item of trip.expenses) {
    if (
      !isRecord(item) ||
      !text(item.id, 100) ||
      expenseIds.has(item.id) ||
      !text(item.name, 100) ||
      !validAmount(item.amount) ||
      !isCurrency(item.currency) ||
      !CATEGORIES.includes(item.category) ||
      !["once", "night", "day"].includes(item.frequency) ||
      typeof item.perPerson !== "boolean" ||
      typeof item.booked !== "boolean"
    ) {
      throw new Error("One of the costs in this plan is invalid.");
    }
    expenseIds.add(item.id);
  }
  return structuredClone(trip);
}

export function validateWorkspace(value: unknown): Workspace {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.plans) ||
    !value.plans.length ||
    value.plans.length > MAX_PLANS ||
    typeof value.selectedId !== "string"
  ) {
    throw new Error(
      "This is not an Elsewhere backup, or its version is unsupported.",
    );
  }
  const plans = value.plans.map(validateTrip);
  if (
    new Set(plans.map((plan) => plan.id)).size !== plans.length ||
    !plans.some((plan) => plan.id === value.selectedId)
  ) {
    throw new Error("This backup contains duplicate or missing plans.");
  }
  return { version: 1, plans, selectedId: value.selectedId };
}
