import ExcelJS from "exceljs";

import type { StockReportProduct, StockReportTotals } from "@/types/reports/stock-report";

import { CURRENCY_FORMAT, XLSX_COLORS, addXlsxReportHeader, thinBorder } from "./theme";

export interface StockReportXlsxData {
  orgName: string;
  periodLabel: string;
  branchLabel: string;
  products: StockReportProduct[];
  totals: StockReportTotals;
}

export function buildStockReportWorkbook(data: StockReportXlsxData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Skyview";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Stock Report", { views: [{ showGridLines: false }] });
  sheet.columns = [
    { width: 34 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  let row = addXlsxReportHeader(sheet, {
    orgName: data.orgName,
    title: "Stock Report",
    desc: "Purchases, stock on hand, and sales for the selected period",
    periodLabel: data.periodLabel,
    branchLabel: data.branchLabel,
    lastCol: "E",
  });

  const columns = ["Menu item", "Avg cost", "Purchased", "In stock", "Sold"];
  const headerRow = sheet.getRow(row);
  headerRow.values = columns;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: XLSX_COLORS.indigo600 } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.tintIndigo } };
    cell.border = thinBorder();
    cell.alignment = { horizontal: colNumber === 1 ? "left" : "right", vertical: "middle" };
  });
  row += 1;

  data.products.forEach((product, i) => {
    const excelRow = sheet.getRow(row + i);
    excelRow.getCell(1).value = product.productModel
      ? `${product.productName} (${product.productModel})`
      : product.productName;
    excelRow.getCell(2).value = product.averageCost;
    excelRow.getCell(2).numFmt = CURRENCY_FORMAT;
    excelRow.getCell(3).value = product.purchaseDevices;
    excelRow.getCell(4).value = product.inStock;
    excelRow.getCell(5).value = product.salesDevices;
    excelRow.eachCell((cell, colNumber) => {
      cell.border = thinBorder();
      cell.alignment = { horizontal: colNumber === 1 ? "left" : "right", vertical: "middle" };
      cell.font = { name: "Calibri", size: 10, color: { argb: XLSX_COLORS.fg1 } };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_COLORS.rowStripe } };
      }
    });
  });

  const totalRowIdx = row + data.products.length;
  const totalRow = sheet.getRow(totalRowIdx);
  totalRow.getCell(1).value = "Total";
  totalRow.getCell(3).value = data.totals.purchaseDevices;
  totalRow.getCell(4).value = data.totals.inStock;
  totalRow.getCell(5).value = data.totals.salesDevices;
  totalRow.eachCell((cell, colNumber) => {
    cell.border = thinBorder();
    cell.alignment = { horizontal: colNumber === 1 ? "left" : "right", vertical: "middle" };
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: XLSX_COLORS.fg1 } };
  });

  return wb;
}
