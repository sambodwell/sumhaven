"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet, FileText, LayoutDashboard, LineChart as LineChartIcon, MessageSquareText, RotateCcw, SlidersHorizontal, Sparkles, Table2 } from "lucide-react";
import { applyScenario, defaultProjectionStart, type ScenarioAdjustment } from "@/lib/schemas";
import { CHART, ChartTooltip, COLOR, Stat, axisProps, impactColor, monthTick, signedUsd } from "@/components/dashboard/chartKit";
import { ExpenseBars, ExpenseDonut, ExpenseViewToggle, toExpenseCategories, toSlices, useExpenseView } from "@/components/dashboard/ExpenseShare";
import { MarginPercentileCard } from "@/components/dashboard/MarginPercentile";
import { NumberField } from "@/components/dashboard/WhatIfSimulator";
import { cn, glass, pct, secondaryBtn, usd, usdCompact } from "@/components/ui";
import { DEMO_BASELINE, DEMO_COMPANY, DEMO_EXPENSES, DEMO_FLAGS, DEMO_MONTHS, DEMO_PERIOD, DEMO_REVENUE, avg, total, type DemoLine } from "./demoData";
import { AssistantPanel } from "./DemoAssistant";
import { DemoReport } from "./DemoReport";
import { AVG_EXPENSES, AVG_NET, AVG_REVENUE, LockedFeature, POTENTIAL_SAVINGS, SampleNote, SeverityPill, UpgradeLink, asAdjustments, implementedSavings as savingsOf, sumOf } from "./demoShared";

/** Sample expenses by category (Q3 monthly averages), largest first: the data behind both expense views. */
const EXPENSE_CATEGORIES = toExpenseCategories(DEMO_EXPENSES.map((e) => ({ name: e.category, value: avg(e.actual) })));
const EXPENSE_SLICES = toSlices(EXPENSE_CATEGORIES);

/** Eases a displayed number toward `target` (instant when the visitor prefers reduced motion). */
function useCountUp(target: number, ms = 700): number {
  const [value, setValue] = useState(0);
  const shown = useRef(0);
  useEffect(() => {
    const from = shown.current;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = duration ? Math.min(1, (now - t0) / duration) : 1;
      const next = from + (target - from) * (1 - Math.pow(1 - p, 3));
      shown.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

// ---------------------------------------------------------------------------
// 1. Overview dashboard
// ---------------------------------------------------------------------------

function OverviewPanel({ implemented, onToggle, onOpenReport }: { implemented: ReadonlySet<string>; onToggle: (id: string) => void; onOpenReport: () => void }) {
  const implementedSavings = savingsOf(implemented);
  const remaining = useCountUp(POTENTIAL_SAVINGS - implementedSavings);
  const captured = useCountUp(implementedSavings);
  const months = DEMO_MONTHS.map((m, i) => ({
    label: m,
    Revenue: sumOf(DEMO_REVENUE, (l) => l.actual[i]),
    Expenses: sumOf(DEMO_EXPENSES, (l) => l.actual[i]),
  }));
  const [expenseView, setExpenseView] = useExpenseView("bar");
  const [start] = useState(() => defaultProjectionStart());
  const margin = (AVG_NET + implementedSavings) / AVG_REVENUE;
  // The next 12 months at the sample quarter's averages, less whatever has been marked implemented.
  const projectedNet = useMemo(() => applyScenario(DEMO_BASELINE, asAdjustments(DEMO_FLAGS.filter((f) => implemented.has(f.id))), { start, months: 12 }).adjustedAnnualNet, [implemented, start]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Revenue / month" value={usd.format(AVG_REVENUE)} />
        <Stat label="Expenses / month" value={usd.format(AVG_EXPENSES - implementedSavings)} />
        <Stat label="Net / month" value={usd.format(AVG_NET + implementedSavings)} tone="good" />
        <Stat label="Net margin" value={pct(margin)} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="12-mo projected net" value={usd.format(projectedNet)} tone={projectedNet < 0 ? "bad" : "good"} />
        </div>
      </div>

      {/* Savings tickers: move as flags below are marked implemented. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
          <p className="text-[11px] uppercase tracking-wide text-amber-200/80">Potential savings still flagged</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-100" aria-live="polite">
            {usd.format(remaining)}
            <span className="text-sm font-normal text-slate-400"> / month</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">An estimate of what acting on every open flag would free up. Not a guarantee.</p>
        </div>
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-4">
          <p className="text-[11px] uppercase tracking-wide text-emerald-200/80">Savings marked implemented</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-200" aria-live="polite">
            {usd.format(captured)}
            <span className="text-sm font-normal text-slate-400"> / month · {usd.format(captured * 12)} / year</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Mark a flag as implemented below and the net figures above update with it.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h4 className="text-sm font-medium text-slate-200">Monthly cash flow</h4>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={52} tickFormatter={(v: number) => usdCompact.format(v)} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursorFill }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: CHART.legend }} />
                <Bar dataKey="Revenue" fill={COLOR.revenue} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Expenses" fill={COLOR.expenses} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-slate-200">Where the money goes</h4>
            <ExpenseViewToggle value={expenseView} onChange={setExpenseView} />
          </div>
          {expenseView === "bar" ? (
            <ExpenseBars categories={EXPENSE_CATEGORIES} className="mt-2 max-h-56" />
          ) : (
            <ExpenseDonut className="mt-3" slices={EXPENSE_SLICES} total={AVG_EXPENSES} totalNote={`${pct(AVG_EXPENSES / AVG_REVENUE)} of revenue`} caption="Sample expenses by category" />
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-200">Industry comparison</h4>
        <MarginPercentileCard profile="FIELD_SERVICES" margin={margin} className="mt-2" />
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-200">Audit flags</h4>
        <ul className="mt-2 space-y-2">
          {DEMO_FLAGS.map((f) => {
            const done = implemented.has(f.id);
            return (
              <li key={f.id} className={cn("rounded-xl border p-3 transition", done ? "border-emerald-300/25 bg-emerald-400/[0.05]" : "border-white/10 bg-white/[0.03]")}>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityPill severity={f.severity} />
                  <p className="text-sm font-medium text-slate-100">{f.title}</p>
                  {f.potentialSavings > 0 && <span className="ml-auto text-xs tabular-nums text-slate-300">est. {usd.format(f.potentialSavings)} / mo</span>}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.message}</p>
                {f.potentialSavings > 0 && (
                  <button type="button" onClick={() => onToggle(f.id)} aria-pressed={done} className={cn(secondaryBtn, "mt-2 px-2.5 py-1 text-xs", done && "border-emerald-300/30 text-emerald-200")}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {done ? "Implemented — undo" : "Mark as implemented"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-amber-300/25 bg-gradient-to-r from-amber-400/10 to-transparent p-4 sm:flex-row sm:items-center">
        <FileText className="h-5 w-5 shrink-0 text-amber-200" aria-hidden />
        <p className="flex-1 text-sm text-slate-300">
          <span className="font-medium text-slate-100">These flags feed the Executive Report.</span> It adds audit goals, the month-by-month P&amp;L, a 12-month projection and the written analysis.
        </p>
        <button type="button" onClick={onOpenReport} className={cn(secondaryBtn, "shrink-0")}>
          Open the Executive Report <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Forecasting (what-if)
// ---------------------------------------------------------------------------

const PRESETS: { label: string; revenue: number; expenses: number }[] = [
  { label: "Lose a major client", revenue: -15, expenses: 0 },
  { label: "Costs rise 8%", revenue: 0, expenses: 8 },
  { label: "Grow 12%, hire to match", revenue: 12, expenses: 7 },
];

const SLIDER_RANGE = 30;
/** Typed percentages can go past the slider: a line can't lose more than all of itself; growth is capped at double. */
const TYPED_MIN = -100;
const TYPED_MAX = 100;

/** Drag the slider, or type an exact percentage (decimals allowed) in the box beside the label. */
function ShiftSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  // A typed value beyond ±30% widens the track so the thumb still shows where you are.
  const lo = Math.min(-SLIDER_RANGE, value);
  const hi = Math.max(SLIDER_RANGE, value);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-slate-300">
          {label}
        </label>
        <NumberField aria-label={`${label} in percent (type an exact value)`} value={value} onCommit={(v) => onChange(v ?? 0)} min={TYPED_MIN} max={TYPED_MAX} suffix="%" className="w-20" />
      </div>
      <input id={id} type="range" min={lo} max={hi} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-indigo-400" />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{lo}%</span>
        <span>0</span>
        <span>+{hi}%</span>
      </div>
    </div>
  );
}

function ForecastPanel({ onOpenChat }: { onOpenChat: () => void }) {
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [seasonality, setSeasonality] = useState(false);
  const [start] = useState(() => defaultProjectionStart());

  const result = useMemo(() => {
    const adjustments: ScenarioAdjustment[] = [
      { type: "REVENUE_PCT", match: null, pct: revenue / 100, startMonth: 1, description: "Revenue shift" },
      { type: "EXPENSE_PCT", match: null, pct: expenses / 100, startMonth: 1, description: "Expense shift" },
    ];
    return applyScenario(DEMO_BASELINE, adjustments, { start, months: 12, seasonality });
  }, [revenue, expenses, seasonality, start]);
  const active = revenue !== 0 || expenses !== 0;
  const data = result.points.map((p) => ({ month: p.month, Baseline: p.baselineCumulative, "What-if": p.adjustedCumulative }));
  const worst = Math.min(...result.points.map((p) => p.adjustedNet));

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <ShiftSlider label="Revenue shift" value={revenue} onChange={setRevenue} />
        <ShiftSlider label="Expense shift" value={expenses} onChange={setExpenses} />
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={seasonality} onChange={(e) => setSeasonality(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-400" />
          <span>
            Apply seasonality
            <span className="block text-xs text-slate-500">Reshapes months using a typical field-service curve (busy summers, slow winters).</span>
          </span>
        </label>
        <div>
          <p className="text-xs text-slate-500">Stress tests</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setRevenue(p.revenue);
                  setExpenses(p.expenses);
                }}
                className={cn(secondaryBtn, "px-2.5 py-1 text-xs")}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              disabled={!active && !seasonality}
              onClick={() => {
                setRevenue(0);
                setExpenses(0);
                setSeasonality(false);
              }}
              className={cn(secondaryBtn, "px-2.5 py-1 text-xs")}
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Reset
            </button>
          </div>
        </div>
        <LockedFeature
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          title="Plain-English scenarios"
          description={'In Pro, describe a change in words ("hire a technician in March at $4,800/mo") and Sumhaven turns it into line-level adjustments you can save and compare.'}
        />
        <button type="button" onClick={onOpenChat} className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200">
          See a sample question answered <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="lg:col-span-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Baseline · 12 mo net" value={usd.format(result.baselineAnnualNet)} />
          <Stat label="What-if · 12 mo net" value={usd.format(result.adjustedAnnualNet)} tone={result.adjustedAnnualNet < 0 ? "bad" : undefined} />
          <Stat label="Difference" value={signedUsd(result.delta)} tone={!active ? undefined : result.delta >= 0 ? "good" : "bad"} />
        </div>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" {...axisProps} tickFormatter={monthTick(false)} minTickGap={16} />
              <YAxis {...axisProps} width={64} tickFormatter={(v: number) => usdCompact.format(v)} />
              <ReferenceLine y={0} stroke={CHART.zero} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.cursor }} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: CHART.legend }} />
              <Line name="Baseline" type="linear" dataKey="Baseline" stroke={COLOR.baseline} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
              {active && (
                <Line name="What-if" type="linear" dataKey="What-if" stroke={impactColor(result.delta)} strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-400" aria-live="polite">
          Cumulative net cash over the next 12 months.{" "}
          {worst < 0 ? (
            <span className="text-rose-300">In this scenario the weakest month runs {usd.format(Math.abs(worst))} negative.</span>
          ) : (
            <>The weakest month in this scenario still nets {usd.format(worst)}.</>
          )}
        </p>
        <SampleNote>A projection of the sample statement&apos;s Q3 averages, computed by the same engine the product uses. It is arithmetic on your inputs, not a prediction.</SampleNote>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Fiscal year actuals (budget vs. actual)
// ---------------------------------------------------------------------------

const PERIODS = [...DEMO_MONTHS, "Q3 total"] as const;

function VarianceRow({ label, sub, budget, actual, moreIsGood, strong }: { label: string; sub?: string; budget: number; actual: number; moreIsGood: boolean; strong?: boolean }) {
  const variance = actual - budget;
  const ratio = budget ? variance / budget : 0;
  const good = variance === 0 ? null : variance > 0 === moreIsGood;
  const tone = good === null ? "text-slate-400" : good ? "text-emerald-300" : "text-rose-300";
  return (
    <tr className={cn("border-t border-white/5", strong && "border-white/15 font-medium")}>
      <th scope="row" className="py-2 pr-3 text-left font-normal">
        <span className={cn("text-slate-200", strong && "font-medium")}>{label}</span>
        {sub && <span className="block text-[11px] text-slate-500">{sub}</span>}
      </th>
      <td className="px-3 py-2 text-right tabular-nums text-slate-400">{usd.format(budget)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-100">{usd.format(actual)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums", tone)}>{variance === 0 ? "—" : signedUsd(variance)}</td>
      <td className={cn("py-2 pl-3 text-right tabular-nums", tone)}>{variance === 0 ? "on budget" : `${ratio > 0 ? "+" : "−"}${pct(Math.abs(ratio))}`}</td>
    </tr>
  );
}

function ActualsPanel() {
  const [period, setPeriod] = useState<number>(3);
  const months = period === 3 ? 3 : 1;
  const actual = (l: DemoLine) => (period === 3 ? total(l.actual) : l.actual[period]);
  const budget = (l: DemoLine) => l.budget * months;
  const rev = { budget: sumOf(DEMO_REVENUE, budget), actual: sumOf(DEMO_REVENUE, actual) };
  const exp = { budget: sumOf(DEMO_EXPENSES, budget), actual: sumOf(DEMO_EXPENSES, actual) };
  const over = [...DEMO_EXPENSES].sort((a, b) => actual(b) - budget(b) - (actual(a) - budget(a)))[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-white/10 p-0.5">
          {PERIODS.map((p, i) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === i}
              onClick={() => setPeriod(i)}
              className={cn("rounded-md px-3 py-1 text-xs transition", period === i ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          Largest overrun: <span className="text-slate-200">{over.category}</span> ({signedUsd(actual(over) - budget(over))})
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">
            Budget versus actual for {PERIODS[period]}, {DEMO_COMPANY}
          </caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-500">
              <th scope="col" className="pb-2 pr-3 text-left font-medium">
                Line
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-medium">
                Budget
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-medium">
                Actual
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-medium">
                Variance
              </th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <VarianceRow label="Revenue" budget={rev.budget} actual={rev.actual} moreIsGood strong />
            {DEMO_EXPENSES.map((l) => (
              <VarianceRow key={l.category} label={l.category} sub={l.label} budget={budget(l)} actual={actual(l)} moreIsGood={false} />
            ))}
            <VarianceRow label="Total operating expenses" budget={exp.budget} actual={exp.actual} moreIsGood={false} strong />
            <VarianceRow label="Net" budget={rev.budget - exp.budget} actual={rev.actual - exp.actual} moreIsGood strong />
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <LockedFeature icon={<FileSpreadsheet className="h-4 w-4" aria-hidden />} title="CSV / Excel export" description="Pro exports the full ledger and variance table for your accountant or your own models." />
        <SampleNote>
          Sample budget and actuals for a fictional company. In the product, actuals come from the statements you upload each month and the budget is the one you set.
        </SampleNote>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabbed showcase
// ---------------------------------------------------------------------------

const TABS = [
  { id: "overview", label: "Overview Dashboard", icon: LayoutDashboard, blurb: "Instant high-level visibility into cash flow and operational health at a glance." },
  { id: "forecast", label: "Forecasting", icon: SlidersHorizontal, blurb: "Model future growth trajectories and stress-test financial scenarios with precision inputs." },
  { id: "assistant", label: "AI Scenario Chat", icon: MessageSquareText, blurb: "Ask a plain-English question and watch the forecast and 12-month projection adjust to answer it." },
  { id: "actuals", label: "Fiscal Year Actuals", icon: Table2, blurb: "Keep budgets airtight with deep-dive variance tracking across all operating expenses." },
  { id: "report", label: "Executive Report & Audit", icon: FileText, blurb: "The Pro deliverable: audit goals and risk callouts with dollar amounts, the month-by-month P&L, a 12-month projection and the full written analysis." },
] as const;

export function DemoShowcase({ onRestart }: { onRestart: () => void }) {
  const [tab, setTab] = useState(0);
  const [implemented, setImplemented] = useState<ReadonlySet<string>>(new Set());
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const baseId = useId();
  const current = TABS[tab];

  // The showcase replaces the processing step: move focus to it so keyboard and screen-reader users land here too.
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  /** Tab changes from below the fold (Back / Next, in-panel links) bring the top of the showcase back into view. */
  const goTo = (i: number) => {
    setTab(i);
    headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const REPORT_TAB = TABS.length - 1;

  const toggle = (id: string) =>
    setImplemented((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : step ? (tab + step + TABS.length) % TABS.length : null;
    if (next === null) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={`${baseId}-title`} className={cn(glass, "p-4 sm:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${baseId}-title`} ref={headingRef} tabIndex={-1} className="flex scroll-mt-20 items-center gap-2 text-lg font-semibold outline-none">
            <LineChartIcon className="h-5 w-5 text-indigo-300" aria-hidden /> Analysis ready: explore what Pro does with it
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {DEMO_COMPANY} · {DEMO_PERIOD} · fictional sample data
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab !== REPORT_TAB && (
            <button type="button" onClick={() => setTab(REPORT_TAB)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-300/20">
              <FileText className="h-3.5 w-3.5" aria-hidden /> View the full Executive Report
            </button>
          )}
          <button type="button" onClick={onRestart} className={cn(secondaryBtn, "px-3 py-1.5 text-xs")}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restart demo
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Pro features" onKeyDown={onKeyDown} className="mt-4 flex gap-1 overflow-x-auto border-b border-white/10">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={tab === i}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400",
              tab === i ? "border-indigo-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200",
            )}
          >
            <t.icon className="h-4 w-4" aria-hidden />
            <span className="text-[11px] tabular-nums text-slate-500">{i + 1}</span> {t.label}
            {i === REPORT_TAB && <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden />}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${current.id}`} className="pt-4">
        <p className="mb-4 rounded-lg border border-indigo-300/20 bg-indigo-500/[0.06] px-3 py-2 text-sm text-indigo-100">{current.blurb}</p>
        {current.id === "overview" && <OverviewPanel implemented={implemented} onToggle={toggle} onOpenReport={() => goTo(REPORT_TAB)} />}
        {current.id === "forecast" && <ForecastPanel onOpenChat={() => goTo(TABS.findIndex((t) => t.id === "assistant"))} />}
        {current.id === "assistant" && <AssistantPanel />}
        {current.id === "actuals" && <ActualsPanel />}
        {current.id === "report" && <DemoReport implemented={implemented} onToggle={toggle} />}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={() => goTo(tab - 1)} disabled={tab === 0} className={secondaryBtn}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <p className="text-xs text-slate-500">
          {tab + 1} of {TABS.length}
        </p>
        {tab < TABS.length - 1 ? (
          <button type="button" onClick={() => goTo(tab + 1)} className={secondaryBtn}>
            Next: {TABS[tab + 1].label} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <UpgradeLink />
        )}
      </div>
    </section>
  );
}
