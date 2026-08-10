"use client";

/**
 * Shared look-and-feel for exported report PDFs — colors/fonts mirror the
 * brand tokens in app/globals.css (light palette; PDFs are always "light").
 * Keep this in sync if the brand palette changes.
 */
import { Circle, Font, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

export const PDF_COLORS = {
  bg: "#faf7f2",
  surface: "#ffffff",
  border: "#eae1d5",
  fg1: "#2b1b12",
  fg2: "#64748b",
  fg3: "#94a3b8",

  indigo: "#6b4226",
  indigo600: "#55321c",
  teal: "#f9a72a",
  violet: "#b5793b",
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
  slate: "#94a3b8",

  tintIndigo: "#f7efe6",
  tintTeal: "#fef5e4",
  tintAmber: "#fffbeb",
  tintEmerald: "#ecfdf5",
  tintRose: "#fff1f2",
  tintSlate: "#f1f5f9",

  headBand: "#f3e7d5",
  headBandBorder: "#e6d3b8",
  rowStripe: "#faf5ee",
} as const;

let fontsRegistered = false;

/** Registers the local Plus Jakarta Sans weights with react-pdf. Safe to call repeatedly. */
export function registerReportFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: "Plus Jakarta Sans",
    fonts: [
      { src: "/fonts/PlusJakartaSans-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/PlusJakartaSans-Medium.ttf", fontWeight: 500 },
      { src: "/fonts/PlusJakartaSans-SemiBold.ttf", fontWeight: 600 },
      { src: "/fonts/PlusJakartaSans-Bold.ttf", fontWeight: 700 },
      { src: "/fonts/PlusJakartaSans-ExtraBold.ttf", fontWeight: 800 },
    ],
  });
  // Disable automatic word-hyphenation — react-pdf's default hyphenator can
  // break labels/currency values mid-word when a cell is tight on space.
  Font.registerHyphenationCallback((word) => [word]);
}

/** Vector redraw of components/logo.tsx's LogoMark (cup + boba pearls) for print. */
export function ReportLogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={2} y={2} width={44} height={44} rx={12} fill="#3F201B" />
      {/* straw — drawn before the cup body so the cup rim covers its base */}
      <Rect
        x={26}
        y={7}
        width={4}
        height={14}
        rx={2}
        fill="#F9A72A"
        transform="rotate(14 28 14)"
      />
      <Path
        d="M15 17h18l-2.4 21a3 3 0 0 1-3 2.7h-7.2a3 3 0 0 1-3-2.7L15 17Z"
        fill="#FDF6EC"
      />
      <Path
        d="M16.2 27.5h15.6l-1.1 10.5a3 3 0 0 1-3 2.7h-7.2a3 3 0 0 1-3-2.7l-1.3-10.5Z"
        fill="#F9A72A"
        fillOpacity={0.85}
      />
      <Circle cx={20.5} cy={36.5} r={1.9} fill="#3F201B" />
      <Circle cx={24.5} cy={37.5} r={1.9} fill="#3F201B" />
      <Circle cx={28} cy={36} r={1.9} fill="#3F201B" />
      <Rect x={14} y={15} width={20} height={3.4} rx={1.7} fill="#F9A72A" />
    </Svg>
  );
}

/** Small colored trend-arrow glyph used on KPI cards, tinted per metric. */
export function TrendGlyph({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 17 10 10 14 14 21 6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M15 6h6v6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Plus Jakarta Sans",
    fontSize: 9,
    color: PDF_COLORS.fg1,
    backgroundColor: PDF_COLORS.surface,
    paddingTop: 112,
    paddingBottom: 46,
    paddingHorizontal: 32,
  },
  headerBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 92,
    backgroundColor: PDF_COLORS.headBand,
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLORS.indigo,
    paddingHorizontal: 32,
    paddingTop: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orgName: {
    fontSize: 13,
    fontWeight: 700,
    color: PDF_COLORS.indigo600,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: PDF_COLORS.fg1,
    marginTop: 6,
  },
  reportDesc: {
    fontSize: 8.5,
    color: PDF_COLORS.fg2,
    marginTop: 2,
  },
  metaBox: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 8,
    color: PDF_COLORS.fg2,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 600,
    color: PDF_COLORS.fg1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingHorizontal: 32,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
    color: PDF_COLORS.fg3,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: PDF_COLORS.fg1,
    marginBottom: 6,
  },
  section: {
    marginBottom: 12,
  },
});

export function ReportHeader({
  orgName,
  title,
  desc,
  periodLabel,
  branchLabel,
}: {
  orgName: string;
  title: string;
  desc: string;
  periodLabel: string;
  branchLabel: string;
}) {
  return (
    <View style={pdfStyles.headerBand} fixed>
      <View style={pdfStyles.headerRow}>
        <View>
          <View style={pdfStyles.brandRow}>
            <ReportLogoMark size={22} />
            <Text style={pdfStyles.orgName}>{orgName}</Text>
          </View>
          <Text style={pdfStyles.reportTitle}>{title}</Text>
          <Text style={pdfStyles.reportDesc}>{desc}</Text>
        </View>
        <View style={pdfStyles.metaBox}>
          <Text style={pdfStyles.metaLabel}>Period</Text>
          <Text style={pdfStyles.metaValue}>{periodLabel}</Text>
          <Text style={[pdfStyles.metaLabel, { marginTop: 6 }]}>Branch</Text>
          <Text style={pdfStyles.metaValue}>{branchLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function ReportFooter({
  orgName,
  generatedAt,
}: {
  orgName: string;
  generatedAt: string;
}) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        {orgName} • {generatedAt} • Generated with Skyview
      </Text>
      <Text
        style={pdfStyles.footerText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

/** Simple striped table: header row + body rows, all cells left-aligned except the last column. */
export function PdfTable({
  columns,
  rows,
  rowColors,
  boldRows,
}: {
  columns: string[];
  rows: (string | number)[][];
  /** Row index → text color for that row's last (amount) cell, e.g. to flag a negative total. */
  rowColors?: Record<number, string>;
  /** Row indices to render in bold (e.g. a totals row). */
  boldRows?: number[];
}) {
  const tableStyles = StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderColor: PDF_COLORS.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    head: {
      flexDirection: "row",
      backgroundColor: PDF_COLORS.tintIndigo,
      paddingVertical: 4.5,
      paddingHorizontal: 8,
    },
    headCell: {
      fontSize: 8,
      fontWeight: 700,
      color: PDF_COLORS.indigo600,
      textTransform: "uppercase",
    },
    row: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: PDF_COLORS.border,
    },
    cell: {
      fontSize: 8.5,
      color: PDF_COLORS.fg1,
    },
  });

  return (
    <View style={tableStyles.wrap}>
      <View style={tableStyles.head}>
        {columns.map((col, i) => (
          <Text
            key={col}
            style={[
              tableStyles.headCell,
              { flex: i === 0 ? 2 : 1, textAlign: i === 0 ? "left" : "right" },
            ]}
          >
            {col}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={
            ri % 2 === 1
              ? [tableStyles.row, { backgroundColor: PDF_COLORS.rowStripe }]
              : tableStyles.row
          }
          wrap={false}
        >
          {row.map((cell, ci) => {
            const isAmountCell = ci === row.length - 1;
            const bold = boldRows?.includes(ri) ?? false;
            return (
              <Text
                key={ci}
                style={[
                  tableStyles.cell,
                  {
                    flex: ci === 0 ? 2 : 1,
                    textAlign: ci === 0 ? "left" : "right",
                    fontWeight: bold ? 700 : isAmountCell ? 600 : 400,
                    color: isAmountCell ? (rowColors?.[ri] ?? tableStyles.cell.color) : tableStyles.cell.color,
                  },
                ]}
              >
                {cell}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}
