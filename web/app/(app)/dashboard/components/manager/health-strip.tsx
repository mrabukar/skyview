import {
  AlertTriangle,
  Package,
  PackageX,
  Percent,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import type { ManagerDashboardSummary } from "@/types/reports/manager-dashboard";

interface Props {
  summary: ManagerDashboardSummary;
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
}

function HealthTile({ icon: Icon, label, value, tone, hint, fill }: Tile) {
  const chipBg =
    tone === "emerald"
      ? "var(--tint-emerald)"
      : tone === "amber"
        ? "var(--tint-amber)"
        : tone === "rose"
          ? "var(--tint-rose)"
          : "var(--tint-indigo)";

  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-md"
          style={{ background: chipBg, color: TONE[tone] }}
          aria-hidden
        >
          <Icon size={11} strokeWidth={2} />
        </span>
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
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <span
            className="block h-full rounded-full"
            style={{
              width: `${fill}%`,
              background: TONE[tone],
            }}
          />
        </div>
      ) : (
        <div className="h-1" aria-hidden />
      )}
      <p className="m-0 truncate text-[10px] leading-tight text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

export function ManagerHealthStrip({ summary: s }: Props) {
  const tiles: Tile[] = [
    {
      icon: Percent,
      label: "Gross Margin",
      value: `${s.grossMarginPercent.toFixed(1)}%`,
      tone: higherIsBetterTone(s.grossMarginPercent, 40),
      hint: "healthy ≥ 40%",
      fill: clampPct((s.grossMarginPercent / 40) * 100),
    },
    {
      icon: Receipt,
      label: "Expense Ratio",
      value: `${s.expenseRatio.toFixed(1)}%`,
      tone: lowerIsBetterTone(s.expenseRatio, 30),
      hint: "aim ≤ 30%",
      fill: clampPct(s.expenseRatio),
    },
    {
      icon: Package,
      label: "In Stock",
      value: s.inStockBalance.toLocaleString(),
      tone: "neutral",
      hint: "units on hand",
    },
    {
      icon: AlertTriangle,
      label: "Low Stock",
      value: s.lowStockCount.toLocaleString(),
      tone: s.lowStockCount > 0 ? "amber" : "emerald",
      hint: "needs restock",
    },
    {
      icon: PackageX,
      label: "Out of Stock",
      value: s.outOfStockCount.toLocaleString(),
      tone: s.outOfStockCount > 0 ? "rose" : "emerald",
      hint: "unavailable items",
    },
  ];

  return (
    <div className="rounded-[10px] border border-border bg-linear-to-b from-(--tint-indigo) to-muted p-1 pt-0">
      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Health
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <HealthTile key={tile.label} {...tile} />
        ))}
      </div>
    </div>
  );
}
