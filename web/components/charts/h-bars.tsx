"use client";

import { useEffect, useState } from "react";

interface Props<T extends Record<string, string | number>> {
  data: T[];
  valueKey: keyof T & string;
  labelKey: keyof T & string;
  color?: string;
  format?: (v: number) => string;
}

export function HBars<T extends Record<string, string | number>>({
  data,
  valueKey,
  labelKey,
  color = "var(--brand-teal)",
  format,
}: Props<T>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(...data.map((d) => d[valueKey] as number), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {data.map((d, i) => {
        const value = d[valueKey] as number;
        const widthPct = max > 0 ? (value / max) * 100 : 0;

        return (
          <div className="hbar-row" key={i} style={{ opacity: on ? 1 : 0, transform: on ? "translateX(0)" : "translateX(-8px)", transition: `opacity .4s ease ${i * 80}ms, transform .4s ease ${i * 80}ms` }}>
            <span className="hb-name" title={String(d[labelKey])}>
              {d[labelKey]}
            </span>
            <div className="hbar-track">
              <div
                className="hbar-fill"
                style={{
                  width: on ? `${widthPct}%` : "0%",
                  background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, #000))`,
                  borderRadius: "4px",
                  transition: `width .7s cubic-bezier(.4,0,.2,1) ${i * 80 + 100}ms`,
                }}
              />
            </div>
            <span className="hb-val num">{format ? format(value) : value}</span>
          </div>
        );
      })}
    </div>
  );
}
