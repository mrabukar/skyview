"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { fmt } from "@/lib/utils";

interface DataPoint {
  m: string;
  rev: number;
  cogs: number;
  exp: number;
}

const SERIES: {
  key: keyof DataPoint;
  label: string;
  color: string;
  gradFrom: string;
  gradTo: string;
}[] = [
  {
    key: "rev",
    label: "Sales",
    color: "var(--brand-indigo)",
    gradFrom: "#8b5e34",
    gradTo: "#5a3520",
  },
  {
    key: "cogs",
    label: "Purchases",
    color: "var(--cost-slate)",
    gradFrom: "#b0bec5",
    gradTo: "#78909c",
  },
  {
    key: "exp",
    label: "Expenses",
    color: "var(--status-amber)",
    gradFrom: "#fbbf24",
    gradTo: "#d97706",
  },
];

function svgX(event: MouseEvent<SVGRectElement>): number | null {
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg) return null;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return pt.matrixTransform(ctm.inverse()).x;
}

export function GroupedBar({
  data,
  height = 240,
}: {
  data: DataPoint[];
  height?: number;
}) {
  const [on, setOn] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 40);
    return () => clearTimeout(t);
  }, []);

  if (data.length === 0) return null;

  const W = 560;
  const H = height;
  const pad = { t: 16, r: 12, b: 28, l: 44 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max =
    Math.max(...data.flatMap((d) => [d.rev, d.cogs, d.exp]), 1) * 1.1;
  const groupW = iw / data.length;
  const barW = Math.min(18, groupW / 3.5);

  const hovered = hoverIndex != null ? data[hoverIndex] : null;
  const tooltipLeft =
    hoverIndex != null
      ? ((pad.l + groupW * hoverIndex + groupW / 2) / W) * 100
      : 0;

  const handlePlotMove = (event: MouseEvent<SVGRectElement>) => {
    const x = svgX(event);
    if (x == null || x < pad.l || x > W - pad.r) {
      setHoverIndex(null);
      return;
    }
    const i = Math.floor((x - pad.l) / groupW);
    setHoverIndex(i >= 0 && i < data.length ? i : null);
  };

  return (
    <div className="chart-wrap">
      {hovered && (
        <div
          className="chart-tooltip"
          style={{ left: `${tooltipLeft}%` }}
          role="tooltip"
        >
          <div className="chart-tooltip-title">{hovered.m}</div>
          {SERIES.map((series) => (
            <div className="chart-tooltip-row" key={series.key}>
              <span
                className="chart-tooltip-dot"
                style={{ background: series.color }}
              />
              <span className="chart-tooltip-label">{series.label}</span>
              <span className="chart-tooltip-value num">
                {fmt(hovered[series.key] as number)}
              </span>
            </div>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="chart-svg"
        style={{ display: "block" }}
      >
        <defs>
          {SERIES.map((series) => (
            <linearGradient
              key={series.key}
              id={`bar-grad-${series.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={series.gradFrom} />
              <stop offset="100%" stopColor={series.gradTo} />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.5, 1].map((g, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + ih * g}
            y2={pad.t + ih * g}
            stroke="var(--border)"
            strokeWidth="0.75"
            strokeDasharray={g === 1 ? "none" : "4 3"}
            opacity={g === 1 ? 1 : 0.7}
            pointerEvents="none"
          />
        ))}
        {data.map((d, i) => {
          const gx = pad.l + groupW * i + groupW / 2;
          const active = hoverIndex === i;
          return (
            <g key={i} pointerEvents="none">
              {SERIES.map((series, j) => {
                const bx = gx + (j - 1) * (barW + 3) - barW / 2;
                const bh = on ? ((d[series.key] as number) / max) * ih : 0;
                return (
                  <rect
                    key={series.key}
                    x={bx}
                    y={pad.t + ih - bh}
                    width={barW}
                    height={bh}
                    rx={barW / 3.5}
                    fill={`url(#bar-grad-${series.key})`}
                    opacity={active || hoverIndex === null ? 1 : 0.35}
                    style={{
                      transition:
                        "height .6s cubic-bezier(.4,0,.2,1), y .6s cubic-bezier(.4,0,.2,1), opacity .15s ease",
                      filter:
                        active
                          ? "drop-shadow(0 2px 4px rgba(0,0,0,.15))"
                          : "none",
                    }}
                  />
                );
              })}
            </g>
          );
        })}
        {data.map((d, i) => (
          <text
            key={i}
            x={pad.l + groupW * i + groupW / 2}
            y={H - 9}
            textAnchor="middle"
            fontSize="11"
            fontWeight={hoverIndex === i ? "600" : "400"}
            fill={hoverIndex === i ? "var(--fg1)" : "var(--fg3)"}
            fontFamily="var(--font-sans)"
          >
            {d.m}
          </text>
        ))}
        {[0, 0.5, 1].map((g, i) => (
          <text
            key={i}
            x={pad.l - 8}
            y={pad.t + ih * (1 - g) + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--fg3)"
            fontFamily="var(--font-mono)"
          >
            {fmt(max * g)}
          </text>
        ))}
        <rect
          x={pad.l}
          y={pad.t}
          width={iw}
          height={ih}
          fill="transparent"
          className="chart-hit"
          onMouseMove={handlePlotMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>
      <div className="legend">
        {SERIES.map((series) => (
          <span className="li" key={series.key}>
            <span className="dot" style={{ background: series.color, borderRadius: "3px" }} />
            {series.label}
          </span>
        ))}
      </div>
    </div>
  );
}
