import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CURRENCIES, createExample } from "../../src/lib/model";

// Deliberately synthetic rates for deterministic UI assertions. Real endpoints
// are exercised separately by `npm run verify:api` and live browser checks.
async function mockRates(page: Page) {
  await page.route("**/api/rates/*", (route) => {
    const base = route.request().url().split("/").pop()!.toLowerCase();
    const usd = Object.fromEntries(
      CURRENCIES.map(([code]) => [code.toLowerCase(), 1]),
    );
    Object.assign(usd, { usd: 1, eur: 0.8, jpy: 150, gbp: 0.7 });
    const rates = Object.fromEntries(
      Object.entries(usd).map(([code, value]) => [code, value / usd[base]]),
    );
    return route.fulfill({
      json: { date: new Date().toISOString().slice(0, 10), [base]: rates },
    });
  });
}

async function freshPlan(page: Page) {
  await page.getByRole("button", { name: "New plan", exact: true }).click();
  await page.getByLabel("Give your trip a name").fill("Four days in Tokyo");
  await page.getByLabel("Where are you headed?").fill("Tokyo, Japan");
  await page.getByLabel("Arrival", { exact: true }).fill("2027-04-01");
  await page.getByLabel("Departure", { exact: true }).fill("2027-04-04");
  await page
    .getByRole("combobox", { name: "Local currency", exact: true })
    .selectOption("JPY");
  await page.getByLabel("Total group budget").fill("2000");
  await page.getByRole("button", { name: "Create my plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Four days in Tokyo" }),
  ).toBeVisible();
}

async function addCost(
  page: Page,
  name: string,
  amount: string,
  frequency: "once" | "night" | "day" = "once",
  perPerson = false,
) {
  await page.getByRole("button", { name: "Add a cost", exact: true }).click();
  await page.getByLabel("What are you planning for?").fill(name);
  await page.getByLabel("Unit cost", { exact: true }).fill(amount);
  await page.getByLabel("How often?").selectOption(frequency);
  if (perPerson) await page.getByLabel("For each traveler").check();
  await page.getByRole("button", { name: "Add to my plan" }).click();
}

test.beforeEach(async ({ page }) => {
  await mockRates(page);
  await page.goto("/");
});

test("has no detected WCAG A/AA accessibility violations on the planner and trip form", async ({
  page,
}) => {
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  await page.evaluate(() => document.fonts.ready);
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("button", { name: "New plan", exact: true }).click();
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("explains sample data, calculates a complete budget, and fits the viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  await expect(
    page.getByText("These sample costs are estimates", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit A sunny little apartment" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".remaining-box")
      .getByText("$115.25 left to play with", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("planner.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("creates a trip, converts recurring local costs, and excludes bookings from the buffer", async ({
  page,
}) => {
  await freshPlan(page);
  await addCost(page, "A quiet hotel", "15000", "night");
  await expect(page.getByTestId("grand-total")).toHaveText("$330.00");
  await addCost(page, "Good sushi", "3000", "day", true);
  await expect(page.getByTestId("grand-total")).toHaveText("$506.00");
  await page
    .getByRole("button", { name: "Edit A quiet hotel", exact: true })
    .click();
  await page.getByLabel("Already booked").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("$476.00");
  await page.reload();
  await expect(page.getByTestId("grand-total")).toHaveText("$476.00");
  await expect(
    page.getByRole("heading", { name: "Four days in Tokyo" }),
  ).toBeVisible();
});

test("edits, removes, and restores a cost with undo", async ({ page }) => {
  await page
    .getByRole("button", { name: "Edit A sunny little apartment", exact: true })
    .click();
  await page.getByLabel("Unit cost", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,528.75");
  await page
    .getByRole("button", { name: "Edit A sunny little apartment", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove cost", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Edit A sunny little apartment",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,528.75");
});

test("previews an extra night before applying it", async ({ page }) => {
  await page
    .getByRole("button", { name: "Play with the possibilities" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("$225.50 more for the group")).toBeVisible();
  await expect(dialog.getByText("$1,710.25", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Keep my plan" }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  await page
    .getByRole("button", { name: "Play with the possibilities" })
    .click();
  await page.getByRole("button", { name: "Make this the plan" }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,710.25");
  await expect(
    page
      .locator(".remaining-box")
      .getByText("$110.25 over budget", { exact: true }),
  ).toBeVisible();
});

test("changes home currency and converts the budget instead of relabeling it", async ({
  page,
}) => {
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  await page.getByRole("button", { name: "Make it yours" }).click();
  await page
    .getByRole("combobox", { name: "Home currency", exact: true })
    .selectOption("EUR");
  await expect(page.getByLabel("Total group budget")).toHaveValue("1280.00");
  await page.getByRole("button", { name: "Save trip", exact: true }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("€1,187.80");
  await expect(
    page.getByRole("heading", { name: "Lisbon, at our own pace" }),
  ).toBeVisible();
  await expect(page.getByText("EXAMPLE PLAN", { exact: true })).toHaveCount(0);
});

test("filters costs and reports an empty category", async ({ page }) => {
  await page.getByRole("button", { name: "Stays", exact: true }).click();
  await expect(page.locator(".expense-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Extras", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nothing here. Yet." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show everything" }).click();
  await expect(page.locator(".expense-row")).toHaveCount(7);
});

test("exports a real CSV download and a round-trippable JSON backup", async ({
  page,
}) => {
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  let downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const csv = await downloadPromise;
  expect(csv.suggestedFilename()).toBe("lisbon-at-our-own-pace.csv");
  const csvStream = await csv.createReadStream();
  let contents = "";
  for await (const chunk of csvStream!) contents += chunk;
  expect(contents).toContain('"Planned total","1484.75"');
  await page.getByRole("button", { name: "Download and manage plan" }).click();
  downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download your plan", exact: false })
    .click();
  const json = await downloadPromise;
  const jsonStream = await json.createReadStream();
  let backup = "";
  for await (const chunk of jsonStream!) backup += chunk;
  expect(JSON.parse(backup).plans[0].expenses).toHaveLength(7);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByLabel("Import Elsewhere backup file")
    .setInputFiles({
      name: "trip.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "Plan imported" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Choose a plan" }).locator("option"),
  ).toHaveCount(2);
});

test("rejects a malformed import and preserves existing plans", async ({
  page,
}) => {
  await page
    .getByLabel("Import Elsewhere backup file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad json"),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "isn’t valid JSON" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lisbon, at our own pace" }),
  ).toBeVisible();
});

test("handles unavailable rates without a fabricated total, then recovers", async ({
  page,
}) => {
  await page.unroute("**/api/rates/*");
  await page.route("**/api/rates/*", (route) =>
    route.fulfill({ status: 502, json: { error: "Unavailable" } }),
  );
  await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("elsewhere.rates."))
      .forEach((key) => localStorage.removeItem(key)),
  );
  await page.reload();
  await expect(page.getByTestId("grand-total")).toHaveText("Rates needed");
  await expect(
    page.getByText("Your costs are safe. No guessed conversions."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export CSV", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/api/rates/*");
  await mockRates(page);
  await page.getByRole("button", { name: "Refresh exchange rates" }).click();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
});

test("keeps saved rates during an outage and marks them clearly", async ({
  page,
}) => {
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  await page.unroute("**/api/rates/*");
  await page.route("**/api/rates/*", (route) =>
    route.fulfill({ status: 502, json: { error: "Unavailable" } }),
  );
  await page.getByRole("button", { name: "Refresh exchange rates" }).click();
  await expect(
    page.getByText("Refresh failed. Totals use the saved reference rates."),
  ).toBeVisible();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
});

test("preserves corrupted saved data until a recovery backup is downloaded", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem("elsewhere.workspace.v1", "corrupt but recoverable"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "We haven’t overwritten them",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("elsewhere.workspace.v1")),
  ).toBe("corrupt but recoverable");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download recovery & enable saving" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("elsewhere-recovery.json");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("provides keyboard dialog focus, escape, and a detailed privacy explanation", async ({
  page,
}) => {
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("Plans don’t sync automatically.", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Clearing browser data removes plans.", { exact: false }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Add a cost", exact: true }).click();
  await expect(page.getByLabel("What are you planning for?")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("duplicates a plan and deletes the copy without losing the original", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Download and manage plan" }).click();
  await page
    .getByRole("button", { name: "Make a second version", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lisbon, at our own pace (copy)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit trip", exact: true }).click();
  await page.getByRole("button", { name: "Delete plan", exact: true }).click();
  await page.getByRole("button", { name: "Delete plan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lisbon, at our own pace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Choose a plan" }).locator("option"),
  ).toHaveCount(1);
});

test("imports a schema-validated trip without sending private costs to the API", async ({
  page,
}) => {
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) requests.push({ url: request.url(), method: request.method(), body: request.postData() });
  });
  const plan = createExample();
  plan.id = "imported";
  plan.name = "Our private holiday";
  await page
    .getByLabel("Import Elsewhere backup file")
    .setInputFiles({
      name: "ours.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ version: 1, plans: [plan], selectedId: "imported" }),
      ),
    });
  await expect(
    page.getByRole("heading", { name: "Our private holiday" }),
  ).toBeVisible();
  await expect(page.getByTestId("grand-total")).toHaveText("$1,484.75");
  const response = page.waitForResponse((result) => result.url().includes('/api/rates/'));
  await page.getByRole('button', { name: 'Refresh exchange rates' }).click();
  await response;
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((request) => /\/api\/rates\/[a-z]{3}$/.test(request.url) && request.method === 'GET' && request.body === null)).toBe(
    true,
  );
});
