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
import { CreateBranchDto } from "./dto/create-branch.dto";
import { BranchQueryDto } from "./dto/branch-query.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { BranchesService } from "./branches.service";

@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // Read: admin manages; managers may read branch names (filters, labels).
  @Get()
  findAll(@Query() query: BranchQueryDto) {
    return this.branchesService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.branchesService.findOne(id);
  }

  @Roles(UserRole.admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: CurrentUserPayload) {
    return this.branchesService.create(dto, user);
  }

  @Roles(UserRole.admin)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.branchesService.update(id, dto, user);
  }

  @Roles(UserRole.admin)
  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.branchesService.deactivate(id, user);
  }

  @Roles(UserRole.admin)
  @Patch(":id/reactivate")
  reactivate(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.branchesService.reactivate(id, user);
  }
}
