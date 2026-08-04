import { Controller, Get, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { AuditLogsService } from "./audit-logs.service";

// Audit log is read-only and admin-only (BR-8.3).
@Roles(UserRole.admin)
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
