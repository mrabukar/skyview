import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";

const categorySelect = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { expenses: true } },
} satisfies Prisma.ExpenseCategorySelect;

export type ExpenseCategoryWithCount = Prisma.ExpenseCategoryGetPayload<{
  select: typeof categorySelect;
}>;

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<ExpenseCategoryWithCount[]> {
    return this.prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
      select: categorySelect,
    });
  }

  async findOne(id: number): Promise<ExpenseCategoryWithCount> {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
      select: categorySelect,
    });
    if (!category) {
      throw new NotFoundException(`Expense category "${id}" not found`);
    }
    return category;
  }

  async create(
    dto: CreateExpenseCategoryDto,
    user: CurrentUserPayload,
  ): Promise<ExpenseCategoryWithCount> {
    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const category = await tx.expenseCategory.create({
          data: withOrganizationId(
            { name, description: dto.description?.trim() || null },
            organizationId,
          ),
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "EXPENSE_CATEGORY_CREATED",
            entityType: "expense_category",
            entityId: String(category.id),
            oldValue: Prisma.JsonNull,
            newValue: { id: category.id, name: category.name },
          },
        });
        return category.id;
      });
      return this.findOne(created);
    } catch (error) {
      throw this.mapDuplicate(error, name);
    }
  }

  async update(
    id: number,
    dto: UpdateExpenseCategoryDto,
    user: CurrentUserPayload,
  ): Promise<ExpenseCategoryWithCount> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.findOne(id);
    if (existing.isSystem) {
      throw new ForbiddenException(
        `"${existing.name}" is a system category and cannot be modified`,
      );
    }

    const organizationId = requireOrganizationId(user);
    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (nextName !== undefined && nextName.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameAvailable(nextName);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const category = await tx.expenseCategory.update({
          where: { id },
          data: {
            ...(nextName !== undefined ? { name: nextName } : undefined),
            ...(dto.description !== undefined
              ? { description: dto.description?.trim() || null }
              : undefined),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "EXPENSE_CATEGORY_UPDATED",
            entityType: "expense_category",
            entityId: String(category.id),
            oldValue: { id: existing.id, name: existing.name },
            newValue: { id: category.id, name: category.name },
          },
        });
      });
      return this.findOne(id);
    } catch (error) {
      throw this.mapDuplicate(error, nextName ?? existing.name);
    }
  }

  async remove(id: number, user: CurrentUserPayload): Promise<void> {
    const existing = await this.findOne(id);
    if (existing.isSystem) {
      throw new ForbiddenException(
        `"${existing.name}" is a system category and cannot be deleted`,
      );
    }
    if (existing._count.expenses > 0) {
      throw new ConflictException(
        "This category is used by existing expenses and cannot be deleted",
      );
    }

    const organizationId = requireOrganizationId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.expenseCategory.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "EXPENSE_CATEGORY_DELETED",
          entityType: "expense_category",
          entityId: String(id),
          oldValue: { id: existing.id, name: existing.name },
          newValue: Prisma.JsonNull,
        },
      });
    });
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const clash = await this.prisma.expenseCategory.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException("A category with this name already exists");
    }
  }

  private mapDuplicate(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(`A category named "${name}" already exists`);
    }
    return error;
  }
}
