import { describe, expect, it } from "vitest";
import { backupPlan, csvCell, exportCsv } from "./export";
import { createExample, validateWorkspace } from "./model";

describe("portable exports", () => {
  it("round-trips a backup through the import validator", () => {
    const plan = createExample();
    expect(
      validateWorkspace(JSON.parse(JSON.stringify(backupPlan(plan)))).plans[0],
    ).toEqual(plan);
  });
  it("escapes CSV formulas, quotes, and multiline user input", () => {
    expect(csvCell("=SUM(A1:A3)")).toBe('"\'=SUM(A1:A3)"');
    expect(csvCell("  +123")).toBe('"\'  +123"');
    expect(csvCell('A "small" stay\nLisbon')).toBe(
      '"A ""small"" stay\nLisbon"',
    );
  });
  it("refuses an incomplete converted budget", () => {
    expect(() => exportCsv(createExample(), null)).toThrow(
      "Refresh exchange rates",
    );
  });
  it("includes every line and the buffer in a complete report", () => {
    const plan = createExample();
    plan.expenses = plan.expenses.map((expense) => ({
      ...expense,
      currency: "USD",
    }));
    const report = exportCsv(plan, null);
    expect(report).toContain('"Planned total"');
    expect(report).toContain('"Buffer (10% of estimates)"');
    expect(report).toContain('"No conversion needed"');
    for (const expense of plan.expenses)
      expect(report).toContain(csvCell(expense.name));
  });
});
