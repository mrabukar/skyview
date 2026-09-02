"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Color =
  | "indigo"
  | "teal"
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "slate";

const SPARK_COLOR: Record<Color, string> = {
  indigo: "var(--brand-indigo)",
  teal: "var(--brand-teal)",
  violet: "var(--brand-violet)",
  amber: "var(--status-amber)",
  emerald: "var(--status-emerald)",
  rose: "var(--status-rose)",
  slate: "var(--cost-slate)",
};

/** Parse "KSh 62,170" → { prefix: "KSh ", number: 62170, suffix: "" } */
function parseFormattedValue(val: string | number): {
  prefix: string;
  number: number;
  suffix: string;
  decimals: number;
} | null {
  if (typeof val === "number") return { prefix: "", number: val, suffix: "", decimals: 0 };
  const m = String(val).match(/^([^\d]*?)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2].replace(/,/g, "");
  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return null;
  const dotIdx = raw.indexOf(".");
  return {
    prefix: m[1],
    number: num,
    suffix: m[3],
    decimals: dotIdx >= 0 ? raw.length - dotIdx - 1 : 0,
  };
}

function formatWithCommas(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function useCountUp(value: string | number, duration = 700): string {
  const [display, setDisplay] = useState(String(value));
  const rafRef = useRef(0);

  useEffect(() => {
    const parsed = parseFormattedValue(value);
    if (!parsed) { setDisplay(String(value)); return; }
    const target = parsed.number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = eased * target;
      setDisplay(`${parsed.prefix}${formatWithCommas(current, parsed.decimals)}${parsed.suffix}`);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

/** Split "KSh 134,947" so the currency can be set smaller than the figure. */
function splitCurrency(display: string): { cur: string; rest: string } {
  const m = display.match(/^([^\d\-−]+)\s*(.*)$/);
  if (!m) return { cur: "", rest: display };
  return { cur: m[1].trim(), rest: m[2] };
}

/**
 * Micro sparkline that bleeds to the card edge. Renders an area + line for
 * the period's trend; a series that never moves off zero draws a dashed
 * baseline instead, so "no activity" reads as deliberate rather than broken.
 */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const gradId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const W = 120;
  const H = 34;
  const TOP = 5;
  const BOT = 30;

  if (values.length < 2) return <div className="kpi-spark" aria-hidden />;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;

  if (span === 0) {
    return (
      <div className="kpi-spark" aria-hidden>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <path
            d={`M0 ${BOT} L${W} ${BOT}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1.6"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  }

  // Losses trend downward: invert so a falling series visually descends.
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => {
    const t = (v - min) / span;
    return [i * step, BOT - t * (BOT - TOP)] as const;
  });

  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <div className="kpi-spark" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.38" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#spark-${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.7"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

interface Props {
  icon: LucideIcon;
  color?: Color;
  value: string | number;
  label: string;
  trend?: string;
  trendDir?: "up" | "down";
  sublabel?: string;
  valueColor?: string;
  /** Period series driving the card's micro sparkline. */
  spark?: number[];
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
  spark,
}: Props) {
  const hasTrend = trend != null;
  const animatedValue = useCountUp(value);
  const { cur, rest } = splitCurrency(animatedValue);

  return (
    <div className="kpi-card" data-accent={color}>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-ic" aria-hidden>
          <Icon size={15} strokeWidth={1.9} />
        </span>
      </div>
      <div className="kpi-inner">
        <div className="kpi-valrow">
          <span
            className="kpi-val num"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {cur && <span className="kpi-cur">{cur}</span>}
            {rest}
          </span>
        </div>
        <div className="kpi-footer">
          {hasTrend && (
            <span
              className={
                trendDir === "down"
                  ? "kpi-trend kpi-trend--down"
                  : "kpi-trend kpi-trend--up"
              }
            >
              {trendDir === "down" ? (
                <ArrowDownRight size={11} strokeWidth={2.6} />
              ) : (
                <ArrowUpRight size={11} strokeWidth={2.6} />
              )}
              {trend}
            </span>
          )}
          <span className="kpi-sub">{sublabel}</span>
        </div>
      </div>
      {spark && <Sparkline values={spark} color={SPARK_COLOR[color]} />}
    </div>
  );
}
