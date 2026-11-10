"use client";

import { useEffect, useState, type DragEvent } from "react";
import Link from "next/link";
import { Check, FileText, GripVertical, Info, Loader2, ScanSearch, UploadCloud, X } from "lucide-react";
import { ANNUAL_SAVINGS_USD, PRICING } from "@/lib/schemas";
import { useApp } from "@/components/AppProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { PlanCard } from "@/components/PlanCard";
import { cn, glass, primaryBtn } from "@/components/ui";
import { DEMO_FILE } from "./demoData";
import { DemoShowcase } from "./DemoShowcase";
import { UpgradeLink } from "./demoShared";

type Phase = "upload" | "processing" | "explore";

const STEPS: { phase: Phase; label: string }[] = [
  { phase: "upload", label: "Upload" },
  { phase: "processing", label: "Analyze" },
  { phase: "explore", label: "Explore Pro" },
];

const STAGES = ["Extracting line items...", "Auditing expense leakage...", "Formatting executive summary..."];
const STAGE_MS = 1100;
/** Marks a drag as the demo's own sample chip, so a real file dropped here is recognised and left unread. */
const DRAG_TYPE = "application/x-sumhaven-demo";

function Stepper({ phase }: { phase: Phase }) {
  const at = STEPS.findIndex((s) => s.phase === phase);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Demo progress">
      {STEPS.map((s, i) => (
        <li key={s.phase} aria-current={i === at ? "step" : undefined} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              i < at && "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
              i === at && "border-indigo-300/30 bg-indigo-500/15 text-indigo-100",
              i > at && "border-white/10 text-slate-500",
            )}
          >
            {i < at ? <Check className="h-3 w-3" aria-hidden /> : <span className="tabular-nums">{i + 1}</span>} {s.label}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-white/15 sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}

function UploadStep({ onAnalyze }: { onAnalyze: () => void }) {
  const [selected, setSelected] = useState(false);
  const [over, setOver] = useState(false);
  const [ignoredDrop, setIgnoredDrop] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    // Only the built-in sample is ever used; anything else is discarded without being read.
    const sample = e.dataTransfer.types.includes(DRAG_TYPE);
    setIgnoredDrop(!sample);
    if (sample) setSelected(true);
  };
  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop,
  };
  const zone = cn("grid min-h-44 w-full place-items-center rounded-xl border-2 border-dashed p-6 text-center transition", over ? "border-indigo-400 bg-indigo-500/10" : "border-white/15 bg-white/[0.02]");

  return (
    <section aria-labelledby="demo-upload-title" className={cn(glass, "p-4 sm:p-6")}>
      <h2 id="demo-upload-title" className="text-lg font-semibold">
        Start with a statement
      </h2>
      <p className="mt-0.5 text-sm text-slate-400">In the product you&apos;d upload your own bank statement or P&amp;L. Here, use the sample.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,15rem)_1fr]">
        <div>
          <p className="text-xs text-slate-500">Sample file</p>
          <div
            draggable={!selected}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, DEMO_FILE.name);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className={cn(
              "mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition",
              selected ? "opacity-40" : "cursor-grab hover:border-white/25 active:cursor-grabbing",
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
            <FileText className="h-8 w-8 shrink-0 text-rose-300" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{DEMO_FILE.name}</p>
              <p className="text-xs text-slate-500">
                PDF · {DEMO_FILE.size} · {DEMO_FILE.pages} pages
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Drag it into the dropzone, or just click the dropzone.</p>
        </div>

        {selected ? (
          <div className={zone} {...dropHandlers}>
            <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.06] p-3 text-left">
              <FileText className="h-8 w-8 shrink-0 text-rose-300" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{DEMO_FILE.name}</p>
                <p className="text-xs text-emerald-200">Sample statement selected</p>
              </div>
              <button type="button" onClick={() => setSelected(false)} aria-label={`Remove ${DEMO_FILE.name}`} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setSelected(true)} className={cn(zone, "cursor-pointer hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400")} {...dropHandlers}>
            <span>
              <UploadCloud className="mx-auto h-8 w-8 text-indigo-300" aria-hidden />
              <span className="mt-2 block text-sm font-medium text-slate-200">Drop the sample statement here</span>
              <span className="mt-0.5 block text-xs text-slate-500">or click to select {DEMO_FILE.name}</span>
            </span>
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex max-w-xl items-start gap-1.5 text-xs text-slate-500" role={ignoredDrop ? "status" : undefined}>
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {ignoredDrop
            ? "The demo only uses its built-in sample. The file you dropped was not read or uploaded."
            : "This demo runs entirely in your browser on a built-in sample. Nothing is uploaded, and your own files can't be used here."}
        </p>
        <button type="button" onClick={onAnalyze} disabled={!selected} className={cn(primaryBtn, "px-5 py-2.5")}>
          <ScanSearch className="h-4 w-4" aria-hidden /> Analyze Statement
        </button>
      </div>
    </section>
  );
}

function ProcessingStep({ stage }: { stage: number }) {
  return (
    <section aria-labelledby="demo-processing-title" className={cn(glass, "p-6 sm:p-10")}>
      <div className="mx-auto max-w-md">
        <h2 id="demo-processing-title" className="text-lg font-semibold">
          Analyzing {DEMO_FILE.name}
        </h2>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={stage} aria-label="Analysis progress">
          <div className="h-full rounded-full bg-indigo-400 transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${((stage + 0.6) / STAGES.length) * 100}%` }} />
        </div>
        <ul className="mt-5 space-y-3" aria-live="polite">
          {STAGES.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2.5 text-sm transition", i < stage ? "text-slate-400" : i === stage ? "text-slate-100" : "text-slate-600")}>
              {i < stage ? (
                <Check className="h-4 w-4 text-emerald-300" aria-hidden />
              ) : i === stage ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-300 motion-reduce:animate-none" aria-hidden />
              ) : (
                <span aria-hidden className="mx-1 h-2 w-2 rounded-full bg-white/15" />
              )}
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-slate-500">Simulated for the demo: the sample results are prepared in advance. A real analysis reads your statement and usually takes longer.</p>
      </div>
    </section>
  );
}

/** Self-guided walkthrough: pick the sample statement → simulated analysis → tabbed tour of the Pro features. */
export function DemoSandbox() {
  const app = useApp();
  const [phase, setPhase] = useState<Phase>("upload");
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (phase !== "processing") return;
    const timers = STAGES.map((_, i) => window.setTimeout(() => (i === STAGES.length - 1 ? setPhase("explore") : setStage(i + 1)), (i + 1) * STAGE_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase]);

  const signedOut = app.ready && !app.user;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Persistent CTA: stays in view through every step. */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" aria-label="Sumhaven home" className="shrink-0">
            <BrandLogo height={22} preload />
          </Link>
          <span className="hidden rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-slate-400 sm:inline">Interactive demo · sample data</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 md:inline">
              Pro · ${PRICING.proMonthlyUsd}/mo or ${PRICING.proAnnualUsd}/yr
            </span>
            {signedOut && (
              <Link href="/signup?mode=signin" className="text-sm text-slate-300 hover:text-white">
                Sign in
              </Link>
            )}
            <UpgradeLink />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">See what Sumhaven Pro does with a statement</h1>
          <p className="mt-3 text-slate-400">
            A hands-on walkthrough using a fictional company&apos;s Q3 income statement. Every figure is illustrative sample data: what Sumhaven finds in your books depends on your numbers.
          </p>
        </div>

        <div className="mt-6">
          <Stepper phase={phase} />
        </div>

        <div className="mt-4">
          {phase === "upload" && (
            <UploadStep
              onAnalyze={() => {
                setStage(0);
                setPhase("processing");
              }}
            />
          )}
          {phase === "processing" && <ProcessingStep stage={stage} />}
          {phase === "explore" && <DemoShowcase onRestart={() => setPhase("upload")} />}
        </div>

        <section aria-labelledby="demo-plan-title" className="mt-10 grid items-center gap-6 md:grid-cols-2">
          <div>
            <h2 id="demo-plan-title" className="text-2xl font-semibold tracking-tight">
              Run it on your own numbers
            </h2>
            <p className="mt-2 text-slate-400">
              Pro analyzes the statements you upload and keeps the dashboard, forecasts, budget tracking and executive reports in one place. ${PRICING.proMonthlyUsd} a month, or $
              {PRICING.proAnnualUsd} a year (${ANNUAL_SAVINGS_USD} less than paying monthly).
            </p>
            <p className="mt-3 text-xs text-slate-500">You&apos;ll create an account first, then choose a plan at checkout. Monthly plans can be cancelled anytime.</p>
          </div>
          <PlanCard plan="pro">
            <UpgradeLink className="w-full" />
          </PlanCard>
        </section>
      </main>
    </div>
  );
}
