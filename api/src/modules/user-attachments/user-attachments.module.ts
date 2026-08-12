import { Module } from "@nestjs/common";
import { UserAttachmentsController } from "./user-attachments.controller";
import { UserAttachmentsService } from "./user-attachments.service";

@Module({
  controllers: [UserAttachmentsController],
  providers: [UserAttachmentsService],
})
export class UserAttachmentsModule {}
