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
  branchAssignments: {
    select: {
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
  },
  disabledPages: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserWithBranch = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export type UserClient = Omit<UserWithBranch, "branchAssignments"> & {
  branchIds: string[];
  branches: { id: string; name: string }[];
};

function toUserClient(user: UserWithBranch): UserClient {
  const fromAssignments = user.branchAssignments.map((a) => ({
    id: a.branch.id,
    name: a.branch.name,
  }));
  // Ensure primary is first if present
  const branches =
    user.branchId && fromAssignments.some((b) => b.id === user.branchId)
      ? [
          fromAssignments.find((b) => b.id === user.branchId)!,
          ...fromAssignments.filter((b) => b.id !== user.branchId),
        ]
      : fromAssignments.length > 0
        ? fromAssignments
        : user.branch
          ? [{ id: user.branch.id, name: user.branch.name }]
          : [];
  const { branchAssignments: _, ...rest } = user;
  return {
    ...rest,
    branchIds: branches.map((b) => b.id),
    branches,
  };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto): Promise<PaginatedResult<UserClient>> {
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
      data: data.map(toUserClient),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<UserClient> {
    const found = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!found) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return toUserClient(found);
  }

  async create(
    dto: CreateUserDto,
    actor: CurrentUserPayload,
  ): Promise<UserClient> {
    const organizationId = requireOrganizationId(actor);
    if (!isStrongPassword(dto.password)) {
      throw new BadRequestException(STRONG_PASSWORD_MESSAGE);
    }
    const role = dto.role as UserRole;
    const branchIds = await this.resolveBranchIdsForRole(
      role,
      dto.branchIds,
      dto.branchId,
    );
    const branchId = branchIds[0] ?? null;

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
      if (role === UserRole.branch_manager && branchIds.length > 0) {
        await tx.branchManagerAssignment.createMany({
          data: branchIds.map((bid) =>
            withOrganizationId(
              { userId, branchId: bid },
              organizationId,
            ),
          ),
        });
      }
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          organizationId,
          action: "USER_CREATED",
          entityType: "user",
          entityId: userId,
          branchId,
          oldValue: Prisma.JsonNull,
          newValue: {
            id: userId,
            name: dto.name.trim(),
            email,
            role,
            branchId,
            branchIds,
          },
        },
      });
    });

    return this.findOne(userId);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: CurrentUserPayload,
  ): Promise<UserClient> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.findOne(id);
    const organizationId = requireOrganizationId(actor);

    const nextRole = (dto.role as UserRole | undefined) ?? existing.role;
    let nextBranchIds: string[] | undefined;
    let nextBranchId: string | null | undefined;
    if (
      dto.role !== undefined ||
      dto.branchId !== undefined ||
      dto.branchIds !== undefined
    ) {
      const idsInput =
        dto.branchIds !== undefined
          ? dto.branchIds
          : dto.branchId === undefined
            ? existing.branchIds
            : undefined;
      const singleInput =
        dto.branchIds === undefined && dto.branchId !== undefined
          ? dto.branchId
          : undefined;
      nextBranchIds = await this.resolveBranchIdsForRole(
        nextRole,
        idsInput,
        singleInput,
      );
      nextBranchId = nextBranchIds[0] ?? null;
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

      if (nextBranchIds !== undefined) {
        await tx.branchManagerAssignment.deleteMany({ where: { userId: id } });
        if (nextRole === UserRole.branch_manager && nextBranchIds.length > 0) {
          await tx.branchManagerAssignment.createMany({
            data: nextBranchIds.map((bid) =>
              withOrganizationId(
                { userId: id, branchId: bid },
                organizationId,
              ),
            ),
          });
        }
      }

      if (dto.password !== undefined) {
        const hashed = await hashPassword(dto.password);
        await tx.account.updateMany({
          where: { userId: id, providerId: "credential" },
          data: { password: hashed },
        });
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
          oldValue: {
            id: existing.id,
            email: existing.email,
            role: existing.role,
            branchIds: existing.branchIds,
          },
          newValue: {
            id,
            email: email ?? existing.email,
            role: nextRole,
            branchIds: nextBranchIds ?? existing.branchIds,
          },
        },
      });
    });

    return this.findOne(id);
  }

  deactivate(id: string, actor: CurrentUserPayload): Promise<void> {
    return this.setActive(id, false, actor);
  }

  async activate(id: string, actor: CurrentUserPayload): Promise<UserClient> {
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

  /**
   * admin → []; branch_manager → ≥1 active org branches.
   * Prefers `branchIds`; falls back to single `branchId`.
   */
  private async resolveBranchIdsForRole(
    role: UserRole,
    branchIds?: string[],
    branchId?: string | null,
  ): Promise<string[]> {
    if (role === UserRole.admin) {
      return [];
    }

    const raw =
      Array.isArray(branchIds) && branchIds.length > 0
        ? branchIds
        : typeof branchId === "string" && branchId.trim()
          ? [branchId.trim()]
          : [];

    const unique = [
      ...new Set(raw.map((id) => id.trim()).filter(Boolean)),
    ];
    if (unique.length === 0) {
      throw new BadRequestException(
        "At least one branch is required for branch managers",
      );
    }

    const branches = await this.prisma.branch.findMany({
      where: { id: { in: unique }, isActive: true },
      select: { id: true },
    });
    if (branches.length !== unique.length) {
      throw new BadRequestException("One or more branches are not found or inactive");
    }
    // Preserve caller order (first = primary).
    return unique;
  }
}
