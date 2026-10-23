import { useState } from "react";
import {
  ArrowRight,
  BedDouble,
  Bus,
  Check,
  ChevronDown,
  CircleHelp,
  CloudOff,
  Coffee,
  Download,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  MAX_EXPENSES,
  MAX_NIGHTS,
  addDays,
  nights,
  type Category,
  type Expense,
  type RateSnapshot,
  type Trip,
} from "../lib/model";
import { costDescription, localTotal, money, summarize } from "../lib/money";
import { rateIsOld } from "../lib/rates";

export const CategoryIcon = {
  stay: BedDouble,
  transport: Bus,
  food: Coffee,
  experiences: Ticket,
  other: ShoppingBag,
};

export function ExpenseList({
  trip,
  snapshot,
  onEdit,
  onAdd,
  onExport,
}: {
  trip: Trip;
  snapshot: RateSnapshot | null;
  onEdit: (expense: Expense) => void;
  onAdd: () => void;
  onExport: () => void;
}) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const summary = summarize(trip, snapshot);
  const visible = summary.rows.filter(
    (row) => filter === "all" || row.expense.category === filter,
  );
  return (
    <section className="expense-section" aria-labelledby="expense-heading">
      <div className="section-header">
        <div>
          <p className="eyebrow">THE DETAILS MAKE THE DIFFERENCE</p>
          <h2 id="expense-heading">Every little part of the trip.</h2>
        </div>
        <button
          className="button button-primary button-small"
          onClick={onAdd}
          disabled={trip.expenses.length >= MAX_EXPENSES}
        >
          <Plus size={17} />
          Add a cost
        </button>
      </div>
      <div className="category-filters" aria-label="Filter costs by category">
        <button
          className={filter === "all" ? "filter active" : "filter"}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Everything<span>{trip.expenses.length}</span>
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            className={filter === category ? "filter active" : "filter"}
            aria-pressed={filter === category}
            onClick={() => setFilter(category)}
          >
            {category === "stay"
              ? "Stays"
              : category === "transport"
                ? "Transport"
                : category === "food"
                  ? "Food & drink"
                  : category === "other"
                    ? "Extras"
                    : "Experiences"}
          </button>
        ))}
      </div>
      <div className="expense-table">
        <div className="table-heading">
          <span>WHAT’S ON THE LIST</span>
          <span>TRIP TOTAL · {trip.homeCurrency}</span>
        </div>
        {visible.length ? (
          visible.map(({ expense, home }) => {
            const Icon = CategoryIcon[expense.category];
            return (
              <button
                key={expense.id}
                className="expense-row"
                aria-label={`Edit ${expense.name}`}
                onClick={() => onEdit(expense)}
              >
                <span className={`category-icon category-${expense.category}`}>
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <span className="expense-info">
                  <span className="expense-title">
                    {expense.name}
                    {expense.booked && (
                      <span className="booked-tag">
                        <Check size={10} />
                        Booked
                      </span>
                    )}
                  </span>
                  <span className="expense-description">
                    {costDescription(expense, trip)}
                  </span>
                </span>
                <span className="expense-price">
                  <strong>
                    {home === null || !Number.isSafeInteger(home) ? "—" : money(home, trip.homeCurrency)}
                  </strong>
                  <small>
                    {expense.currency !== trip.homeCurrency
                      ? `${money(localTotal(expense, trip), expense.currency)} ${expense.currency}`
                      : "in your home currency"}
                  </small>
                </span>
                <Pencil size={14} className="row-pencil" />
              </button>
            );
          })
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Wallet size={28} strokeWidth={1.3} />
            </span>
            <h3>
              {filter === "all"
                ? "Big adventures start with a small list."
                : "Nothing here. Yet."}
            </h3>
            <p>
              {filter === "all"
                ? "Add your stay, a way to get there, and the little things in between. Rough estimates are a great start."
                : "Add a cost in this category, or go back to everything."}
            </p>
            <button
              className="button button-secondary"
              onClick={() => (filter === "all" ? onAdd() : setFilter("all"))}
            >
              {filter === "all" ? "Add your first cost" : "Show everything"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {trip.expenses.length > 0 && (
          <button
            className="add-row"
            onClick={onAdd}
            disabled={trip.expenses.length >= MAX_EXPENSES}
          >
            <Plus size={17} />
            {trip.expenses.length >= MAX_EXPENSES
              ? "Maximum 200 costs per plan"
              : "Something else to look forward to?"}
          </button>
        )}
        <div className="table-footer">
          <span>
            <Info size={14} />
            Tap any cost to fine-tune it.
          </span>
          <button
            className="button-text"
            onClick={onExport}
            disabled={!summary.complete}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>
    </section>
  );
}

export function BudgetSummary({
  trip,
  snapshot,
  loading,
  error,
  onRefresh,
  onBuffer,
  onEdit,
}: {
  trip: Trip;
  snapshot: RateSnapshot | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onBuffer: (value: number) => void;
  onEdit: () => void;
}) {
  const summary = summarize(trip, snapshot);
  const old = snapshot && rateIsOld(snapshot);
  const stale = !!error || old;
  const progress =
    summary.budget > 0
      ? Math.min((summary.total / summary.budget) * 100, 100)
      : 0;
  return (
    <section
      className="budget-card"
      id="budget-overview"
      aria-labelledby="budget-heading"
    >
      <div className="budget-card-top">
        <span className="eyebrow" id="budget-heading">
          THE BIG PICTURE
        </span>
        <span className="currency-chip">{trip.homeCurrency}</span>
      </div>
      <p className="total-label">Your trip, all in.</p>
      <div className="grand-total" data-testid="grand-total" aria-live="polite">
        {summary.complete ? (
          money(summary.total, trip.homeCurrency)
        ) : (
          <span className="total-unavailable">
              {summary.calculationError ? "Check costs" : loading ? "Finding rates…" : "Rates needed"}
          </span>
        )}
      </div>
      <button className="budget-target" onClick={onEdit}>
        of a {money(summary.budget, trip.homeCurrency, true)} group budget
        <Pencil size={12} />
      </button>
      {summary.complete ? (
        <>
          <div
            className="budget-progress"
            role="meter"
            aria-label="Budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${Math.round(summary.budget ? (summary.total / summary.budget) * 100 : 0)}% of budget planned`}
          >
            {summary.categories
              .filter((category) => category.total > 0)
              .map((category) => (
                <span
                  className={`category-fill-${category.category}`}
                  key={category.category}
                  style={{
                    width: `${summary.total > 0 ? (category.total / summary.total) * progress : 0}%`,
                  }}
                />
              ))}
            <span
              className="buffer-fill"
              style={{
                width: `${summary.total > 0 ? (summary.buffer / summary.total) * progress : 0}%`,
              }}
            />
          </div>
          <div
            className={`remaining-box ${summary.remaining < 0 ? "over-budget" : ""}`}
          >
            <span className="remaining-icon">
              {summary.remaining < 0 ? (
                <TrendingUp size={20} />
              ) : (
                <Sparkles size={20} />
              )}
            </span>
            <div>
              <strong>
                {money(Math.abs(summary.remaining), trip.homeCurrency)}{" "}
                {summary.remaining < 0 ? "over budget" : "left to play with"}
              </strong>
              <p>
                {summary.remaining < 0
                  ? "A little fine-tuning can bring it back."
                  : summary.total === 0
                    ? "Your next adventure starts here."
                    : "A little room for the unexpected."}
              </p>
            </div>
          </div>
          <div className="per-person">
            <div>
              <Users size={15} />
              <span>
                Per person
                <strong>{money(summary.perPerson, trip.homeCurrency)}</strong>
              </span>
            </div>
            <div>
              <span>
                Per person / day
                <strong>
                  {money(summary.perPersonDay, trip.homeCurrency)}
                </strong>
              </span>
            </div>
          </div>
          <div className="budget-breakdown">
            <div>
              <span>Already booked</span>
              <strong>{money(summary.booked, trip.homeCurrency)}</strong>
            </div>
            <div>
              <span>Still an estimate</span>
              <strong>{money(summary.estimated, trip.homeCurrency)}</strong>
            </div>
            <div>
              <span>Room-for-life buffer</span>
              <strong>{money(summary.buffer, trip.homeCurrency)}</strong>
            </div>
          </div>
        </>
      ) : (
        <div className="missing-rates">
          <CloudOff size={25} />
          <p>
            {summary.calculationError ?? `We need a reference rate for ${summary.missing.join(", ")} before showing a complete total.`}
          </p>
          <span>Your costs are safe. No guessed conversions.</span>
        </div>
      )}
      <div className="buffer-control">
        <div>
          <label htmlFor="buffer">
            A little breathing room
            <CircleHelp size={14} />
          </label>
          <output htmlFor="buffer">{trip.bufferPercent}%</output>
        </div>
        <input
          id="buffer"
          type="range"
          min="0"
          max="30"
          step="1"
          value={trip.bufferPercent}
          onChange={(event) => onBuffer(Number(event.target.value))}
          style={
            {
              "--range-progress": `${(trip.bufferPercent / 30) * 100}%`,
            } as React.CSSProperties
          }
        />
        <p>Added to estimates only. Booked costs stay fixed.</p>
      </div>
      <div className={`rate-status ${stale ? "rate-warning" : ""}`}>
        <div>
          <span className={`status-dot ${stale ? "warning" : ""}`} />
          <span>
            {snapshot
              ? `${error ? "Saved" : old ? "Older" : "Daily"} rates · ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${snapshot.date}T12:00:00Z`))}`
              : loading
                ? "Loading daily exchange rates"
                : "Exchange rates unavailable"}
          </span>
          <button
            className={`icon-button ${loading ? "spinning" : ""}`}
            aria-label="Refresh exchange rates"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {error && (
          <p role="status">
            {snapshot
              ? "Refresh failed. Totals use the saved reference rates."
              : error}
          </p>
        )}
        {old && !error && (
          <p role="status">
            These rates are more than 3 days old. Refresh before making a
            decision.
          </p>
        )}
        <small>Planning rates, not bank quotes. Card fees may apply.</small>
      </div>
    </section>
  );
}

export function ScenarioTeaser({
  trip,
  snapshot,
  onOpen,
}: {
  trip: Trip;
  snapshot: RateSnapshot | null;
  onOpen: () => void;
}) {
  const current = summarize(trip, snapshot);
  const extended = summarize(
    { ...trip, endDate: addDays(trip.endDate, 1) },
    snapshot,
  );
  const canExtend = nights(trip) < MAX_NIGHTS;
  return (
    <section className="scenario-teaser">
      <span className="scenario-icon">
        <BedDouble size={21} strokeWidth={1.5} />
      </span>
      <div>
        <p className="eyebrow">THE “WHAT IF” CORNER</p>
        <h3>One more night?</h3>
        <p>
          {current.complete && trip.expenses.length && canExtend ? (
            <>
              Your recurring costs would add{" "}
              <strong>
                {money(extended.total - current.total, trip.homeCurrency)}
              </strong>
              , buffer included.
            </>
          ) : (
            "Try different dates or group sizes before you decide."
          )}
        </p>
        <button className="button-text" onClick={onOpen}>
          Play with the possibilities
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

export function ScenarioForm({
  trip,
  snapshot,
  onApply,
  onCancel,
}: {
  trip: Trip;
  snapshot: RateSnapshot | null;
  onApply: (next: Trip) => void;
  onCancel: () => void;
}) {
  const [nightCount, setNightCount] = useState(
    Math.min(nights(trip) + 1, MAX_NIGHTS),
  );
  const [travelers, setTravelers] = useState(trip.travelers);
  const next = {
    ...trip,
    endDate: addDays(trip.startDate, nightCount),
    travelers,
  };
  const current = summarize(trip, snapshot);
  const scenario = summarize(next, snapshot);
  const delta = scenario.total - current.total;
  return (
    <div className="scenario-form">
      <p className="form-intro">
        An extra sunset? A friend joining in? See what changes before changing
        your plan.
      </p>
      <div className="scenario-inputs">
        {[
          {
            label: "Nights away",
            value: nightCount,
            change: setNightCount,
            min: 0,
            max: MAX_NIGHTS,
            icon: BedDouble,
          },
          {
            label: "People coming",
            value: travelers,
            change: setTravelers,
            min: 1,
            max: 50,
            icon: Users,
          },
        ].map((control) => (
          <div className="stepper" key={control.label}>
            <span>
              <control.icon size={18} />
              {control.label}
            </span>
            <div>
              <button
                className="icon-button"
                aria-label={`Decrease ${control.label.toLowerCase()}`}
                disabled={control.value <= control.min}
                onClick={() => control.change(control.value - 1)}
              >
                −
              </button>
              <output aria-label={control.label}>{control.value}</output>
              <button
                className="icon-button"
                aria-label={`Increase ${control.label.toLowerCase()}`}
                disabled={control.value >= control.max}
                onClick={() => control.change(control.value + 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="scenario-comparison">
        <div>
          <span>Your plan now</span>
          <strong>
            {current.complete
              ? money(current.total, trip.homeCurrency)
              : current.calculationError ? "Check costs" : "Rates needed"}
          </strong>
          <small>
            {nights(trip)} nights · {trip.travelers} people
          </small>
        </div>
        <ArrowRight size={20} />
        <div>
          <span>A little different</span>
          <strong>
            {scenario.complete
              ? money(scenario.total, trip.homeCurrency)
              : scenario.calculationError ? "Check costs" : "Rates needed"}
          </strong>
          <small>
            {nightCount} nights · {travelers} people
          </small>
        </div>
      </div>
      {scenario.complete && (
        <div
          className={`scenario-result ${scenario.remaining < 0 ? "over-budget" : ""}`}
        >
          <Sparkles size={22} />
          <div>
            <strong>
              {delta === 0
                ? "Same total. Different possibilities."
                : `${money(Math.abs(delta), trip.homeCurrency)} ${delta > 0 ? "more for the group" : "less for the group"}`}
            </strong>
            <p>
              {scenario.remaining >= 0
                ? `${money(scenario.remaining, trip.homeCurrency)} still within your budget.`
                : `${money(-scenario.remaining, trip.homeCurrency)} over your budget.`}
            </p>
          </div>
        </div>
      )}
      <p className="form-note">
        <Info size={15} />
        Daily, nightly, and per-person costs scale automatically, including
        booked items. Fixed booking prices may need updating manually. One-off
        shared costs stay the same. This doesn’t check availability.
      </p>
      <div className="form-actions">
        <div className="form-actions-right">
          <button className="button button-secondary" onClick={onCancel}>
            Keep my plan
          </button>
          <button
            className="button button-primary"
            onClick={() => onApply(next)}
          >
            Make this the plan
            <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CategoryBreakdown({
  trip,
  snapshot,
}: {
  trip: Trip;
  snapshot: RateSnapshot | null;
}) {
  const [open, setOpen] = useState(false);
  const summary = summarize(trip, snapshot);
  if (!trip.expenses.length || !summary.complete) return null;
  return (
    <section className="category-breakdown">
      <button
        className="breakdown-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Where it all goes</span>
        <ChevronDown
          size={17}
          style={{ transform: open ? "rotate(180deg)" : "" }}
        />
      </button>
      {open && (
        <div className="category-breakdown-list">
          {summary.categories
            .filter((category) => category.total > 0)
            .map(({ category, total }) => (
              <div key={category}>
                <span>
                  <i className={`category-fill-${category}`} />
                  {CATEGORY_LABELS[category]}
                </span>
                <strong>{money(total, trip.homeCurrency)}</strong>
              </div>
            ))}
          <div>
            <span>
              <i className="buffer-fill" />
              Buffer
            </span>
            <strong>{money(summary.buffer, trip.homeCurrency)}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
