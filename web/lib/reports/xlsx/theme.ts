import type ExcelJS from "exceljs";

/** ARGB hex strings — exceljs wants alpha-prefixed hex, unlike the app's CSS hex tokens. */
export const XLSX_COLORS = {
  indigo: "FF6B4226",
  indigo600: "FF55321C",
  slate: "FF94A3B8",
  amber: "FFF59E0B",
  emerald: "FF10B981",
  rose: "FFF43F5E",
  tintIndigo: "FFF7EFE6",
  tintSlate: "FFF1F5F9",
  fg1: "FF2B1B12",
  fg2: "FF64748B",
  border: "FFEAE1D5",
  rowStripe: "FFFAF5EE",
  white: "FFFFFFFF",
} as const;

export const CURRENCY_FORMAT = '"KSh" #,##0.00';

export function thinBorder(color: string = XLSX_COLORS.border) {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

/** Writes the shared branded banner (org name, report title, desc, period/branch) at the top of a sheet. */
export function addXlsxReportHeader(
  sheet: ExcelJS.Worksheet,
  opts: {
    orgName: string;
    title: string;
    desc: string;
    periodLabel: string;
    branchLabel: string;
    lastCol: string;
  },
): number {
  const { orgName, title, desc, periodLabel, branchLabel, lastCol } = opts;

  sheet.mergeCells(`A1:${lastCol}1`);
  const orgCell = sheet.getCell("A1");
  orgCell.value = orgName;
  orgCell.font = { name: "Calibri", bold: true, size: 14, color: { argb: XLSX_COLORS.indigo600 } };
  sheet.getRow(1).height = 22;

  sheet.mergeCells(`A2:${lastCol}2`);
  const titleCell = sheet.getCell("A2");
  titleCell.value = title;
  titleCell.font = { name: "Calibri", bold: true, size: 18, color: { argb: XLSX_COLORS.fg1 } };
  sheet.getRow(2).height = 26;

  sheet.mergeCells(`A3:${lastCol}3`);
  const descCell = sheet.getCell("A3");
  descCell.value = desc;
  descCell.font = { name: "Calibri", italic: true, size: 10, color: { argb: XLSX_COLORS.fg2 } };

  sheet.mergeCells(`A4:${lastCol}4`);
  const metaCell = sheet.getCell("A4");
  metaCell.value = `Period: ${periodLabel}   •   Branch: ${branchLabel}`;
  metaCell.font = { name: "Calibri", size: 9, color: { argb: XLSX_COLORS.fg2 } };

  // next free row (row 5 is a blank spacer)
  return 6;
}

/** Writes a simple two-column, branded table starting at `startRow`; returns the next free row. */
export function addXlsxTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  opts: {
    heading: string;
    columns: [string, string];
    rows: { label: string; value: number | string; bold?: boolean; color?: string }[];
    currency?: boolean;
  },
): number {
  const { heading, columns, rows, currency = true } = opts;

  const headingCell = sheet.getCell(`A${startRow}`);
  headingCell.value = heading;
  headingCell.font = { name: "Calibri", bold: true, size: 12, color: { argb: XLSX_COLORS.fg1 } };

  const headerRowIdx = startRow + 1;
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = columns;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: XLSX_COLORS.indigo600 } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.tintIndigo } };
    cell.border = thinBorder();
    cell.alignment = { horizontal: colNumber === 1 ? "left" : "right", vertical: "middle" };
  });

  rows.forEach((row, i) => {
    const rowIdx = headerRowIdx + 1 + i;
    const excelRow = sheet.getRow(rowIdx);
    excelRow.getCell(1).value = row.label;
    excelRow.getCell(2).value = row.value;
    if (currency && typeof row.value === "number") {
      excelRow.getCell(2).numFmt = CURRENCY_FORMAT;
    }
    excelRow.eachCell((cell, colNumber) => {
      cell.border = thinBorder();
      cell.alignment = { horizontal: colNumber === 1 ? "left" : "right", vertical: "middle" };
      cell.font = {
        name: "Calibri",
        size: 10,
        bold: Boolean(row.bold),
        color: { argb: row.color ?? XLSX_COLORS.fg1 },
      };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.rowStripe } };
      }
    });
  });

  return headerRowIdx + rows.length + 2; // blank spacer row after the table
}
