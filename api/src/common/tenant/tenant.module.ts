import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BranchAccessService } from "../branch-access/branch-access.service";
import { TenantContextService } from "./tenant-context.service";
import { TenantInterceptor } from "./tenant.interceptor";

@Global()
@Module({
  providers: [
    TenantContextService,
    BranchAccessService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  exports: [TenantContextService, BranchAccessService],
})
export class TenantModule {}
