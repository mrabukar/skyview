import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PayrollQueryDto } from "./dto/payroll-query.dto";
import { PayrollService } from "./payroll.service";

// BR-6.7 — payroll is admin-only.
@Roles(UserRole.admin)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  getStatus(
    @Query() query: PayrollQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.payrollService.getStatus(user, query.month);
  }

  // Pay all staff not yet paid for the selected month (default: current).
  @Post()
  @HttpCode(HttpStatus.CREATED)
  runAll(
    @Query() query: PayrollQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.payrollService.runAll(user, query.month);
  }

  // Pay a single staff member for the selected month (default: current).
  @Post("pay-user/:userId")
  @HttpCode(HttpStatus.CREATED)
  payUser(
    @Param("userId") userId: string,
    @Query() query: PayrollQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.payrollService.payUser(userId, user, query.month);
  }
}
