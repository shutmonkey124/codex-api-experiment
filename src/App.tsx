import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Copy,
  FileJson,
  Heart,
  Info,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Artwork, Logo } from "./components/Artwork";
import { Dialog } from "./components/Dialog";
import { ExpenseForm, TripForm } from "./components/Forms";
import {
  BudgetSummary,
  CategoryBreakdown,
  ExpenseList,
  ScenarioForm,
  ScenarioTeaser,
} from "./components/Budget";
import {
  MAX_PLANS,
  createTrip,
  id,
  nights,
  validateWorkspace,
  type Expense,
  type Trip,
} from "./lib/model";
import { backupPlan, exportCsv } from "./lib/export";
import {
  STORAGE_KEY,
  downloadFile,
  loadWorkspace,
  safeFilename,
  saveWorkspace,
} from "./lib/storage";
import { useRates } from "./lib/useRates";
import { money, summarize } from "./lib/money";

type Modal =
  | { kind: "trip"; initial: Trip; isNew: boolean }
  | { kind: "expense"; expense?: Expense }
  | { kind: "scenario" | "help" | "delete" | "download" }
  | null;
type Toast = { text: string; action?: () => void; actionLabel?: string } | null;

function dateRange(trip: Trip): string {
  const format = (date: string, withYear: boolean) =>
    new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" as const } : {}),
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  return `${format(trip.startDate, trip.startDate.slice(0, 4) !== trip.endDate.slice(0, 4))} – ${format(trip.endDate, true)}`;
}

export default function App() {
  const [loaded] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState(loaded.workspace);
  const [recoveryBlocked, setRecoveryBlocked] = useState(!!loaded.warning);
  const [saveFailed, setSaveFailed] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<Toast>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const trip = workspace.plans.find(
    (plan) => plan.id === workspace.selectedId,
  )!;
  const { snapshot, loading, error, refresh } = useRates(trip.homeCurrency);
  const summary = summarize(trip, snapshot);

  useEffect(() => {
    if (recoveryBlocked) return;
    setSaveFailed(!saveWorkspace(workspace));
  }, [workspace, recoveryBlocked]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast(null),
      toast.action ? 12_000 : 6000,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateTrip(next: Trip) {
    setWorkspace((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.id === next.id ? next : plan)),
    }));
  }
  function openNew() {
    if (workspace.plans.length >= MAX_PLANS) {
      setToast({
        text: "You can keep up to 20 plans. Export and delete an old one to make room.",
      });
      return;
    }
    setModal({ kind: "trip", initial: createTrip(), isNew: true });
  }
  function saveTrip(next: Trip, isNew: boolean) {
    if (isNew)
      setWorkspace((current) => ({
        ...current,
        plans: [...current.plans, next],
        selectedId: next.id,
      }));
    else updateTrip(next);
    setModal(null);
    setToast({
      text: isNew
        ? "A new adventure, in the making."
        : "Trip details updated. Your recurring costs have been recalculated.",
    });
  }
  function saveExpense(expense: Expense) {
    const editing = trip.expenses.some((item) => item.id === expense.id);
    updateTrip({
      ...trip,
      expenses: editing
        ? trip.expenses.map((item) => (item.id === expense.id ? expense : item))
        : [...trip.expenses, expense],
    });
    setModal(null);
    setToast({
      text: editing
        ? "A little fine-tuning. Cost updated."
        : "One more part of the trip, planned.",
    });
  }
  function removeExpense(expense: Expense) {
    const planId = trip.id;
    const index = trip.expenses.findIndex((item) => item.id === expense.id);
    updateTrip({
      ...trip,
      expenses: trip.expenses.filter((item) => item.id !== expense.id),
    });
    setModal(null);
    setToast({
      text: `“${expense.name}” removed.`,
      actionLabel: "Undo",
      action: () => {
        setWorkspace((current) => ({
          ...current,
          plans: current.plans.map((plan) => {
            if (
              plan.id !== planId ||
              plan.expenses.some((item) => item.id === expense.id)
            )
              return plan;
            const expenses = [...plan.expenses];
            expenses.splice(index, 0, expense);
            return { ...plan, expenses };
          }),
        }));
        setToast({ text: "Cost restored." });
      },
    });
  }
  function deleteTrip() {
    const remaining = workspace.plans.filter((plan) => plan.id !== trip.id);
    if (!remaining.length) {
      const fresh = {
        ...createTrip(),
        name: "My next adventure",
        destination: "Somewhere wonderful",
      };
      remaining.push(fresh);
    }
    setWorkspace({ version: 1, plans: remaining, selectedId: remaining[0].id });
    setModal(null);
    setToast({ text: "Plan deleted. On to the next adventure." });
  }
  function duplicateTrip() {
    if (workspace.plans.length >= MAX_PLANS) {
      setToast({
        text: "You can keep up to 20 plans. Export and delete an old one to make room.",
      });
      return;
    }
    const next = {
      ...structuredClone(trip),
      id: id(),
      name: `${trip.name.slice(0, 70)} (copy)`,
      isExample: false,
      expenses: trip.expenses.map((item) => ({ ...item, id: id() })),
    };
    setWorkspace((current) => ({
      ...current,
      plans: [...current.plans, next],
      selectedId: next.id,
    }));
    setModal(null);
    setToast({ text: "A copy is ready. Try a different version of the trip." });
  }
  function backup() {
    downloadFile(
      JSON.stringify(backupPlan(trip), null, 2),
      `${safeFilename(trip.name)}.elsewhere.json`,
      "application/json",
    );
    setToast({
      text: "Plan downloaded. Import it on another device, or send the file to your travel partner.",
    });
  }
  function csv() {
    try {
      downloadFile(
        exportCsv(trip, snapshot),
        `${safeFilename(trip.name)}.csv`,
        "text/csv;charset=utf-8",
      );
      setToast({ text: "Your complete budget is ready for a spreadsheet." });
    } catch (cause) {
      setToast({
        text:
          cause instanceof Error
            ? cause.message
            : "Could not export the budget.",
      });
    }
  }
  async function importPlans(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error(
          "That file is too large. Elsewhere backups must be smaller than 2 MB.",
        );
      const imported = validateWorkspace(JSON.parse(await file.text()));
      if (workspace.plans.length + imported.plans.length > MAX_PLANS)
        throw new Error(
          "This import would exceed 20 plans. Export and delete an old plan first.",
        );
      const plans = imported.plans.map((plan) => ({
        ...plan,
        id: id(),
        expenses: plan.expenses.map((item) => ({ ...item, id: id() })),
      }));
      setWorkspace((current) => ({
        ...current,
        plans: [...current.plans, ...plans],
        selectedId: plans[0].id,
      }));
      setToast({
        text: `${plans.length === 1 ? "Plan" : `${plans.length} plans`} imported. Your existing plans are still here.`,
      });
      setModal(null);
    } catch (cause) {
      setToast({
        text:
          cause instanceof SyntaxError
            ? "That file isn’t valid JSON. Choose an Elsewhere plan backup."
            : cause instanceof Error
              ? cause.message
              : "Could not import that file.",
      });
    }
  }
  function recover() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) downloadFile(raw, "elsewhere-recovery.json", "application/json");
      else
        downloadFile(
          JSON.stringify(workspace, null, 2),
          "elsewhere-recovery.json",
          "application/json",
        );
      setRecoveryBlocked(false);
      setToast({
        text: "Recovery file downloaded. New plans can now be saved in this browser.",
      });
    } catch {
      setToast({
        text: "Browser storage is unavailable. Download your current plan to keep your work.",
      });
    }
  }

  return (
    <>
      <a className="skip-link" href="#your-plan">
        Skip to your plan
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="Elsewhere home">
            <Logo />
            <span>
              elsewhere<span className="brand-period">.</span>
            </span>
          </a>
          <span className="header-tagline">
            A little planning. A lot of possibility.
          </span>
          <nav aria-label="Main navigation">
            <button
              className="button-text how-button"
              onClick={() => setModal({ kind: "help" })}
            >
              <CircleHelp size={17} />
              How it works
            </button>
            <span className="header-divider" />
            <button
              className="button button-primary button-small"
              onClick={openNew}
            >
              <Plus size={17} />
              New plan
            </button>
          </nav>
        </div>
      </header>
      <main className="page-shell">
        {(recoveryBlocked || saveFailed) && (
          <div className="storage-warning" role="alert">
            <Info size={20} />
            <p>
              {recoveryBlocked
                ? loaded.warning
                : "This browser couldn’t save your latest changes. Download a backup before leaving this page."}
            </p>
            <button
              className="button button-secondary button-small"
              onClick={recoveryBlocked ? recover : backup}
            >
              {recoveryBlocked
                ? "Download recovery & enable saving"
                : "Download plan"}
            </button>
          </div>
        )}
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span />
              LESS GUESSWORK. MORE GETTING THERE.
            </span>
            <h1 id="hero-heading">
              A good trip starts
              <br />
              with <em>a little clarity.</em>
            </h1>
            <p>
              The stay, the little treats, the one-more-night.
              <br className="desktop-break" /> Bring it all together. See what’s
              possible.
            </p>
          </div>
          <div className="hero-artwork">
            <Artwork />
            <div className="art-caption">
              <span>TAKE THE SCENIC ROUTE</span>
              <span><ArrowUpRight size={14} /></span>
            </div>
          </div>
        </section>
        <div className="plans-bar">
          <div className="plans-selector">
            <span className="eyebrow">YOUR PLANS</span>
            <div className="select-wrap">
              <select
                aria-label="Choose a plan"
                value={trip.id}
                onChange={(event) =>
                  setWorkspace((current) => ({
                    ...current,
                    selectedId: event.target.value,
                  }))
                }
              >
                {workspace.plans.map((plan) => (
                  <option value={plan.id} key={plan.id}>
                    {plan.isExample ? "✧ " : ""}
                    {plan.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
            <span className="plan-count">{workspace.plans.length}</span>
          </div>
          <div className="plans-actions">
            <button
              className="button-text"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={15} />
              Import a plan
            </button>
            <span className="private-label">
              <ShieldCheck size={14} />
              Just on your device
            </span>
          </div>
        </div>
        <section
          className="plan-heading"
          id="your-plan"
          aria-labelledby="trip-heading"
        >
          <div>
            <div className="plan-eyebrow">
              <span className="eyebrow">
                {trip.isExample
                  ? "A LITTLE INSPIRATION TO START"
                  : "YOUR NEXT ELSEWHERE"}
              </span>
              {trip.isExample && (
                <span className="example-badge">EXAMPLE PLAN</span>
              )}
            </div>
            <h2 id="trip-heading">{trip.name}</h2>
            <div className="trip-meta">
              <span>
                <MapPin size={14} />
                {trip.destination}
              </span>
              <span>
                <CalendarDays size={14} />
                {dateRange(trip)}
              </span>
              <span>
                <Users size={14} />
                {trip.travelers}{" "}
                {trip.travelers === 1 ? "traveler" : "travelers"}
                <i />
                {nights(trip)} nights
              </span>
            </div>
          </div>
          <div className="plan-header-actions">
            <button
              className="button button-secondary button-small"
              onClick={() =>
                setModal({ kind: "trip", initial: trip, isNew: false })
              }
            >
              <Pencil size={14} />
              {trip.isExample ? "Make it yours" : "Edit trip"}
            </button>
            <button
              className="icon-button download-menu-button"
              aria-label="Download and manage plan"
              onClick={() => setModal({ kind: "download" })}
            >
              <ArrowDownToLine size={19} />
            </button>
          </div>
        </section>
        {trip.isExample && (
          <div className="sample-note">
            <Info size={14} />
            <p>
              A made-up trip. Real exchange rates. These sample costs are
              estimates, not travel quotes.
            </p>
            <button className="button-text" onClick={openNew}>
              Start fresh
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        <a className="mobile-overview" href="#budget-overview">
          <div>
            <span>YOUR TRIP, ALL IN · {trip.homeCurrency}</span>
            <strong>
              {summary.complete
                ? money(summary.total, trip.homeCurrency)
                : summary.calculationError ? "Check costs" : loading
                  ? "Finding rates…"
                  : "Rates needed"}
            </strong>
          </div>
          <div>
            <span>
              {summary.complete
                ? `${money(Math.abs(summary.remaining), trip.homeCurrency)} ${summary.remaining < 0 ? "over budget" : "left to play with"}`
                : "Your costs are safely saved."}
            </span>
            <small>See the big picture ↓</small>
          </div>
        </a>
        <div className="plan-layout">
          <div className="plan-main">
            <ExpenseList
              key={trip.id}
              trip={trip}
              snapshot={snapshot}
              onEdit={(expense) => setModal({ kind: "expense", expense })}
              onAdd={() => setModal({ kind: "expense" })}
              onExport={csv}
            />
            <div className="below-list">
              <ScenarioTeaser
                trip={trip}
                snapshot={snapshot}
                onOpen={() => setModal({ kind: "scenario" })}
              />
              <div className="gentle-reminder">
                <Heart size={18} strokeWidth={1.5} />
                <div>
                  <strong>Make room for the unplanned.</strong>
                  <p>
                    That tiny bookshop. Another coffee. The best parts of a trip
                    rarely make the itinerary.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <aside className="plan-aside">
            <BudgetSummary
              trip={trip}
              snapshot={snapshot}
              loading={loading}
              error={error}
              onRefresh={refresh}
              onBuffer={(value) =>
                updateTrip({ ...trip, bufferPercent: value })
              }
              onEdit={() =>
                setModal({ kind: "trip", initial: trip, isNew: false })
              }
            />
            <CategoryBreakdown trip={trip} snapshot={snapshot} />
            <p className="saved-label">
              <CheckCheck size={14} />
              {recoveryBlocked || saveFailed
                ? "Changes are in memory. Download to keep them."
                : "Quietly saved in this browser."}
            </p>
          </aside>
        </div>
        <footer className="site-footer">
          <div className="footer-brand">
            <Logo />
            <span>For the joy of going somewhere.</span>
          </div>
          <div>
            <a
              href="https://github.com/fawazahmed0/exchange-api"
              target="_blank"
              rel="noreferrer"
            >
              Exchange rates by Currency API
              <ArrowRight size={12} />
            </a>
            <button
              className="button-text"
              onClick={() => setModal({ kind: "help" })}
            >
              Private by design
              <ShieldCheck size={13} />
            </button>
          </div>
        </footer>
      </main>
      <input
        className="visually-hidden"
        type="file"
        ref={importRef}
        accept=".json,application/json"
        aria-label="Import Elsewhere backup file"
        onChange={importPlans}
        tabIndex={-1}
      />
      {modal?.kind === "trip" && (
        <Dialog
          title={
            modal.isNew
              ? "Where to next?"
              : trip.isExample
                ? "Make a little adventure yours."
                : "The shape of your trip."
          }
          eyebrow={modal.isNew ? "A FRESH PAGE" : "TRIP DETAILS"}
          onClose={() => setModal(null)}
        >
          <TripForm
            key={modal.initial.id}
            initial={modal.initial}
            snapshot={snapshot}
            isNew={modal.isNew}
            onSave={(next) => saveTrip(next, modal.isNew)}
            onCancel={() => setModal(null)}
            onDelete={
              !modal.isNew ? () => setModal({ kind: "delete" }) : undefined
            }
          />
        </Dialog>
      )}
      {modal?.kind === "expense" && (
        <Dialog
          title={
            modal.expense
              ? "A little fine-tuning."
              : "One more part of the adventure."
          }
          eyebrow={modal.expense ? "EDIT A COST" : "ADD A COST"}
          onClose={() => setModal(null)}
        >
          <ExpenseForm
            trip={trip}
            initial={modal.expense}
            onSave={saveExpense}
            onCancel={() => setModal(null)}
            onDelete={
              modal.expense ? () => removeExpense(modal.expense!) : undefined
            }
          />
        </Dialog>
      )}
      {modal?.kind === "scenario" && (
        <Dialog
          title="What if you stayed a little longer?"
          eyebrow="PLAY WITH THE POSSIBILITIES"
          onClose={() => setModal(null)}
        >
          <ScenarioForm
            trip={trip}
            snapshot={snapshot}
            onApply={(next) => {
              updateTrip(next);
              setModal(null);
              setToast({
                text: "Possibility becomes the plan. Costs recalculated.",
              });
            }}
            onCancel={() => setModal(null)}
          />
        </Dialog>
      )}
      {modal?.kind === "delete" && (
        <Dialog
          title="Leave this plan behind?"
          eyebrow="DELETE PLAN"
          onClose={() => setModal(null)}
        >
          <p className="form-intro">
            “{trip.name}” and its costs will be removed from this browser.
            Download a backup first if you might come back to it.
          </p>
          <div className="form-actions">
            <button className="button-text" onClick={backup}>
              <FileJson size={16} />
              Download backup
            </button>
            <div className="form-actions-right">
              <button
                className="button button-secondary"
                onClick={() => setModal(null)}
              >
                Keep it
              </button>
              <button className="button button-danger" onClick={deleteTrip}>
                <Trash2 size={15} />
                Delete plan
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {modal?.kind === "download" && (
        <Dialog
          title="A plan worth keeping."
          eyebrow="TAKE IT WITH YOU"
          onClose={() => setModal(null)}
        >
          <div className="download-options">
            <button onClick={backup}>
              <span className="download-option-icon">
                <FileJson size={24} />
              </span>
              <span>
                <strong>Download your plan</strong>
                <small>
                  A complete backup. Import it on another device or share the
                  file with a travel partner.
                </small>
              </span>
              <ArrowDownToLine size={19} />
            </button>
            <button onClick={csv}>
              <span className="download-option-icon">
                <ArrowDownToLine size={24} />
              </span>
              <span>
                <strong>Export a spreadsheet</strong>
                <small>
                  Every cost, conversion, and total in a CSV file. Requires
                  rates for foreign-currency costs.
                </small>
              </span>
              <ArrowRight size={19} />
            </button>
            <button onClick={duplicateTrip}>
              <span className="download-option-icon">
                <Copy size={24} />
              </span>
              <span>
                <strong>Make a second version</strong>
                <small>
                  Duplicate this plan and explore a different budget, itinerary,
                  or group.
                </small>
              </span>
              <Plus size={19} />
            </button>
          </div>
          <p className="form-note">
            <ShieldCheck size={16} />
            Your backup contains your plan, not exchange-rate cache data. Keep
            it somewhere you trust. Plans don’t sync automatically.
          </p>
        </Dialog>
      )}
      {modal?.kind === "help" && (
        <Dialog
          title="Less mental math. More possibility."
          eyebrow="A SMALL GUIDE TO ELSEWHERE"
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <div>
              <span>01</span>
              <section>
                <h3>Give the trip a little shape.</h3>
                <p>
                  Choose your dates, travelers, total group budget, and home
                  currency. A same-day trip has 0 nights and 1 travel day.
                </p>
              </section>
            </div>
            <div>
              <span>02</span>
              <section>
                <h3>Think in local prices.</h3>
                <p>
                  Add any cost in one of 42 supported currencies. Mark it as
                  one-off, nightly, or daily; shared or per person. Elsewhere
                  does the multiplying and converting.
                </p>
              </section>
            </div>
            <div>
              <span>03</span>
              <section>
                <h3>Leave a little breathing room.</h3>
                <p>
                  Your buffer adds 0–30% to unbooked estimates. Booked costs are
                  excluded from the buffer. Daily reference rates are estimates,
                  not card or bank quotes.
                </p>
              </section>
            </div>
            <div>
              <span>04</span>
              <section>
                <h3>Try a different possibility.</h3>
                <p>
                  Change the nights or group size in the “what if” corner before
                  applying it. All recurring prices scale, including booked
                  items; update fixed booking totals yourself.
                </p>
              </section>
            </div>
            <div>
              <span>
                <ShieldCheck size={21} />
              </span>
              <section>
                <h3>Your plans stay with you.</h3>
                <p>
                  Plans are saved only in this browser. No account, tracking, or
                  server upload. The rate provider receives your chosen home
                  currency and ordinary connection information, never your
                  costs. Clearing browser data removes plans. Download a JSON
                  backup to keep or share them.
                </p>
              </section>
            </div>
          </div>
          <button
            className="button button-primary help-done"
            onClick={() => setModal(null)}
          >
            Let’s plan something good
            <ArrowRight size={16} />
          </button>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast.text}</span>
          {toast.action && (
            <button onClick={toast.action}>{toast.actionLabel}</button>
          )}
          <button
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
