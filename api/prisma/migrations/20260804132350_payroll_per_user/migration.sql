/*
  Warnings:

  - You are about to drop the column `payrollRunId` on the `expense` table. All the data in the column will be lost.
  - You are about to drop the `payroll_run` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_run_item` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SALARY_PAID';

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_payrollRunId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run" DROP CONSTRAINT "payroll_run_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run" DROP CONSTRAINT "payroll_run_paidById_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run_item" DROP CONSTRAINT "payroll_run_item_runId_fkey";

-- DropForeignKey
ALTER TABLE "payroll_run_item" DROP CONSTRAINT "payroll_run_item_userId_fkey";

-- DropIndex
DROP INDEX "expense_payrollRunId_idx";

-- AlterTable
ALTER TABLE "expense" DROP COLUMN "payrollRunId";

-- DropTable
DROP TABLE "payroll_run";

-- DropTable
DROP TABLE "payroll_run_item";

-- CreateTable
CREATE TABLE "salary_payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "branchId" TEXT,
    "branchName" TEXT,
    "monthKey" TEXT NOT NULL,
    "expenseId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" TEXT NOT NULL,

    CONSTRAINT "salary_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_payment_organizationId_monthKey_idx" ON "salary_payment"("organizationId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "salary_payment_organizationId_userId_monthKey_key" ON "salary_payment"("organizationId", "userId", "monthKey");
