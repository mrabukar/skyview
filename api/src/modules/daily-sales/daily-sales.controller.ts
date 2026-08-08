import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Page } from "../../common/page-access/page.decorator";
import { CreateDailySaleDto } from "./dto/create-daily-sale.dto";
import { DailySaleQueryDto } from "./dto/daily-sale-query.dto";
import { UpdateDailySaleDto } from "./dto/update-daily-sale.dto";
import { DailySalesService } from "./daily-sales.service";

@Page("sales")
@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("daily-sales")
export class DailySalesController {
  constructor(private readonly dailySalesService: DailySalesService) {}

  @Get()
  findAll(
    @Query() query: DailySaleQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailySalesService.findAll(query, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.dailySalesService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateDailySaleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailySalesService.create(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDailySaleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailySalesService.update(id, dto, user);
  }

  // BR-2.6 — delete is admin-only (method-level role overrides the class list).
  @Roles(UserRole.admin)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.dailySalesService.remove(id, user);
  }
}
