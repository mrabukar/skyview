"use client";

import { useEffect, useState } from "react";

interface Props<T extends Record<string, string | number>> {
  data: T[];
  valueKey: keyof T & string;
  labelKey: keyof T & string;
  color?: string;
  format?: (v: number) => string;
  /** Caption under each bar, e.g. "93.4% of all revenue". */
  shareLabel?: string;
}

export function HBars<T extends Record<string, string | number>>({
  data,
  valueKey,
  labelKey,
  color = "var(--brand-teal)",
  format,
  shareLabel,
}: Props<T>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const values = data.map((d) => d[valueKey] as number);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <div>
      {data.map((d, i) => {
        const value = d[valueKey] as number;
        // Bars are scaled against the leader so the ranking reads at a
        // glance; the caption carries the share of the total.
        const widthPct = max > 0 ? (value / max) * 100 : 0;
        const sharePct = total > 0 ? (value / total) * 100 : 0;

        return (
          <div
            className="hbar-row"
            key={i}
            style={{
              opacity: on ? 1 : 0,
              transform: on ? "translateX(0)" : "translateX(-8px)",
              transition: `opacity .4s ease ${i * 80}ms, transform .4s ease ${i * 80}ms`,
            }}
          >
            <div className="hbar-head">
              <span className="hb-name" title={String(d[labelKey])}>
                <span className="hb-idx">{i + 1}</span>
                {d[labelKey]}
              </span>
              <span className="hb-val num">
                {format ? format(value) : value.toLocaleString("en-US")}
              </span>
            </div>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{
                  width: on ? `${widthPct}%` : "0%",
                  background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 68%, #000))`,
                  transition: `width .7s cubic-bezier(.4,0,.2,1) ${i * 80 + 100}ms`,
                }}
              />
            </div>
            {shareLabel && (
              <p className="hb-sub">
                {sharePct.toFixed(1)}% {shareLabel}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
