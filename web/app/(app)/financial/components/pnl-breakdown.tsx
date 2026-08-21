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
    <div className="card card-pad">
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>
        P&L Breakdown
      </h3>
      {ROWS.map((row) => {
        const value = breakdown[row.key];
        const width = Math.min(100, Math.round((Math.abs(value) / base) * 100));
        const color =
          row.key === "netProfit" && value < 0
            ? "var(--fin-net-neg)"
            : row.color;

        return (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "7px 0",
            }}
          >
            <span
              style={{
                width: 180,
                flexShrink: 0,
                fontSize: row.indent ? 12 : 13,
                fontWeight: 500,
                paddingLeft: row.indent ? 16 : 0,
                color: row.indent ? "var(--fg3)" : undefined,
              }}
            >
              <span style={{ color: "var(--fg3)" }}>{row.op} </span>
              {row.label}
            </span>
            <span
              style={{
                flex: 1,
                height: 14,
                background: "var(--input-bg)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${width}%`,
                  background: color,
                  borderRadius: 4,
                }}
              />
            </span>
            <span
              className="num"
              style={{
                width: 90,
                textAlign: "right",
                fontWeight: 600,
                fontSize: 13,
                color: row.emphasize ? color : "var(--fg1)",
              }}
            >
              {fmt(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
