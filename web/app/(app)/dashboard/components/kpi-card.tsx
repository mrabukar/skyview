"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Color =
  | "indigo"
  | "teal"
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "slate";


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
  const hasTrend = trend != null;
  const animatedValue = useCountUp(value);

  return (
    <div className="kpi-card" data-accent={color}>
      <div className="kpi-head">
        <span className="kpi-ic" aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-inner">
        <div className="kpi-valrow">
          <span
            className="kpi-val num"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {animatedValue}
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
                <ArrowDownRight size={11} strokeWidth={2.25} />
              ) : (
                <ArrowUpRight size={11} strokeWidth={2.25} />
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
