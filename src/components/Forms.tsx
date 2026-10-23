import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Info, Trash2 } from "lucide-react";
import {
  CURRENCIES,
  CATEGORY_LABELS,
  CATEGORIES,
  type Trip,
  type Expense,
  type Currency,
  type RateSnapshot,
  validateTrip,
  id,
} from "../lib/model";
import { costDescription, digits, localTotal, money } from "../lib/money";

export function CurrencySelect({
  value,
  onChange,
  id: selectId,
  name,
}: {
  value: Currency;
  onChange: (value: Currency) => void;
  id: string;
  name?: string;
}) {
  return (
    <select
      id={selectId}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value as Currency)}
    >
      {CURRENCIES.map(([code, label]) => (
        <option key={code} value={code}>
          {code} · {label}
        </option>
      ))}
    </select>
  );
}

export function TripForm({
  initial,
  snapshot,
  onSave,
  onDelete,
  onCancel,
  isNew = false,
}: {
  initial: Trip;
  snapshot: RateSnapshot | null;
  onSave: (trip: Trip) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState<Trip>(() => structuredClone(initial));
  const [error, setError] = useState("");
  const [currencyNote, setCurrencyNote] = useState("");
  function update<K extends keyof Trip>(key: K, value: Trip[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function changeHome(next: Currency) {
    if (next === draft.homeCurrency) return;
    const from = snapshot?.rates[draft.homeCurrency.toLowerCase()];
    const to = snapshot?.rates[next.toLowerCase()];
    if (from && to && draft.budget) {
      setDraft((current) => ({
        ...current,
        homeCurrency: next,
        budget: ((Number(current.budget) * to) / from).toFixed(digits(next)),
      }));
      setCurrencyNote(
        `Your budget was converted to ${next} using the ${snapshot!.date} reference rate.`,
      );
    } else {
      update("homeCurrency", next);
      setCurrencyNote(
        `The budget number is unchanged. Enter your target budget in ${next} before saving.`,
      );
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const valid = validateTrip({
        ...draft,
        name: draft.name.trim(),
        destination: draft.destination.trim(),
        isExample: false,
      });
      if (Number(valid.budget) <= 0)
        throw new Error("Set a total budget greater than zero.");
      onSave(valid);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Please check the trip details.",
      );
    }
  }
  return (
    <form onSubmit={submit} className="form">
      {isNew && (
        <p className="form-intro">
          A few details now. A lot less mental math later.
        </p>
      )}
      <label htmlFor="trip-name">
        Give your trip a name
        <input
          id="trip-name"
          autoFocus
          required
          maxLength={80}
          value={draft.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="A long weekend, a little adventure…"
        />
      </label>
      <label htmlFor="trip-destination">
        Where are you headed?
        <input
          id="trip-destination"
          required
          maxLength={80}
          value={draft.destination}
          onChange={(event) => update("destination", event.target.value)}
          placeholder="City, country, or a few stops"
        />
      </label>
      <div className="form-grid">
        <label htmlFor="trip-start">
          Arrival
          <input
            id="trip-start"
            type="date"
            required
            value={draft.startDate}
            onChange={(event) => update("startDate", event.target.value)}
          />
        </label>
        <label htmlFor="trip-end">
          Departure
          <input
            id="trip-end"
            type="date"
            required
            min={draft.startDate}
            value={draft.endDate}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </label>
      </div>
      <div className="form-grid">
        <label htmlFor="trip-travelers">
          Travelers
          <input
            id="trip-travelers"
            type="number"
            min="1"
            max="50"
            step="1"
            required
            value={draft.travelers}
            onChange={(event) =>
              update("travelers", Number(event.target.value))
            }
          />
        </label>
        <label htmlFor="trip-local">
          Local currency
          <CurrencySelect
            id="trip-local"
            value={draft.localCurrency}
            onChange={(value) => update("localCurrency", value)}
          />
        </label>
      </div>
      <div className="form-section-title">THE MONEY PART</div>
      <div className="form-grid">
        <label htmlFor="trip-home">
          Home currency
          <CurrencySelect
            id="trip-home"
            value={draft.homeCurrency}
            onChange={changeHome}
          />
        </label>
        <label htmlFor="trip-budget">
          Total group budget ({draft.homeCurrency})
          <input
            id="trip-budget"
            type="number"
            min={10 ** -digits(draft.homeCurrency)}
            max="10000000"
            step={10 ** -digits(draft.homeCurrency)}
            required
            value={draft.budget}
            onChange={(event) => update("budget", event.target.value)}
          />
        </label>
      </div>
      {currencyNote && (
        <p className="form-note">
          <Info size={15} />
          {currencyNote}
        </p>
      )}
      <p className="form-note">
        Your budget covers everyone, including your contingency buffer. Arrival
        and departure each count as a travel day.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        {onDelete && (
          <button
            type="button"
            className="button-text danger"
            onClick={onDelete}
          >
            <Trash2 size={16} />
            Delete plan
          </button>
        )}
        <div className="form-actions-right">
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="button button-primary" type="submit">
            {isNew ? "Create my plan" : "Save trip"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </form>
  );
}

export function ExpenseForm({
  trip,
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  trip: Trip;
  initial?: Expense;
  onSave: (expense: Expense) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Expense>(() =>
    initial
      ? { ...initial }
      : {
          id: id(),
          name: "",
          amount: "",
          currency: trip.localCurrency,
          category: "other",
          frequency: "once",
          perPerson: false,
          booked: false,
        },
  );
  const [error, setError] = useState("");
  function update<K extends keyof Expense>(key: K, value: Expense[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const expense = { ...draft, name: draft.name.trim() };
      validateTrip({ ...trip, expenses: [expense] });
      if (Number(draft.amount) <= 0)
        throw new Error("Enter a cost greater than zero.");
      onSave(expense);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Check the cost details.",
      );
    }
  }
  return (
    <form onSubmit={submit} className="form">
      <label htmlFor="expense-name">
        What are you planning for?
        <input
          id="expense-name"
          required
          autoFocus
          maxLength={100}
          value={draft.name}
          placeholder="A place to stay, a train ride, a good lunch…"
          onChange={(event) => update("name", event.target.value)}
        />
      </label>
      <label htmlFor="expense-category">
        Category
        <select
          id="expense-category"
          value={draft.category}
          onChange={(event) =>
            update("category", event.target.value as Expense["category"])
          }
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label htmlFor="expense-amount">
          Unit cost
          <input
            id="expense-amount"
            type="number"
            min={10 ** -digits(draft.currency)}
            max="10000000"
            required
            step={10 ** -digits(draft.currency)}
            value={draft.amount}
            placeholder="0.00"
            onChange={(event) => update("amount", event.target.value)}
          />
        </label>
        <label htmlFor="expense-currency">
          Currency
          <CurrencySelect
            id="expense-currency"
            value={draft.currency}
            onChange={(value) => update("currency", value)}
          />
        </label>
      </div>
      <label htmlFor="expense-frequency">
        How often?
        <select
          id="expense-frequency"
          value={draft.frequency}
          onChange={(event) =>
            update("frequency", event.target.value as Expense["frequency"])
          }
        >
          <option value="once">Once for the trip</option>
          <option value="night">Every night</option>
          <option value="day">Every travel day</option>
        </select>
      </label>
      <label className="check-label" htmlFor="expense-per-person">
        <input
          id="expense-per-person"
          type="checkbox"
          checked={draft.perPerson}
          onChange={(event) => update("perPerson", event.target.checked)}
        />
        <span>
          <strong>For each traveler</strong>
          <small>
            Multiply this cost by {trip.travelers}{" "}
            {trip.travelers === 1 ? "person" : "people"}.
          </small>
        </span>
      </label>
      <label className="check-label" htmlFor="expense-booked">
        <input
          id="expense-booked"
          type="checkbox"
          checked={draft.booked}
          onChange={(event) => update("booked", event.target.checked)}
        />
        <span>
          <strong>Already booked</strong>
          <small>Fixed in this plan. Your buffer won’t apply to it.</small>
        </span>
      </label>
      {draft.amount && Number(draft.amount) > 0 && (
        <div className="cost-preview">
          <div>
            <span className="eyebrow">TOTAL FOR YOUR TRIP</span>
            <small>{costDescription(draft, trip)}</small>
          </div>
          <strong>
            {money(localTotal(draft, trip), draft.currency)}
            <span>{draft.currency}</span>
          </strong>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        {onDelete && (
          <button
            className="button-text danger"
            type="button"
            onClick={onDelete}
          >
            <Trash2 size={16} />
            Remove cost
          </button>
        )}
        <div className="form-actions-right">
          <button
            className="button button-secondary"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="button button-primary" type="submit">
            <Check size={16} />
            {initial ? "Save changes" : "Add to my plan"}
          </button>
        </div>
      </div>
    </form>
  );
}
