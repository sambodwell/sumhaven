"use client";

import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Crosshair, RotateCcw, SlidersHorizontal, Zap } from "lucide-react";
import { MODE_COPY, applyScenario, modeOf, projectionOptions, splitTotals, type FinancialAnalysis, type ForecastSettings, type ScenarioAdjustment, type ScenarioResult } from "@/lib/schemas";
import { breakEven, computeRunway } from "@/lib/runway";
import { CHART, COLOR, ChartTooltip, Stat, axisProps, impactColor, monthTick, signedUsd } from "@/components/dashboard/chartKit";
import { InfoTip } from "@/components/InfoTip";
import { cn, glass, inputCls, secondaryBtn, usd, usdCompact } from "@/components/ui";

interface WhatIfState {
  fixedDelta: number;
  fixedLabel: string;
  fixedStart: number;
  revenuePct: number;
  scaleCategory: string; // "" = all recurring expenses
  scalePct: number;
}

const INITIAL: WhatIfState = { fixedDelta: 0, fixedLabel: "", fixedStart: 1, revenuePct: 0, scaleCategory: "", scalePct: 0 };

const ALL = "";
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Plain number for an input box: thousands separators, decimals only when there are cents. */
const plain = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals > 0 && !Number.isInteger(round2(v)) ? 2 : 0, maximumFractionDigits: decimals });

/** Parses typed text ("$1,250.50", "−300", "12%") to a number, or null while it isn't one yet ("", "-", "."). */
function parseTyped(raw: string): number | null {
  const t = raw.replace(/[−–]/g, "-").replace(/[\s,$%]/g, "");
  if (!/^-?\d*\.?\d*$/.test(t) || !/\d/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compact numeric box for exact entry. Shows the formatted value until focused; while typing, every parseable value
 * is committed (clamped to [min, max]) so the chart follows along, and blur restores the clean formatted value.
 */
export function NumberField({
  value,
  onCommit,
  min,
  max,
  decimals = 2,
  prefix,
  suffix,
  placeholder,
  className,
  ...rest
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  min: number;
  max: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label": string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value == null ? "" : plain(value, decimals));
  const clamp = (n: number) => Math.min(max, Math.max(min, decimals === 0 ? Math.round(n) : round2(n)));
  return (
    <div className={cn("group relative shrink-0", className)}>
      {prefix && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-slate-500 group-focus-within:text-indigo-300">{prefix}</span>}
      <input
        {...rest}
        type="text"
        inputMode={decimals === 0 && min >= 0 ? "numeric" : "decimal"}
        autoComplete="off"
        value={shown}
        placeholder={placeholder}
        onFocus={(e) => {
          setText(value == null ? "" : String(value));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === "") return onCommit(null);
          const n = parseTyped(e.target.value);
          if (n != null) onCommit(clamp(n));
        }}
        onBlur={() => setText(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(inputCls, "py-1 text-right text-xs tabular-nums", prefix ? "pl-5" : "pl-2", suffix ? "pr-6" : "pr-2")}
      />
      {suffix && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">{suffix}</span>}
    </div>
  );
}

/** Slider + readout, with a number box to its right for exact values and a center tick at zero for two-sided ranges. */
function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  hint,
  field,
  pctField,
}: {
  /** Editable percent box shown in place of the read-only value, for sliders measured in percent. */
  pctField?: ReactNode;
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
  /** Exact-entry box shown to the right of the slider. */
  field?: ReactNode;
}) {
  // A typed value outside the slider's usual range widens it, so the thumb still shows where you are.
  const lo = Math.min(min, value);
  const hi = Math.max(max, value);
  const zeroAt = lo < 0 && hi > 0 ? ((0 - lo) / (hi - lo)) * 100 : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-300">
          {label}
        </label>
        {pctField ?? (
          <output htmlFor={id} className={cn("text-sm font-semibold tabular-nums", value === 0 ? "text-slate-500" : "text-slate-50")}>
            {format(value)}
          </output>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          {zeroAt != null && <span aria-hidden className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-500" style={{ left: `${zeroAt}%` }} />}
          <input id={id} type="range" min={lo} max={hi} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-indigo-400" />
        </div>
        {field}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

const signedPct = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}%`;
};

/** Hard bounds for typed percentages: can't cut more than everything; growth capped at 10×. */
const PCT_MIN = -100;
const PCT_MAX = 1000;

/**
 * Runs the what-if on top of `base` adjustments (implemented savings), so "Baseline" means the plan with those savings
 * already in it and the what-if line shows only the owner's slider changes on top.
 */
function runWithBase(
  input: Parameters<typeof applyScenario>[0],
  base: ScenarioAdjustment[],
  adjustments: ScenarioAdjustment[],
  opts: ReturnType<typeof projectionOptions>,
): ScenarioResult {
  if (!base.length) return applyScenario(input, adjustments, opts);
  const b = applyScenario(input, base, opts);
  const w = applyScenario(input, [...base, ...adjustments], opts);
  const baseSet = new Set(base.map((a) => a.description));
  return {
    ...w,
    points: w.points.map((p, i) => ({
      ...p,
      baselineNet: b.points[i].adjustedNet,
      baselineRevenue: b.points[i].adjustedRevenue,
      baselineExpenses: b.points[i].adjustedExpenses,
      baselineCumulative: b.points[i].adjustedCumulative,
    })),
    baselineAnnualNet: b.adjustedAnnualNet,
    delta: round2(w.adjustedAnnualNet - b.adjustedAnnualNet),
    beyondHorizon: w.beyondHorizon.filter((d) => !baseSet.has(d)),
    unmatched: w.unmatched.filter((d) => !baseSet.has(d)),
  };
}

/**
 * Client-side "What-If" sliders: every change is a deterministic scenario adjustment run through the same projection
 * engine as the baseline, so the overlay updates instantly and costs no AI queries.
 */
export function WhatIfSimulator({
  analysis,
  settings,
  cash,
  baseAdjustments = [],
}: {
  analysis: FinancialAnalysis;
  settings: ForecastSettings;
  cash?: number | null;
  /** Always-on changes folded into the baseline (implemented savings). */
  baseAdjustments?: ScenarioAdjustment[];
}) {
  const uid = useId();
  const copy = MODE_COPY[modeOf(analysis.businessType)];
  const personal = analysis.businessType === "PERSONAL_FAMILY";
  const [s, setS] = useState<WhatIfState>(INITIAL);
  const [targetNet, setTargetNet] = useState<number | null>(null);
  const [view, setView] = useState<"monthly" | "cumulative">("cumulative");
  const set = (patch: Partial<WhatIfState>) => setS((cur) => ({ ...cur, ...patch }));
  // Keep dragging smooth on long horizons: the chart catches up with the slider instead of blocking it.
  const deferred = useDeferredValue(s);

  const months = settings.months;
  const monthlyExpenses = splitTotals(analysis.itemizedExpenses).recurring;
  const monthlyRevenue = analysis.monthlyRevenue;
  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of analysis.itemizedExpenses) if (!e.oneTime) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [analysis.itemizedExpenses]);
  const scaleBase = s.scaleCategory === ALL ? monthlyExpenses : categories.find(([c]) => c === s.scaleCategory)?.[1] ?? 0;
  const fixedMax = Math.max(5000, Math.ceil((monthlyExpenses * 0.5) / 500) * 500);
  const fixedMin = -Math.min(fixedMax, Math.floor(monthlyExpenses / 100) * 100);
  const savingsMonthly = -baseAdjustments.reduce((acc, a) => acc + (a.type === "EXPENSE_ADD" ? a.amount : 0), 0);

  const adjustments = useMemo<ScenarioAdjustment[]>(() => {
    const out: ScenarioAdjustment[] = [];
    if (deferred.fixedDelta !== 0) {
      const label = deferred.fixedLabel.trim() || (deferred.fixedDelta > 0 ? (personal ? "New monthly bill" : "New fixed cost (e.g. hire)") : "Fixed cost removed");
      out.push({ type: "EXPENSE_ADD", label, amount: deferred.fixedDelta, startMonth: deferred.fixedStart, description: `${deferred.fixedDelta > 0 ? "Add" : "Cut"} ${usd.format(Math.abs(deferred.fixedDelta))}/mo fixed (${label})` });
    }
    if (deferred.revenuePct !== 0) {
      out.push({ type: "REVENUE_PCT", match: null, pct: deferred.revenuePct / 100, startMonth: 1, description: `${signedPct(deferred.revenuePct)} ${copy.revenue.toLowerCase()}` });
    }
    if (deferred.scalePct !== 0) {
      out.push({
        type: "EXPENSE_PCT",
        match: deferred.scaleCategory === ALL ? null : deferred.scaleCategory,
        pct: deferred.scalePct / 100,
        startMonth: 1,
        description: `${signedPct(deferred.scalePct)} ${deferred.scaleCategory || `all ${copy.expenses.toLowerCase()}`}`,
      });
    }
    return out;
  }, [deferred, personal, copy.revenue, copy.expenses]);

  const scenarioInput = useMemo(
    () => ({ businessType: analysis.businessType, itemizedRevenue: analysis.itemizedRevenue, itemizedExpenses: analysis.itemizedExpenses, inflationRateAssumed: analysis.inflationRateAssumed }),
    [analysis],
  );
  const opts = useMemo(() => projectionOptions(settings), [settings]);
  const result = useMemo(() => runWithBase(scenarioInput, baseAdjustments, adjustments, opts), [scenarioInput, baseAdjustments, adjustments, opts]);

  /*
   * Target net: the engine is linear in a revenue or an across-the-board expense percentage, so one probe run per side
   * gives the exact slope ($ of horizon net per 1%), and the required level is solved directly — seasonality,
   * inflation, partial months and %-of-revenue expenses all included.
   */
  const solver = useMemo(() => {
    const base = runWithBase(scenarioInput, baseAdjustments, [], opts).baselineAnnualNet;
    const probe = (type: "REVENUE_PCT" | "EXPENSE_PCT") =>
      (runWithBase(scenarioInput, baseAdjustments, [{ type, match: null, pct: 0.1, startMonth: 1, description: "probe" }], opts).adjustedAnnualNet - base) / 10;
    return { base, perRevPct: monthlyRevenue > 0 ? probe("REVENUE_PCT") : 0, perExpPct: monthlyExpenses > 0 ? probe("EXPENSE_PCT") : 0 };
  }, [scenarioInput, baseAdjustments, opts, monthlyRevenue, monthlyExpenses]);
  const target = useMemo(() => {
    if (targetNet == null) return null;
    const gap = round2(targetNet - solver.base);
    const revPct = Math.abs(solver.perRevPct) > 1e-9 ? gap / solver.perRevPct : null;
    const expPct = Math.abs(solver.perExpPct) > 1e-9 ? gap / solver.perExpPct : null;
    return {
      gap,
      revPct,
      revMonthly: revPct == null ? null : monthlyRevenue * (1 + revPct / 100),
      expPct,
      expMonthly: expPct == null ? null : monthlyExpenses * (1 + expPct / 100),
      // Costs can't go below zero.
      expReachable: expPct != null && expPct >= -100,
    };
  }, [targetNet, solver, monthlyRevenue, monthlyExpenses]);

  // Break-even and runway on the steady-state "what-if" month (last projected month's adjusted run-rate).
  const be = useMemo(() => breakEven(analysis.itemizedRevenue, analysis.itemizedExpenses), [analysis.itemizedRevenue, analysis.itemizedExpenses]);
  const beAt = (fixedChange: number) => (be.breakEvenMonthly == null ? null : Math.max(0, (be.fixedOverhead + fixedChange) / be.contributionMargin));
  const baseBreakEven = beAt(-savingsMonthly);
  const whatIfBreakEven = beAt(-savingsMonthly + (s.fixedDelta || 0) + (s.scalePct ? (scaleBase * s.scalePct) / 100 : 0));
  const runways = useMemo(() => {
    if (cash == null || !Number.isFinite(cash)) return null;
    const toProj = (k: "baseline" | "adjusted") => result.points.map((p) => ({ month: p.month, projectedRevenue: k === "baseline" ? p.baselineRevenue : p.adjustedRevenue, projectedExpenses: k === "baseline" ? p.baselineExpenses : p.adjustedExpenses }));
    return { base: computeRunway(cash, toProj("baseline")), next: computeRunway(cash, toProj("adjusted")) };
  }, [cash, result.points]);

  const active = adjustments.length > 0;
  const long = months > 12;
  const rows = result.points.map((p) =>
    view === "cumulative" ? { month: p.month, Baseline: p.baselineCumulative, "What-if": p.adjustedCumulative } : { month: p.month, Baseline: p.baselineNet, "What-if": p.adjustedNet },
  );
  const runwayText = (r: ReturnType<typeof computeRunway>) => (r.months == null ? (r.avgNet >= 0 ? "Self-funding" : "10+ yrs") : `${r.months.toFixed(1)} mo`);
  const pctToTarget = (pct: number) => Math.min(PCT_MAX, Math.max(PCT_MIN, round2(pct)));

  return (
    <div className={cn(glass, "p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <SlidersHorizontal className="h-5 w-5 text-indigo-300" /> What-If Simulator
            <InfoTip label="How the simulator works" align="left">
              Drag a slider — or type an exact amount in the box beside it — and the forecast re-runs instantly in your browser with the same projection engine as the
              baseline (your start month, horizon, seasonality and inflation settings apply). It doesn&apos;t use AI, so it never counts against your AI query allowance.
            </InfoTip>
          </h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-200">
            <Zap className="h-3.5 w-3.5" aria-hidden /> Instant · runs on your device · no AI queries used
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setS(INITIAL);
            setTargetNet(null);
          }}
          disabled={!active && !s.fixedLabel && targetNet == null}
          className={cn(secondaryBtn, "px-3 py-1.5 text-xs")}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-5">
          <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <legend className="px-1 text-[11px] uppercase tracking-wide text-slate-500">{personal ? "Fixed bills" : "Fixed monthly costs"}</legend>
            <Slider
              id={`${uid}-fixed`}
              label={personal ? "Add / remove a monthly bill" : "Add / cut fixed expenses"}
              value={s.fixedDelta}
              min={fixedMin}
              max={fixedMax}
              step={50}
              format={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${usd.format(Math.abs(v))}/mo`}
              onChange={(v) => set({ fixedDelta: v })}
              hint={personal ? "e.g. a new car payment, or cancelling a bill" : "e.g. hiring staff at $4,000/mo, or dropping an office lease"}
              field={
                <NumberField
                  aria-label="Exact fixed cost change per month (negative to cut)"
                  value={s.fixedDelta}
                  onCommit={(v) => set({ fixedDelta: v ?? 0 })}
                  min={-Math.max(0, Math.floor(monthlyExpenses))}
                  max={10_000_000}
                  prefix="$"
                  className="w-28"
                />
              }
            />
            <input
              value={s.fixedLabel}
              onChange={(e) => set({ fixedLabel: e.target.value.slice(0, 60) })}
              placeholder={personal ? "Name it (e.g. Car payment)" : "Name it (e.g. Junior designer hire)"}
              aria-label="Name for the fixed cost change"
              className={cn(inputCls, "py-1.5 text-xs")}
            />
            <Slider
              id={`${uid}-start`}
              label="Starting in"
              value={Math.min(s.fixedStart, months)}
              min={1}
              max={months}
              step={1}
              format={(v) => result.points[v - 1]?.month ?? `Month ${v}`}
              onChange={(v) => set({ fixedStart: v })}
              field={
                <NumberField
                  aria-label={`Starting month number (1 to ${months})`}
                  value={Math.min(s.fixedStart, months)}
                  onCommit={(v) => set({ fixedStart: v ?? 1 })}
                  min={1}
                  max={months}
                  decimals={0}
                  prefix="M"
                  className="w-28"
                />
              }
            />
          </fieldset>

          <fieldset className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <legend className="px-1 text-[11px] uppercase tracking-wide text-slate-500">{copy.revenue}</legend>
            <Slider
              id={`${uid}-rev`}
              label={personal ? "Income change" : "Revenue churn / growth"}
              value={s.revenuePct}
              min={-50}
              max={50}
              step={1}
              format={signedPct}
              onChange={(v) => set({ revenuePct: v })}
              hint={`${signedUsd((monthlyRevenue * s.revenuePct) / 100)}/mo on ${usd.format(monthlyRevenue)} recurring ${copy.revenue.toLowerCase()} · type an exact % above or a target $/mo in the box`}
              pctField={
                <NumberField aria-label={`${copy.revenue} change in percent`} value={s.revenuePct} onCommit={(v) => set({ revenuePct: v ?? 0 })} min={PCT_MIN} max={PCT_MAX} suffix="%" className="w-20" />
              }
              field={
                monthlyRevenue > 0 ? (
                  <NumberField
                    aria-label={`Target monthly ${copy.revenue.toLowerCase()} in dollars`}
                    value={round2(monthlyRevenue * (1 + s.revenuePct / 100))}
                    onCommit={(v) => set({ revenuePct: v == null ? 0 : pctToTarget((v / monthlyRevenue - 1) * 100) })}
                    min={0}
                    max={monthlyRevenue * (1 + PCT_MAX / 100)}
                    prefix="$"
                    className="w-28"
                  />
                ) : (
                  <NumberField aria-label={`${copy.revenue} change in percent`} value={s.revenuePct} onCommit={(v) => set({ revenuePct: v ?? 0 })} min={PCT_MIN} max={PCT_MAX} suffix="%" className="w-28" />
                )
              }
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <legend className="px-1 text-[11px] uppercase tracking-wide text-slate-500">{personal ? "Spending scaling" : "Expense scaling"}</legend>
            <label className="block text-xs text-slate-300">
              Apply to
              <select value={s.scaleCategory} onChange={(e) => set({ scaleCategory: e.target.value })} className={cn(inputCls, "mt-1 py-1.5 text-xs")}>
                <option value={ALL}>All recurring {copy.expenses.toLowerCase()}</option>
                {categories.map(([c, amt]) => (
                  <option key={c} value={c}>
                    {c} ({usd.format(amt)}/mo)
                  </option>
                ))}
              </select>
            </label>
            <Slider
              id={`${uid}-scale`}
              label={personal ? "Cut / raise spending" : "Cut / scale spend"}
              value={s.scalePct}
              min={-50}
              max={50}
              step={1}
              format={signedPct}
              onChange={(v) => set({ scalePct: v })}
              hint={`${signedUsd((scaleBase * s.scalePct) / 100)}/mo on ${usd.format(scaleBase)} · type an exact % above or a target $/mo in the box`}
              pctField={<NumberField aria-label="Spend change in percent" value={s.scalePct} onCommit={(v) => set({ scalePct: v ?? 0 })} min={PCT_MIN} max={PCT_MAX} suffix="%" className="w-20" />}
              field={
                scaleBase > 0 ? (
                  <NumberField
                    aria-label={`Target monthly spend for ${s.scaleCategory || "all recurring expenses"} in dollars`}
                    value={round2(scaleBase * (1 + s.scalePct / 100))}
                    onCommit={(v) => set({ scalePct: v == null ? 0 : pctToTarget((v / scaleBase - 1) * 100) })}
                    min={0}
                    max={scaleBase * (1 + PCT_MAX / 100)}
                    prefix="$"
                    className="w-28"
                  />
                ) : (
                  <NumberField aria-label="Spend change in percent" value={s.scalePct} onCommit={(v) => set({ scalePct: v ?? 0 })} min={PCT_MIN} max={PCT_MAX} suffix="%" className="w-28" />
                )
              }
            />
          </fieldset>
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={`Baseline ${months}-mo net`} value={signedUsd(result.baselineAnnualNet)} tone={result.baselineAnnualNet >= 0 ? "good" : "bad"} />
            <Stat label={`What-if ${months}-mo net`} value={signedUsd(result.adjustedAnnualNet)} tone={result.adjustedAnnualNet >= 0 ? "good" : "bad"} />
            <Stat label="Impact" value={active ? signedUsd(result.delta) : "—"} tone={!active ? undefined : result.delta >= 0 ? "good" : "bad"} />
            {runways ? (
              <Stat label="Cash runway" value={active ? `${runwayText(runways.base)} → ${runwayText(runways.next)}` : runwayText(runways.base)} tone={runways.next.level === "CRITICAL" ? "bad" : undefined} />
            ) : (
              <Stat
                label={personal ? "Income to break even" : "Break-even revenue"}
                value={
                  whatIfBreakEven == null
                    ? "—"
                    : active && baseBreakEven != null && Math.abs(whatIfBreakEven - baseBreakEven) > 0.5
                      ? `${usdCompact.format(baseBreakEven)} → ${usdCompact.format(whatIfBreakEven)}`
                      : `${usd.format(whatIfBreakEven)}/mo`
                }
              />
            )}
          </div>
          {savingsMonthly > 0 && <p className="mt-1.5 text-[11px] text-emerald-300/90">Baseline includes {usd.format(savingsMonthly)}/mo of savings you marked implemented.</p>}

          {/* Target net → required revenue / expense levels */}
          <div className="mt-3 rounded-xl border border-indigo-300/20 bg-indigo-500/[0.05] p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <label htmlFor={`${uid}-target`} className="flex items-center gap-1.5 text-xs font-medium text-indigo-100">
                <Crosshair className="h-3.5 w-3.5" aria-hidden /> Target {months}-mo net
              </label>
              <NumberField
                id={`${uid}-target`}
                aria-label={`Target ${months}-month net ${personal ? "savings" : "income"} in dollars`}
                value={targetNet}
                onCommit={setTargetNet}
                min={-1e10}
                max={1e10}
                prefix="$"
                placeholder={plain(Math.round(result.baselineAnnualNet), 0)}
                className="w-36"
              />
              <span className="text-[11px] text-slate-500">Type the net you want over the next {months} months — we&apos;ll solve for what it takes.</span>
            </div>
            {target && (
              <div className="mt-3 text-xs" aria-live="polite">
                {target.gap <= 0 ? (
                  <p className="text-emerald-200">
                    Your baseline already reaches this target, with {usd.format(-target.gap)} to spare over {months} months.
                  </p>
                ) : (
                  <>
                    <p className="text-slate-300">
                      You need <span className="font-semibold text-slate-50">{usd.format(target.gap)}</span> more net over {months} months (≈{usd.format(target.gap / months)}/mo). Either:
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{personal ? "Income needed" : "Revenue needed"}</p>
                        {target.revMonthly != null && target.revPct != null ? (
                          <>
                            <p className="mt-0.5 font-semibold tabular-nums text-slate-50">
                              {usd.format(target.revMonthly)}/mo <span className="font-normal text-emerald-300">({signedPct(target.revPct)})</span>
                            </p>
                            <p className="text-[11px] text-slate-500">with {copy.expenses.toLowerCase()} unchanged</p>
                            <button type="button" onClick={() => set({ revenuePct: pctToTarget(target.revPct!), scalePct: 0, fixedDelta: 0 })} className="mt-1.5 text-[11px] font-medium text-indigo-300 hover:text-indigo-200">
                              Apply to sliders →
                            </button>
                          </>
                        ) : (
                          <p className="mt-0.5 text-slate-500">Add recurring {copy.revenue.toLowerCase()} to solve for this.</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2.5">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{personal ? "Spending ceiling" : "Expense level needed"}</p>
                        {target.expMonthly != null && target.expPct != null && target.expReachable ? (
                          <>
                            <p className="mt-0.5 font-semibold tabular-nums text-slate-50">
                              {usd.format(target.expMonthly)}/mo <span className="font-normal text-emerald-300">({signedPct(target.expPct)})</span>
                            </p>
                            <p className="text-[11px] text-slate-500">with {copy.revenue.toLowerCase()} unchanged</p>
                            <button
                              type="button"
                              onClick={() => set({ scalePct: pctToTarget(target.expPct!), scaleCategory: ALL, revenuePct: 0, fixedDelta: 0 })}
                              className="mt-1.5 text-[11px] font-medium text-indigo-300 hover:text-indigo-200"
                            >
                              Apply to sliders →
                            </button>
                          </>
                        ) : (
                          <p className="mt-0.5 text-slate-500">{target.expPct == null ? `Add recurring ${copy.expenses.toLowerCase()} to solve for this.` : "Not reachable by cutting costs alone — it needs more revenue."}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400" aria-live="polite">
              {active ? adjustments.map((a) => a.description).join(" · ") : "Move a slider or type an amount to overlay a what-if line on your baseline."}
            </p>
            <div role="radiogroup" aria-label="Chart view" className="inline-flex rounded-lg border border-white/10 bg-slate-900/60 p-0.5 text-xs">
              {(
                [
                  ["cumulative", "Cumulative"],
                  ["monthly", "Monthly net"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => setView(k)} className={cn("rounded-md px-2.5 py-1 font-medium", view === k ? "bg-indigo-500/80 text-white" : "text-slate-400 hover:text-slate-200")}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" {...axisProps} tickFormatter={monthTick(long)} minTickGap={16} />
                <YAxis {...axisProps} width={72} tickFormatter={(v: number) => usdCompact.format(v)} />
                <ReferenceLine y={0} stroke={CHART.zero} />
                {view === "cumulative" && targetNet != null && <ReferenceLine y={targetNet} stroke="#a5b4fc" strokeDasharray="2 4" label={{ value: "Target", fill: "#a5b4fc", fontSize: 11, position: "insideTopRight" }} />}
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.cursor }} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: CHART.legend }} />
                <Line name="Baseline" type="linear" dataKey="Baseline" stroke={COLOR.baseline} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                {active && <Line name="What-if" type="linear" dataKey="What-if" stroke={impactColor(result.delta)} strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Dashed = your current baseline. Solid = the what-if ({result.delta >= 0 ? "green when it improves" : "red when it lowers"} your {view === "cumulative" ? "cumulative cash" : "monthly net"}).
            {result.beyondHorizon.length > 0 && " A change starts after the last projected month — extend the horizon to see it."}
          </p>
        </div>
      </div>
    </div>
  );
}
