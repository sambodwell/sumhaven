import type { Metadata } from "next";
import { DemoSandbox } from "@/components/demo/DemoSandbox";

export const metadata: Metadata = {
  title: "Interactive demo",
  description: "Walk through Sumhaven Pro on a sample statement: the overview dashboard, what-if forecasting, budget-vs-actual tracking and the executive report.",
};

/** Public, no-account product walkthrough. Runs on built-in sample data only (see components/demo/demoData.ts). */
export default function DemoPage() {
  return <DemoSandbox />;
}
