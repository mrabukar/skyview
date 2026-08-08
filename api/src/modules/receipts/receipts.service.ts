import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import {
  parseDateColumnRangeEnd,
  parseDateColumnRangeStart,
} from "../../common/utils/app-timezone.util";
import {
  assertBranchAccess,
  resolveBranchFilter,
} from "../../common/utils/branch-scope.util";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { R2Service } from "../../common/r2/r2.service";
import { ConfirmReceiptDto } from "./dto/confirm-receipt.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { ReceiptQueryDto } from "./dto/receipt-query.dto";
import { RECEIPT_EXTENSION } from "./receipt.constants";

const receiptInclude = {
  branch: { select: { id: true, name: true } },
  uploadedBy: { select: { id: true, name: true } },
  purchase: {
    select: {
      id: true,
      itemName: true,
      purchaseDate: true,
      vendor: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ReceiptInclude;

type ReceiptWithDetails = Prisma.ReceiptGetPayload<{
  include: typeof receiptInclude;
}>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  /** Step 1 — pre-signed PUT URL for a direct browser → R2 upload. */
  async createUploadUrl(dto: CreateUploadUrlDto, user: CurrentUserPayload) {
    const organizationId = requireOrganizationId(user);
    const purchase = await this.requirePurchase(dto.purchaseId, user);

    const ext = RECEIPT_EXTENSION[dto.contentType] ?? "bin";
    const key = `receipts/${organizationId}/${purchase.id}/${randomUUID()}.${ext}`;
    const url = await this.r2.presignPut(key, dto.contentType);

    return { key, url, expiresIn: 300 };
  }

  /** Step 2 — persist metadata once the browser has uploaded to R2. */
  async confirm(dto: ConfirmReceiptDto, user: CurrentUserPayload) {
    const organizationId = requireOrganizationId(user);
    const purchase = await this.requirePurchase(dto.purchaseId, user);

    // The key must be one we issued for this purchase (prevents arbitrary rows).
    const prefix = `receipts/${organizationId}/${purchase.id}/`;
    if (!dto.key.startsWith(prefix)) {
      throw new BadRequestException("Receipt key does not match the purchase");
    }

    const created = await this.prisma.receipt.create({
      data: withOrganizationId(
        {
          purchaseId: purchase.id,
          branchId: purchase.branchId,
          key: dto.key,
          originalName: dto.originalName.trim().slice(0, 255),
          contentType: dto.contentType,
          size: dto.size,
          uploadedById: user.id,
        },
        organizationId,
      ),
      include: receiptInclude,
    });

    return this.toClient(created);
  }

  async list(query: ReceiptQueryDto, user: CurrentUserPayload) {
    // Single-purchase listing (used by the purchase detail / form).
    if (query.purchaseId) {
      await this.requirePurchase(query.purchaseId, user);
      const rows = await this.prisma.receipt.findMany({
        where: { purchaseId: query.purchaseId },
        orderBy: { createdAt: "desc" },
        include: receiptInclude,
      });
      const data = await Promise.all(rows.map((r) => this.toClient(r)));
      return {
        data,
        meta: {
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
        },
      };
    }

    // Receipt Centre feed (paginated, branch-scoped).
    const skip = (query.page - 1) * query.limit;
    const branchId = resolveBranchFilter(user, query.branchId);
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);

    const where: Prisma.ReceiptWhereInput = {
      ...(branchId ? { branchId } : undefined),
      ...(dateRange ? { createdAt: dateRange } : undefined),
    };

    const [rows, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: receiptInclude,
      }),
      this.prisma.receipt.count({ where }),
    ]);

    const data = await Promise.all(rows.map((r) => this.toClient(r)));
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /** Fresh short-lived view/download URL for one receipt. */
  async getUrl(id: string, user: CurrentUserPayload) {
    const receipt = await this.requireReceipt(id, user);
    const url = await this.r2.presignGet(receipt.key);
    return { url, expiresIn: 300 };
  }

  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    const receipt = await this.requireReceipt(id, user);
    // Best-effort object delete; always drop the row.
    try {
      await this.r2.deleteObject(receipt.key);
    } catch {
      // ignore storage errors — the row must still be removed
    }
    await this.prisma.receipt.delete({ where: { id } });
  }

  private async requirePurchase(purchaseId: string, user: CurrentUserPayload) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { id: true, branchId: true },
    });
    if (!purchase) {
      throw new NotFoundException(`Purchase with id "${purchaseId}" not found`);
    }
    assertBranchAccess(purchase.branchId, user);
    return purchase;
  }

  private async requireReceipt(id: string, user: CurrentUserPayload) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id } });
    if (!receipt) {
      throw new NotFoundException(`Receipt with id "${id}" not found`);
    }
    assertBranchAccess(receipt.branchId, user);
    return receipt;
  }

  private async toClient(receipt: ReceiptWithDetails) {
    return {
      id: receipt.id,
      purchaseId: receipt.purchaseId,
      branchId: receipt.branchId,
      branchName: receipt.branch?.name ?? null,
      itemName: receipt.purchase?.itemName ?? null,
      vendorName: receipt.purchase?.vendor?.name ?? null,
      purchaseDate: receipt.purchase?.purchaseDate.toISOString().slice(0, 10) ?? null,
      originalName: receipt.originalName,
      contentType: receipt.contentType,
      size: receipt.size,
      uploadedByName: receipt.uploadedBy?.name ?? null,
      createdAt: receipt.createdAt.toISOString(),
      url: await this.r2.presignGet(receipt.key),
    };
  }

  private buildDateRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    const from = typeof fromDate === "string" ? fromDate.trim() : "";
    const to = typeof toDate === "string" ? toDate.trim() : "";
    if (!from && !to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = parseDateColumnRangeStart(from);
    if (to) range.lte = parseDateColumnRangeEnd(to);
    return range;
  }
}
