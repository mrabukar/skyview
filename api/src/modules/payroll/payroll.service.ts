import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import {
  calendarDateToDbDate,
  todayCalendarDate,
} from "../../common/utils/app-timezone.util";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

type ActiveUser = {
  id: string;
  name: string;
  salary: Prisma.Decimal;
  branchId: string | null;
  branch: { name: string } | null;
};

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(user: CurrentUserPayload) {
    requireOrganizationId(user);
    const currentMonthKey = todayCalendarDate().slice(0, 7);

    const [activeUsers, payments] = await Promise.all([
      this.activeUsers(),
      this.prisma.salaryPayment.findMany({ orderBy: { paidAt: "desc" } }),
    ]);

    const paidThisMonth = new Set(
      payments.filter((p) => p.monthKey === currentMonthKey).map((p) => p.userId),
    );

    const users = activeUsers.map((u) => ({
      id: u.id,
      name: u.name,
      salary: Number(u.salary),
      branchName: u.branch?.name ?? null,
      paid: paidThisMonth.has(u.id),
    }));

    const monthlyTotal = users.reduce((sum, u) => sum + u.salary, 0);
    const remaining = users.filter((u) => !u.paid);

    return {
      currentMonthKey,
      currentMonthLabel: monthLabel(currentMonthKey),
      currentMonthPaid: remaining.length === 0,
      monthlyTotal,
      activeUserCount: users.length,
      remainingCount: remaining.length,
      users,
      history: this.buildHistory(payments),
    };
  }

  /** Pay every active user not yet paid for the current month. */
  async runAll(user: CurrentUserPayload) {
    const currentMonthKey = todayCalendarDate().slice(0, 7);
    const active = await this.activeUsers();
    const alreadyPaid = new Set(
      (
        await this.prisma.salaryPayment.findMany({
          where: { monthKey: currentMonthKey },
          select: { userId: true },
        })
      ).map((p) => p.userId),
    );
    const toPay = active.filter((u) => !alreadyPaid.has(u.id));
    if (toPay.length === 0) {
      throw new ConflictException(
        `All staff have already been paid for ${monthLabel(currentMonthKey)}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const u of toPay) {
        await this.payOne(tx, user, u, currentMonthKey);
      }
    });

    return this.getStatus(user);
  }

  /** Pay a single user for the current month. */
  async payUser(userId: string, user: CurrentUserPayload) {
    const currentMonthKey = todayCalendarDate().slice(0, 7);
    const target = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        name: true,
        salary: true,
        branchId: true,
        branch: { select: { name: true } },
      },
    });
    if (!target) {
      throw new NotFoundException("Active user not found");
    }
    if (Number(target.salary) <= 0) {
      throw new BadRequestException("This user has no salary set");
    }

    const existing = await this.prisma.salaryPayment.findFirst({
      where: { userId, monthKey: currentMonthKey },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `${target.name} has already been paid for ${monthLabel(currentMonthKey)}.`,
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.payOne(tx, user, target, currentMonthKey);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `${target.name} has already been paid for ${monthLabel(currentMonthKey)}.`,
        );
      }
      throw error;
    }

    return this.getStatus(user);
  }

  /** Create the salary expense + payment record for one user (inside a tx). */
  private async payOne(
    tx: Prisma.TransactionClient,
    actor: CurrentUserPayload,
    target: ActiveUser,
    monthKey: string,
  ): Promise<void> {
    const organizationId = requireOrganizationId(actor);
    const label = monthLabel(monthKey);
    const category = await tx.expenseCategory.findFirst({
      where: { name: "Salaries" },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(
        'The "Salaries" expense category is missing. Re-run the seed.',
      );
    }

    const expense = await tx.expense.create({
      data: withOrganizationId(
        {
          title: `Salary — ${target.name} (${label})`,
          amount: target.salary,
          categoryId: category.id,
          branchId: target.branchId,
          expenseDate: calendarDateToDbDate(todayCalendarDate()),
          note: `Salary payment ${label}`,
          createdById: actor.id,
        },
        organizationId,
      ),
    });

    await tx.salaryPayment.create({
      data: withOrganizationId(
        {
          userId: target.id,
          userName: target.name,
          salary: target.salary,
          branchId: target.branchId,
          branchName: target.branch?.name ?? null,
          monthKey,
          expenseId: expense.id,
          paidById: actor.id,
        },
        organizationId,
      ),
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        organizationId,
        action: "SALARY_PAID",
        entityType: "salary_payment",
        entityId: target.id,
        branchId: target.branchId,
        oldValue: Prisma.JsonNull,
        newValue: { userId: target.id, monthKey, amount: Number(target.salary) },
      },
    });
  }

  private activeUsers(): Promise<ActiveUser[]> {
    return this.prisma.user.findMany({
      where: { isActive: true, salary: { gt: 0 } },
      select: {
        id: true,
        name: true,
        salary: true,
        branchId: true,
        branch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  private buildHistory(
    payments: Array<{
      monthKey: string;
      salary: Prisma.Decimal;
      userName: string;
      branchName: string | null;
      paidAt: Date;
      userId: string;
    }>,
  ) {
    const map = new Map<
      string,
      { total: number; users: Array<{ id: string; name: string; salary: number; branchName: string | null; paidAt: Date }> }
    >();
    for (const p of payments) {
      const entry = map.get(p.monthKey) ?? { total: 0, users: [] };
      entry.total += Number(p.salary);
      entry.users.push({
        id: p.userId,
        name: p.userName,
        salary: Number(p.salary),
        branchName: p.branchName,
        paidAt: p.paidAt,
      });
      map.set(p.monthKey, entry);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, v]) => ({
        monthKey,
        monthLabel: monthLabel(monthKey),
        totalAmount: v.total,
        userCount: v.users.length,
        users: v.users,
      }));
  }
}
