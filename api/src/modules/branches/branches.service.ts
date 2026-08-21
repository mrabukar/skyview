import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Branch, Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { orderByUpdatedAtDesc } from "../../common/utils/list-order.util";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { BranchQueryDto } from "./dto/branch-query.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: BranchQueryDto): Promise<PaginatedResult<Branch>> {
    const skip = (query.page - 1) * query.limit;
    const search = typeof query.search === "string" ? query.search.trim() : "";

    const where: Prisma.BranchWhereInput = {
      ...(query.includeInactive ? undefined : { isActive: true }),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined),
    };

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: orderByUpdatedAtDesc,
      }),
      this.prisma.branch.count({ where }),
    ]);

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

  async findOne(id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with id "${id}" not found`);
    }
    return branch;
  }

  async create(dto: CreateBranchDto, user: CurrentUserPayload): Promise<Branch> {
    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    try {
      const branchId = await this.prisma.$transaction(async (tx) => {
        const branch = await tx.branch.create({
          data: withOrganizationId(
            { name, address: dto.address.trim() },
            organizationId,
          ),
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "STORE_CREATED",
            entityType: "branch",
            entityId: branch.id,
            branchId: branch.id,
            oldValue: Prisma.JsonNull,
            newValue: this.snapshot(branch),
          },
        });
        return branch.id;
      });
      return this.findOne(branchId);
    } catch (error) {
      throw this.mapDuplicate(error, name);
    }
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
    user: CurrentUserPayload,
  ): Promise<Branch> {
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
        const branch = await tx.branch.update({
          where: { id },
          data: {
            ...(nextName !== undefined ? { name: nextName } : undefined),
            ...(dto.address !== undefined ? { address: dto.address.trim() } : undefined),
            ...(dto.posEnabled !== undefined ? { posEnabled: dto.posEnabled } : undefined),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "STORE_UPDATED",
            entityType: "branch",
            entityId: branch.id,
            branchId: branch.id,
            oldValue: this.snapshot(existing),
            newValue: this.snapshot(branch),
          },
        });
      });
      return this.findOne(id);
    } catch (error) {
      throw this.mapDuplicate(error, nextName ?? existing.name);
    }
  }

  deactivate(id: string, user: CurrentUserPayload): Promise<Branch> {
    return this.setActive(id, false, user);
  }

  reactivate(id: string, user: CurrentUserPayload): Promise<Branch> {
    return this.setActive(id, true, user);
  }

  private async setActive(
    id: string,
    isActive: boolean,
    user: CurrentUserPayload,
  ): Promise<Branch> {
    const existing = await this.findOne(id);
    if (existing.isActive === isActive) {
      return existing;
    }
    const organizationId = requireOrganizationId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.branch.update({ where: { id }, data: { isActive } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: isActive ? "STORE_REACTIVATED" : "STORE_DEACTIVATED",
          entityType: "branch",
          entityId: id,
          branchId: id,
          oldValue: this.snapshot(existing),
          newValue: { ...this.snapshot(existing), isActive },
        },
      });
    });
    return this.findOne(id);
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const clash = await this.prisma.branch.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException("A branch with this name already exists");
    }
  }

  private mapDuplicate(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(`A branch named "${name}" already exists`);
    }
    return error;
  }

  private snapshot(branch: Branch): Prisma.InputJsonObject {
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      isActive: branch.isActive,
    };
  }
}
