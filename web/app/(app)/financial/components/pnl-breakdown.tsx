import { Card } from "@/components/ui/card";
import { fmt } from "@/lib/utils";
import type { FinancialBreakdown } from "@/types/reports/financial-summary";

const ROWS: {
  key: keyof FinancialBreakdown;
  label: string;
  op: string;
  color: string;
  emphasize?: boolean;
  indent?: boolean;
}[] = [
  { key: "revenue", label: "Revenue", op: "", color: "var(--fin-revenue)" },
  {
    key: "cogs",
    label: "Cost of Goods Sold",
    op: "−",
    color: "var(--fin-cogs)",
  },
  {
    key: "grossProfit",
    label: "Gross Profit",
    op: "=",
    color: "var(--fin-gross)",
  },
  {
    key: "expenses",
    label: "Operating Expenses",
    op: "−",
    color: "var(--fin-expenses)",
  },
  {
    key: "salaries",
    label: "Salaries & Payroll",
    op: "",
    color: "var(--fin-expenses)",
    indent: true,
  },
  {
    key: "netProfit",
    label: "Net Profit",
    op: "=",
    color: "var(--fin-net-pos)",
    emphasize: true,
  },
];

export function PnlBreakdown({ breakdown }: { breakdown: FinancialBreakdown }) {
  const base = breakdown.revenue > 0 ? breakdown.revenue : 1;

  return (
    <Card title="P&L Breakdown" pad>
      <ul className="pnl">
        {ROWS.map((row) => {
          const value = breakdown[row.key];
          const share = (Math.abs(value) / base) * 100;
          const width = Math.min(100, share);
          const color =
            row.key === "netProfit" && value < 0
              ? "var(--fin-net-neg)"
              : row.color;

          return (
            <li
              key={row.key}
              className={`pnl-row${row.indent ? " pnl-row--sub" : ""}${
                row.emphasize ? " pnl-row--total" : ""
              }`}
            >
              <span className="pnl-label">
                <span className="pnl-op" aria-hidden>
                  {row.op}
                </span>
                {row.label}
              </span>
              <span className="pnl-track">
                <span
                  className="pnl-fill"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 68%, #000))`,
                  }}
                />
              </span>
              <span
                className="pnl-val num"
                style={row.emphasize ? { color } : undefined}
              >
                {fmt(value)}
              </span>
              <span className="pnl-share">{share.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
