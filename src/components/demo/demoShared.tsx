"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import type { ScenarioAdjustment, Severity } from "@/lib/schemas";
import { useApp } from "@/components/AppProvider";
import { cn, primaryBtn } from "@/components/ui";
import { DEMO_EXPENSES, DEMO_FLAGS, DEMO_REVENUE, avg, type DemoFlag, type DemoLine } from "./demoData";

/** Where the paywall lives: the dashboard opens it on `?upgrade=1`. Signed-out visitors create an account first. */
const UPGRADE_PATH = "/dashboard?upgrade=1";

/** The demo's upgrade button. Pro accounts get a link to their dashboard instead of a pitch. */
export function UpgradeLink({ className, label = "Upgrade to Pro" }: { className?: string; label?: string }) {
  const app = useApp();
  const signedIn = app.ready && !!app.user;
  if (signedIn && app.isPro) {
    return (
      <Link href="/dashboard" className={cn(primaryBtn, className)}>
        Open your dashboard <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    );
  }
  return (
    <Link href={signedIn ? UPGRADE_PATH : `/signup?next=${encodeURIComponent(UPGRADE_PATH)}`} className={cn(primaryBtn, className)}>
      <Sparkles className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
}

export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[11px] font-medium text-amber-100", className)}>
      <Lock className="h-3 w-3" aria-hidden /> Pro Feature
    </span>
  );
}

export function SampleNote({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-slate-500">{children}</p>;
}

/** A feature that exists in Pro but isn't operable in the demo: shown plainly, never as a working control. */
export function LockedFeature({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-200">
          {title} <ProBadge />
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  HIGH: "border-rose-300/25 bg-rose-400/10 text-rose-200",
  MEDIUM: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  LOW: "border-sky-300/25 bg-sky-400/10 text-sky-200",
};

export function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide", SEVERITY_STYLE[severity])}>{severity}</span>;
}

export const sumOf = (lines: DemoLine[], pick: (l: DemoLine) => number) => lines.reduce((a, l) => a + pick(l), 0);

/** Monthly averages over the sample quarter, and what the flags add up to. */
export const AVG_REVENUE = sumOf(DEMO_REVENUE, (l) => avg(l.actual));
export const AVG_EXPENSES = sumOf(DEMO_EXPENSES, (l) => avg(l.actual));
export const AVG_NET = AVG_REVENUE - AVG_EXPENSES;
export const BUDGET_REVENUE = sumOf(DEMO_REVENUE, (l) => l.budget);
export const BUDGET_EXPENSES = sumOf(DEMO_EXPENSES, (l) => l.budget);
export const POTENTIAL_SAVINGS = DEMO_FLAGS.reduce((a, f) => a + f.potentialSavings, 0);

/** An implemented flag, as the forecasting engine sees it: that much less expense every month. */
export const asAdjustments = (flags: DemoFlag[]): ScenarioAdjustment[] =>
  flags.map((f) => ({ type: "EXPENSE_ADD", label: f.category, amount: -f.potentialSavings, startMonth: 1, description: f.title }));

/** Monthly savings from the flags the visitor has marked implemented. */
export const implementedSavings = (implemented: ReadonlySet<string>) => DEMO_FLAGS.filter((f) => implemented.has(f.id)).reduce((a, f) => a + f.potentialSavings, 0);
