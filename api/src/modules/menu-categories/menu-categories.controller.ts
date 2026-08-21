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
import { CreateMenuCategoryDto } from "./dto/create-menu-category.dto";
import { MenuCategoryQueryDto } from "./dto/menu-category-query.dto";
import { UpdateMenuCategoryDto } from "./dto/update-menu-category.dto";
import { MenuCategoriesService } from "./menu-categories.service";

@Page("menu")
@Roles(UserRole.admin, UserRole.branch_manager, UserRole.cashier)
@Controller("menu-categories")
export class MenuCategoriesController {
  constructor(
    private readonly menuCategoriesService: MenuCategoriesService,
  ) {}

  @Get()
  findAll(
    @Query() query: MenuCategoryQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuCategoriesService.findAll(query, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.menuCategoriesService.findOne(id);
  }

  // BR-POS-2.1 / BR-POS-2.2: admin and managers can create categories.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateMenuCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuCategoriesService.create(dto, user);
  }

  // BR-POS-2.3: managers can only edit categories they created.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMenuCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuCategoriesService.update(id, dto, user);
  }

  // Hard-delete is admin-only; managers use PATCH { isActive: false } to deactivate.
  @Roles(UserRole.admin)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.menuCategoriesService.remove(id, user);
  }
}
