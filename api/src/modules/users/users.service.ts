import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { orderByUpdatedAtDesc } from "../../common/utils/list-order.util";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import {
  isStrongPassword,
  STRONG_PASSWORD_MESSAGE,
} from "../auth/validators/password-strength.validator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  salary: true,
  isActive: true,
  branchId: true,
  branch: { select: { id: true, name: true } },
  disabledPages: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserWithBranch = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto): Promise<PaginatedResult<UserWithBranch>> {
    const skip = (query.page - 1) * query.limit;
    const search = typeof query.search === "string" ? query.search.trim() : "";

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role as UserRole } : undefined),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : undefined),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: orderByUpdatedAtDesc,
        select: userSelect,
      }),
      this.prisma.user.count({ where }),
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

  async findOne(id: string): Promise<UserWithBranch> {
    const found = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!found) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return found;
  }

  async create(
    dto: CreateUserDto,
    actor: CurrentUserPayload,
  ): Promise<UserWithBranch> {
    const organizationId = requireOrganizationId(actor);
    if (!isStrongPassword(dto.password)) {
      throw new BadRequestException(STRONG_PASSWORD_MESSAGE);
    }
    const role = dto.role as UserRole;
    const branchId = await this.resolveBranchForRole(role, dto.branchId);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const userId = randomUUID();
    const accountId = randomUUID();
    const hashed = await hashPassword(dto.password);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: withOrganizationId(
          {
            id: userId,
            name: dto.name.trim(),
            email,
            emailVerified: true,
            role,
            isActive: true,
            phone: dto.phone?.trim() || null,
            salary: dto.salary ?? 0,
            // Page restrictions only apply to managers; admins keep [].
            disabledPages:
              role === UserRole.branch_manager ? (dto.disabledPages ?? []) : [],
            branchId,
            accounts: {
              create: {
                id: accountId,
                accountId: userId,
                providerId: "credential",
                password: hashed,
              },
            },
          },
          organizationId,
        ),
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId,
          action: "USER_CREATED",
          entityType: "user",
          entityId: userId,
          branchId,
          oldValue: Prisma.JsonNull,
          newValue: { id: userId, name: dto.name.trim(), email, role, branchId },
        },
      });
    });

    return this.findOne(userId);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: CurrentUserPayload,
  ): Promise<UserWithBranch> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.findOne(id);
    const organizationId = requireOrganizationId(actor);

    const nextRole = (dto.role as UserRole | undefined) ?? existing.role;
    let nextBranchId: string | null | undefined;
    if (dto.role !== undefined || dto.branchId !== undefined) {
      const suppliedBranch =
        dto.branchId !== undefined ? dto.branchId : existing.branchId;
      nextBranchId = await this.resolveBranchForRole(
        nextRole,
        suppliedBranch ?? undefined,
      );
    }

    let email: string | undefined;
    if (dto.email !== undefined) {
      email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const clash = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException("A user with this email already exists");
        }
      }
    }

    if (dto.password !== undefined && !isStrongPassword(dto.password)) {
      throw new BadRequestException(STRONG_PASSWORD_MESSAGE);
    }

    // Page restrictions only apply to managers; admins are always cleared to [].
    let nextDisabledPages: string[] | undefined;
    if (nextRole === UserRole.admin) {
      nextDisabledPages = [];
    } else if (dto.disabledPages !== undefined) {
      nextDisabledPages = dto.disabledPages;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : undefined),
          ...(email !== undefined ? { email } : undefined),
          ...(dto.role !== undefined ? { role: nextRole } : undefined),
          ...(nextBranchId !== undefined ? { branchId: nextBranchId } : undefined),
          ...(dto.phone !== undefined
            ? { phone: dto.phone?.trim() || null }
            : undefined),
          ...(dto.salary !== undefined ? { salary: dto.salary } : undefined),
          ...(nextDisabledPages !== undefined
            ? { disabledPages: nextDisabledPages }
            : undefined),
        },
      });

      if (dto.password !== undefined) {
        const hashed = await hashPassword(dto.password);
        await tx.account.updateMany({
          where: { userId: id, providerId: "credential" },
          data: { password: hashed },
        });
        // password change → drop existing sessions
        await tx.session.deleteMany({ where: { userId: id } });
      }

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId,
          action: "USER_UPDATED",
          entityType: "user",
          entityId: id,
          branchId: nextBranchId ?? existing.branchId,
          oldValue: { id: existing.id, email: existing.email, role: existing.role },
          newValue: { id, email: email ?? existing.email, role: nextRole },
        },
      });
    });

    return this.findOne(id);
  }

  deactivate(id: string, actor: CurrentUserPayload): Promise<void> {
    return this.setActive(id, false, actor);
  }

  async activate(id: string, actor: CurrentUserPayload): Promise<UserWithBranch> {
    await this.setActive(id, true, actor);
    return this.findOne(id);
  }

  private async setActive(
    id: string,
    isActive: boolean,
    actor: CurrentUserPayload,
  ): Promise<void> {
    const existing = await this.findOne(id);
    if (existing.id === actor.id && !isActive) {
      throw new BadRequestException("You cannot deactivate your own account");
    }
    if (existing.isActive === isActive) {
      return;
    }
    const organizationId = requireOrganizationId(actor);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isActive } });
      if (!isActive) {
        // BR-7.4 — revoke sessions on deactivation.
        await tx.session.deleteMany({ where: { userId: id } });
      }
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId,
          action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
          entityType: "user",
          entityId: id,
          branchId: existing.branchId,
          oldValue: { id, isActive: existing.isActive },
          newValue: { id, isActive },
        },
      });
    });
  }

  /** admin → no branch; branch_manager → an active branch is required. */
  private async resolveBranchForRole(
    role: UserRole,
    branchId?: string,
  ): Promise<string | null> {
    if (role === UserRole.admin) {
      return null;
    }
    const trimmed = typeof branchId === "string" ? branchId.trim() : "";
    if (!trimmed) {
      throw new BadRequestException("Branch is required for branch managers");
    }
    const branch = await this.prisma.branch.findFirst({
      where: { id: trimmed, isActive: true },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException("Branch not found or inactive");
    }
    return branch.id;
  }
}
