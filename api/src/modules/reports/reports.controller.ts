import { Controller, Get, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Page } from "../../common/page-access/page.decorator";
import { ReportQueryDto } from "./dto/report-query.dto";
import { ReportsService } from "./reports.service";

@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.admin)
  @Get("admin-dashboard")
  adminDashboard(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.adminDashboard(query, user);
  }

  @Page("dashboard")
  @Get("manager-dashboard")
  managerDashboard(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.managerDashboard(user, query.branchId);
  }

  @Roles(UserRole.admin)
  @Get("financial-summary")
  financialSummary(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.financialSummary(query, user);
  }

  /** Total purchased per vendor (admin org-wide / manager branch-scoped). */
  @Get("vendor-spend")
  vendorSpend(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.vendorSpend(query, user);
  }

  /**
   * GET /reports/pos-summary
   * Aggregate POS revenue: totals, by-branch breakdown, payment-method mix,
   * and daily trend. Scoped to posEnabled branches only.
   */
  @Get("pos-summary")
  posSummary(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.posSummary(query, user);
  }

  /**
   * GET /reports/pos-items
   * Per-menu-item sales: quantity sold, revenue, and % of total.
   * Scoped to posEnabled branches only.
   */
  @Get("pos-items")
  posItemSales(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.posItemSales(query, user);
  }

  /**
   * GET /reports/pos-cashier-performance
   * Per-cashier summary: orders, revenue, avg order value, discounts given,
   * void count. Scoped to posEnabled branches only.
   */
  @Get("pos-cashier-performance")
  posCashierPerformance(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.posCashierPerformance(query, user);
  }
}
