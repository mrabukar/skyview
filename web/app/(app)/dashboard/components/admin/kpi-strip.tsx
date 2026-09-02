import {
  Banknote,
  Percent,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { fmt } from "@/lib/utils";

export interface HealthRatioSummary {
  dailyAvgRevenue: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  expenseRatio: number;
  payrollRatio: number;
}

interface Props {
  summary: HealthRatioSummary;
}

type Tone = "emerald" | "amber" | "rose" | "neutral";

const TONE: Record<Tone, string> = {
  emerald: "var(--status-emerald)",
  amber: "var(--status-amber)",
  rose: "var(--status-rose)",
  neutral: "var(--fg1)",
};

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

function higherIsBetterTone(value: number, target: number): Tone {
  if (value < 0) return "rose";
  return value >= target ? "emerald" : "amber";
}

function lowerIsBetterTone(value: number, target: number): Tone {
  if (value <= target) return "emerald";
  if (value <= target * 1.7) return "amber";
  return "rose";
}

interface Tile {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
  hint: string;
  fill?: number;
  /** Where the target sits on the same 0-100 track as `fill`. */
  targetAt?: number;
}

function HealthTile({
  icon: Icon,
  label,
  value,
  tone,
  hint,
  fill,
  targetAt,
  index = 0,
}: Tile & { index?: number }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md"
      style={{
        animation: `card-enter .45s cubic-bezier(.4,0,.2,1) ${index * 60}ms both`,
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon
          size={12}
          strokeWidth={1.9}
          className="shrink-0 text-muted-foreground opacity-55"
          aria-hidden
        />
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        className="num truncate text-lg font-bold leading-tight tracking-tight"
        style={{ color: TONE[tone] }}
      >
        {value}
      </div>
      {fill != null ? (
        // The bar alone can't answer "is this good?" — the tick marks where
        // the target sits on the same track, so being 3x over is visible.
        <div className="relative h-1.5 w-full rounded-full bg-muted" aria-hidden>
          <span
            className="absolute left-0 top-0 block h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${fill}%`, background: TONE[tone] }}
          />
          {targetAt != null && (
            <span
              className="absolute -top-[3px] block w-0.5 rounded-full bg-foreground opacity-50"
              style={{ left: `${targetAt}%`, height: "calc(100% + 6px)" }}
            />
          )}
        </div>
      ) : (
        <div className="h-1.5" aria-hidden />
      )}
      <p className="m-0 truncate text-[10px] leading-tight text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

export function AdminKpiStrip({ summary: s }: Props) {
  const tiles: Tile[] = [
    {
      icon: Banknote,
      label: "Daily Avg Revenue",
      value: fmt(s.dailyAvgRevenue),
      tone: "neutral",
      hint: "per day in range",
    },
    // Each track runs 0 → SCALE so the target tick lands inside it with room
    // left to show a value that overshoots. Scaling to the target itself
    // would pin the tick to the end and hide by how much you are over.
    {
      icon: Percent,
      label: "Gross Margin",
      value: `${s.grossMarginPercent.toFixed(1)}%`,
      tone: higherIsBetterTone(s.grossMarginPercent, 40),
      hint: "healthy ≥ 40%",
      fill: clampPct((s.grossMarginPercent / 60) * 100),
      targetAt: (40 / 60) * 100,
    },
    {
      icon: Percent,
      label: "Net Margin",
      value: `${s.netMarginPercent.toFixed(1)}%`,
      tone: higherIsBetterTone(s.netMarginPercent, 10),
      hint: "healthy ≥ 10%",
      fill: clampPct((s.netMarginPercent / 15) * 100),
      targetAt: (10 / 15) * 100,
    },
    {
      icon: Receipt,
      label: "Expense Ratio",
      value: `${s.expenseRatio.toFixed(1)}%`,
      tone: lowerIsBetterTone(s.expenseRatio, 30),
      hint: "aim ≤ 30%",
      fill: clampPct((s.expenseRatio / 120) * 100),
      targetAt: (30 / 120) * 100,
    },
    {
      icon: Wallet,
      label: "Payroll Ratio",
      value: `${s.payrollRatio.toFixed(1)}%`,
      tone: lowerIsBetterTone(s.payrollRatio, 25),
      hint: "aim ≤ 25%",
      fill: clampPct((s.payrollRatio / 120) * 100),
      targetAt: (25 / 120) * 100,
    },
  ];

  return (
    <div className="rounded-[10px] border border-border bg-linear-to-b from-(--tint-indigo) to-muted p-1 pt-0">
      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Health
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile, i) => (
          <HealthTile key={tile.label} {...tile} index={i} />
        ))}
      </div>
    </div>
  );
}
