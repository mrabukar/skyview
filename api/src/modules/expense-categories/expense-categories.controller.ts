import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";
import { ExpenseCategoriesService } from "./expense-categories.service";

@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("expense-categories")
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  // Managers read categories to pick one when recording an expense.
  @Get()
  findAll() {
    return this.expenseCategoriesService.findAll();
  }

  @Roles(UserRole.admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateExpenseCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenseCategoriesService.create(dto, user);
  }

  @Roles(UserRole.admin)
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenseCategoriesService.update(id, dto, user);
  }

  @Roles(UserRole.admin)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenseCategoriesService.remove(id, user);
  }
}
