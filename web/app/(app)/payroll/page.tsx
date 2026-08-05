"use client";

import { useState } from "react";
import { BadgeCheck, Banknote, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import {
  usePayrollStatus,
  usePayUser,
  useRunPayroll,
} from "@/hooks/payroll/use-payroll";
import { fmt } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { PayrollStaff } from "@/types/payroll/payroll";

export default function PayrollPage() {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmUser, setConfirmUser] = useState<PayrollStaff | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data: status, isPending, isError, error } = usePayrollStatus();
  const runPayroll = useRunPayroll();
  const payUser = usePayUser();

  const handleRunAll = async () => {
    try {
      const res = await runPayroll.mutateAsync();
      addToast({
        title: `Salaries paid for ${res.currentMonthLabel}`,
        sub: "Recorded as Salaries expenses",
      });
      setConfirmAll(false);
    } catch (e) {
      addErrorToast({
        title: "Payroll failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
      setConfirmAll(false);
    }
  };

  const handlePayUser = async (staff: PayrollStaff) => {
    setPayingId(staff.id);
    try {
      await payUser.mutateAsync(staff.id);
      addToast({ title: `Paid ${staff.name}`, sub: fmt(staff.salary) });
      setConfirmUser(null);
    } catch (e) {
      addErrorToast({
        title: `Could not pay ${staff.name}`,
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setPayingId(null);
    }
  };

  const remaining = status?.remainingCount ?? 0;

  return (
    <>
      <PageHeader
        title="Payroll"
        desc="Pay monthly salaries — per staff or all at once, recorded as Salaries expenses"
        action={
          status ? (
            status.currentMonthPaid ? (
              <Button disabled title="Everyone is paid — unlocks next month">
                <BadgeCheck className="size-4" />
                {status.currentMonthLabel} paid
              </Button>
            ) : (
              <Button
                onClick={() => setConfirmAll(true)}
                disabled={runPayroll.isPending}
              >
                <Banknote className="size-4" />
                Pay all remaining ({remaining}) — {status.currentMonthLabel}
              </Button>
            )
          ) : null
        }
      />

      {isError && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error instanceof Error ? error.message : "Failed to load payroll."}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2.5">
              <Wallet className="size-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly payroll</p>
              <p className="text-xl font-bold tabular-nums">
                {status ? fmt(status.monthlyTotal) : "—"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2.5">
              <Users className="size-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Staff on payroll</p>
              <p className="text-xl font-bold tabular-nums">
                {status ? status.activeUserCount : "—"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2.5">
              <BadgeCheck className="size-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {status?.currentMonthLabel ?? "This month"}
              </p>
              <p className="text-xl font-bold">
                {status ? (
                  status.currentMonthPaid ? (
                    <Badge color="emerald">All paid</Badge>
                  ) : (
                    <Badge color="amber">{remaining} unpaid</Badge>
                  )
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Staff salaries with per-user Pay */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">
            Staff salaries — {status?.currentMonthLabel ?? "this month"}
          </h3>
          {(status?.users.length ?? 0) === 0 && !isPending ? (
            <p className="text-sm text-muted-foreground">No active staff.</p>
          ) : (
            <div className="grid gap-1.5">
              {(status?.users ?? []).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.storeName ?? "Head office"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {fmt(u.salary)}
                    </span>
                    {u.paid ? (
                      <Badge color="emerald">Paid</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setConfirmUser(u)}
                        disabled={payUser.isPending && payingId === u.id}
                      >
                        {payUser.isPending && payingId === u.id
                          ? "Paying…"
                          : "Pay"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Salaries are set per user on the Users page.
          </p>
        </Card>

        {/* Payment history */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Payment history</h3>
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (status?.history.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No salary payments yet.
            </p>
          ) : (
            <div className="grid gap-1.5">
              {status!.history.map((run) => (
                <div
                  key={run.monthKey}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{run.monthLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.userCount} staff paid
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {fmt(run.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {confirmAll && status ? (
        <ConfirmDialog
          title={`Pay all remaining staff for ${status.currentMonthLabel}?`}
          message={`This records a Salaries expense for each of the ${remaining} unpaid staff. Already-paid staff are skipped.`}
          confirmLabel={`Pay ${remaining} staff`}
          isLoading={runPayroll.isPending}
          onConfirm={() => void handleRunAll()}
          onClose={() => setConfirmAll(false)}
        />
      ) : null}

      {confirmUser && status ? (
        <ConfirmDialog
          title={`Pay ${confirmUser.name}?`}
          message={`This records a Salaries expense of ${fmt(confirmUser.salary)} for ${status.currentMonthLabel}.`}
          confirmLabel={`Pay ${fmt(confirmUser.salary)}`}
          isLoading={payUser.isPending}
          onConfirm={() => void handlePayUser(confirmUser)}
          onClose={() => setConfirmUser(null)}
        />
      ) : null}
    </>
  );
}
