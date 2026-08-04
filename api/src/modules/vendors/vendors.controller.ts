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
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { VendorQueryDto } from "./dto/vendor-query.dto";
import { VendorsService } from "./vendors.service";

@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // Read: managers pick vendors when recording purchases; only admins may
  // include inactive vendors.
  @Get()
  findAll(
    @Query() query: VendorQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vendorsService.findAll(query, user.role === UserRole.admin);
  }

  @Roles(UserRole.admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vendorsService.create(dto, user);
  }

  @Roles(UserRole.admin)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vendorsService.update(id, dto, user);
  }

  @Roles(UserRole.admin)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.vendorsService.remove(id, user);
  }
}
