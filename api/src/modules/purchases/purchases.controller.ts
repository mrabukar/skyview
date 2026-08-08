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
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { PurchaseQueryDto } from "./dto/purchase-query.dto";
import { UpdatePurchaseDto } from "./dto/update-purchase.dto";
import { PurchasesService } from "./purchases.service";

@Page("purchases")
@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(
    @Query() query: PurchaseQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchasesService.findAll(query, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.purchasesService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePurchaseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchasesService.create(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchasesService.update(id, dto, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.purchasesService.remove(id, user);
  }
}
