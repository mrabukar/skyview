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
import { CreateMenuItemDto, CreateMenuItemSizeDto } from "./dto/create-menu-item.dto";
import { ConfirmMenuItemImageDto } from "./dto/confirm-menu-item-image.dto";
import { MenuItemQueryDto } from "./dto/menu-item-query.dto";
import { MenuItemUploadUrlDto } from "./dto/menu-item-upload-url.dto";
import { UpdateMenuItemDto, UpdateMenuItemSizeDto } from "./dto/update-menu-item.dto";
import { MenuItemsService } from "./menu-items.service";

@Page("menu")
@Roles(UserRole.admin, UserRole.branch_manager, UserRole.cashier)
@Controller("menu-items")
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get()
  findAll(
    @Query() query: MenuItemQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.findAll(query, user);
  }

  // Static image routes MUST be declared before `:id`, otherwise Nest/Express
  // treats `confirm-image` as an item id and returns 404 Cannot POST.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Post("upload-url")
  @HttpCode(HttpStatus.OK)
  createUploadUrl(
    @Body() dto: MenuItemUploadUrlDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.createUploadUrl(dto, user);
  }

  @Roles(UserRole.admin, UserRole.branch_manager)
  @Post("confirm-image")
  @HttpCode(HttpStatus.OK)
  confirmImage(
    @Body() dto: ConfirmMenuItemImageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.confirmImage(dto, user);
  }

  @Get("image-url/{*key}")
  getImageUrl(@Param("key") key: string) {
    return this.menuItemsService.getImageUrl(key);
  }

  // BR-POS-3.1 / BR-POS-3.2: admin and managers can create items.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.create(dto, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.menuItemsService.findOne(id);
  }

  // BR-POS-3.5: managers can only update items they created.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.update(id, dto, user);
  }

  // Hard-delete is admin-only; managers use PATCH { isActive: false }.
  @Roles(UserRole.admin)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.remove(id, user);
  }

  @Roles(UserRole.admin, UserRole.branch_manager)
  @Post(":id/sizes")
  @HttpCode(HttpStatus.CREATED)
  addSize(
    @Param("id") id: string,
    @Body() dto: CreateMenuItemSizeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.addSize(id, dto, user);
  }

  @Roles(UserRole.admin, UserRole.branch_manager)
  @Patch(":id/sizes/:sizeId")
  updateSize(
    @Param("id") _itemId: string,
    @Param("sizeId") sizeId: string,
    @Body() dto: UpdateMenuItemSizeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.updateSize(sizeId, dto, user);
  }

  @Roles(UserRole.admin)
  @Delete(":id/sizes/:sizeId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSize(
    @Param("id") _itemId: string,
    @Param("sizeId") sizeId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuItemsService.removeSize(sizeId, user);
  }
}
