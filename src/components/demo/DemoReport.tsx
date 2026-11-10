"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, ListChecks, PiggyBank, Share2, Sparkles, Target } from "lucide-react";
import { PRICING, applyScenario, defaultProjectionStart, type ScenarioAdjustment } from "@/lib/schemas";
import { CHART, ChartTooltip, COLOR, Stat, axisProps, monthTick, signedUsd } from "@/components/dashboard/chartKit";
import { cn, pct, secondaryBtn, usd, usdCompact } from "@/components/ui";
import { DEMO_BASELINE, DEMO_COMPANY, DEMO_EXPENSES, DEMO_FILE, DEMO_FLAGS, DEMO_MONTHS, DEMO_PERIOD, DEMO_REVENUE, avg, total, type DemoFlag, type DemoLine } from "./demoData";
import { AVG_EXPENSES, AVG_NET, AVG_REVENUE, BUDGET_EXPENSES, BUDGET_REVENUE, LockedFeature, POTENTIAL_SAVINGS, ProBadge, SampleNote, SeverityPill, UpgradeLink, implementedSavings, sumOf } from "./demoShared";

// ---------------------------------------------------------------------------
// Figures the report is written from (all derived from demoData)
// ---------------------------------------------------------------------------

const FIRST = 0;
const LAST = DEMO_MONTHS.length - 1;

/** Revenue, expenses and net for each month of the sample statement. */
const MONTHLY = DEMO_MONTHS.map((label, i) => {
  const revenue = sumOf(DEMO_REVENUE, (l) => l.actual[i]);
  const expenses = sumOf(DEMO_EXPENSES, (l) => l.actual[i]);
  return { label, revenue, expenses, net: revenue - expenses };
});
const BEST = MONTHLY.reduce((a, m) => (m.net > a.net ? m : a));
const WEAKEST = MONTHLY.reduce((a, m) => (m.net < a.net ? m : a));

const BUDGET_NET = BUDGET_REVENUE - BUDGET_EXPENSES;
const BUDGET_MARGIN = BUDGET_NET / BUDGET_REVENUE;
const EXPENSE_OVERRUN = AVG_EXPENSES - BUDGET_EXPENSES;

const BY_SIZE = [...DEMO_EXPENSES].sort((a, b) => avg(b.actual) - avg(a.actual));
const overBudget = (l: DemoLine) => avg(l.actual) - l.budget;
const LINES_OVER = DEMO_EXPENSES.filter((l) => overBudget(l) > 0);
const LINES_UNDER = DEMO_EXPENSES.filter((l) => overBudget(l) < 0);
const LARGEST_OVERRUN = [...DEMO_EXPENSES].sort((a, b) => overBudget(b) - overBudget(a))[0];
const growth = (l: DemoLine) => (l.actual[LAST] - l.actual[FIRST]) / l.actual[FIRST];
const FASTEST_COST = [...DEMO_EXPENSES].sort((a, b) => growth(b) - growth(a))[0];
const FASTEST_REVENUE = [...DEMO_REVENUE].sort((a, b) => growth(b) - growth(a))[0];
const ACTIONABLE = DEMO_FLAGS.filter((f) => f.potentialSavings > 0);

/** "rose $2,030.00" / "fell $500.00" / "was flat", for the month-over-month narrative. */
const moved = (delta: number) => (delta === 0 ? "was flat" : `${delta > 0 ? "rose" : "fell"} ${usd.format(Math.abs(delta))}`);

/** An implemented flag, as the forecasting engine sees it: that much less expense every month. */
const asAdjustments = (flags: DemoFlag[]): ScenarioAdjustment[] =>
  flags.map((f) => ({ type: "EXPENSE_ADD", label: f.category, amount: -f.potentialSavings, startMonth: 1, description: f.title }));

const SECTIONS = [
  { id: "demo-report-summary", label: "Executive summary" },
  { id: "demo-report-goals", label: "Audit goals & risk callouts" },
  { id: "demo-report-pl", label: "Month-by-month P&L" },
  { id: "demo-report-projection", label: "12-month projection" },
  { id: "demo-report-analysis", label: "Detailed analysis" },
] as const;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Section({ index, children }: { index: number; children: ReactNode }) {
  const s = SECTIONS[index];
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-20 border-t border-white/10 pt-6">
      <h4 id={`${s.id}-title`} className="flex items-baseline gap-2.5 text-base font-semibold text-slate-100">
        <span className="text-xs font-medium tabular-nums text-indigo-300">{String(index + 1).padStart(2, "0")}</span>
        {s.label}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</h5>;
}

function Goal({ title, target, now, progress, met, note }: { title: string; target: string; now: string; progress: number; met: boolean; note: string }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className={cn("flex flex-col rounded-xl border p-4 transition", met ? "border-emerald-300/30 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03]")}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-start gap-2 text-sm font-medium text-slate-100">
          <Target className={cn("mt-0.5 h-4 w-4 shrink-0", met ? "text-emerald-300" : "text-indigo-300")} aria-hidden /> {title}
        </p>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide", met ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : p > 0 ? "border-indigo-300/30 bg-indigo-500/15 text-indigo-100" : "border-white/15 text-slate-400")}>
          {met ? "MET" : p > 0 ? "IN PROGRESS" : "OPEN"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Target</dt>
          <dd className="mt-0.5 tabular-nums text-slate-200">{target}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Now</dt>
          <dd className={cn("mt-0.5 tabular-nums", met ? "text-emerald-200" : "text-slate-200")}>{now}</dd>
        </div>
      </dl>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${title}: progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
        <div className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", met ? "bg-emerald-400" : "bg-indigo-400")} style={{ width: `${p * 100}%` }} />
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{note}</p>
    </div>
  );
}

const cell = "px-3 py-2 text-right tabular-nums";

/** One P&L line across the statement's months, its quarter total, the quarter budget and the variance. */
function PlRow({ label, sub, values, budget, moreIsGood, strong }: { label: string; sub?: string; values: readonly number[]; budget: number; moreIsGood: boolean; strong?: boolean }) {
  const sum = values.reduce((a, v) => a + v, 0);
  const quarterBudget = budget * values.length;
  const variance = sum - quarterBudget;
  const good = variance === 0 ? null : variance > 0 === moreIsGood;
  return (
    <tr className={cn("border-t", strong ? "border-white/15 bg-white/[0.03] font-medium" : "border-white/5")}>
      <th scope="row" className="py-2 pl-3 pr-3 text-left font-normal">
        <span className={cn("text-slate-200", strong && "font-medium")}>{label}</span>
        {sub && <span className="block text-[11px] text-slate-500">{sub}</span>}
      </th>
      {values.map((v, i) => (
        <td key={DEMO_MONTHS[i]} className={cn(cell, "text-slate-300")}>
          {usd.format(v)}
        </td>
      ))}
      <td className={cn(cell, "text-slate-100")}>{usd.format(sum)}</td>
      <td className={cn(cell, "text-slate-400")}>{usd.format(quarterBudget)}</td>
      <td className={cn(cell, good === null ? "text-slate-400" : good ? "text-emerald-300" : "text-rose-300")}>{variance === 0 ? "on budget" : signedUsd(variance)}</td>
    </tr>
  );
}

function GroupRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-white/10">
      <th scope="colgroup" colSpan={DEMO_MONTHS.length + 4} className="px-3 pb-1 pt-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {children}
      </th>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/**
 * The demo's full Executive Report: the document Pro produces from a statement. Everything is computed from the
 * sample data, and the savings figures follow the flags the visitor marks implemented (here or on the Overview tab).
 */
export function DemoReport({ implemented, onToggle }: { implemented: ReadonlySet<string>; onToggle: (id: string) => void }) {
  const [seasonality, setSeasonality] = useState(true);
  const [start] = useState(() => defaultProjectionStart());

  const captured = implementedSavings(implemented);
  const remaining = POTENTIAL_SAVINGS - captured;
  const doneCount = ACTIONABLE.filter((f) => implemented.has(f.id)).length;
  const net = AVG_NET + captured;
  const margin = net / AVG_REVENUE;
  const overrun = EXPENSE_OVERRUN - captured;
  const proCover = captured / PRICING.proMonthlyUsd;

  const { current, potential } = useMemo(() => {
    const opts = { start, months: 12, seasonality };
    return {
      current: applyScenario(DEMO_BASELINE, asAdjustments(ACTIONABLE.filter((f) => implemented.has(f.id))), opts),
      potential: applyScenario(DEMO_BASELINE, asAdjustments(ACTIONABLE), opts),
    };
  }, [implemented, seasonality, start]);
  const chart = current.points.map((p) => ({ month: p.month, "Current run rate": p.baselineCumulative, "With implemented savings": p.adjustedCumulative }));
  const projected = current.points.reduce((a, p) => ({ revenue: a.revenue + p.adjustedRevenue, expenses: a.expenses + p.adjustedExpenses }), { revenue: 0, expenses: 0 });
  const softest = current.points.reduce((a, p) => (p.adjustedNet < a.adjustedNet ? p : a));
  const strongest = current.points.reduce((a, p) => (p.adjustedNet > a.adjustedNet ? p : a));

  return (
    <article aria-label={`Executive report, ${DEMO_COMPANY}`} className="rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Cover */}
      <header className="rounded-t-2xl border-b border-white/10 bg-gradient-to-r from-indigo-500/15 via-indigo-500/[0.04] to-amber-400/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Executive report · cash flow audit</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">{DEMO_COMPANY}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {DEMO_PERIOD} · prepared from {DEMO_FILE.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProBadge />
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-400">SAMPLE DATA</span>
          </div>
        </div>
        <nav aria-label="Report sections" className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-white/15 bg-slate-950/30 px-3 py-1 text-xs text-slate-300 transition hover:border-white/30 hover:text-white">
              <span className="tabular-nums text-slate-500">{i + 1}</span> {s.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Stat label="Revenue / month" value={usd.format(AVG_REVENUE)} />
          <Stat label="Expenses / month" value={usd.format(AVG_EXPENSES - captured)} />
          <Stat label="Net / month" value={usd.format(net)} tone="good" />
          <Stat label="Net margin" value={pct(margin)} />
          <Stat label="Leakage identified / mo" value={usd.format(POTENTIAL_SAVINGS)} />
          <Stat label="Projected 12-mo net" value={usd.format(current.adjustedAnnualNet)} tone={current.adjustedAnnualNet < 0 ? "bad" : "good"} />
        </div>

        {/* 1. Executive summary */}
        <Section index={0}>
          <div className="max-w-4xl space-y-3 text-sm leading-relaxed text-slate-300">
            <p>
              Over the quarter the business averaged {usd.format(AVG_REVENUE)} in monthly revenue against {usd.format(AVG_EXPENSES)} in operating expenses, a net of {usd.format(AVG_NET)} per month and a{" "}
              {pct(AVG_NET / AVG_REVENUE)} net margin. Revenue ran {pct((AVG_REVENUE - BUDGET_REVENUE) / BUDGET_REVENUE)} ahead of budget, but expenses ran {pct(EXPENSE_OVERRUN / BUDGET_EXPENSES)} over, so the
              margin landed below the {pct(BUDGET_MARGIN)} the budget called for.
            </p>
            <p>
              The audit found {ACTIONABLE.length} places where money is leaking, worth an estimated {usd.format(POTENTIAL_SAVINGS)} a month ({usd.format(POTENTIAL_SAVINGS * 12)} a year), plus one item to verify
              rather than cut. Acting on all {ACTIONABLE.length} would lift the monthly net to {usd.format(AVG_NET + POTENTIAL_SAVINGS)} and the margin to {pct((AVG_NET + POTENTIAL_SAVINGS) / AVG_REVENUE)}, back above
              budget.
            </p>
            <p aria-live="polite">
              {captured > 0 ? (
                <>
                  <span className="font-medium text-emerald-200">
                    {doneCount} of {ACTIONABLE.length} recommended adjustments are marked implemented, saving {usd.format(captured)} a month ({usd.format(captured * 12)} a year).
                  </span>{" "}
                  {remaining > 0 ? `${usd.format(remaining)} a month is still open.` : "Every flagged leak has been closed."} On that footing the next twelve months project to a net of{" "}
                  {usd.format(current.adjustedAnnualNet)}, {usd.format(current.delta)} more than the run rate the statement showed.
                </>
              ) : (
                <>
                  None of the recommended adjustments is marked implemented yet. At the current run rate the next twelve months project to a net of {usd.format(current.baselineAnnualNet)}; closing every flagged
                  leak would add {usd.format(potential.delta)} to that.
                </>
              )}
            </p>
          </div>
        </Section>

        {/* 2. Audit goals & risk callouts */}
        <Section index={1}>
          <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border px-4 py-3", captured > 0 ? "border-emerald-400/30 bg-gradient-to-r from-emerald-500/[0.16] via-emerald-500/[0.07] to-transparent" : "border-amber-300/25 bg-amber-300/[0.06]")}>
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", captured > 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-300/15 text-amber-200")}>
              <PiggyBank className="h-5 w-5" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-sm" aria-live="polite">
              {captured > 0 ? (
                <>
                  <span className="text-base font-semibold text-emerald-50 sm:text-lg">
                    Saved <span className="tabular-nums">{usd.format(captured)}</span> / month by implementing {doneCount} recommended adjustment{doneCount === 1 ? "" : "s"}
                  </span>
                  <span className="mt-0.5 block text-xs text-emerald-200/80">
                    {usd.format(captured * 12)} a year
                    {remaining > 0 && ` · ${usd.format(remaining)} / month still open`}
                    {proCover >= 1 && ` · ${proCover >= 10 ? Math.round(proCover) : proCover.toFixed(1)}× the $${PRICING.proMonthlyUsd}/mo Pro subscription`}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base font-semibold text-amber-50 sm:text-lg">
                    <span className="tabular-nums">{usd.format(POTENTIAL_SAVINGS)}</span> / month of leakage identified, none recovered yet
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">Mark a callout below as implemented and the goals, summary and projection in this report recalculate.</span>
                </>
              )}
            </p>
          </div>

          <div className="mt-4">
            <SubHeading>Audit goals</SubHeading>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <Goal
                title="Recover the flagged leakage"
                target={`${usd.format(POTENTIAL_SAVINGS)} / mo`}
                now={`${usd.format(captured)} / mo`}
                progress={captured / POTENTIAL_SAVINGS}
                met={remaining <= 0}
                note={remaining > 0 ? `${ACTIONABLE.length - doneCount} of ${ACTIONABLE.length} adjustments still to implement.` : "All of the recommended adjustments are in place."}
              />
              <Goal
                title="Bring operating expenses back to budget"
                target={`${usd.format(BUDGET_EXPENSES)} / mo`}
                now={`${usd.format(AVG_EXPENSES - captured)} / mo`}
                progress={captured / EXPENSE_OVERRUN}
                met={overrun <= 0}
                note={`${usd.format(Math.max(0, overrun))} over budget. The flags can close ${usd.format(POTENTIAL_SAVINGS)} of the ${usd.format(EXPENSE_OVERRUN)} gap; the rest is payroll and materials following higher revenue.`}
              />
              <Goal
                title={`Restore the budgeted ${pct(BUDGET_MARGIN)} net margin`}
                target={pct(BUDGET_MARGIN)}
                now={pct(margin)}
                progress={(margin - AVG_NET / AVG_REVENUE) / (BUDGET_MARGIN - AVG_NET / AVG_REVENUE)}
                met={margin >= BUDGET_MARGIN}
                note={margin >= BUDGET_MARGIN ? "Net margin is back above the budgeted level." : `${usd.format(BUDGET_MARGIN * AVG_REVENUE - net)} more monthly net reaches it at this quarter's revenue.`}
              />
            </div>
          </div>

          <div className="mt-5">
            <SubHeading>Risk callouts</SubHeading>
            <ul className="mt-2 space-y-2.5">
              {DEMO_FLAGS.map((f) => {
                const done = implemented.has(f.id);
                const actionable = f.potentialSavings > 0;
                return (
                  <li key={f.id} className={cn("rounded-xl border p-4 transition", done ? "border-emerald-300/25 bg-emerald-400/[0.05]" : "border-white/10 bg-white/[0.03]")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      {done ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                      ) : (
                        <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", f.severity === "HIGH" ? "text-rose-300" : f.severity === "MEDIUM" ? "text-amber-300" : "text-sky-300")} aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
                          {f.title} <SeverityPill severity={f.severity} />
                          <span className="text-xs font-normal text-slate-500">{f.category}</span>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.message}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          <span className="font-medium text-slate-200">Recommended adjustment:</span> {f.action}
                        </p>
                      </div>
                      <div className="shrink-0 sm:w-44 sm:text-right">
                        {actionable ? (
                          <>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{done ? "Saved" : "Estimated leak"}</p>
                            <p className={cn("text-lg font-semibold tabular-nums", done ? "text-emerald-200" : "text-slate-100")}>
                              {usd.format(f.potentialSavings)}
                              <span className="text-xs font-normal text-slate-400"> / mo</span>
                            </p>
                            <p className="text-xs tabular-nums text-slate-400">{usd.format(f.potentialSavings * 12)} / yr</p>
                            <button type="button" onClick={() => onToggle(f.id)} aria-pressed={done} className={cn(secondaryBtn, "mt-2 px-2.5 py-1 text-xs", done && "border-emerald-300/30 text-emerald-200")}>
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {done ? "Implemented — undo" : "Mark as implemented"}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">No saving assumed</p>
                            <p className="text-xs text-slate-400">Verify before acting</p>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <SampleNote>Savings are estimates from the sample statement: what an adjustment is worth if it is carried out, not a guarantee. Implemented status is shared with the Overview tab.</SampleNote>
          </div>
        </Section>

        {/* 3. Month-by-month P&L */}
        <Section index={2}>
          <div className="grid gap-3 sm:grid-cols-3">
            {MONTHLY.map((m, i) => {
              const change = i > 0 ? m.net - MONTHLY[i - 1].net : null;
              return (
                <div key={m.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{m.label} net</p>
                  <p className="mt-1 font-semibold tabular-nums text-slate-100">{usd.format(m.net)}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                    {pct(m.net / m.revenue)} margin
                    {change !== null && (
                      <>
                        {" · "}
                        <span className={change >= 0 ? "text-emerald-300" : "text-rose-300"}>
                          {signedUsd(change)} vs {MONTHLY[i - 1].label}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10" tabIndex={0} role="region" aria-label="Month-by-month profit and loss table">
            <table className="w-full min-w-[52rem] text-sm">
              <caption className="sr-only">
                Profit and loss by month for {DEMO_PERIOD}, {DEMO_COMPANY}, with quarter total, budget and variance
              </caption>
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2.5 pl-3 pr-3 text-left font-medium">
                    Line
                  </th>
                  {DEMO_MONTHS.map((m) => (
                    <th key={m} scope="col" className="px-3 py-2.5 text-right font-medium">
                      {m}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Q3 total
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Q3 budget
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                <GroupRow>Revenue</GroupRow>
                {DEMO_REVENUE.map((l) => (
                  <PlRow key={l.label} label={l.label} values={l.actual} budget={l.budget} moreIsGood />
                ))}
                <PlRow label="Total revenue" values={MONTHLY.map((m) => m.revenue)} budget={BUDGET_REVENUE} moreIsGood strong />
                <GroupRow>Operating expenses</GroupRow>
                {DEMO_EXPENSES.map((l) => (
                  <PlRow key={l.category} label={l.category} sub={l.label} values={l.actual} budget={l.budget} moreIsGood={false} />
                ))}
                <PlRow label="Total operating expenses" values={MONTHLY.map((m) => m.expenses)} budget={BUDGET_EXPENSES} moreIsGood={false} strong />
                <PlRow label="Net income" values={MONTHLY.map((m) => m.net)} budget={BUDGET_NET} moreIsGood strong />
                <tr className="border-t border-white/5">
                  <th scope="row" className="py-2 pl-3 pr-3 text-left font-normal text-slate-200">
                    Net margin
                  </th>
                  {MONTHLY.map((m) => (
                    <td key={m.label} className={cn(cell, "text-slate-300")}>
                      {pct(m.net / m.revenue)}
                    </td>
                  ))}
                  <td className={cn(cell, "text-slate-100")}>{pct(AVG_NET / AVG_REVENUE)}</td>
                  <td className={cn(cell, "text-slate-400")}>{pct(BUDGET_MARGIN)}</td>
                  <td className={cn(cell, AVG_NET / AVG_REVENUE >= BUDGET_MARGIN ? "text-emerald-300" : "text-rose-300")}>
                    {AVG_NET / AVG_REVENUE >= BUDGET_MARGIN ? "+" : "−"}
                    {(Math.abs(AVG_NET / AVG_REVENUE - BUDGET_MARGIN) * 100).toFixed(1)} pts
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-300">
            {BEST.label} was the strongest month at {usd.format(BEST.net)} net; {WEAKEST.label} was the weakest at {usd.format(WEAKEST.net)}. Between {MONTHLY[FIRST].label} and {MONTHLY[LAST].label} revenue {moved(MONTHLY[LAST].revenue - MONTHLY[FIRST].revenue)} while expenses {moved(MONTHLY[LAST].expenses - MONTHLY[FIRST].expenses)}, which is where the quarter&apos;s margin went.
          </p>
          <SampleNote>Actuals as they appear on the statement, before any implemented adjustment. Green variances help the bottom line; red ones hurt it.</SampleNote>
        </Section>

        {/* 4. 12-month forward projection */}
        <Section index={3}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-slate-300">
              The audited quarter carried forward twelve months from {current.points[0].month}
              {captured > 0 ? `, with the ${usd.format(captured)} a month of implemented savings taken out of expenses.` : ". Mark a risk callout as implemented to see its effect here."}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={seasonality} onChange={(e) => setSeasonality(e.target.checked)} className="h-4 w-4 accent-indigo-400" />
              Apply field-service seasonality
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="12-mo revenue" value={usd.format(projected.revenue)} />
            <Stat label="12-mo expenses" value={usd.format(projected.expenses)} />
            <Stat label="12-mo net" value={usd.format(current.adjustedAnnualNet)} tone={current.adjustedAnnualNet < 0 ? "bad" : "good"} />
            <Stat label={captured > 0 ? "Gain from implemented savings" : "Gain if every flag is closed"} value={signedUsd(captured > 0 ? current.delta : potential.delta)} tone={captured > 0 ? "good" : undefined} />
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-5">
            <div className="min-w-0 xl:col-span-2">
              <SubHeading>Cumulative net cash</SubHeading>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="month" {...axisProps} tickFormatter={monthTick(false)} minTickGap={16} />
                    <YAxis {...axisProps} width={64} tickFormatter={(v: number) => usdCompact.format(v)} />
                    <ReferenceLine y={0} stroke={CHART.zero} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.cursor }} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: CHART.legend }} />
                    <Line name="Current run rate" type="linear" dataKey="Current run rate" stroke={COLOR.baseline} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                    {captured > 0 && (
                      <Line name="With implemented savings" type="linear" dataKey="With implemented savings" stroke={COLOR.gain} strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400" aria-live="polite">
                {seasonality
                  ? `Strongest projected month: ${strongest.month} (${usd.format(strongest.adjustedNet)} net). Softest: ${softest.month} (${usd.format(softest.adjustedNet)} net).`
                  : `Without seasonality every month repeats the quarter's average: ${usd.format(softest.adjustedNet)} net.`}{" "}
                {softest.adjustedNet < 0 ? "Plan cash for the months that run negative." : "No projected month runs negative."}
              </p>
            </div>

            <div className="min-w-0 xl:col-span-3">
              <SubHeading>Monthly outlook</SubHeading>
              <div className="mt-2 overflow-x-auto rounded-xl border border-white/10" tabIndex={0} role="region" aria-label="12-month projection table">
                <table className="w-full min-w-[36rem] text-sm">
                  <caption className="sr-only">Projected revenue, expenses, net and cumulative net for the next 12 months</caption>
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th scope="col" className="py-2 pl-3 pr-3 text-left font-medium">
                        Month
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Revenue
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Expenses
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Net
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Cumulative
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.points.map((p) => (
                      <tr key={p.month} className="border-t border-white/5">
                        <th scope="row" className="py-1.5 pl-3 pr-3 text-left font-normal text-slate-200">
                          {p.month}
                        </th>
                        <td className={cn(cell, "py-1.5 text-slate-300")}>{usd.format(p.adjustedRevenue)}</td>
                        <td className={cn(cell, "py-1.5 text-slate-300")}>{usd.format(p.adjustedExpenses)}</td>
                        <td className={cn(cell, "py-1.5", p.adjustedNet < 0 ? "text-rose-300" : "text-slate-100")}>{usd.format(p.adjustedNet)}</td>
                        <td className={cn(cell, "py-1.5", p.adjustedCumulative < 0 ? "text-rose-300" : "text-slate-100")}>{usd.format(p.adjustedCumulative)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/15 bg-white/[0.03] font-medium">
                      <th scope="row" className="py-2 pl-3 pr-3 text-left font-medium text-slate-200">
                        12 months
                      </th>
                      <td className={cn(cell, "text-slate-100")}>{usd.format(projected.revenue)}</td>
                      <td className={cn(cell, "text-slate-100")}>{usd.format(projected.expenses)}</td>
                      <td className={cn(cell, "text-slate-100")}>{usd.format(current.adjustedAnnualNet)}</td>
                      <td className={cn(cell, "text-slate-500")}>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <SampleNote>
            Computed by the same projection engine the product uses, from the sample quarter&apos;s averages. Seasonality reshapes months along a typical field-service curve. It is arithmetic on these inputs, not a
            prediction; Pro lets you extend the horizon and layer your own what-if scenarios on top.
          </SampleNote>
        </Section>

        {/* 5. Detailed analysis */}
        <Section index={4}>
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
            <div>
              <SubHeading>Profitability</SubHeading>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                The quarter earned {pct(AVG_NET / AVG_REVENUE)} on revenue against a budgeted {pct(BUDGET_MARGIN)}. The shortfall is a cost story, not a sales one: revenue beat budget by{" "}
                {usd.format(AVG_REVENUE - BUDGET_REVENUE)} a month while expenses overshot by {usd.format(EXPENSE_OVERRUN)}. Net came in {usd.format(Math.abs(AVG_NET - BUDGET_NET))} a month{" "}
                {AVG_NET < BUDGET_NET ? "under" : "over"} plan.
              </p>
            </div>
            <div>
              <SubHeading>Cost structure</SubHeading>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {BY_SIZE[0].category} is the largest cost at {usd.format(avg(BY_SIZE[0].actual))} a month, {pct(avg(BY_SIZE[0].actual) / AVG_REVENUE)} of revenue. Together with {BY_SIZE[1].category} and{" "}
                {BY_SIZE[2].category} it makes up {pct(sumOf(BY_SIZE.slice(0, 3), (l) => avg(l.actual)) / AVG_EXPENSES)} of operating expenses, so small percentage moves in those three lines outweigh everything
                else on the statement.
              </p>
            </div>
            <div>
              <SubHeading>Budget discipline</SubHeading>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {LINES_OVER.length} of {DEMO_EXPENSES.length} expense lines ran over budget, {LINES_UNDER.length} ran under and {DEMO_EXPENSES.length - LINES_OVER.length - LINES_UNDER.length} landed exactly on it. The
                largest overrun was {LARGEST_OVERRUN.category} at {usd.format(overBudget(LARGEST_OVERRUN))} a month.
                {LINES_UNDER[0] && ` ${LINES_UNDER[0].category} came in ${usd.format(-overBudget(LINES_UNDER[0]))} under, though it rose each month.`}
              </p>
            </div>
            <div>
              <SubHeading>Trends to watch</SubHeading>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {FASTEST_COST.category} grew fastest, up {pct(growth(FASTEST_COST))} from {DEMO_MONTHS[FIRST]} to {DEMO_MONTHS[LAST]} ({usd.format(FASTEST_COST.actual[FIRST])} to{" "}
                {usd.format(FASTEST_COST.actual[LAST])}). On the revenue side, {FASTEST_REVENUE.label} was the steadiest grower at {pct(growth(FASTEST_REVENUE))} over the same months and totalled{" "}
                {usd.format(total(FASTEST_REVENUE.actual))} for the quarter.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <SubHeading>Recommended next steps</SubHeading>
            <ol className="mt-2 space-y-2">
              {DEMO_FLAGS.map((f, i) => {
                const done = implemented.has(f.id);
                return (
                  <li key={f.id} className="flex items-start gap-3 text-sm">
                    <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums", done ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-slate-300")}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-label="Implemented" /> : i + 1}
                    </span>
                    <p className={cn("min-w-0 flex-1 leading-relaxed", done ? "text-slate-400" : "text-slate-300")}>
                      {f.action}{" "}
                      <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                        {f.potentialSavings > 0 ? `${done ? "Saving" : "Worth"} ${usd.format(f.potentialSavings)} / mo` : "No saving assumed"}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Locked section: neutral placeholder bars, not blurred fake content. */}
          <div className="mt-5 rounded-lg border border-dashed border-white/15 p-4">
            <div aria-hidden className="space-y-2 opacity-40">
              <div className="h-2.5 w-2/5 rounded bg-white/15" />
              <div className="h-2 w-full rounded bg-white/10" />
              <div className="h-2 w-11/12 rounded bg-white/10" />
              <div className="h-2 w-4/5 rounded bg-white/10" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ProBadge />
              <p className="text-xs text-slate-400">
                <ListChecks className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Strategy deep-dives: a step-by-step plan for each callout, written against your own line items.
              </p>
            </div>
          </div>
        </Section>

        {/* What Pro adds around the report */}
        <section aria-labelledby="demo-report-pro-title" className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-amber-400/10 to-transparent p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <h4 id="demo-report-pro-title" className="flex items-center gap-2 text-base font-semibold text-slate-100">
                <Sparkles className="h-4 w-4 text-amber-200" aria-hidden /> This report, written from your own statements
              </h4>
              <p className="mt-1 text-sm text-slate-300">
                Pro builds it from the statements you upload and refreshes it as each month closes. ${PRICING.proMonthlyUsd} a month or ${PRICING.proAnnualUsd} a year.
              </p>
            </div>
            <UpgradeLink className="shrink-0 px-5 py-2.5" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <LockedFeature icon={<Download className="h-4 w-4" aria-hidden />} title="Download as PDF" description="The full report as a formatted PDF, one click from the dashboard." />
            <LockedFeature icon={<Share2 className="h-4 w-4" aria-hidden />} title="Share by link" description="Send a read-only report link to a partner, lender or accountant." />
            <LockedFeature icon={<FileSpreadsheet className="h-4 w-4" aria-hidden />} title="CSV / Excel export" description="Take the underlying numbers into your own spreadsheet." />
          </div>
          <div className="mt-3">
            <SampleNote>These three are previews of what Pro includes. They aren&apos;t operable in the demo because there is no real report behind this sample.</SampleNote>
          </div>
        </section>
      </div>
    </article>
  );
}
