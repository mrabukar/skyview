-- Performance indexes for org-scoped date-range queries (reports, lists, audit).

CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "audit_log"("organizationId", "createdAt");

CREATE INDEX "user_organizationId_idx" ON "user"("organizationId");

CREATE INDEX "expense_organizationId_expenseDate_idx" ON "expense"("organizationId", "expenseDate");

CREATE INDEX "purchase_organizationId_purchaseDate_idx" ON "purchase"("organizationId", "purchaseDate");

CREATE INDEX "pos_order_organizationId_status_createdAt_idx" ON "pos_order"("organizationId", "status", "createdAt");

CREATE INDEX "pos_order_organizationId_branchId_createdAt_idx" ON "pos_order"("organizationId", "branchId", "createdAt");

CREATE INDEX "receipt_organizationId_createdAt_idx" ON "receipt"("organizationId", "createdAt");

CREATE INDEX "receipt_branchId_createdAt_idx" ON "receipt"("branchId", "createdAt");
