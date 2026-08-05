import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import {
  buildMonthSeries,
  calendarDateDaysAgo,
  calendarDateMonthsAgo,
  calendarDateToDbDate,
  eachCalendarDate,
  monthLabelFromKey,
  resolveReportDateRange,
  startOfMonthCalendarDate,
  todayCalendarDate,
} from "../../common/utils/app-timezone.util";
import { resolveBranchFilter } from "../../common/utils/branch-scope.util";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportQueryDto } from "./dto/report-query.dto";

type SaleRow = {
  id: string;
  saleDate: Date;
  totalAmount: Prisma.Decimal;
  branchId: string;
  branch: { id: string; name: string };
  enteredBy: { id: string; name: string; email: string };
};
type PurchaseRow = { purchaseDate: Date; totalCost: Prisma.Decimal };
type ExpenseRow = {
  expenseDate: Date;
  amount: Prisma.Decimal;
  categoryId: number;
  category: { name: string };
};

export interface Delta {
  percent: number | null;
  direction: "up" | "down" | "flat";
  label: string;
}

function delta(current: number, previous: number): Delta {
  if (previous === 0) {
    return { percent: null, direction: current > 0 ? "up" : "flat", label: "vs previous period" };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    percent,
    direction: percent > 0.5 ? "up" : percent < -0.5 ? "down" : "flat",
    label: "vs previous period",
  };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminDashboard(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);
    const { sales, purchases, expenses } = await this.collect(range.fromDate, range.toDate, branchId);

    const revenue = this.sum(sales, "totalAmount");
    const cogs = this.sum(purchases, "totalCost");
    const totalExpenses = this.sum(expenses, "amount");
    const salaries = expenses
      .filter((e) => e.category.name === "Salaries")
      .reduce((a, e) => a + Number(e.amount), 0);

    // previous period — same length immediately before
    const spanDays = eachCalendarDate(range.fromCalendar, range.toCalendar).length - 1;
    const prevToCal = calendarDateDaysAgo(1, range.fromCalendar);
    const prevFromCal = calendarDateDaysAgo(1 + spanDays, range.fromCalendar);
    const prev = await this.collect(
      calendarDateToDbDate(prevFromCal),
      calendarDateToDbDate(prevToCal),
      branchId,
    );
    const prevRevenue = this.sum(prev.sales, "totalAmount");
    const prevCogs = this.sum(prev.purchases, "totalCost");
    const prevExpenses = this.sum(prev.expenses, "amount");

    const monthly = this.monthlyRows(range.fromCalendar, range.toCalendar, sales, purchases, expenses);

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        totalUnitsSold: sales.length,
        cogs: Math.round(cogs),
        grossProfit: Math.round(revenue - cogs),
        totalExpenses: Math.round(totalExpenses),
        salaries: Math.round(salaries),
        netProfit: Math.round(revenue - cogs - totalExpenses),
        currentStockValue: 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      comparison: {
        label: "vs previous period",
        previousPeriod: { from: prevFromCal, to: prevToCal },
        totalRevenue: delta(revenue, prevRevenue),
        grossProfit: delta(revenue - cogs, prevRevenue - prevCogs),
        netProfit: delta(revenue - cogs - totalExpenses, prevRevenue - prevCogs - prevExpenses),
        totalExpenses: delta(totalExpenses, prevExpenses),
        totalUnitsSold: delta(sales.length, prev.sales.length),
      },
      charts: {
        revenueCogsExpenses: monthly,
        netProfitTrend: monthly.map((m) => ({ month: m.month, monthKey: m.monthKey, netProfit: m.netProfit })),
        expenseBreakdown: this.expenseBreakdown(expenses),
        stockByCategory: [],
        topProducts: [],
        topStores: this.topStores(sales),
      },
      recentSales: this.recentSales(sales),
    };
  }

  async managerDashboard(user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, undefined);
    const today = todayCalendarDate();
    const monthStart = startOfMonthCalendarDate(today);

    // month-to-date sales, purchases and expenses for the branch P&L
    const month = await this.collect(
      calendarDateToDbDate(monthStart),
      calendarDateToDbDate(today),
      branchId,
    );
    const monthRows = month.sales;
    const todayRows = monthRows.filter((s) => ymd(s.saleDate) === today);

    const monthRevenue = this.sum(monthRows, "totalAmount");
    const monthPurchases = this.sum(month.purchases, "totalCost");
    const monthExpenses = this.sum(month.expenses, "amount");
    const todayRevenue = this.sum(todayRows, "totalAmount");

    // deltas
    const yesterday = calendarDateDaysAgo(1, today);
    const yesterdayRows = await this.salesInRange(yesterday, yesterday, branchId);
    const prevMonthSameDay = calendarDateMonthsAgo(1, today);
    const prevMonthStart = startOfMonthCalendarDate(prevMonthSameDay);
    const prevMonthRows = await this.salesInRange(prevMonthStart, prevMonthSameDay, branchId);

    // 14-day trend
    const salesTrend: Array<{ date: string; revenue: number }> = [];
    for (let d = 13; d >= 0; d--) {
      const date = calendarDateDaysAgo(d, today);
      const rows = await this.salesInRange(date, date, branchId);
      salesTrend.push({ date, revenue: Math.round(this.sum(rows, "totalAmount")) });
    }

    return {
      storeId: branchId ?? null,
      summary: {
        todayRevenue: Math.round(todayRevenue),
        todayUnitsSold: todayRows.length,
        monthRevenue: Math.round(monthRevenue),
        monthPurchases: Math.round(monthPurchases),
        monthExpenses: Math.round(monthExpenses),
        netProfit: Math.round(monthRevenue - monthPurchases - monthExpenses),
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      comparison: {
        label: "vs previous period",
        todayRevenue: delta(todayRevenue, this.sum(yesterdayRows, "totalAmount")),
        monthRevenue: delta(monthRevenue, this.sum(prevMonthRows, "totalAmount")),
      },
      charts: { salesTrend, stockByCategory: [] },
      recentSales: this.recentSales(monthRows),
    };
  }

  async financialSummary(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);
    const { sales, purchases, expenses } = await this.collect(range.fromDate, range.toDate, branchId);

    const revenue = this.sum(sales, "totalAmount");
    const cogs = this.sum(purchases, "totalCost");
    const totalExpenses = this.sum(expenses, "amount");
    const grossProfit = revenue - cogs;
    const monthly = this.monthlyRows(range.fromCalendar, range.toCalendar, sales, purchases, expenses);

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        totalUnitsSold: sales.length,
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(grossProfit - totalExpenses),
        currentStockValue: 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        grossMarginPercent: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
        stockInvestment: 0,
      },
      expenseByCategory: this.expenseBreakdown(expenses),
      breakdown: {
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        expenses: Math.round(totalExpenses),
        netProfit: Math.round(grossProfit - totalExpenses),
      },
      charts: {
        revenueCogsExpenses: monthly,
        netProfitTrend: monthly.map((m) => ({ month: m.month, monthKey: m.monthKey, netProfit: m.netProfit })),
      },
    };
  }

  /* ---------------- data ---------------- */

  private async collect(from: Date, to: Date, branchId?: string) {
    const [sales, purchases, expenses] = await Promise.all([
      this.prisma.dailySale.findMany({
        where: { saleDate: { gte: from, lte: to }, ...(branchId ? { branchId } : undefined) },
        select: {
          id: true,
          saleDate: true,
          totalAmount: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          enteredBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { saleDate: "desc" },
      }),
      this.prisma.purchase.findMany({
        where: { purchaseDate: { gte: from, lte: to }, ...(branchId ? { branchId } : undefined) },
        select: { purchaseDate: true, totalCost: true },
      }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: from, lte: to }, ...(branchId ? { branchId } : undefined) },
        select: { expenseDate: true, amount: true, categoryId: true, category: { select: { name: true } } },
      }),
    ]);
    return {
      sales: sales as SaleRow[],
      purchases: purchases as PurchaseRow[],
      expenses: expenses as ExpenseRow[],
    };
  }

  private async salesInRange(
    fromCal: string,
    toCal: string,
    branchId?: string,
  ): Promise<SaleRow[]> {
    const rows = await this.prisma.dailySale.findMany({
      where: {
        saleDate: { gte: calendarDateToDbDate(fromCal), lte: calendarDateToDbDate(toCal) },
        ...(branchId ? { branchId } : undefined),
      },
      select: {
        id: true,
        saleDate: true,
        totalAmount: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { saleDate: "desc" },
    });
    return rows as SaleRow[];
  }

  private sum<T>(rows: T[], key: keyof T): number {
    return rows.reduce((acc, r) => acc + Number(r[key]), 0);
  }

  private monthlyRows(
    fromCal: string,
    toCal: string,
    sales: SaleRow[],
    purchases: PurchaseRow[],
    expenses: ExpenseRow[],
  ) {
    const keys = buildMonthSeries(fromCal, toCal);
    return keys.map((monthKey) => {
      const revenue = sales
        .filter((s) => ymd(s.saleDate).startsWith(monthKey))
        .reduce((a, s) => a + Number(s.totalAmount), 0);
      const cogs = purchases
        .filter((p) => ymd(p.purchaseDate).startsWith(monthKey))
        .reduce((a, p) => a + Number(p.totalCost), 0);
      const exp = expenses
        .filter((e) => ymd(e.expenseDate).startsWith(monthKey))
        .reduce((a, e) => a + Number(e.amount), 0);
      return {
        month: monthLabelFromKey(monthKey),
        monthKey,
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        expenses: Math.round(exp),
        netProfit: Math.round(revenue - cogs - exp),
      };
    });
  }

  private expenseBreakdown(expenses: ExpenseRow[]) {
    const map = new Map<number, { name: string; amount: number }>();
    for (const e of expenses) {
      const cur = map.get(e.categoryId) ?? { name: e.category.name, amount: 0 };
      cur.amount += Number(e.amount);
      map.set(e.categoryId, cur);
    }
    return [...map.entries()]
      .map(([categoryId, v]) => ({ categoryId: String(categoryId), categoryName: v.name, amount: Math.round(v.amount) }))
      .sort((a, b) => b.amount - a.amount);
  }

  private topStores(sales: SaleRow[]) {
    const map = new Map<string, { name: string; revenue: number }>();
    for (const s of sales) {
      const cur = map.get(s.branchId) ?? { name: s.branch.name, revenue: 0 };
      cur.revenue += Number(s.totalAmount);
      map.set(s.branchId, cur);
    }
    return [...map.entries()]
      .map(([storeId, v]) => ({ storeId, storeName: v.name, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private recentSales(sales: SaleRow[]) {
    return sales.slice(0, 8).map((s) => ({
      id: s.id,
      quantitySold: 1,
      totalAmount: Number(s.totalAmount),
      saleDate: ymd(s.saleDate),
      status: "active",
      product: { id: "daily-total", name: "Daily sales total", model: null, category: { id: 0, name: "Sales" } },
      store: { id: s.branch.id, name: s.branch.name },
      soldBy: s.enteredBy,
    }));
  }
}
