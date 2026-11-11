import Link from "next/link";
import { AlertTriangle, ArrowRight, FileText, LayoutDashboard, MessageSquareText, MousePointerClick, PlayCircle, ShieldCheck, SlidersHorizontal, Table2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PlanCard } from "@/components/PlanCard";
import { AccountCta, HeaderAccountLink } from "@/components/landing/AccountLinks";
import { cn, glass, primaryBtn, secondaryBtn, usd } from "@/components/ui";
import { DEMO_COMPANY, DEMO_FILE, DEMO_FLAGS, DEMO_PERIOD } from "@/components/demo/demoData";

const DEMO_STEPS = [
  { icon: LayoutDashboard, title: "Overview dashboard", text: "Cash flow, spending by category and the audit flags found in the statement." },
  { icon: SlidersHorizontal, title: "What-if forecasting", text: "Move revenue and expenses and watch the next 12 months respond." },
  { icon: MessageSquareText, title: "AI scenario chat", text: "Ask a plain-English question and see the forecast re-run with the answer." },
  { icon: Table2, title: "Budget vs. actuals", text: "Line-by-line variance for each month and the quarter." },
  { icon: FileText, title: "Executive report", text: "Audit goals, risk callouts, month-by-month P&L, a 12-month projection and the written analysis." },
] as const;

const SAMPLE_FLAGS = DEMO_FLAGS.filter((f) => f.potentialSavings > 0);
const SAMPLE_SAVINGS = SAMPLE_FLAGS.reduce((a, f) => a + f.potentialSavings, 0);

/** Public landing page. The interactive demo is the main call to action for visitors and signed-in users alike. */
export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Demo banner: the first thing on the page, and the whole strip is one link. */}
      <Link
        href="/demo"
        className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-indigo-300/20 bg-indigo-500/20 px-4 py-2.5 text-center text-sm text-indigo-50 transition hover:bg-indigo-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-300"
      >
        <PlayCircle className="h-4 w-4 shrink-0 text-indigo-200" aria-hidden />
        <span>
          <span className="font-semibold">Try the interactive demo.</span> A full sample audit and executive report, no account needed.
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-medium text-white">
          Open the demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" aria-label="Sumhaven home" className="shrink-0">
            <BrandLogo height={24} preload />
          </Link>
          <nav aria-label="Main" className="ml-auto flex items-center gap-2 sm:gap-4">
            <a href="#pricing" className="hidden px-1 text-sm text-slate-300 hover:text-white sm:inline">
              Pricing
            </a>
            <HeaderAccountLink />
            <Link href="/demo" className={cn(primaryBtn, "px-3 py-1.5")}>
              <PlayCircle className="h-4 w-4" aria-hidden />
              {/* One flex item, so the words are separated by a normal space rather than the button's icon gap. */}
              <span>
                <span className="hidden sm:inline">Interactive </span>Demo
              </span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div className="min-w-0">
            <h1 id="hero-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Find where the money leaks. See the next 12 months.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-400">
              Sumhaven audits a bank statement or P&amp;L, flags the spending worth a second look, and projects your cash flow forward. For small businesses, landlords and households.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/demo" className={cn(primaryBtn, "px-6 py-3 text-base shadow-lg shadow-indigo-500/25")}>
                <PlayCircle className="h-5 w-5" aria-hidden /> Try the interactive demo
              </Link>
              <AccountCta className="px-5 py-3 text-base" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
              <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden /> About two minutes, runs in your browser on sample data. No sign-up.
            </p>
            <p className="mt-6 flex max-w-xl items-start gap-2 text-sm text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              With an account, statement files are parsed in memory and never stored. Only the parsed results are saved to your private workspace.
            </p>
          </div>

          {/* Demo preview: real figures from the demo's sample data, and one big link into it. */}
          <Link
            href="/demo"
            aria-label="Open the interactive demo"
            className={cn(glass, "group block min-w-0 p-5 transition hover:border-indigo-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400 sm:p-6")}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Inside the demo · executive report</p>
                <p className="mt-1 font-semibold text-slate-100">{DEMO_COMPANY}</p>
                <p className="text-xs text-slate-400">
                  {DEMO_PERIOD} · {DEMO_FILE.name}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-400">SAMPLE DATA</span>
            </div>
            <ul className="mt-3 space-y-2">
              {SAMPLE_FLAGS.map((f) => (
                <li key={f.id} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <AlertTriangle className={cn("h-4 w-4 shrink-0", f.severity === "HIGH" ? "text-rose-300" : "text-amber-300")} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{f.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-300">{usd.format(f.potentialSavings)} / mo</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-end justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-amber-200/80">Leakage flagged in the sample</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-amber-100">
                  {usd.format(SAMPLE_SAVINGS)}
                  <span className="text-sm font-normal text-slate-400"> / month</span>
                </p>
              </div>
              <p className="text-xs tabular-nums text-slate-400">{usd.format(SAMPLE_SAVINGS * 12)} / year</p>
            </div>
            <span className={cn(primaryBtn, "mt-4 w-full py-2.5 group-hover:bg-indigo-400")}>
              Explore this report in the demo <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-2 text-center text-xs text-slate-500">A fictional company. What Sumhaven finds in your books depends on your numbers.</p>
          </Link>
        </section>

        {/* What the demo walks through */}
        <section aria-labelledby="demo-tour-title" className={cn(glass, "p-5 sm:p-8")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-300">Interactive demo</p>
              <h2 id="demo-tour-title" className="mt-1 text-2xl font-semibold tracking-tight">
                Walk through a full audit before you sign up
              </h2>
              <p className="mt-2 max-w-2xl text-slate-400">Drop in the sample statement and explore everything Pro produces from it, in five steps.</p>
            </div>
            <Link href="/demo" className={cn(primaryBtn, "shrink-0 px-5 py-2.5")}>
              <PlayCircle className="h-4 w-4" aria-hidden /> Start the demo
            </Link>
          </div>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {DEMO_STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/15 text-indigo-200">
                    <s.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-slate-100">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 py-12 lg:py-16">
          <h2 id="pricing-title" className="text-2xl font-semibold tracking-tight">
            Pricing
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">Create an account, run an analysis, then choose how to unlock the full report.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PlanCard plan="report">
              <AccountCta className="w-full" />
            </PlanCard>
            <PlanCard plan="pro">
              <Link href="/demo" className={cn(secondaryBtn, "w-full")}>
                <PlayCircle className="h-4 w-4" aria-hidden /> See Pro in the demo
              </Link>
            </PlanCard>
          </div>
        </section>

        {/* Closing demo call to action */}
        <section aria-labelledby="closing-title" className="mb-12 flex flex-col items-start gap-4 rounded-2xl border border-indigo-300/30 bg-gradient-to-r from-indigo-500/20 via-indigo-500/[0.07] to-emerald-500/10 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex-1">
            <h2 id="closing-title" className="text-xl font-semibold tracking-tight">
              Not sure yet? See it work first.
            </h2>
            <p className="mt-1 text-slate-300">The demo runs the whole flow on a sample statement, from upload to executive report.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo" className={cn(primaryBtn, "px-5 py-2.5")}>
              <PlayCircle className="h-4 w-4" aria-hidden /> Try the interactive demo
            </Link>
            <AccountCta className="px-5 py-2.5" />
          </div>
        </section>
      </main>
    </div>
  );
}
