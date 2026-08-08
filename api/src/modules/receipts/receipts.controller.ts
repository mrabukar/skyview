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
import { ConfirmReceiptDto } from "./dto/confirm-receipt.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { ReceiptQueryDto } from "./dto/receipt-query.dto";
import { ReceiptsService } from "./receipts.service";

// Receipts are attached to / viewed from purchases; access follows the
// purchases capability, so no separate @Page gate here.
@Roles(UserRole.admin, UserRole.branch_manager)
@Controller("receipts")
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  // Step 1: get a pre-signed PUT URL to upload directly to R2.
  @Post("upload-url")
  @HttpCode(HttpStatus.OK)
  createUploadUrl(
    @Body() dto: CreateUploadUrlDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.receiptsService.createUploadUrl(dto, user);
  }

  // Step 2: persist metadata after the upload completes.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  confirm(
    @Body() dto: ConfirmReceiptDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.receiptsService.confirm(dto, user);
  }

  // Receipt Centre feed, or receipts for one purchase (?purchaseId=).
  @Get()
  list(
    @Query() query: ReceiptQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.receiptsService.list(query, user);
  }

  @Get(":id/url")
  getUrl(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.receiptsService.getUrl(id, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.receiptsService.remove(id, user);
  }
}
