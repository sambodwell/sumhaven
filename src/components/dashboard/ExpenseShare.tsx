"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import { MODE_COPY, modeOf, splitTotals, type FinancialAnalysis } from "@/lib/schemas";
import { InfoTip } from "@/components/InfoTip";
import { cn, glass, usd } from "@/components/ui";
import { CHART, COLOR } from "@/components/dashboard/chartKit";
import { useWorkspacePref } from "@/components/dashboard/useWorkspacePref";

/**
 * Categorical slots (dark steps), fixed order; validated on #0f172a: CVD ΔE ≥ 8.4, normal-vision ≥ 19.3, ≥ 3:1 contrast.
 * Slices beyond the top five fold into a neutral "Other" — never a generated hue.
 */
const SLOTS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"] as const;
const OTHER = "#64748b";
const SURFACE = CHART.surface;
const MAX_SLICES = SLOTS.length;

/** One expense category: its monthly amount and its share of the total. */
export interface ExpenseCategory {
  name: string;
  value: number;
  share: number;
  lines: number;
}

export interface Slice extends ExpenseCategory {
  color: string;
}

/** Sorts categories largest first and adds each one's share of the total. Non-positive amounts are dropped. */
export function toExpenseCategories(entries: { name: string; value: number; lines?: number }[]): ExpenseCategory[] {
  const sorted = entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, e) => s + e.value, 0);
  return total > 0 ? sorted.map((e) => ({ name: e.name, value: e.value, share: e.value / total, lines: e.lines ?? 1 })) : [];
}

/** Pie slices: the five largest categories, or the top four plus a neutral "Other" when there are more. */
export function toSlices(categories: ExpenseCategory[]): Slice[] {
  const head = categories.length > MAX_SLICES ? categories.slice(0, MAX_SLICES - 1) : categories;
  const tail = categories.length > MAX_SLICES ? categories.slice(MAX_SLICES - 1) : [];
  const slices: Slice[] = head.map((c, i) => ({ ...c, color: SLOTS[i] }));
  if (tail.length) {
    slices.push({
      name: `Other (${tail.length} categories)`,
      value: tail.reduce((s, c) => s + c.value, 0),
      share: tail.reduce((s, c) => s + c.share, 0),
      color: OTHER,
      lines: tail.reduce((s, c) => s + c.lines, 0),
    });
  }
  return slices;
}

/** Recurring monthly expenses by category, largest first. */
export function expenseCategories(a: Pick<FinancialAnalysis, "itemizedExpenses">): ExpenseCategory[] {
  const byCat = new Map<string, { value: number; lines: number }>();
  for (const e of a.itemizedExpenses) {
    if (e.oneTime || !(e.amount > 0)) continue;
    const k = e.category?.trim() || "Other";
    const cur = byCat.get(k) ?? { value: 0, lines: 0 };
    byCat.set(k, { value: cur.value + e.amount, lines: cur.lines + 1 });
  }
  return toExpenseCategories([...byCat.entries()].map(([name, v]) => ({ name, ...v })));
}

/** Recurring monthly expenses by category, largest first, top five + "Other". */
export function expenseSlices(a: Pick<FinancialAnalysis, "itemizedExpenses">): Slice[] {
  return toSlices(expenseCategories(a));
}

const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Bar / pie toggle
// ---------------------------------------------------------------------------

export type ExpenseView = "bar" | "pie";

const VIEW_KEY = "sumhaven:expense-view";
const isExpenseView = (v: unknown): ExpenseView | null => (v === "bar" || v === "pie" ? v : null);

/** The visitor's chosen expense view, remembered on this device and shared by the dashboard and the demo. */
export function useExpenseView(fallback: ExpenseView): [ExpenseView, (v: ExpenseView) => void] {
  return useWorkspacePref<ExpenseView>(VIEW_KEY, fallback, isExpenseView);
}

const VIEWS: { value: ExpenseView; label: string; Icon: typeof PieIcon }[] = [
  { value: "bar", label: "Bars", Icon: BarChart3 },
  { value: "pie", label: "Pie", Icon: PieIcon },
];

export function ExpenseViewToggle({ value, onChange, className }: { value: ExpenseView; onChange: (v: ExpenseView) => void; className?: string }) {
  return (
    <div role="group" aria-label="Expense breakdown view" className={cn("inline-flex shrink-0 rounded-lg border border-white/10 p-0.5", className)}>
      {VIEWS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300",
            value === v ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The two views
// ---------------------------------------------------------------------------

/** "Where the money goes": every category as a horizontal bar, longest first, with its amount and share. */
export function ExpenseBars({ categories, className }: { categories: ExpenseCategory[]; className?: string }) {
  // Bars are scaled to the largest category so small ones stay visible; the printed share is always of the total.
  const max = categories[0]?.share ?? 1;
  return (
    <ul className={cn("space-y-2 overflow-y-auto pr-1", className)} tabIndex={0} aria-label="Expense categories by share of spend">
      {categories.map((c) => (
        <li key={c.name} title={`${c.name}: ${usd.format(c.value)}/mo · ${pct1(c.share)}`}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-slate-300">{c.name}</span>
            <span className="shrink-0 tabular-nums text-slate-400">
              {usd.format(c.value)} · {pct1(c.share)}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${(c.share / max) * 100}%`, background: COLOR.expenses }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut with the total (or the hovered slice) in the hole, and a legend that doubles as the data table. */
export function ExpenseDonut({ slices, total, totalNote, caption, className }: { slices: Slice[]; total: number; totalNote?: string; caption: string; className?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const shown = active != null ? slices[active] : null;
  return (
    <div className={className}>
      <div className="relative mx-auto aspect-square w-full max-w-[15rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="96%"
              startAngle={90}
              endAngle={-270}
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {slices.map((s, i) => (
                <Cell key={s.name} fill={s.color} fillOpacity={active == null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip
              content={({ active: on, payload }) => {
                const p = on && payload?.[0] ? (payload[0].payload as Slice) : null;
                return p ? (
                  <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
                    <p className="font-medium text-slate-100">{p.name}</p>
                    <p className="tabular-nums text-slate-300">
                      {usd.format(p.value)}/mo · {pct1(p.share)}
                    </p>
                  </div>
                ) : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Hero number in the hole: total, or the hovered slice. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden>
          <div className="max-w-[60%]">
            <p className="truncate text-[11px] uppercase tracking-wide text-slate-400">{shown ? shown.name : "Per month"}</p>
            <p className="text-xl font-semibold tabular-nums text-slate-50">{usd.format(shown ? shown.value : total)}</p>
            <p className="text-[11px] tabular-nums text-slate-400">{shown ? pct1(shown.share) : totalNote ?? ""}</p>
          </div>
        </div>
      </div>

      <table className="mt-4 w-full text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead className="sr-only">
          <tr>
            <th>Category</th>
            <th>Monthly</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s, i) => (
            <tr key={s.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={cn("transition", active != null && active !== i && "opacity-50")}>
              <td className="py-1 pr-2">
                <span className="flex min-w-0 items-center gap-2 text-slate-300">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                  <span className="truncate" title={s.name}>
                    {s.name}
                  </span>
                </span>
              </td>
              <td className="py-1 text-right text-slate-200">{usd.format(s.value)}</td>
              <td className="w-14 py-1 text-right text-slate-400">{pct1(s.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Where the money goes each month: a pie (donut) or horizontal bars, switched with the toggle in the header. */
export function ExpenseShareCard({ analysis, className }: { analysis: FinancialAnalysis; className?: string }) {
  const copy = MODE_COPY[modeOf(analysis.businessType)];
  const categories = expenseCategories(analysis);
  const [view, setView] = useExpenseView("pie");
  const totals = splitTotals(analysis.itemizedExpenses);
  const revenue = analysis.monthlyRevenue;

  return (
    <section aria-label={`${copy.expenses} share`} className={cn(glass, "p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <PieIcon className="h-5 w-5 text-indigo-300" aria-hidden /> {copy.expenses} share
          <InfoTip label="How expense share is calculated" align="left">
            Recurring monthly {copy.expenses.toLowerCase()} grouped by category, as a share of the monthly total. One-time items are left out so a single purchase
            doesn&apos;t distort your run-rate. The pie shows the largest categories and groups the rest as &ldquo;Other&rdquo;; the bars list every category.
          </InfoTip>
        </h2>
        {categories.length > 0 && <ExpenseViewToggle value={view} onChange={setView} />}
      </div>
      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No recurring {copy.expenses.toLowerCase()} to break down yet.</p>
      ) : (
        <>
          {view === "pie" ? (
            <ExpenseDonut
              className="mt-4"
              slices={toSlices(categories)}
              total={totals.recurring}
              totalNote={revenue > 0 ? `${pct1(totals.recurring / revenue)} of ${copy.revenue.toLowerCase()}` : undefined}
              caption={`${copy.expenses} by category`}
            />
          ) : (
            <>
              <p className="mt-3 text-xs text-slate-400">
                Where the money goes · {usd.format(totals.recurring)} per month
                {revenue > 0 ? ` (${pct1(totals.recurring / revenue)} of ${copy.revenue.toLowerCase()})` : ""}
              </p>
              <ExpenseBars categories={categories} className="mt-3 max-h-80" />
            </>
          )}
          {totals.oneTime > 0 && <p className="mt-2 text-xs text-slate-500">+ {usd.format(totals.oneTime)} one-time, not included above.</p>}
        </>
      )}
    </section>
  );
}
