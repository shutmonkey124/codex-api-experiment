import {
  CATEGORY_LABELS,
  type RateSnapshot,
  type Trip,
  type Workspace,
} from "./model";
import { decimal, localTotal, multiplier, summarize } from "./money";

// Prevent spreadsheet formula injection in user-provided cells.
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportCsv(trip: Trip, snapshot: RateSnapshot | null): string {
  const summary = summarize(trip, snapshot);
  if (summary.calculationError) throw new Error(summary.calculationError);
  if (!summary.complete)
    throw new Error(
      "Refresh exchange rates before exporting a complete budget.",
    );
  const rows: string[][] = [
    ["Elsewhere trip budget", trip.name],
    ["Destination", trip.destination],
    ["Dates", trip.startDate, trip.endDate],
    ["Travelers", String(trip.travelers)],
    ["Home currency", trip.homeCurrency],
    ["Reference rate date", snapshot?.date ?? "No conversion needed"],
    [
      "Note",
      "Planning reference rates; card fees and market changes are not included.",
    ],
    [],
    [
      "Item",
      "Category",
      "Unit amount",
      "Currency",
      "Frequency",
      "Per person",
      "Multiplier",
      "Local total",
      `Total (${trip.homeCurrency})`,
      "Status",
    ],
    ...summary.rows.map(({ expense, home }) => [
      expense.name,
      CATEGORY_LABELS[expense.category],
      expense.amount,
      expense.currency,
      expense.frequency,
      expense.perPerson ? "Yes" : "No",
      String(multiplier(expense, trip)),
      decimal(localTotal(expense, trip), expense.currency),
      decimal(home!, trip.homeCurrency),
      expense.booked ? "Booked" : "Estimate",
    ]),
    [],
    ["Subtotal", decimal(summary.subtotal, trip.homeCurrency)],
    [
      `Buffer (${trip.bufferPercent}% of estimates)`,
      decimal(summary.buffer, trip.homeCurrency),
    ],
    ["Planned total", decimal(summary.total, trip.homeCurrency)],
    ["Budget", trip.budget],
    ["Remaining", decimal(summary.remaining, trip.homeCurrency)],
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function backupPlan(trip: Trip): Workspace {
  return { version: 1, plans: [trip], selectedId: trip.id };
}
