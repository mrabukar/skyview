import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { VendorQueryDto } from "./dto/vendor-query.dto";

const vendorSelect = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { purchases: true } },
} satisfies Prisma.VendorSelect;

export type VendorWithCount = Prisma.VendorGetPayload<{
  select: typeof vendorSelect;
}>;

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Managers always get active vendors only; admins may include inactive. */
  async findAll(
    query: VendorQueryDto,
    includeInactiveAllowed: boolean,
  ): Promise<VendorWithCount[]> {
    const includeInactive = includeInactiveAllowed && query.includeInactive === true;
    return this.prisma.vendor.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: "asc" },
      select: vendorSelect,
    });
  }

  async findOne(id: string): Promise<VendorWithCount> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: vendorSelect,
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with id "${id}" not found`);
    }
    return vendor;
  }

  /** For other modules (purchases): the vendor must exist and be active. */
  async requireActiveVendor(id: string): Promise<{ id: string; name: string }> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, isActive: true },
      select: { id: true, name: true },
    });
    if (!vendor) {
      throw new BadRequestException("Vendor not found or inactive");
    }
    return vendor;
  }

  async create(
    dto: CreateVendorDto,
    user: CurrentUserPayload,
  ): Promise<VendorWithCount> {
    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    try {
      const vendorId = await this.prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.create({
          data: withOrganizationId({ name }, organizationId),
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "VENDOR_CREATED",
            entityType: "vendor",
            entityId: vendor.id,
            oldValue: Prisma.JsonNull,
            newValue: { id: vendor.id, name: vendor.name, isActive: vendor.isActive },
          },
        });
        return vendor.id;
      });
      return this.findOne(vendorId);
    } catch (error) {
      throw this.mapDuplicate(error, name);
    }
  }

  async update(
    id: string,
    dto: UpdateVendorDto,
    user: CurrentUserPayload,
  ): Promise<VendorWithCount> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.findOne(id);
    const organizationId = requireOrganizationId(user);

    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (nextName !== undefined && nextName.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameAvailable(nextName);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.update({
          where: { id },
          data: {
            ...(nextName !== undefined ? { name: nextName } : undefined),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : undefined),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: dto.isActive === false ? "VENDOR_DEACTIVATED" : "VENDOR_UPDATED",
            entityType: "vendor",
            entityId: vendor.id,
            oldValue: { id: existing.id, name: existing.name, isActive: existing.isActive },
            newValue: { id: vendor.id, name: vendor.name, isActive: vendor.isActive },
          },
        });
      });
      return this.findOne(id);
    } catch (error) {
      throw this.mapDuplicate(error, nextName ?? existing.name);
    }
  }

  /**
   * BR-4.3 — hard-delete only when unused; otherwise deactivate so historical
   * purchases keep their vendor.
   */
  async remove(
    id: string,
    user: CurrentUserPayload,
  ): Promise<{ id: string; action: "deleted" | "deactivated" }> {
    const existing = await this.findOne(id);
    const organizationId = requireOrganizationId(user);
    const referenced = existing._count.purchases > 0;

    await this.prisma.$transaction(async (tx) => {
      if (referenced) {
        await tx.vendor.update({ where: { id }, data: { isActive: false } });
      } else {
        await tx.vendor.delete({ where: { id } });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "VENDOR_DEACTIVATED",
          entityType: "vendor",
          entityId: id,
          oldValue: { id: existing.id, name: existing.name, isActive: existing.isActive },
          newValue: referenced
            ? { id: existing.id, name: existing.name, isActive: false }
            : Prisma.JsonNull,
        },
      });
    });

    return { id, action: referenced ? "deactivated" : "deleted" };
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const clash = await this.prisma.vendor.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException("A vendor with this name already exists");
    }
  }

  private mapDuplicate(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(`A vendor named "${name}" already exists`);
    }
    return error;
  }
}
