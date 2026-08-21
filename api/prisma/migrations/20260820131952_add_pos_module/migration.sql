-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'cancelled', 'voided');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'mpesa', 'card');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MENU_CATEGORY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_CATEGORY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_CATEGORY_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_SIZE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_SIZE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_SIZE_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'TOPPING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TOPPING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TOPPING_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'BRANCH_MENU_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'BRANCH_TOPPING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_ORDER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_ORDER_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'POS_ORDER_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'POS_ORDER_VOIDED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'cashier';

-- AlterTable
ALTER TABLE "branch" ADD COLUMN     "nextPosOrderNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "posEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "maxDiscountPercent" DECIMAL(5,2),
ADD COLUMN     "shiftDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shiftEndTime" TEXT,
ADD COLUMN     "shiftStartTime" TEXT;

-- CreateTable
CREATE TABLE "branch_menu_item" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isInStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_menu_item_price" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "menuItemSizeId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_menu_item_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_topping" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "toppingId" TEXT NOT NULL,
    "isInStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_topping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_size" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "paymentMethod" "PaymentMethod",
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(12,2),
    "discountAmount" DECIMAL(12,2),
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "cashierId" TEXT NOT NULL,
    "voidedById" TEXT,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "menuItemSizeId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "sizeName" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "toppingsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_topping" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "toppingId" TEXT NOT NULL,
    "toppingName" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_line_topping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_menu_item_branchId_idx" ON "branch_menu_item"("branchId");

-- CreateIndex
CREATE INDEX "branch_menu_item_menuItemId_idx" ON "branch_menu_item"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_menu_item_branchId_menuItemId_key" ON "branch_menu_item"("branchId", "menuItemId");

-- CreateIndex
CREATE INDEX "branch_menu_item_price_branchId_idx" ON "branch_menu_item_price"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_menu_item_price_branchId_menuItemSizeId_key" ON "branch_menu_item_price"("branchId", "menuItemSizeId");

-- CreateIndex
CREATE INDEX "branch_topping_branchId_idx" ON "branch_topping"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_topping_branchId_toppingId_key" ON "branch_topping"("branchId", "toppingId");

-- CreateIndex
CREATE INDEX "menu_category_organizationId_idx" ON "menu_category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "menu_category_name_organizationId_key" ON "menu_category"("name", "organizationId");

-- CreateIndex
CREATE INDEX "menu_item_organizationId_idx" ON "menu_item"("organizationId");

-- CreateIndex
CREATE INDEX "menu_item_categoryId_idx" ON "menu_item"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_name_organizationId_key" ON "menu_item"("name", "organizationId");

-- CreateIndex
CREATE INDEX "menu_item_size_menuItemId_idx" ON "menu_item_size"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_size_menuItemId_name_key" ON "menu_item_size"("menuItemId", "name");

-- CreateIndex
CREATE INDEX "pos_order_organizationId_idx" ON "pos_order"("organizationId");

-- CreateIndex
CREATE INDEX "pos_order_branchId_idx" ON "pos_order"("branchId");

-- CreateIndex
CREATE INDEX "pos_order_cashierId_idx" ON "pos_order"("cashierId");

-- CreateIndex
CREATE INDEX "pos_order_status_idx" ON "pos_order"("status");

-- CreateIndex
CREATE INDEX "pos_order_createdAt_idx" ON "pos_order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pos_order_branchId_orderNumber_key" ON "pos_order"("branchId", "orderNumber");

-- CreateIndex
CREATE INDEX "order_line_orderId_idx" ON "order_line"("orderId");

-- CreateIndex
CREATE INDEX "order_line_menuItemId_idx" ON "order_line"("menuItemId");

-- CreateIndex
CREATE INDEX "order_line_topping_orderLineId_idx" ON "order_line_topping"("orderLineId");

-- CreateIndex
CREATE INDEX "topping_organizationId_idx" ON "topping"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "topping_name_organizationId_key" ON "topping"("name", "organizationId");

-- AddForeignKey
ALTER TABLE "branch_menu_item" ADD CONSTRAINT "branch_menu_item_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_item" ADD CONSTRAINT "branch_menu_item_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_item_price" ADD CONSTRAINT "branch_menu_item_price_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_item_price" ADD CONSTRAINT "branch_menu_item_price_menuItemSizeId_fkey" FOREIGN KEY ("menuItemSizeId") REFERENCES "menu_item_size"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_topping" ADD CONSTRAINT "branch_topping_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_topping" ADD CONSTRAINT "branch_topping_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "topping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_category" ADD CONSTRAINT "menu_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_category" ADD CONSTRAINT "menu_category_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "menu_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_size" ADD CONSTRAINT "menu_item_size_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order" ADD CONSTRAINT "pos_order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order" ADD CONSTRAINT "pos_order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order" ADD CONSTRAINT "pos_order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_order" ADD CONSTRAINT "pos_order_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pos_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_menuItemSizeId_fkey" FOREIGN KEY ("menuItemSizeId") REFERENCES "menu_item_size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_topping" ADD CONSTRAINT "order_line_topping_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_topping" ADD CONSTRAINT "order_line_topping_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "topping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topping" ADD CONSTRAINT "topping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topping" ADD CONSTRAINT "topping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
