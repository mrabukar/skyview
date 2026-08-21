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
import { CreateToppingDto } from "./dto/create-topping.dto";
import { ToppingQueryDto } from "./dto/topping-query.dto";
import { UpdateToppingDto } from "./dto/update-topping.dto";
import { ToppingsService } from "./toppings.service";

@Page("menu")
@Roles(UserRole.admin, UserRole.branch_manager, UserRole.cashier)
@Controller("toppings")
export class ToppingsController {
  constructor(private readonly toppingsService: ToppingsService) {}

  @Get()
  findAll(
    @Query() query: ToppingQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.toppingsService.findAll(query, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.toppingsService.findOne(id);
  }

  // BR-POS-4.1 / BR-POS-4.2: admin and managers can create toppings.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateToppingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.toppingsService.create(dto, user);
  }

  // BR-POS-4.4: managers can only edit toppings they created.
  @Roles(UserRole.admin, UserRole.branch_manager)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateToppingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.toppingsService.update(id, dto, user);
  }

  // Hard-delete (or smart deactivate) is admin-only; managers use PATCH { isActive: false }.
  @Roles(UserRole.admin)
  @Delete(":id")
  remove(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.toppingsService.remove(id, user);
  }
}
