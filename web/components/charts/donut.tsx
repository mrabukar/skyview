"use client";
import { useEffect, useState } from "react";

interface Slice { label: string; value: number; color: string; }

interface Props {
  data: Slice[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  /** Formats each slice's value in the side legend. */
  format?: (value: number) => string;
}

export function Donut({
  data,
  centerLabel,
  centerValue,
  height = 200,
  format = (v) => v.toLocaleString("en-US"),
}: Props) {
  const [on, setOn] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), 40);
    return () => clearTimeout(t);
  }, [data]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 72, r = 55, C = 90;
  const singleSlice = data.length === 1 && total > 0;
  let acc = 0;

  // Tiny gap between segments for a cleaner look
  const GAP = data.length > 1 ? 0.006 : 0;

  const segs = singleSlice
    ? []
    : data.map((d, idx) => {
        const frac = total > 0 ? d.value / total : 0;
        const a0 = (acc + GAP / 2) * 2 * Math.PI - Math.PI / 2;
        acc += frac;
        const a1 = (acc - GAP / 2) * 2 * Math.PI - Math.PI / 2;
        const large = frac - GAP > 0.5 ? 1 : 0;
        const p = (ang: number, rad: number): [number, number] => [
          C + rad * Math.cos(ang),
          C + rad * Math.sin(ang),
        ];
        const [x0, y0] = p(a0, R);
        const [x1, y1] = p(a1, R);
        const [x2, y2] = p(a1, r);
        const [x3, y3] = p(a0, r);
        return {
          path: `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`,
          color: d.color,
          label: d.label,
          idx,
        };
      });

  const displayLabel = hoverIdx != null ? data[hoverIdx]?.label : centerLabel;
  const displayValue =
    hoverIdx != null
      ? `${((data[hoverIdx]?.value ?? 0) / Math.max(total, 1) * 100).toFixed(1)}%`
      : centerValue;

  // The ring sits beside its legend rather than above it, so cap it well
  // short of the card width and let the value list take the rest.
  const ringSize = Math.min(height, 132);

  return (
    <div className="donut-wrap">
      <div className="donut-ring">
      <svg viewBox="0 0 180 180" width={ringSize} height={ringSize}
        style={{ opacity: on ? 1 : 0, transform: on ? "scale(1) rotate(0)" : "scale(.85) rotate(-8deg)", transition: "opacity .5s ease, transform .6s cubic-bezier(.4,0,.2,1)" }}>
        <defs>
          <filter id="donut-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
          </filter>
        </defs>
        {/* Subtle inner shadow ring */}
        <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="var(--border)" strokeWidth={R - r} strokeOpacity="0.08" />
        {singleSlice ? (
          <>
            <circle cx={C} cy={C} r={R} fill={data[0].color} filter="url(#donut-shadow)" />
            <circle cx={C} cy={C} r={r} fill="var(--surface)" />
          </>
        ) : (
          segs.map((s) => (
            <path
              key={s.idx}
              d={s.path}
              fill={s.color}
              style={{
                opacity: hoverIdx === null || hoverIdx === s.idx ? 1 : 0.4,
                transform: hoverIdx === s.idx ? "scale(1.035)" : "scale(1)",
                transformOrigin: `${C}px ${C}px`,
                transition: "opacity .2s ease, transform .2s ease",
                filter: hoverIdx === s.idx ? "url(#donut-shadow)" : "none",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoverIdx(s.idx)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))
        )}
        {/* White center circle */}
        <circle cx={C} cy={C} r={r - 1} fill="var(--surface)" />
        {displayValue != null && (
          <text x="90" y={displayLabel ? "86" : "93"} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--fg1)" fontFamily="var(--font-sans)">{displayValue}</text>
        )}
        {displayLabel && (
          <text x="90" y="103" textAnchor="middle" fontSize="10" fill="var(--fg3)" fontFamily="var(--font-sans)">{displayLabel}</text>
        )}
      </svg>
      </div>
      <ul className="donut-list">
        {data.map((d, i) => (
          <li
            key={i}
            style={{ opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.5 }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className="dl-sw" style={{ background: d.color }} />
            <span className="dl-nm" title={d.label}>
              {d.label}
            </span>
            <span className="dl-vals">
              <span className="dl-vl num">{format(d.value)}</span>
              <span className="dl-pc">
                {total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
