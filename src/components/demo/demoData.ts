import type { ScenarioBaseline, Severity } from "@/lib/schemas";

/**
 * Sample data for the public /demo walkthrough. Everything here is fictional and labelled as such in the UI:
 * no real customer, no measured results. Monthly figures are the three months of the sample Q3 statement, so the
 * averages, variances and flag amounts shown in the demo are all derived from (and consistent with) these numbers.
 */
export const DEMO_FILE = { name: "Q3_Income_Statement.pdf", size: "184 KB", pages: 3 } as const;
export const DEMO_COMPANY = "Example Field Services Co.";
export const DEMO_PERIOD = "Q3 · Jul – Sep";
export const DEMO_MONTHS = ["Jul", "Aug", "Sep"] as const;

type Quarter = [number, number, number];

export interface DemoLine {
  category: string;
  label: string;
  /** Monthly budget. */
  budget: number;
  /** Actuals for Jul, Aug, Sep. */
  actual: Quarter;
}

export const DEMO_REVENUE: DemoLine[] = [
  { category: "Revenue", label: "Service Calls", budget: 37_500, actual: [37_900, 39_600, 37_700] },
  { category: "Revenue", label: "Installations", budget: 21_000, actual: [21_300, 21_900, 21_300] },
  { category: "Revenue", label: "Maintenance Contracts", budget: 9_500, actual: [9_700, 9_800, 9_900] },
];

export const DEMO_EXPENSES: DemoLine[] = [
  { category: "Payroll / Subcontractors", label: "Technician payroll", budget: 27_000, actual: [27_200, 27_600, 28_000] },
  { category: "Supplies & Materials", label: "Parts & materials", budget: 11_000, actual: [11_400, 12_300, 12_000] },
  { category: "Vehicle Costs", label: "Van leases", budget: 4_350, actual: [4_350, 4_350, 4_350] },
  { category: "Fuel", label: "Fleet fuel cards", budget: 2_900, actual: [3_050, 3_210, 3_280] },
  { category: "Marketing", label: "Local search ads", budget: 3_200, actual: [2_700, 2_900, 3_100] },
  { category: "Insurance", label: "Liability & workers' comp", budget: 2_240, actual: [2_240, 2_240, 2_240] },
  { category: "Software & Dispatch", label: "Dispatch + scheduling tools", budget: 1_150, actual: [1_509, 1_509, 1_509] },
  { category: "Tools & Equipment", label: "Equipment rental", budget: 900, actual: [1_460, 1_460, 1_460] },
];

export const avg = (q: Quarter) => Math.round(((q[0] + q[1] + q[2]) / 3) * 100) / 100;
export const total = (q: Quarter) => q[0] + q[1] + q[2];

/** The statement as the forecasting engine sees it: each line at its Q3 monthly average. */
export const DEMO_BASELINE: ScenarioBaseline = {
  businessType: "FIELD_SERVICE",
  itemizedRevenue: DEMO_REVENUE.map((l) => ({ label: l.label, amount: avg(l.actual) })),
  itemizedExpenses: DEMO_EXPENSES.map((l) => ({ label: l.label, category: l.category, amount: avg(l.actual) })),
  inflationRateAssumed: 0,
};

export interface DemoFlag {
  id: string;
  title: string;
  severity: Severity;
  message: string;
  /** Monthly estimate if the flagged item were acted on; 0 = informational. */
  potentialSavings: number;
  /** The expense category (DEMO_EXPENSES) the flag was raised on. */
  category: string;
  /** The recommended adjustment, as the report words it. */
  action: string;
}

export const DEMO_FLAGS: DemoFlag[] = [
  {
    id: "software",
    title: "Overlapping scheduling software",
    severity: "HIGH",
    message: "Two dispatch/scheduling subscriptions were billed in all three months. If one is redundant, cancelling it would remove $389.00 a month.",
    potentialSavings: 389,
    category: "Software & Dispatch",
    action: "Confirm which scheduling tool the dispatchers actually use and cancel the other before its next renewal.",
  },
  {
    id: "rental",
    title: "Recurring equipment rental over budget",
    severity: "MEDIUM",
    message: "The same equipment rental repeats every month at $560.00 over budget. A rental that never ends is worth pricing against buying or a long-term lease.",
    potentialSavings: 560,
    category: "Tools & Equipment",
    action: "Get a purchase quote and a 12-month lease quote for the rented equipment, then switch to whichever undercuts the monthly rental.",
  },
  {
    id: "fuel",
    title: "Fuel rising month over month",
    severity: "MEDIUM",
    message: "Fuel climbed each month of the quarter ($3,050 → $3,280) and averaged $280.00 over budget. Route density and fuel-card pricing are the usual levers.",
    potentialSavings: 280,
    category: "Fuel",
    action: "Tighten route density on low-volume days and re-price the fleet fuel cards to bring fuel back to budget.",
  },
  {
    id: "payroll",
    title: "Payroll above budget every month",
    severity: "LOW",
    message: "Payroll averaged $600.00 over budget, while revenue ran $1,700.00 ahead of budget, so this may simply be labor tracking demand. Worth confirming rather than cutting.",
    potentialSavings: 0,
    category: "Payroll / Subcontractors",
    action: "Compare technician hours with billed service calls to confirm the extra payroll is producing the extra revenue.",
  },
];
