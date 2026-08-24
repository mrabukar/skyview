import { Injectable } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import {
  buildMonthSeries,
  calendarDateDaysAgo,
  calendarDateMonthsAgo,
  calendarDateToDbDate,
  eachCalendarDate,
  getAppTimezone,
  monthLabelFromKey,
  resolveReportDateRange,
  startOfMonthCalendarDate,
  todayCalendarDate,
  toReportDateRange,
} from "../../common/utils/app-timezone.util";
import { resolveBranchFilter, type BranchIdFilter } from "../../common/utils/branch-scope.util";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportQueryDto } from "./dto/report-query.dto";

// ─── Row types ─────────────────────────────────────────────────────────────────

type SaleRow = {
  id: string;
  saleDate: Date;
  totalAmount: Prisma.Decimal;
  branchId: string;
  branch: { id: string; name: string };
  enteredBy: { id: string; name: string; email: string };
};
type SaleSlimRow = { saleDate: Date; totalAmount: Prisma.Decimal; branchId: string; branch: { id: string; name: string } };
type PurchaseRow = { purchaseDate: Date; totalCost: Prisma.Decimal };
type ExpenseRow = {
  expenseDate: Date;
  amount: Prisma.Decimal;
  categoryId: number;
  category: { name: string };
};
type PosOrderRow = {
  id: string;
  branchId: string;
  cashierId: string;
  status: OrderStatus;
  totalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal | null;
  paymentMethod: string | null;
  createdAt: Date;
  branch: { id: string; name: string };
  cashier: { id: string; name: string };
};
type PosOrderSlimRow = {
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  branchId: string;
  branch: { id: string; name: string };
};

// ─── Shared helpers ─────────────────────────────────────────────────────────────

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

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public report methods ───────────────────────────────────────────────────

  async adminDashboard(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);

    // Previous period (same span length, immediately before)
    const spanDays = eachCalendarDate(range.fromCalendar, range.toCalendar).length - 1;
    const prevToCal = calendarDateDaysAgo(1, range.fromCalendar);
    const prevFromCal = calendarDateDaysAgo(1 + spanDays, range.fromCalendar);
    const prevRange = toReportDateRange(prevFromCal, prevToCal);

    // Current window needs dated rows for charts; previous window is SQL aggregates only.
    const [
      { sales, purchases, expenses },
      posOrders,
      prevSaleRevenue,
      prevPosRevenue,
      prevCogs,
      prevExpenses,
      prevSaleCount,
      prevSalaries,
      recentSales,
    ] = await Promise.all([
      this.collect(range.fromDate, range.toDate, branchId),
      this.collectPosOrders(range.fromTimestamp, range.toTimestamp, branchId),
      this.sumSalesInRange(prevFromCal, prevToCal, branchId),
      this.sumPosInRange(prevRange.fromTimestamp, prevRange.toTimestamp, branchId),
      this.sumPurchasesInRange(prevRange.fromDate, prevRange.toDate, branchId),
      this.sumExpensesInRange(prevRange.fromDate, prevRange.toDate, branchId),
      this.countSalesInRange(prevFromCal, prevToCal, branchId),
      this.sumSalariesInRange(prevRange.fromDate, prevRange.toDate, branchId),
      this.fetchRecentSales(range.fromDate, range.toDate, branchId),
    ]);

    const saleRevenue = this.sum(sales, "totalAmount");
    const posRevenue = this.sumPosArr(posOrders);
    const revenue = saleRevenue + posRevenue;

    const cogs = this.sum(purchases, "totalCost");
    const totalExpenses = this.sum(expenses, "amount");
    const salaries = expenses
      .filter((e) => e.category.name === "Salaries")
      .reduce((a, e) => a + Number(e.amount), 0);

    const prevRevenue = prevSaleRevenue + prevPosRevenue;

    const grossProfit = revenue - cogs;
    const netProfit = revenue - cogs - totalExpenses;
    const grossMarginPercent = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
    const netMarginPercent = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;
    const expenseRatio = revenue > 0 ? Math.round((totalExpenses / revenue) * 1000) / 10 : 0;
    const payrollRatio = revenue > 0 ? Math.round((salaries / revenue) * 1000) / 10 : 0;
    const periodDays = eachCalendarDate(range.fromCalendar, range.toCalendar).length;
    const dailyAvgRevenue = periodDays > 0 ? Math.round(revenue / periodDays) : 0;

    const monthly = this.monthlyRows(
      range.fromCalendar, range.toCalendar, sales, purchases, expenses, posOrders,
    );

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        saleRevenue: Math.round(saleRevenue),
        posRevenue: Math.round(posRevenue),
        posOrderCount: posOrders.length,
        totalUnitsSold: sales.length,
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        totalExpenses: Math.round(totalExpenses),
        salaries: Math.round(salaries),
        netProfit: Math.round(netProfit),
        grossMarginPercent,
        netMarginPercent,
        expenseRatio,
        payrollRatio,
        dailyAvgRevenue,
        currentStockValue: 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      comparison: {
        label: "vs previous period",
        previousPeriod: { from: prevFromCal, to: prevToCal },
        totalRevenue: delta(revenue, prevRevenue),
        grossProfit: delta(grossProfit, prevRevenue - prevCogs),
        netProfit: delta(netProfit, prevRevenue - prevCogs - prevExpenses),
        totalExpenses: delta(totalExpenses, prevExpenses),
        totalUnitsSold: delta(sales.length, prevSaleCount),
        cogs: delta(cogs, prevCogs),
        salaries: delta(salaries, prevSalaries),
      },
      charts: {
        revenueCogsExpenses: monthly,
        netProfitTrend: monthly.map((m) => ({ month: m.month, monthKey: m.monthKey, netProfit: m.netProfit })),
        grossMarginTrend: monthly.map((m) => ({
          month: m.month,
          monthKey: m.monthKey,
          percent: m.revenue > 0 ? Math.round(((m.revenue - m.cogs) / m.revenue) * 1000) / 10 : 0,
        })),
        profitMarginTrend: monthly.map((m) => ({
          month: m.month,
          monthKey: m.monthKey,
          percent: m.revenue > 0 ? Math.round(m.netProfit / m.revenue * 1000) / 10 : 0,
        })),
        revenueByBranch: this.topStores(sales, posOrders),
        expenseBreakdown: this.expenseBreakdown(expenses),
        stockByCategory: [],
        topProducts: [],
        topStores: this.topStores(sales, posOrders),
      },
      recentSales: this.recentSales(recentSales),
    };
  }

  /**
   * Total purchased per vendor, ranked high→low. Branch-scoped (manager → their
   * assigned branches; admin → all, or one branch via `branchId`). Includes
   * inactive vendors that still have historical purchases.
   */
  async vendorSpend(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);

    const grouped = await this.prisma.purchase.groupBy({
      by: ["vendorId"],
      where: {
        purchaseDate: { gte: range.fromDate, lte: range.toDate },
        ...(branchId ? { branchId } : undefined),
      },
      _sum: { totalCost: true },
      _count: true,
    });

    const vendorIds = grouped.map((g) => g.vendorId);
    const vendors = vendorIds.length
      ? await this.prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true, isActive: true },
        })
      : [];
    const byId = new Map(vendors.map((v) => [v.id, v]));

    const rows = grouped
      .map((g) => ({
        vendorId: g.vendorId,
        vendorName: byId.get(g.vendorId)?.name ?? "(unknown vendor)",
        isActive: byId.get(g.vendorId)?.isActive ?? false,
        totalAmount: Math.round(Number(g._sum.totalCost ?? 0)),
        purchaseCount: g._count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      totalAmount,
      vendorCount: rows.length,
      vendors: rows.map((r) => ({
        ...r,
        percent:
          totalAmount > 0
            ? Math.round((r.totalAmount / totalAmount) * 1000) / 10
            : 0,
      })),
    };
  }

  async managerDashboard(user: CurrentUserPayload, branchId?: string) {
    const branchFilter = resolveBranchFilter(user, branchId);
    const today = todayCalendarDate();
    const monthStart = startOfMonthCalendarDate(today);
    const yesterday = calendarDateDaysAgo(1, today);
    const prevMonthSameDay = calendarDateMonthsAgo(1, today);
    const prevMonthStart = startOfMonthCalendarDate(prevMonthSameDay);
    const trendStart = calendarDateDaysAgo(13, today);

    const monthRange = toReportDateRange(monthStart, today);
    const prevMonthRange = toReportDateRange(prevMonthStart, prevMonthSameDay);
    const yesterdayRange = toReportDateRange(yesterday, yesterday);
    const trendRange = toReportDateRange(trendStart, today);

    // Month collectors cover today; only fetch yesterday / prev-month as
    // slim revenue aggregates (not full enteredBy rows).
    const [
      month,
      monthPosOrders,
      yesterdaySaleAgg,
      yesterdayPosAgg,
      prevMonthSaleAgg,
      prevMonthPosAgg,
      trendSaleRows,
      trendPosOrders,
      recentSales,
    ] = await Promise.all([
      this.collect(monthRange.fromDate, monthRange.toDate, branchFilter),
      this.collectPosOrders(monthRange.fromTimestamp, monthRange.toTimestamp, branchFilter),
      this.sumSalesInRange(yesterday, yesterday, branchFilter),
      this.sumPosInRange(yesterdayRange.fromTimestamp, yesterdayRange.toTimestamp, branchFilter),
      this.sumSalesInRange(prevMonthStart, prevMonthSameDay, branchFilter),
      this.sumPosInRange(prevMonthRange.fromTimestamp, prevMonthRange.toTimestamp, branchFilter),
      this.salesSlimInRange(trendStart, today, branchFilter),
      this.collectPosOrdersSlim(trendRange.fromTimestamp, trendRange.toTimestamp, branchFilter),
      this.fetchRecentSales(monthRange.fromDate, monthRange.toDate, branchFilter),
    ]);

    const monthRows = month.sales;
    const todayRows = monthRows.filter((s) => ymd(s.saleDate) === today);
    const todayPosOrders = monthPosOrders.filter((o) => this.toAppTzDate(o.createdAt) === today);

    const monthRevenue = this.sum(monthRows, "totalAmount") + this.sumPosArr(monthPosOrders);
    const monthPurchases = this.sum(month.purchases, "totalCost");
    const monthExpenses = this.sum(month.expenses, "amount");
    const todayRevenue = this.sum(todayRows, "totalAmount") + this.sumPosArr(todayPosOrders);

    const yesterdayRevenue = yesterdaySaleAgg + yesterdayPosAgg;
    const prevMonthRevenue = prevMonthSaleAgg + prevMonthPosAgg;

    // 14-day trend — all in-memory (no extra queries)
    const salesTrend: Array<{ date: string; revenue: number }> = [];
    for (let d = 13; d >= 0; d--) {
      const date = calendarDateDaysAgo(d, today);
      const saleDayRevenue = trendSaleRows
        .filter((s) => ymd(s.saleDate) === date)
        .reduce((a, s) => a + Number(s.totalAmount), 0);
      const posDayRevenue = trendPosOrders
        .filter((o) => this.toAppTzDate(o.createdAt) === date)
        .reduce((a, o) => a + Number(o.totalAmount), 0);
      salesTrend.push({ date, revenue: Math.round(saleDayRevenue + posDayRevenue) });
    }

    return {
      storeId:
        typeof branchFilter === "string"
          ? branchFilter
          : (user.branchId ?? null),
      summary: {
        todayRevenue: Math.round(todayRevenue),
        todayUnitsSold: todayRows.length,
        monthRevenue: Math.round(monthRevenue),
        monthSaleRevenue: Math.round(this.sum(monthRows, "totalAmount")),
        monthPosRevenue: Math.round(this.sumPosArr(monthPosOrders)),
        monthPurchases: Math.round(monthPurchases),
        monthExpenses: Math.round(monthExpenses),
        netProfit: Math.round(monthRevenue - monthPurchases - monthExpenses),
        grossMarginPercent: monthRevenue > 0 ? Math.round(((monthRevenue - monthPurchases) / monthRevenue) * 1000) / 10 : 0,
        expenseRatio: monthRevenue > 0 ? Math.round((monthExpenses / monthRevenue) * 1000) / 10 : 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      comparison: {
        label: "vs previous period",
        todayRevenue: delta(todayRevenue, yesterdayRevenue),
        monthRevenue: delta(monthRevenue, prevMonthRevenue),
      },
      charts: {
        salesTrend,
        expenseBreakdown: this.expenseBreakdown(month.expenses),
        stockByCategory: [],
      },
      recentSales: this.recentSales(recentSales),
    };
  }

  async financialSummary(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);
    const [{ sales, purchases, expenses }, posOrders] = await Promise.all([
      this.collect(range.fromDate, range.toDate, branchId),
      this.collectPosOrders(range.fromTimestamp, range.toTimestamp, branchId),
    ]);

    const saleRevenue = this.sum(sales, "totalAmount");
    const posRevenue = this.sumPosArr(posOrders);
    const revenue = saleRevenue + posRevenue;
    const cogs = this.sum(purchases, "totalCost");
    const totalExpenses = this.sum(expenses, "amount");
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    const salaries = expenses
      .filter((e) => e.category.name === "Salaries")
      .reduce((a, e) => a + Number(e.amount), 0);
    const periodDays = eachCalendarDate(range.fromCalendar, range.toCalendar).length;
    const monthly = this.monthlyRows(
      range.fromCalendar, range.toCalendar, sales, purchases, expenses, posOrders,
    );

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        saleRevenue: Math.round(saleRevenue),
        posRevenue: Math.round(posRevenue),
        totalUnitsSold: sales.length,
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        totalExpenses: Math.round(totalExpenses),
        salaries: Math.round(salaries),
        netProfit: Math.round(netProfit),
        grossMarginPercent: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
        netMarginPercent: revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0,
        expenseRatio: revenue > 0 ? Math.round((totalExpenses / revenue) * 1000) / 10 : 0,
        payrollRatio: revenue > 0 ? Math.round((salaries / revenue) * 1000) / 10 : 0,
        dailyAvgRevenue: periodDays > 0 ? Math.round(revenue / periodDays) : 0,
        currentStockValue: 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        stockInvestment: 0,
      },
      expenseByCategory: this.expenseBreakdown(expenses),
      breakdown: {
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        expenses: Math.round(totalExpenses),
        salaries: Math.round(salaries),
        netProfit: Math.round(netProfit),
      },
      charts: {
        revenueCogsExpenses: monthly,
        netProfitTrend: monthly.map((m) => ({ month: m.month, monthKey: m.monthKey, netProfit: m.netProfit })),
        grossMarginTrend: monthly.map((m) => ({
          month: m.month,
          monthKey: m.monthKey,
          percent: m.revenue > 0 ? Math.round(((m.revenue - m.cogs) / m.revenue) * 1000) / 10 : 0,
        })),
        profitMarginTrend: monthly.map((m) => ({
          month: m.month,
          monthKey: m.monthKey,
          percent: m.revenue > 0 ? Math.round(m.netProfit / m.revenue * 1000) / 10 : 0,
        })),
        revenueByBranch: this.topStores(sales, posOrders),
        expenseBreakdown: this.expenseBreakdown(expenses),
      },
    };
  }

  /**
   * POS revenue summary: totals, by-branch breakdown, payment-method mix,
   * and daily trend. Scoped to posEnabled branches only.
   */
  async posSummary(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);
    const orders = await this.collectPosOrders(range.fromTimestamp, range.toTimestamp, branchId);

    const totalRevenue = this.sumPosArr(orders);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0;
    const totalDiscount = orders.reduce((a, o) => a + Number(o.discountAmount ?? 0), 0);

    // By branch
    const branchMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
    for (const o of orders) {
      const cur = branchMap.get(o.branchId) ?? { name: o.branch.name, revenue: 0, orderCount: 0 };
      cur.revenue += Number(o.totalAmount);
      cur.orderCount++;
      branchMap.set(o.branchId, cur);
    }
    const byBranch = [...branchMap.entries()]
      .map(([bid, v]) => ({
        branchId: bid,
        branchName: v.name,
        revenue: Math.round(v.revenue),
        orderCount: v.orderCount,
        avgOrderValue: v.orderCount > 0 ? Math.round((v.revenue / v.orderCount) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // By payment method
    const methodMap = new Map<string, { revenue: number; orderCount: number }>();
    for (const o of orders) {
      const method = o.paymentMethod ?? "unknown";
      const cur = methodMap.get(method) ?? { revenue: 0, orderCount: 0 };
      cur.revenue += Number(o.totalAmount);
      cur.orderCount++;
      methodMap.set(method, cur);
    }
    const byPaymentMethod = [...methodMap.entries()]
      .map(([method, v]) => ({ method, revenue: Math.round(v.revenue), orderCount: v.orderCount }))
      .sort((a, b) => b.revenue - a.revenue);

    // Daily trend
    const dayMap = new Map<string, { revenue: number; orderCount: number }>();
    for (const o of orders) {
      const date = this.toAppTzDate(o.createdAt);
      const cur = dayMap.get(date) ?? { revenue: 0, orderCount: 0 };
      cur.revenue += Number(o.totalAmount);
      cur.orderCount++;
      dayMap.set(date, cur);
    }
    const dailyTrend = [...dayMap.entries()]
      .map(([date, v]) => ({ date, revenue: Math.round(v.revenue), orderCount: v.orderCount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(totalRevenue),
        orderCount,
        avgOrderValue,
        totalDiscount: Math.round(totalDiscount),
      },
      byBranch,
      byPaymentMethod,
      dailyTrend,
    };
  }

  /**
   * Per-item sales breakdown: quantity sold and revenue for each menu item
   * that appeared in paid POS orders during the period.
   */
  async posItemSales(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);

    const lines = await this.prisma.orderLine.findMany({
      where: {
        order: {
          status: OrderStatus.paid,
          createdAt: { gte: range.fromTimestamp, lte: range.toTimestamp },
          branch: { posEnabled: true },
          ...(branchId ? { branchId } : undefined),
        },
      },
      select: {
        menuItemId: true,
        itemName: true,
        sizeName: true,
        quantity: true,
        lineTotal: true,
      },
    });

    const itemMap = new Map<
      string,
      { itemName: string; quantitySold: number; revenue: number }
    >();
    for (const l of lines) {
      const cur = itemMap.get(l.menuItemId) ?? {
        itemName: l.itemName,
        quantitySold: 0,
        revenue: 0,
      };
      cur.quantitySold += l.quantity;
      cur.revenue += Number(l.lineTotal);
      itemMap.set(l.menuItemId, cur);
    }

    const totalRevenue = [...itemMap.values()].reduce((a, v) => a + v.revenue, 0);

    const items = [...itemMap.entries()]
      .map(([menuItemId, v]) => ({
        menuItemId,
        itemName: v.itemName,
        quantitySold: v.quantitySold,
        revenue: Math.round(v.revenue),
        percentOfTotal:
          totalRevenue > 0 ? Math.round((v.revenue / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      totalRevenue: Math.round(totalRevenue),
      itemCount: items.length,
      items,
    };
  }

  /**
   * Per-cashier performance: order count, revenue, avg order value,
   * discount given, and void count for the period.
   */
  async posCashierPerformance(query: ReportQueryDto, user: CurrentUserPayload) {
    const branchId = resolveBranchFilter(user, query.branchId);
    const range = resolveReportDateRange(query.fromDate, query.toDate);

    const orders = await this.prisma.posOrder.findMany({
      where: {
        status: { in: [OrderStatus.paid, OrderStatus.voided] },
        createdAt: { gte: range.fromTimestamp, lte: range.toTimestamp },
        branch: { posEnabled: true },
        ...(branchId ? { branchId } : undefined),
      },
      select: {
        cashierId: true,
        status: true,
        totalAmount: true,
        discountAmount: true,
        cashier: { select: { id: true, name: true } },
      },
    });

    const cashierMap = new Map<
      string,
      { name: string; orderCount: number; revenue: number; totalDiscountGiven: number; voidedCount: number }
    >();

    for (const o of orders) {
      const cur = cashierMap.get(o.cashierId) ?? {
        name: o.cashier.name,
        orderCount: 0,
        revenue: 0,
        totalDiscountGiven: 0,
        voidedCount: 0,
      };
      if (o.status === OrderStatus.paid) {
        cur.orderCount++;
        cur.revenue += Number(o.totalAmount);
        cur.totalDiscountGiven += Number(o.discountAmount ?? 0);
      } else if (o.status === OrderStatus.voided) {
        cur.voidedCount++;
      }
      cashierMap.set(o.cashierId, cur);
    }

    const cashiers = [...cashierMap.entries()]
      .map(([cashierId, v]) => ({
        cashierId,
        cashierName: v.name,
        orderCount: v.orderCount,
        revenue: Math.round(v.revenue),
        avgOrderValue:
          v.orderCount > 0 ? Math.round((v.revenue / v.orderCount) * 100) / 100 : 0,
        totalDiscountGiven: Math.round(v.totalDiscountGiven),
        voidedCount: v.voidedCount,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period: { from: range.fromCalendar, to: range.toCalendar, timezone: "Africa/Nairobi" },
      cashierCount: cashiers.length,
      cashiers,
    };
  }

  // ── Data collection ─────────────────────────────────────────────────────────

  /**
   * Fetch DailySale + Purchase + Expense rows for a date range.
   * DailySale is filtered to posEnabled=false branches only — POS-enabled
   * branches use PosOrder as their revenue source (BR-POS-8.5).
   * Omits enteredBy (use fetchRecentSales for the dashboard strip).
   */
  private async collect(from: Date, to: Date, branchId?: BranchIdFilter) {
    const [sales, purchases, expenses] = await Promise.all([
      this.prisma.dailySale.findMany({
        where: {
          saleDate: { gte: from, lte: to },
          branch: { posEnabled: false },
          ...(branchId ? { branchId } : undefined),
        },
        select: {
          id: true,
          saleDate: true,
          totalAmount: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
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
      sales: sales as SaleSlimRow[],
      purchases: purchases as PurchaseRow[],
      expenses: expenses as ExpenseRow[],
    };
  }

  /** Latest DailySale rows with enteredBy for the dashboard recent-sales strip. */
  private async fetchRecentSales(
    from: Date,
    to: Date,
    branchId?: BranchIdFilter,
  ): Promise<SaleRow[]> {
    const rows = await this.prisma.dailySale.findMany({
      where: {
        saleDate: { gte: from, lte: to },
        branch: { posEnabled: false },
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
      take: 8,
    });
    return rows as SaleRow[];
  }

  /** Slim DailySale rows for trend charts (no enteredBy). */
  private async salesSlimInRange(
    fromCal: string,
    toCal: string,
    branchId?: BranchIdFilter,
  ): Promise<SaleSlimRow[]> {
    const rows = await this.prisma.dailySale.findMany({
      where: {
        saleDate: {
          gte: calendarDateToDbDate(fromCal),
          lte: calendarDateToDbDate(toCal),
        },
        branch: { posEnabled: false },
        ...(branchId ? { branchId } : undefined),
      },
      select: {
        saleDate: true,
        totalAmount: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
      },
    });
    return rows as SaleSlimRow[];
  }

  private async sumSalesInRange(
    fromCal: string,
    toCal: string,
    branchId?: BranchIdFilter,
  ): Promise<number> {
    const agg = await this.prisma.dailySale.aggregate({
      where: {
        saleDate: {
          gte: calendarDateToDbDate(fromCal),
          lte: calendarDateToDbDate(toCal),
        },
        branch: { posEnabled: false },
        ...(branchId ? { branchId } : undefined),
      },
      _sum: { totalAmount: true },
    });
    return Number(agg._sum.totalAmount ?? 0);
  }

  private async countSalesInRange(
    fromCal: string,
    toCal: string,
    branchId?: BranchIdFilter,
  ): Promise<number> {
    return this.prisma.dailySale.count({
      where: {
        saleDate: {
          gte: calendarDateToDbDate(fromCal),
          lte: calendarDateToDbDate(toCal),
        },
        branch: { posEnabled: false },
        ...(branchId ? { branchId } : undefined),
      },
    });
  }

  private async sumPurchasesInRange(
    from: Date,
    to: Date,
    branchId?: BranchIdFilter,
  ): Promise<number> {
    const agg = await this.prisma.purchase.aggregate({
      where: { purchaseDate: { gte: from, lte: to }, ...(branchId ? { branchId } : undefined) },
      _sum: { totalCost: true },
    });
    return Number(agg._sum.totalCost ?? 0);
  }

  private async sumExpensesInRange(
    from: Date,
    to: Date,
    branchId?: BranchIdFilter,
  ): Promise<number> {
    const agg = await this.prisma.expense.aggregate({
      where: { expenseDate: { gte: from, lte: to }, ...(branchId ? { branchId } : undefined) },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  private async sumSalariesInRange(
    from: Date,
    to: Date,
    branchId?: BranchIdFilter,
  ): Promise<number> {
    const agg = await this.prisma.expense.aggregate({
      where: {
        expenseDate: { gte: from, lte: to },
        category: { name: "Salaries" },
        ...(branchId ? { branchId } : undefined),
      },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  private async sumPosInRange(
    fromTs: Date,
    toTs: Date,
    branchId?: BranchIdFilter,
  ): Promise<number> {
    const agg = await this.prisma.posOrder.aggregate({
      where: {
        status: OrderStatus.paid,
        createdAt: { gte: fromTs, lte: toTs },
        branch: { posEnabled: true },
        ...(branchId ? { branchId } : undefined),
      },
      _sum: { totalAmount: true },
    });
    return Number(agg._sum.totalAmount ?? 0);
  }

  /**
   * Paid PosOrder rows for posEnabled branches in a timestamp range.
   * Used for revenue aggregation in all dashboards.
   */
  private async collectPosOrders(
    fromTs: Date,
    toTs: Date,
    branchId?: BranchIdFilter,
  ): Promise<PosOrderRow[]> {
    const rows = await this.prisma.posOrder.findMany({
      where: {
        status: OrderStatus.paid,
        createdAt: { gte: fromTs, lte: toTs },
        branch: { posEnabled: true },
        ...(branchId ? { branchId } : undefined),
      },
      select: {
        id: true,
        branchId: true,
        cashierId: true,
        status: true,
        totalAmount: true,
        discountAmount: true,
        paymentMethod: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
        cashier: { select: { id: true, name: true } },
      },
    });
    return rows as PosOrderRow[];
  }

  /** Slim POS rows for trend / revenue-by-day (no cashier join). */
  private async collectPosOrdersSlim(
    fromTs: Date,
    toTs: Date,
    branchId?: BranchIdFilter,
  ): Promise<PosOrderSlimRow[]> {
    const rows = await this.prisma.posOrder.findMany({
      where: {
        status: OrderStatus.paid,
        createdAt: { gte: fromTs, lte: toTs },
        branch: { posEnabled: true },
        ...(branchId ? { branchId } : undefined),
      },
      select: {
        totalAmount: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
      },
    });
    return rows as PosOrderSlimRow[];
  }

  // ── Aggregation helpers ─────────────────────────────────────────────────────

  /** Convert a UTC timestamp to the app timezone's calendar date (YYYY-MM-DD). */
  private toAppTzDate(utc: Date): string {
    return DateTime.fromJSDate(utc).setZone(getAppTimezone()).toISODate()!;
  }

  /** Sum totalAmount from POS order rows. */
  private sumPosArr(orders: Array<{ totalAmount: Prisma.Decimal }>): number {
    return orders.reduce((a, o) => a + Number(o.totalAmount), 0);
  }

  private sum<T>(rows: T[], key: keyof T): number {
    return rows.reduce((acc, r) => acc + Number(r[key]), 0);
  }

  private monthlyRows(
    fromCal: string,
    toCal: string,
    sales: Array<{ saleDate: Date; totalAmount: Prisma.Decimal }>,
    purchases: PurchaseRow[],
    expenses: ExpenseRow[],
    posOrders: Array<{ createdAt: Date; totalAmount: Prisma.Decimal }> = [],
  ) {
    const keys = buildMonthSeries(fromCal, toCal);
    return keys.map((monthKey) => {
      const saleRevenue = sales
        .filter((s) => ymd(s.saleDate).startsWith(monthKey))
        .reduce((a, s) => a + Number(s.totalAmount), 0);
      const posMonthRevenue = posOrders
        .filter((o) => this.toAppTzDate(o.createdAt).startsWith(monthKey))
        .reduce((a, o) => a + Number(o.totalAmount), 0);
      const revenue = saleRevenue + posMonthRevenue;
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
      .map(([categoryId, v]) => ({
        categoryId: String(categoryId),
        categoryName: v.name,
        amount: Math.round(v.amount),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private topStores(
    sales: Array<{ branchId: string; branch: { name: string }; totalAmount: Prisma.Decimal }>,
    posOrders: Array<{ branchId: string; branch: { name: string }; totalAmount: Prisma.Decimal }> = [],
  ) {
    const map = new Map<string, { name: string; revenue: number }>();
    for (const s of sales) {
      const cur = map.get(s.branchId) ?? { name: s.branch.name, revenue: 0 };
      cur.revenue += Number(s.totalAmount);
      map.set(s.branchId, cur);
    }
    for (const o of posOrders) {
      const cur = map.get(o.branchId) ?? { name: o.branch.name, revenue: 0 };
      cur.revenue += Number(o.totalAmount);
      map.set(o.branchId, cur);
    }
    return [...map.entries()]
      .map(([storeId, v]) => ({ storeId, storeName: v.name, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private recentSales(sales: SaleRow[]) {
    return sales.map((s) => ({
      id: s.id,
      quantitySold: 1,
      totalAmount: Number(s.totalAmount),
      saleDate: ymd(s.saleDate),
      status: "active",
      product: {
        id: "daily-total",
        name: "Daily sales total",
        model: null,
        category: { id: 0, name: "Sales" },
      },
      store: { id: s.branch.id, name: s.branch.name },
      soldBy: s.enteredBy,
    }));
  }
}
