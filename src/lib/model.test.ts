import { describe, expect, it } from "vitest";
import { createExample, validateTrip, validateWorkspace } from "./model";

describe("untrusted backups and saved plans", () => {
  it("accepts a complete valid backup and returns an independent copy", () => {
    const plan = createExample();
    const backup = { version: 1, plans: [plan], selectedId: plan.id };
    const result = validateWorkspace(backup);
    expect(result).toEqual(backup);
    expect(result.plans[0]).not.toBe(plan);
  });
  it.each([
    [
      "negative amount",
      { expenses: [{ ...createExample().expenses[0], amount: "-2" }] },
    ],
    ["huge amount", { budget: "10000000000" }],
    ["malformed currency", { homeCurrency: "../../usd" }],
    ["invalid day", { startDate: "2026-02-30", endDate: "2026-03-02" }],
    ["reverse dates", { startDate: "2026-05-04", endDate: "2026-05-03" }],
    ["excessive duration", { startDate: "2026-01-01", endDate: "2027-02-01" }],
    ["fractional travelers", { travelers: 1.5 }],
    ["excessive travelers", { travelers: 51 }],
    ["excessive buffer", { bufferPercent: 100 }],
    ["empty name", { name: "   " }],
  ])("rejects %s", (_name, override) => {
    expect(() => validateTrip({ ...createExample(), ...override })).toThrow();
  });
  it("rejects duplicate expense identifiers and unsupported schema versions", () => {
    const plan = createExample();
    expect(() =>
      validateTrip({ ...plan, expenses: [plan.expenses[0], plan.expenses[0]] }),
    ).toThrow();
    expect(() =>
      validateWorkspace({ version: 2, plans: [plan], selectedId: plan.id }),
    ).toThrow();
    expect(() =>
      validateWorkspace({
        version: 1,
        plans: [plan, plan],
        selectedId: plan.id,
      }),
    ).toThrow();
    expect(() =>
      validateWorkspace({ version: 1, plans: [plan], selectedId: "missing" }),
    ).toThrow();
  });
});
