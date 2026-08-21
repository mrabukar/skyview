import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Page } from "../../common/page-access/page.decorator";
import { BulkEnableBranchMenuItemsDto } from "./dto/bulk-enable-branch-menu-items.dto";
import { UpdateBranchMenuItemDto } from "./dto/update-branch-menu-item.dto";
import { UpdateBranchToppingDto } from "./dto/update-branch-topping.dto";
import { BranchMenuService } from "./branch-menu.service";

/**
 * Branch-level menu configuration.
 * All routes are nested under /branches/:branchId.
 * Branch-access enforcement is handled inside the service via assertBranchAccess().
 */
@Page("menu")
@Roles(UserRole.admin, UserRole.branch_manager, UserRole.cashier)
@Controller("branches/:branchId")
export class BranchMenuController {
  constructor(private readonly branchMenuService: BranchMenuService) {}

  /**
   * GET /branches/:branchId/menu
   * Full catalogue for this branch with availability, stock status, and
   * effective prices. Cashiers receive enabled items/toppings, including out of stock.
   */
  @Get("menu")
  getBranchMenu(
    @Param("branchId") branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.branchMenuService.getBranchMenu(branchId, user);
  }

  /**
   * PATCH /branches/:branchId/menu-items/:menuItemId
   * Set isEnabled, isInStock, and/or per-size price overrides for one item.
   * Cashiers may only set isInStock; isEnabled and prices require admin/manager.
   */
  @Patch("menu-items/:menuItemId")
  updateBranchMenuItem(
    @Param("branchId") branchId: string,
    @Param("menuItemId") menuItemId: string,
    @Body() dto: UpdateBranchMenuItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.branchMenuService.updateBranchMenuItem(
      branchId,
      menuItemId,
      dto,
      user,
    );
  }

  /**
   * POST /branches/:branchId/menu-items/bulk
   * Bulk-enable multiple items at a branch. Idempotent — skips existing rows.
   * Admin-only: typically used during initial branch setup.
   */
  @Roles(UserRole.admin)
  @Post("menu-items/bulk")
  @HttpCode(HttpStatus.OK)
  bulkEnableMenuItems(
    @Param("branchId") branchId: string,
    @Body() dto: BulkEnableBranchMenuItemsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.branchMenuService.bulkEnable(branchId, dto, user);
  }

  /**
   * PATCH /branches/:branchId/toppings/:toppingId
   * Toggle whether a topping is in stock at this branch.
   * No BranchTopping row = topping is in stock (default on).
   */
  @Patch("toppings/:toppingId")
  updateBranchTopping(
    @Param("branchId") branchId: string,
    @Param("toppingId") toppingId: string,
    @Body() dto: UpdateBranchToppingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.branchMenuService.updateBranchTopping(
      branchId,
      toppingId,
      dto,
      user,
    );
  }
}
