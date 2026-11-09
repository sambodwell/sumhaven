"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, PiggyBank, TrendingDown } from "lucide-react";
import { PRICING } from "@/lib/schemas";
import { exactMoney } from "@/lib/fiscal";
import type { SavingsTotals } from "@/lib/savingsImpact";
import { cn } from "@/components/ui";

/** Animates a number toward `target` (ease-out, ~0.7s) so a new saving visibly ticks the total up. */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    // Reduced motion: jump straight to the new total on the next frame.
    const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = duration === 0 ? 1 : Math.min(1, (now - t0) / duration);
      const v = start + (target - start) * (1 - Math.pow(1 - k, 3));
      from.current = v;
      setShown(k === 1 ? target : v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

/**
 * "Saved $X/mo with Sumhaven": the running ROI of every recommendation the owner marked implemented, shown at the
 * top of the dashboard so it's obvious the service pays for itself.
 */
export function SavingsBanner({
  totals,
  fyRealized,
  fyLabel,
  inProjection,
  onView,
  className,
}: {
  totals: SavingsTotals;
  fyRealized: number;
  fyLabel: string;
  /** Monthly saving currently subtracted from the projections. */
  inProjection: number;
  onView?: () => void;
  className?: string;
}) {
  const monthly = useCountUp(totals.monthly);
  const annual = useCountUp(totals.annual);
  const cover = totals.monthly / PRICING.proMonthlyUsd;
  return (
    <section
      aria-label="Savings with Sumhaven"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/[0.16] via-emerald-500/[0.07] to-indigo-500/[0.08] px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/20 text-emerald-200">
          <PiggyBank className="h-5 w-5" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm text-emerald-50">
          <span className="text-base font-semibold sm:text-lg">
            Saved <span className="tabular-nums">{exactMoney(monthly)}</span>/mo with Sumhaven
          </span>
          <span className="ml-2 whitespace-nowrap text-emerald-200/90">
            · <span className="tabular-nums">{exactMoney(annual)}</span>/yr
          </span>
          <span className="mt-0.5 block text-xs text-emerald-200/75">
            {totals.count} implemented change{totals.count === 1 ? "" : "s"} · {exactMoney(totals.realizedToDate)} realized to date · {exactMoney(fyRealized)} in {fyLabel}
            {cover >= 1 && ` · covers Sumhaven Pro ${cover >= 10 ? Math.round(cover) : cover.toFixed(1)}× over`}
          </span>
        </p>
        {inProjection > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-slate-950/30 px-2.5 py-1 text-[11px] text-emerald-100" title="Implemented savings are subtracted from every projected month from the month they took effect.">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden /> Projections include −{exactMoney(inProjection)}/mo
          </span>
        )}
        {onView && (
          <button type="button" onClick={onView} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-200 hover:text-white">
            View savings <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
    </section>
  );
}
