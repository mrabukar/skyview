import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ConfirmUserAttachmentDto } from "./dto/confirm-user-attachment.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { UserAttachmentQueryDto } from "./dto/user-attachment-query.dto";
import { UserAttachmentsService } from "./user-attachments.service";

@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("user-attachments")
export class UserAttachmentsController {
  constructor(
    private readonly userAttachmentsService: UserAttachmentsService,
  ) {}

  @Post("upload-url")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin)
  createUploadUrl(
    @Body() dto: CreateUploadUrlDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userAttachmentsService.createUploadUrl(dto, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.admin)
  confirm(
    @Body() dto: ConfirmUserAttachmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userAttachmentsService.confirm(dto, user);
  }

  @Get()
  list(
    @Query() query: UserAttachmentQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userAttachmentsService.list(query, user);
  }

  @Get(":id/url")
  getUrl(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.userAttachmentsService.getUrl(id, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.admin)
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.userAttachmentsService.remove(id, user);
  }
}
