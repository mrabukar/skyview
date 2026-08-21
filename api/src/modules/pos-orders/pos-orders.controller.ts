import {
  Body,
  Controller,
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
import { ShiftGuarded } from "../../common/decorators/shift-guarded.decorator";
import { Page } from "../../common/page-access/page.decorator";
import { CreatePosOrderDto } from "./dto/create-pos-order.dto";
import { PayOrderDto } from "./dto/pay-order.dto";
import { PosOrderQueryDto } from "./dto/pos-order-query.dto";
import { VoidOrderDto } from "./dto/void-order.dto";
import { PosOrdersService } from "./pos-orders.service";

@Page("pos")
@Roles(UserRole.admin, UserRole.branch_manager, UserRole.cashier)
@Controller("pos/orders")
export class PosOrdersController {
  constructor(private readonly posOrdersService: PosOrdersService) {}

  /**
   * POST /pos/orders
   * Create a new POS order. Cashier-only; shift must be active.
   */
  @Roles(UserRole.cashier)
  @ShiftGuarded()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @Body() dto: CreatePosOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.posOrdersService.createOrder(dto, user);
  }

  /**
   * GET /pos/orders
   * List orders. Role-scoped: cashiers see own branch + today only.
   */
  @Get()
  findAll(
    @Query() query: PosOrderQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.posOrdersService.findAll(query, user);
  }

  /**
   * GET /pos/orders/:id
   * Full order detail with lines and toppings.
   */
  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.posOrdersService.findOne(id, user);
  }

  /**
   * PATCH /pos/orders/:id/pay
   * Mark a pending order as paid. Cashier-only (own order); shift must be active.
   */
  @Roles(UserRole.cashier)
  @ShiftGuarded()
  @Patch(":id/pay")
  payOrder(
    @Param("id") id: string,
    @Body() dto: PayOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.posOrdersService.payOrder(id, dto, user);
  }

  /**
   * PATCH /pos/orders/:id/cancel
   * Cancel a pending order. Cashiers may cancel their own; admin/manager may
   * cancel any pending order in scope. No shift guard — cashiers must be able
   * to cancel stale pending orders even if off shift.
   */
  @Roles(UserRole.cashier, UserRole.admin, UserRole.branch_manager)
  @Patch(":id/cancel")
  cancelOrder(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.posOrdersService.cancelOrder(id, user);
  }

  /**
   * PATCH /pos/orders/:id/void
   * Void a paid order. Admin/manager only; reason required (BR-POS-6.13).
   */
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Patch(":id/void")
  voidOrder(
    @Param("id") id: string,
    @Body() dto: VoidOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.posOrdersService.voidOrder(id, dto, user);
  }
}
