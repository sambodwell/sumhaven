"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CornerDownLeft, RotateCcw, Sparkles, User } from "lucide-react";
import { applyScenario, defaultProjectionStart, type ScenarioAdjustment } from "@/lib/schemas";
import { Stat, signedUsd } from "@/components/dashboard/chartKit";
import { cn, pct, secondaryBtn, usd } from "@/components/ui";
import { DEMO_BASELINE, DEMO_EXPENSES, avg } from "./demoData";
import { AVG_EXPENSES, AVG_NET, AVG_REVENUE, ProBadge, SampleNote, UpgradeLink } from "./demoShared";

const QUESTION = "What happens to our projected runway if we reduce marketing spend by 15% and increase software costs by $200/mo?";

/** Opening cash for the sample company, so the answer can talk about runway. Fictional, like the rest of the demo. */
const DEMO_CASH = 42_000;

const MARKETING = DEMO_EXPENSES.find((l) => l.category === "Marketing")!;
const SOFTWARE = DEMO_EXPENSES.find((l) => l.category === "Software & Dispatch")!;
const MARKETING_CUT = 0.15;
const SOFTWARE_ADD = 200;

/** The question, as the adjustments Pro's scenario engine would run. */
const ADJUSTMENTS: ScenarioAdjustment[] = [
  { type: "EXPENSE_PCT", match: MARKETING.category, pct: -MARKETING_CUT, startMonth: 1, description: "Marketing spend −15%" },
  { type: "EXPENSE_ADD", label: SOFTWARE.category, amount: SOFTWARE_ADD, startMonth: 1, description: "Software costs +$200/mo" },
];

// Playback: one step per typed character, then "sent", then "answered".
const SENT = QUESTION.length + 1;
const ANSWERED = QUESTION.length + 2;

/**
 * The AI prompt interface, played back on the sample statement: a typed plain-English question and the forecast it
 * produces. The numbers are real output of the projection engine for those two adjustments; only the conversation
 * (the typing and the instant reply) is scripted, and the panel says so.
 */
export function AssistantPanel() {
  const [step, setStep] = useState(0);
  const [start] = useState(() => defaultProjectionStart());

  useEffect(() => {
    if (step >= ANSWERED) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : step < QUESTION.length ? 18 : step === QUESTION.length ? 350 : 700;
    const t = window.setTimeout(() => setStep((s) => (reduced ? ANSWERED : s + 1)), delay);
    return () => window.clearTimeout(t);
  }, [step]);

  const result = useMemo(() => applyScenario(DEMO_BASELINE, ADJUSTMENTS, { start, months: 12 }), [start]);
  const monthlyChange = result.delta / 12;
  const newNet = AVG_NET + monthlyChange;
  const marketingSaved = avg(MARKETING.actual) * MARKETING_CUT;
  const endCash = { before: DEMO_CASH + result.baselineAnnualNet, after: DEMO_CASH + result.adjustedAnnualNet };
  const lowest = Math.min(...result.points.map((p) => DEMO_CASH + p.adjustedCumulative));

  const typed = QUESTION.slice(0, Math.min(step, QUESTION.length));
  const sent = step >= SENT;
  const answered = step >= ANSWERED;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
              <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden /> Ask Sumhaven
            </p>
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-400">SIMULATED CONVERSATION</span>
          </div>

          <div className="min-h-[18rem] space-y-4 p-4" aria-live="polite">
            {sent && (
              <div className="flex items-start justify-end gap-2.5">
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-500 px-3.5 py-2.5 text-sm leading-relaxed text-white">{QUESTION}</p>
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-slate-300">
                  <User className="h-4 w-4" aria-hidden />
                </span>
              </div>
            )}

            {sent && !answered && (
              <div className="flex items-center gap-2.5 text-sm text-slate-400">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-indigo-200">
                  <Bot className="h-4 w-4" aria-hidden />
                </span>
                Re-running the forecast…
              </div>
            )}

            {answered && (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-indigo-200">
                  <Bot className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-3 rounded-2xl rounded-tl-sm border border-white/10 bg-slate-900/60 px-3.5 py-3 text-sm leading-relaxed text-slate-200">
                  <p>
                    I adjusted the forecast with both changes starting next month. Cutting {MARKETING.category.toLowerCase()} by 15% saves {usd.format(marketingSaved)} a month, and the software increase
                    adds {usd.format(SOFTWARE_ADD)}, so the net effect is <span className="font-semibold text-emerald-200">{signedUsd(monthlyChange)} a month</span>.
                  </p>
                  <ul className="space-y-1 text-[13px] text-slate-300">
                    {ADJUSTMENTS.map((a) => (
                      <li key={a.description} className="flex items-center gap-2">
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300" /> {a.description}, from month 1
                      </li>
                    ))}
                  </ul>
                  <p>
                    <span className="font-medium text-slate-100">Runway:</span> the business stays cash-flow positive in all 12 months, so cash never runs down. Starting from {usd.format(DEMO_CASH)},
                    the lowest balance is {usd.format(lowest)} and you end the year at {usd.format(endCash.after)}, {usd.format(endCash.after - endCash.before)} more than before. Net margin moves from{" "}
                    {pct(AVG_NET / AVG_REVENUE)} to {pct(newNet / AVG_REVENUE)}.
                  </p>
                  <p className="text-xs text-slate-400">Assumes revenue is unchanged. Less marketing usually costs some leads over time: ask a follow-up like &ldquo;and if revenue dips 3%?&rdquo; to stress-test it.</p>
                </div>
              </div>
            )}
          </div>

          {/* The prompt box: shows the sample question being typed. Not editable in the demo. */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
              <p className={cn("min-h-[2.5rem] flex-1 text-sm leading-relaxed", sent ? "text-slate-600" : "text-slate-100")} aria-label="Sample question">
                {sent ? "Ask a follow-up in plain English…" : typed}
                {!sent && <span aria-hidden className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-indigo-300 motion-reduce:animate-none" />}
              </p>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white", sent ? "bg-white/10" : "bg-indigo-500")} aria-hidden>
                <CornerDownLeft className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">Scripted for the demo: the question is typed for you and can&apos;t be edited here.</p>
              <button type="button" onClick={() => setStep(0)} disabled={!answered} className={cn(secondaryBtn, "px-2.5 py-1 text-xs")}>
                <RotateCcw className="h-3 w-3" aria-hidden /> Replay
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className={cn("space-y-3 transition-opacity duration-500 motion-reduce:transition-none", answered ? "opacity-100" : "opacity-40")} aria-hidden={!answered}>
          <p className="text-sm font-medium text-slate-200">Auto-adjusted forecast</p>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Expenses / month" value={usd.format(AVG_EXPENSES - monthlyChange)} />
            <Stat label="Net / month" value={usd.format(newNet)} tone="good" />
            <Stat label="12-mo net · before" value={usd.format(result.baselineAnnualNet)} />
            <Stat label="12-mo net · after" value={usd.format(result.adjustedAnnualNet)} tone="good" />
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border border-white/10" tabIndex={answered ? 0 : -1} role="region" aria-label="Updated 12-month projection table">
            <table className="w-full min-w-[22rem] text-xs">
              <caption className="sr-only">Updated 12-month projection: net per month before and after the two changes, and the cash balance</caption>
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Month
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Net before
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Net after
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Cash
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.points.map((p) => (
                  <tr key={p.month} className="border-t border-white/5">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal text-slate-200">
                      {p.month}
                    </th>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{usd.format(p.baselineNet)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-100">{usd.format(p.adjustedNet)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">{usd.format(DEMO_CASH + p.adjustedCumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-300/25 bg-indigo-500/[0.07] p-4">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
            Ask in plain English <ProBadge />
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            Pro users type questions like this one about their own books. Sumhaven turns each into line-level adjustments, re-runs the financial model in real time, and shows the new projection, which
            you can save and compare against other scenarios.
          </p>
          <UpgradeLink className="mt-3" label="Ask your own numbers" />
        </div>
        <SampleNote>
          The figures are computed by the same projection engine the product uses, from the sample statement&apos;s Q3 averages and a fictional {usd.format(DEMO_CASH)} opening cash balance. The conversation
          itself is scripted. It is arithmetic on these inputs, not a prediction.
        </SampleNote>
      </div>
    </div>
  );
}
