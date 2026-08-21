import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Color =
  | "indigo"
  | "teal"
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "slate";

const TINTS: Record<Color, [string, string]> = {
  indigo: ["var(--tint-indigo)", "var(--brand-indigo)"],
  teal: ["var(--tint-teal)", "var(--brand-teal)"],
  violet: ["var(--tint-violet)", "var(--brand-violet)"],
  amber: ["var(--tint-amber)", "var(--status-amber)"],
  emerald: ["var(--tint-emerald)", "var(--status-emerald)"],
  rose: ["var(--tint-rose)", "var(--status-rose)"],
  slate: ["var(--tint-slate)", "var(--cost-slate)"],
};

interface Props {
  icon: LucideIcon;
  color?: Color;
  value: string | number;
  label: string;
  trend?: string;
  trendDir?: "up" | "down";
  sublabel?: string;
  valueColor?: string;
}

export function KpiCard({
  icon: Icon,
  color = "indigo",
  value,
  label,
  trend,
  trendDir = "up",
  sublabel = "vs prior period",
  valueColor,
}: Props) {
  const [, fg] = TINTS[color] ?? TINTS.indigo;
  const hasTrend = trend != null;

  return (
    <div className="kpi-card" data-accent={color}>
      <div className="kpi-head">
        <span className="kpi-ic" style={{ color: fg }} aria-hidden>
          <Icon size={12} strokeWidth={2} />
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-inner">
        <div className="kpi-valrow">
          <span
            className="kpi-val num"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </span>
          {hasTrend && (
            <span
              className={
                trendDir === "down"
                  ? "kpi-trend kpi-trend--down"
                  : "kpi-trend kpi-trend--up"
              }
            >
              {trendDir === "down" ? (
                <ArrowDownRight size={10} strokeWidth={2.25} />
              ) : (
                <ArrowUpRight size={10} strokeWidth={2.25} />
              )}
              {trend}
            </span>
          )}
        </div>
        <div className="kpi-footer">
          <ArrowUpRight
            size={14}
            strokeWidth={1.75}
            className="kpi-arrow"
            aria-hidden
          />
          <span className="kpi-sub">{sublabel}</span>
        </div>
      </div>
    </div>
  );
}
