"use client";

import { useState } from "react";
import { BadgeCheck, Banknote, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { usePayrollStatus, useRunPayroll } from "@/hooks/payroll/use-payroll";
import { useUsers } from "@/hooks/users/use-users";
import { fmt } from "@/lib/utils";
import { useAppStore } from "@/store/app";

export default function PayrollPage() {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: status, isPending, isError, error } = usePayrollStatus();
  const { data: usersData } = useUsers({ limit: 100, isActive: true });
  const runPayroll = useRunPayroll();

  const activeUsers = (usersData?.data ?? []).filter((u) => u.isActive);

  const handleRun = async () => {
    if (!status) return;
    try {
      const run = await runPayroll.mutateAsync({ monthKey: status.currentMonthKey });
      addToast({
        title: `Salaries paid for ${run.monthLabel}`,
        sub: `${run.userCount} staff · ${fmt(run.totalAmount)} recorded as expenses`,
      });
      setConfirmOpen(false);
    } catch (e) {
      addErrorToast({
        title: "Payroll failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Payroll"
        desc="Pay monthly salaries — one run per month, recorded as Salaries expenses"
        action={
          status ? (
            status.currentMonthPaid ? (
              <Button disabled title="Already paid — unlocks next month">
                <BadgeCheck className="size-4" />
                {status.currentMonthLabel} paid
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)} disabled={runPayroll.isPending}>
                <Banknote className="size-4" />
                Pay salaries — {status.currentMonthLabel}
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

      {/* Summary cards */}
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
              <p className="text-sm text-muted-foreground">{status?.currentMonthLabel ?? "This month"}</p>
              <p className="text-xl font-bold">
                {status ? (
                  status.currentMonthPaid ? (
                    <Badge color="emerald">Paid</Badge>
                  ) : (
                    <Badge color="amber">Not paid yet</Badge>
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
        {/* Staff salaries */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Staff salaries</h3>
          {activeUsers.length === 0 && !isPending ? (
            <p className="text-sm text-muted-foreground">No active staff.</p>
          ) : (
            <div className="grid gap-1.5">
              {activeUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.store?.name ?? "Head office"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {fmt(u.salary ?? 0)}
                  </span>
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
          ) : (status?.runs.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
          ) : (
            <div className="grid gap-1.5">
              {status!.runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{run.monthLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.userCount} staff · paid {run.paidAt.slice(0, 10)} by {run.paidBy.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {fmt(run.totalAmount)}
                    </span>
                    <Badge color="emerald">Paid</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {confirmOpen && status ? (
        <ConfirmDialog
          title={`Pay salaries for ${status.currentMonthLabel}?`}
          message={`This records a Salaries expense for each of the ${status.activeUserCount} active staff (total ${fmt(status.monthlyTotal)}). It can only be done once per month.`}
          confirmLabel="Pay salaries"
          isLoading={runPayroll.isPending}
          onConfirm={() => void handleRun()}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
  );
}
