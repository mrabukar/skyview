import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { IncomingMessage, ServerResponse } from "http";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { envValidationSchema } from "./config/env.validation";
import { BetterAuthNestModule } from "./modules/auth/auth.module";
import { DailySalesModule } from "./modules/daily-sales/daily-sales.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { PurchasesModule } from "./modules/purchases/purchases.module";
import { ExpenseCategoriesModule } from "./modules/expense-categories/expense-categories.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { UsersModule } from "./modules/users/users.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ReceiptsModule } from "./modules/receipts/receipts.module";
import { UserAttachmentsModule } from "./modules/user-attachments/user-attachments.module";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { R2Module } from "./common/r2/r2.module";
import { TenantModule } from "./common/tenant/tenant.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== "production"
            ? {
                target: "pino-pretty",
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        level: "info",
        redact: ["req.headers.cookie", "req.headers.authorization"],
        serializers: {
          req: () => undefined,
          res: () => undefined,
        },
        customSuccessMessage: (
          req: IncomingMessage,
          res: ServerResponse,
          responseTime: number,
        ) =>
          `${req.method ?? "?"} ${req.url ?? "?"} ${res.statusCode} ${responseTime}ms`,
        customErrorMessage: (
          req: IncomingMessage,
          res: ServerResponse,
          error: Error,
        ) =>
          `${req.method ?? "?"} ${req.url ?? "?"} ${res.statusCode} ${error.message}`,
      },
    }),
    PrismaModule,
    TenantModule,
    R2Module,
    HealthModule,
    BetterAuthNestModule,
    DailySalesModule,
    VendorsModule,
    PurchasesModule,
    ExpenseCategoriesModule,
    ExpensesModule,
    PayrollModule,
    BranchesModule,
    UsersModule,
    AuditLogsModule,
    ReportsModule,
    ReceiptsModule,
    UserAttachmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
