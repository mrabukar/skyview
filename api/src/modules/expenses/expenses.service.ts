import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import {
  calendarDateToDbDate,
  compareCalendarDates,
  extractCalendarDate,
  parseDateColumnRangeEnd,
  parseDateColumnRangeStart,
  todayCalendarDate,
} from "../../common/utils/app-timezone.util";
import {
  assertBranchAccess,
  assertManagerHasBranches,
  isManager,
  resolveWriteBranchId,
} from "../../common/utils/branch-scope.util";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { ExpenseCategoriesService } from "../expense-categories/expense-categories.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { ExpenseQueryDto } from "./dto/expense-query.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

const expenseInclude = {
  category: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseWithDetails = Prisma.ExpenseGetPayload<{
  include: typeof expenseInclude;
}>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  async findAll(
    query: ExpenseQueryDto,
    user: CurrentUserPayload,
  ): Promise<PaginatedResult<ExpenseWithDetails>> {
    const skip = (query.page - 1) * query.limit;
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);
    const search = typeof query.search === "string" ? query.search.trim() : "";

    let branchFilter: Prisma.ExpenseWhereInput;
    if (isManager(user)) {
      // Managers: assigned branches only; company-wide excluded (BR-5.3).
      const ids = assertManagerHasBranches(user);
      const trimmed =
        typeof query.branchId === "string" ? query.branchId.trim() : "";
      if (trimmed) {
        if (!ids.includes(trimmed)) {
          throw new ForbiddenException(
            "You can only access your assigned branches",
          );
        }
        branchFilter = { branchId: trimmed };
      } else {
        branchFilter = {
          branchId: ids.length === 1 ? ids[0]! : { in: ids },
        };
      }
    } else if (query.companyWideOnly) {
      branchFilter = { branchId: null };
    } else if (query.branchId) {
      branchFilter = { branchId: query.branchId };
    } else {
      branchFilter = {};
    }

    const where: Prisma.ExpenseWhereInput = {
      ...branchFilter,
      ...(query.categoryId ? { categoryId: query.categoryId } : undefined),
      ...(dateRange ? { expenseDate: dateRange } : undefined),
      ...(search
        ? { title: { contains: search, mode: "insensitive" } }
        : undefined),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        include: expenseInclude,
      }),
      this.prisma.expense.count({ where }),
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

  async findOne(
    id: string,
    user: CurrentUserPayload,
  ): Promise<ExpenseWithDetails> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: expenseInclude,
    });
    if (!expense) {
      throw new NotFoundException(`Expense with id "${id}" not found`);
    }
    if (isManager(user)) {
      if (!expense.branchId) {
        throw new ForbiddenException(
          "You can only access your assigned branches' expenses",
        );
      }
      assertBranchAccess(expense.branchId, user);
    }
    return expense;
  }

  async create(
    dto: CreateExpenseDto,
    user: CurrentUserPayload,
  ): Promise<ExpenseWithDetails> {
    const organizationId = requireOrganizationId(user);
    await this.expenseCategoriesService.findOne(dto.categoryId);

    const branchId = await this.resolveWriteBranch(user, dto.branchId);
    const expenseDate = extractCalendarDate(dto.expenseDate);
    this.assertNotFuture(expenseDate);

    const expenseId = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: withOrganizationId(
          {
            title: dto.title.trim(),
            amount: dto.amount,
            categoryId: dto.categoryId,
            branchId,
            expenseDate: calendarDateToDbDate(expenseDate),
            note: dto.note ?? null,
            createdById: user.id,
          },
          organizationId,
        ),
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "EXPENSE_CREATED",
          entityType: "expense",
          entityId: expense.id,
          branchId,
          oldValue: Prisma.JsonNull,
          newValue: this.toAuditSnapshot(expense),
        },
      });
      return expense.id;
    });

    return this.findOne(expenseId, user);
  }

  async update(
    id: string,
    dto: UpdateExpenseDto,
    user: CurrentUserPayload,
  ): Promise<ExpenseWithDetails> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.findOne(id, user);

    // BR-5.4 — managers may only edit the same-day entry.
    if (isManager(user)) {
      const existingDate = existing.expenseDate.toISOString().slice(0, 10);
      if (existingDate !== todayCalendarDate()) {
        throw new ForbiddenException(
          "Managers can only edit today's expenses. Ask an admin to correct older entries.",
        );
      }
      if (dto.branchId !== undefined) {
        throw new ForbiddenException("Managers cannot change the branch of an expense");
      }
    }

    if (dto.categoryId !== undefined) {
      await this.expenseCategoriesService.findOne(dto.categoryId);
    }

    let nextBranchId: string | null | undefined;
    if (dto.branchId !== undefined && !isManager(user)) {
      const trimmed =
        typeof dto.branchId === "string" ? dto.branchId.trim() : "";
      nextBranchId = trimmed ? await this.requireActiveBranch(trimmed) : null;
    }

    let nextDate: string | undefined;
    if (dto.expenseDate !== undefined) {
      nextDate = extractCalendarDate(dto.expenseDate);
      this.assertNotFuture(nextDate);
    }

    const organizationId = requireOrganizationId(user);

    const expenseId = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : undefined),
          ...(dto.amount !== undefined ? { amount: dto.amount } : undefined),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : undefined),
          ...(nextBranchId !== undefined ? { branchId: nextBranchId } : undefined),
          ...(nextDate !== undefined
            ? { expenseDate: calendarDateToDbDate(nextDate) }
            : undefined),
          ...(dto.note !== undefined ? { note: dto.note ?? null } : undefined),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "EXPENSE_UPDATED",
          entityType: "expense",
          entityId: expense.id,
          branchId: expense.branchId,
          oldValue: this.toAuditSnapshot(existing),
          newValue: this.toAuditSnapshot(expense),
        },
      });
      return expense.id;
    });

    return this.findOne(expenseId, user);
  }

  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    // BR-5.4 — delete is admin-only (controller enforces too).
    if (isManager(user)) {
      throw new ForbiddenException("Only an admin can delete expenses");
    }
    const existing = await this.findOne(id, user);
    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "EXPENSE_DELETED",
          entityType: "expense",
          entityId: id,
          branchId: existing.branchId,
          oldValue: this.toAuditSnapshot(existing),
          newValue: Prisma.JsonNull,
        },
      });
    });
  }

  /** Manager: assigned branch (require dto when >1). Admin: given branch or company-wide (null). */
  private async resolveWriteBranch(
    user: CurrentUserPayload,
    dtoBranchId?: string,
  ): Promise<string | null> {
    if (isManager(user)) {
      return resolveWriteBranchId(user, dtoBranchId);
    }
    const trimmed = typeof dtoBranchId === "string" ? dtoBranchId.trim() : "";
    if (!trimmed) return null;
    return this.requireActiveBranch(trimmed);
  }

  private async requireActiveBranch(branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException("Branch not found or inactive");
    }
    return branch.id;
  }

  private assertNotFuture(calendarDate: string): void {
    if (compareCalendarDates(calendarDate, todayCalendarDate()) > 0) {
      throw new BadRequestException("Expense date cannot be in the future");
    }
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

  private toAuditSnapshot(expense: {
    id: string;
    title: string;
    amount: Prisma.Decimal;
    categoryId: number;
    branchId: string | null;
    expenseDate: Date;
    note: string | null;
  }): Prisma.InputJsonObject {
    return {
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      categoryId: expense.categoryId,
      branchId: expense.branchId,
      expenseDate: expense.expenseDate.toISOString().slice(0, 10),
      note: expense.note,
    };
  }
}
