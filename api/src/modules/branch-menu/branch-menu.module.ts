import { Module } from "@nestjs/common";
import { BranchMenuController } from "./branch-menu.controller";
import { BranchMenuService } from "./branch-menu.service";

@Module({
  controllers: [BranchMenuController],
  providers: [BranchMenuService],
  exports: [BranchMenuService],
})
export class BranchMenuModule {}
