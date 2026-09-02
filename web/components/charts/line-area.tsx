"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { fmt } from "@/lib/utils";

interface Props {
  values: number[];
  labels: string[];
  height?: number;
  color?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Draws a dashed reference line so "is this good?" is answerable at a glance. */
  target?: number;
  targetLabel?: string;
}

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

export function LineArea({
  values,
  labels,
  height = 240,
  color = "var(--brand-violet)",
  valueLabel = "Net Profit",
  formatValue = fmt,
  target,
  targetLabel,
}: Props) {
  const [on, setOn] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), 40);
    return () => clearTimeout(t);
  }, [values, labels]);

  if (values.length === 0) return null;

  // A single point cannot form a line path — duplicate it so the chart renders.
  const plotValues = values.length === 1 ? [values[0], values[0]] : values;
  const plotLabels =
    labels.length === 1 ? [labels[0], labels[0]] : labels.length === values.length
      ? labels
      : values.map((_, i) => labels[i] ?? "");

  const W = 560;
  const H = height;
  const pad = { t: 16, r: 14, b: 28, l: 44 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  // The target has to be inside the scale or its reference line lands off
  // the plot and the comparison it exists to make is invisible.
  const scaleValues =
    target != null ? [...plotValues, target] : plotValues;
  const max = Math.max(...scaleValues, 1) * 1.15;
  const min = Math.min(0, ...scaleValues);
  const span = Math.max(plotValues.length - 1, 1);
  const x = (i: number) => pad.l + (iw / span) * i;
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const pts = plotValues.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const area =
    line + ` L${x(plotValues.length - 1)} ${y(min)} L${x(0)} ${y(min)} Z`;

  const tooltipLeft =
    hoverIndex != null ? (x(hoverIndex) / W) * 100 : 0;

  const handlePlotMove = (event: MouseEvent<SVGRectElement>) => {
    const px = svgX(event);
    if (px == null || px < pad.l || px > W - pad.r) {
      setHoverIndex(null);
      return;
    }
    const raw = ((px - pad.l) / iw) * span;
    const i = Math.round(raw);
    setHoverIndex(i >= 0 && i < plotValues.length ? i : null);
  };

  return (
    <div className="chart-wrap">
      {hoverIndex != null && (
        <div
          className="chart-tooltip chart-tooltip--compact"
          style={{ left: `${tooltipLeft}%` }}
          role="tooltip"
        >
          <div className="chart-tooltip-title">{plotLabels[hoverIndex]}</div>
          <div className="chart-tooltip-row">
            <span className="chart-tooltip-dot" style={{ background: color }} />
            <span className="chart-tooltip-label">{valueLabel}</span>
            <span className="chart-tooltip-value num">
              {formatValue(plotValues[hoverIndex])}
            </span>
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="chart-svg"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`area-grad-${color.replace(/[^a-zA-Z]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="85%" stopColor={color} stopOpacity="0.03" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="line-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dy="1" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feFlood floodColor={color} floodOpacity="0.2" />
            <feComposite in2="SourceGraphic" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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
        {target != null && (
          <>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(target)}
              y2={y(target)}
              stroke="var(--status-emerald)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.65"
              pointerEvents="none"
            />
            {targetLabel && (
              <text
                x={W - pad.r}
                y={y(target) - 5}
                textAnchor="end"
                fontSize="9.5"
                fontWeight="700"
                fill="var(--status-emerald)"
                fontFamily="var(--font-sans)"
                pointerEvents="none"
              >
                {targetLabel}
              </text>
            )}
          </>
        )}
        <path
          d={area}
          fill={`url(#area-grad-${color.replace(/[^a-zA-Z]/g, "")})`}
          style={{ opacity: on ? 1 : 0, transition: "opacity .8s ease" }}
          pointerEvents="none"
        />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#line-glow)"
          style={{
            strokeDasharray: 1400,
            strokeDashoffset: on ? 0 : 1400,
            transition: "stroke-dashoffset 1s ease",
          }}
          pointerEvents="none"
        />
        {/* Hover crosshair line */}
        {hoverIndex != null && (
          <line
            x1={pts[hoverIndex][0]}
            x2={pts[hoverIndex][0]}
            y1={pad.t}
            y2={pad.t + ih}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.35"
            pointerEvents="none"
          />
        )}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={hoverIndex === i ? 5.5 : 3}
            fill={hoverIndex === i ? color : "var(--surface)"}
            stroke={color}
            strokeWidth={hoverIndex === i ? 2.5 : 2}
            style={{
              opacity: on ? 1 : 0,
              transition: "opacity .5s ease .4s, r .15s ease, fill .15s ease",
            }}
            pointerEvents="none"
          />
        ))}
        {plotLabels.map((l, i) =>
          i === 1 && values.length === 1 ? null : (
            <text
              key={i}
              x={x(i)}
              y={H - 9}
              textAnchor="middle"
              fontSize="11"
              fontWeight={hoverIndex === i ? "600" : "400"}
              fill={hoverIndex === i ? "var(--fg1)" : "var(--fg3)"}
              fontFamily="var(--font-sans)"
              pointerEvents="none"
            >
              {l}
            </text>
          ),
        )}
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
    </div>
  );
}
