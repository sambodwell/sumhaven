/**
 * Implemented savings → projections. When an owner marks a recommendation (price creep, audit flag) as implemented,
 * its monthly saving comes off every projected month from the month it took effect, so the forecast, the Fiscal Year
 * re-forecast, the What-If baseline and the Executive Report all reflect the lower cost base.
 *
 * Double counting: numbers that were measured *after* a saving took effect already contain it. Each forecast basis
 * passes the months it was built from; a saving is applied only for the share of those months that predate it.
 * Pure and deterministic.
 */

import { monthKey, parseMonthKey, type ScenarioAdjustment } from "@/lib/schemas";

export interface SavingLike {
  title: string;
  monthly: number;
  status: "IDENTIFIED" | "IMPLEMENTED";
  /** "YYYY-MM" the saving took effect. Missing = in effect from before the data. */
  since?: string;
}

export const implementedOf = <T extends SavingLike>(savings: T[]): T[] => savings.filter((s) => s.status === "IMPLEMENTED" && s.monthly > 0);

/**
 * Share (0..1) of a saving not yet reflected in a forecast built from `basisMonths` ("YYYY-MM"). Unknown basis months
 * (null / empty) = the forecast predates the saving, so all of it applies.
 */
export function uncapturedShare(since: string | undefined, basisMonths: string[] | null | undefined): number {
  if (!basisMonths?.length) return 1;
  if (!since) return 0; // no start date: assume it was already in effect for all measured months
  return basisMonths.filter((k) => k < since).length / basisMonths.length;
}

/** Monthly saving a forecast built from `basisMonths` should still subtract, summed over implemented items. */
export function uncapturedMonthly(savings: SavingLike[], basisMonths: string[] | null | undefined): number {
  return Math.round(implementedOf(savings).reduce((acc, s) => acc + s.monthly * uncapturedShare(s.since, basisMonths), 0) * 100) / 100;
}

/**
 * Implemented savings as scenario adjustments (negative fixed expenses) for a projection starting at `start`.
 * A saving that began before the projection applies from month 1.
 */
export function savingsAdjustments(savings: SavingLike[], start: Date, basisMonths: string[] | null | undefined): ScenarioAdjustment[] {
  const out: ScenarioAdjustment[] = [];
  for (const s of implementedOf(savings)) {
    const amount = Math.round(s.monthly * uncapturedShare(s.since, basisMonths) * 100) / 100;
    if (amount <= 0) continue;
    const from = parseMonthKey(s.since);
    const startMonth = from ? Math.max(1, (from.getUTCFullYear() - start.getUTCFullYear()) * 12 + (from.getUTCMonth() - start.getUTCMonth()) + 1) : 1;
    out.push({ type: "EXPENSE_ADD", label: `Implemented: ${s.title}`.slice(0, 80), amount: -amount, startMonth, description: `Implemented saving: ${s.title}` });
  }
  return out;
}

/** Whole months a saving has been in effect through `now` (the month it took effect counts). */
export function monthsInEffect(since: string | undefined, now = new Date()): number {
  const from = parseMonthKey(since);
  if (!from) return 0;
  const cur = parseMonthKey(monthKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))))!;
  return Math.max(0, (cur.getUTCFullYear() - from.getUTCFullYear()) * 12 + (cur.getUTCMonth() - from.getUTCMonth()) + 1);
}

export interface SavingsTotals {
  count: number;
  monthly: number;
  annual: number;
  /** Every implemented saving × months in effect so far (not limited to the fiscal year). */
  realizedToDate: number;
}

export function savingsTotals(savings: SavingLike[], now = new Date()): SavingsTotals {
  const items = implementedOf(savings);
  const monthly = Math.round(items.reduce((a, s) => a + s.monthly, 0) * 100) / 100;
  const realizedToDate = Math.round(items.reduce((a, s) => a + s.monthly * monthsInEffect(s.since, now), 0) * 100) / 100;
  return { count: items.length, monthly, annual: Math.round(monthly * 12 * 100) / 100, realizedToDate };
}
