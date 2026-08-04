import { Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PayrollService } from "./payroll.service";

// BR-6.7 — payroll is admin-only.
@Roles(UserRole.admin)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  getStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.payrollService.getStatus(user);
  }

  // Pay all staff not yet paid this month.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  runAll(@CurrentUser() user: CurrentUserPayload) {
    return this.payrollService.runAll(user);
  }

  // Pay a single staff member for the current month.
  @Post("pay-user/:userId")
  @HttpCode(HttpStatus.CREATED)
  payUser(
    @Param("userId") userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.payrollService.payUser(userId, user);
  }
}
