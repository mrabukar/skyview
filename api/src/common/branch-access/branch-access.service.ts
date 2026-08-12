import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assigned branch ids for a manager (join table ∪ primary User.branchId).
   * Non-managers get [].
   */
  async getBranchIds(
    userId: string,
    role: UserRole,
    primaryBranchId: string | null | undefined,
  ): Promise<string[]> {
    if (role !== UserRole.branch_manager) {
      return [];
    }

    const rows = await this.prisma.branchManagerAssignment.findMany({
      where: { userId },
      select: { branchId: true },
    });

    const ids = new Set(rows.map((r) => r.branchId));
    if (primaryBranchId) {
      ids.add(primaryBranchId);
    }
    return [...ids];
  }
}
