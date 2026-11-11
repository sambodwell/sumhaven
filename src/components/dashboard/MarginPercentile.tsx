"use client";

import { BENCHMARK_PROFILE_LABELS, marginPercentile, ordinal, type BenchmarkProfile } from "@/lib/benchmarks";
import { InfoTip } from "@/components/InfoTip";
import { CHART } from "@/components/dashboard/chartKit";
import { cn } from "@/components/ui";

const p1 = (n: number) => `${(n * 100).toFixed(1)}%`;
const p0 = (n: number) => `${Math.round(n * 100)}%`;

// Plot geometry (viewBox units).
const W = 360;
const H = 118;
const PAD = { l: 8, r: 8, t: 22, b: 20 };
const BASE = H - PAD.b;
const STEPS = 60;

/**
 * Net margin against a peer-group bell curve: the estimated percentile as the headline, the curve with the typical
 * range shaded and the owner's margin marked. The curve is an assumption built from rule-of-thumb ranges (see
 * `marginPercentile`), so the card says "estimated" everywhere a number could be read as a statistic.
 */
export function MarginPercentileCard({ profile, margin, className }: { profile: BenchmarkProfile; margin: number; className?: string }) {
  const m = marginPercentile(profile, margin);
  if (!m) return null;
  const peers = BENCHMARK_PROFILE_LABELS[profile];

  // Three standard deviations either side of the centre; a margin beyond that is pinned to the edge of the plot.
  const min = m.mean - 3 * m.sd;
  const max = m.mean + 3 * m.sd;
  const x = (v: number) => PAD.l + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (W - PAD.l - PAD.r);
  const y = (v: number) => BASE - Math.exp(-((v - m.mean) ** 2) / (2 * m.sd ** 2)) * (BASE - PAD.t);
  const curve = (from: number, to: number) =>
    Array.from({ length: STEPS + 1 }, (_, i) => from + ((to - from) * i) / STEPS)
      .map((v, i) => `${i ? "L" : "M"}${x(v).toFixed(1)},${y(v).toFixed(1)}`)
      .join("");
  const area = (from: number, to: number) => `${curve(from, to)}L${x(to).toFixed(1)},${BASE}L${x(from).toFixed(1)},${BASE}Z`;

  const at = x(m.value);
  const offScale = m.value < min || m.value > max;
  // Keep the "You" label inside the plot when the marker is near an edge.
  const anchor = at < 70 ? "start" : at > W - 70 ? "end" : "middle";
  const below = m.value < m.lo;
  const summary = `Estimated ${ordinal(m.percentile)} percentile: a ${p1(m.value)} ${m.label.toLowerCase()} is higher than roughly ${m.percentile}% of ${peers} peers. Typical range ${p0(m.lo)} to ${p0(m.hi)}.`;

  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.02] p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-slate-200">
            {m.label} vs. peers
            <InfoTip label="How the percentile is estimated">
              An estimate, not a measured statistic. The peer group&apos;s typical range ({p0(m.lo)}–{p0(m.hi)}) is treated as the middle half of businesses like yours, which gives a bell
              curve centred on {p0(m.mean)}. Your margin is placed on that curve. Real peer data is lumpier than a bell curve, so read this as rough context.
            </InfoTip>
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-50">
            {p1(m.value)}
            <span className="ml-2 text-sm font-normal text-slate-400">
              ≈ {ordinal(m.percentile)} percentile <span className="text-slate-500">(est.)</span>
            </span>
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Typical {p0(m.lo)}–{p0(m.hi)}
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={summary}>
        <title>{summary}</title>
        {/* Typical range: the middle half of the assumed distribution. */}
        <path d={area(m.lo, m.hi)} fill="#199e70" fillOpacity={0.22} />
        {/* Share of peers below your margin. */}
        <path d={area(min, Math.min(max, Math.max(min, m.value)))} fill="#3987e5" fillOpacity={0.2} />
        <path d={curve(min, max)} fill="none" stroke={CHART.tick} strokeWidth={1.5} />
        <line x1={PAD.l} x2={W - PAD.r} y1={BASE} y2={BASE} stroke={CHART.grid} />
        {[m.lo, m.hi].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={BASE} y2={BASE + 4} stroke={CHART.tick} />
            <text x={x(v)} y={H - 4} textAnchor="middle" fontSize={10} fill={CHART.tick}>
              {p0(v)}
            </text>
          </g>
        ))}
        {/* Your margin */}
        <line x1={at} x2={at} y1={PAD.t - 6} y2={BASE} stroke="#3987e5" strokeWidth={2} />
        <circle cx={at} cy={offScale ? BASE : y(m.value)} r={4} fill="#3987e5" stroke={CHART.surface} strokeWidth={2} />
        <text x={at} y={10} textAnchor={anchor} fontSize={11} fontWeight={600} fill="currentColor" className="text-slate-100">
          You · {p1(m.value)}
          {offScale ? (m.value < min ? " ←" : " →") : ""}
        </text>
      </svg>

      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: "#3987e5", opacity: 0.55 }} /> Peers below you (est. {m.percentile}%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: "#199e70", opacity: 0.55 }} /> Typical range
        </span>
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        Higher than roughly {m.percentile}% of {peers.toLowerCase()} peers
        {below ? `; ${((m.lo - m.value) * 100).toFixed(1)} points below the typical range.` : m.value > m.hi ? "; above the typical range." : "; inside the typical range."}{" "}
        <span className="text-slate-500">Estimated from rule-of-thumb ranges, not audited industry data.</span>
      </p>
    </div>
  );
}

/** One-line percentile note for the printed executive report. */
export function marginPercentileHtml(profile: BenchmarkProfile, margin: number, esc: (s: string) => string): string {
  const m = marginPercentile(profile, margin);
  if (!m) return "";
  return `<p><strong>${esc(m.label)}: ${p1(m.value)}</strong> — an estimated ${ordinal(m.percentile)} percentile among ${esc(BENCHMARK_PROFILE_LABELS[profile])} peers (typical range ${p0(m.lo)}–${p0(m.hi)}). <span class="muted">Placed on a bell curve built from rule-of-thumb ranges; an estimate, not audited industry data.</span></p>`;
}
