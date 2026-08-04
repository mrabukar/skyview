import { Controller, Get, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
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

  @Get("manager-dashboard")
  managerDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.managerDashboard(user);
  }

  @Roles(UserRole.admin)
  @Get("financial-summary")
  financialSummary(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.financialSummary(query, user);
  }
}
