"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox, MultiCombobox } from "@/components/ui/combobox";
import { PageHeader } from "@/components/ui/page-header";
import { MANAGER_PAGES } from "@/lib/auth/pages";
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "@/lib/auth/password";
import { cn } from "@/lib/utils";
import { SHIFT_DAY_OPTIONS } from "@/lib/format-shift";
import { useCreateUser } from "@/hooks/users/use-create-user";
import { useSession } from "@/hooks/auth/session";
import { useStores } from "@/hooks/stores/list-stores";
import { useAppStore } from "@/store/app";
import { ROLE_ITEMS, type UserRole } from "@/types/users/user";

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// ── Form field helper ─────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium leading-none">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {helper && !error ? (
        <p className="text-sm text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionTitle({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {desc ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      ) : null}
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  storeIds: string[];
  phone: string;
  salary: string;
  disabledPages: string[];
  shiftDays: string[];
  shiftStartTime: string;
  shiftEndTime: string;
  maxDiscountPercent: string;
}

const INITIAL: FormValues = {
  name: "",
  email: "",
  password: "",
  role: "branch_manager",
  storeIds: [],
  phone: "",
  salary: "",
  disabledPages: [],
  shiftDays: [],
  shiftStartTime: "",
  shiftEndTime: "",
  maxDiscountPercent: "",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewUserPage() {
  const router = useRouter();
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const { user: sessionUser } = useSession();
  const hasStores = sessionUser?.hasStores ?? true;

  const { data: storesData } = useStores({ limit: 100 });
  const createUser = useCreateUser();

  const [form, setForm] = useState<FormValues>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<Partial<Record<keyof FormValues, string>>>({});

  const storeItems = useMemo(
    () =>
      (storesData?.data ?? []).map((store) => ({
        value: store.id,
        label: store.name,
      })),
    [storesData],
  );

  const roleItems = useMemo(() => {
    const items = ROLE_ITEMS.map((item) => ({
      value: item.value,
      label: item.label,
    }));
    return hasStores
      ? items
      : items.filter(
          (item) => item.value !== "branch_manager" && item.value !== "cashier",
        );
  }, [hasStores]);

  const set = (key: keyof FormValues, value: string) => {
    setForm((s) => ({ ...s, [key]: value }));
    setErr((e) => ({ ...e, [key]: undefined }));
  };

  const setRole = (role: UserRole | undefined) => {
    const nextRole = role ?? "branch_manager";
    setForm((s) => ({
      ...s,
      role: nextRole,
      storeIds:
        nextRole === "admin"
          ? []
          : nextRole === "cashier"
            ? s.storeIds.slice(0, 1)
            : s.storeIds,
      disabledPages: nextRole === "branch_manager" ? s.disabledPages : [],
    }));
  };

  const togglePage = (key: string) =>
    setForm((s) => ({
      ...s,
      disabledPages: s.disabledPages.includes(key)
        ? s.disabledPages.filter((k) => k !== key)
        : [...s.disabledPages, key],
    }));

  const toggleShiftDay = (day: string) =>
    setForm((s) => ({
      ...s,
      shiftDays: s.shiftDays.includes(day)
        ? s.shiftDays.filter((d) => d !== day)
        : [...s.shiftDays, day],
    }));

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): typeof err => {
    const next: typeof err = {};

    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) next.email = "Email is required";

    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 8)
      next.password = "Password must be at least 8 characters";
    else if (!isStrongPassword(form.password))
      next.password = STRONG_PASSWORD_MESSAGE;

    if (hasStores && form.role === "branch_manager" && form.storeIds.length === 0) {
      next.storeIds = "Select at least one branch";
    }

    if (hasStores && form.role === "cashier") {
      if (form.storeIds.length === 0) next.storeIds = "Select a branch";
      if (form.shiftDays.length === 0)
        next.shiftDays = "Select at least one working day";
      if (!form.shiftStartTime) next.shiftStartTime = "Start time is required";
      if (!form.shiftEndTime) next.shiftEndTime = "End time is required";
      else if (form.shiftStartTime && form.shiftEndTime <= form.shiftStartTime)
        next.shiftEndTime = "End time must be after start time";
      if (form.maxDiscountPercent) {
        const n = Number(form.maxDiscountPercent);
        if (Number.isNaN(n) || n < 0 || n > 100)
          next.maxDiscountPercent = "Must be between 0 and 100";
      }
    }

    if (form.salary && Number(form.salary) < 0) {
      next.salary = "Salary cannot be negative";
    }

    return next;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const nextErr = validate();
    setErr(nextErr);
    if (Object.keys(nextErr).length) return;

    try {
      await createUser.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        storeIds:
          form.role === "branch_manager" ? form.storeIds : undefined,
        storeId:
          form.role === "branch_manager" || form.role === "cashier"
            ? form.storeIds[0]
            : undefined,
        phone: form.phone.trim() || undefined,
        salary: form.salary ? Number(form.salary) : 0,
        disabledPages:
          form.role === "branch_manager" ? form.disabledPages : undefined,
        ...(form.role === "cashier"
          ? {
              shiftDays: form.shiftDays,
              shiftStartTime: form.shiftStartTime.slice(0, 5),
              shiftEndTime: form.shiftEndTime.slice(0, 5),
              ...(form.maxDiscountPercent.trim()
                ? { maxDiscountPercent: Number(form.maxDiscountPercent) }
                : {}),
            }
          : {}),
      });
      addToast({ title: "User added successfully" });
      router.push("/users");
    } catch (e) {
      addErrorToast({
        title: "Failed to create user",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const isSaving = createUser.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Add User"
        desc="Create an admin, branch manager, or cashier account."
      />

      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/users">
            <ArrowLeft className="size-4" />
            Back to users
          </Link>
        </Button>
      </div>

      <Card className="pb-0">
        <div className="p-6 pb-8 sm:p-8 sm:pb-10">
          <div className="space-y-10">
            {/* ── Section 1: Account ────────────────────────────────────── */}
            <section>
              <SectionTitle
                title="Account"
                desc="Basic credentials for the new user."
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Name" required error={err.name}>
                  <input
                    className={cn(inputCls, err.name && "border-destructive")}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Full name"
                  />
                </FormField>

                <FormField label="Email" required error={err.email}>
                  <input
                    className={cn(inputCls, err.email && "border-destructive")}
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="name@company.com"
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField
                    label="Password"
                    required
                    error={err.password}
                    helper={STRONG_PASSWORD_MESSAGE}
                  >
                    <div className="relative">
                      <input
                        className={cn(
                          inputCls,
                          "pr-10",
                          err.password && "border-destructive",
                        )}
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPassword((s) => !s)}
                        tabIndex={-1}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormField>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            {/* ── Section 2: Role & Branches ────────────────────────────── */}
            <section>
              <SectionTitle
                title="Role & Branch Assignment"
                desc="Define the user's role and which branches they can access."
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Role" required>
                  <Combobox
                    value={form.role}
                    onValueChange={(value) =>
                      setRole(value as UserRole | undefined)
                    }
                    items={roleItems}
                    placeholder="Select role"
                    searchPlaceholder="Search roles…"
                    emptyText="No roles found."
                    className="w-full"
                  />
                </FormField>

                {hasStores && form.role === "branch_manager" ? (
                  <FormField label="Branches" required error={err.storeIds}>
                    <MultiCombobox
                      values={form.storeIds}
                      onValuesChange={(storeIds) =>
                        setForm((s) => ({ ...s, storeIds }))
                      }
                      items={storeItems}
                      placeholder="Select branches"
                      searchPlaceholder="Search branches…"
                      emptyText="No branches found."
                      className="w-full"
                    />
                  </FormField>
                ) : null}

                {hasStores && form.role === "cashier" ? (
                  <FormField label="Branch" required error={err.storeIds}>
                    <Combobox
                      value={form.storeIds[0]}
                      onValueChange={(value) =>
                        setForm((s) => ({
                          ...s,
                          storeIds: value ? [value] : [],
                        }))
                      }
                      items={storeItems}
                      placeholder="Select branch"
                      searchPlaceholder="Search branches…"
                      emptyText="No branches found."
                      className="w-full"
                    />
                  </FormField>
                ) : null}
              </div>
            </section>

            {/* ── Section 3: Module Access (managers only) ──────────────── */}
            {hasStores && form.role === "branch_manager" ? (
              <>
                <hr className="border-border" />
                <section>
                  <SectionTitle
                    title="Module Access"
                    desc="Unchecked modules are hidden from this manager's sidebar."
                  />
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {MANAGER_PAGES.map((page) => {
                      const enabled = !form.disabledPages.includes(page.key);
                      return (
                        <label
                          key={page.key}
                          className="flex items-center gap-2.5 rounded-md border border-input px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={enabled}
                            onChange={() => togglePage(page.key)}
                          />
                          <span>{page.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : null}

            {/* ── Section 4: Shift Schedule (cashiers only) ─────────────── */}
            {form.role === "cashier" ? (
              <>
                <hr className="border-border" />
                <section>
                  <SectionTitle
                    title="Shift Schedule"
                    desc="Define this cashier's working days and hours."
                  />
                  <div className="grid gap-5">
                    <FormField
                      label="Working days"
                      required
                      error={err.shiftDays}
                    >
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                        {SHIFT_DAY_OPTIONS.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={form.shiftDays.includes(day.value)}
                              onChange={() => toggleShiftDay(day.value)}
                            />
                            <span>{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </FormField>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <FormField
                        label="Shift start"
                        required
                        error={err.shiftStartTime}
                      >
                        <input
                          className={cn(
                            inputCls,
                            err.shiftStartTime && "border-destructive",
                          )}
                          type="time"
                          value={form.shiftStartTime}
                          onChange={(e) =>
                            set("shiftStartTime", e.target.value)
                          }
                        />
                      </FormField>
                      <FormField
                        label="Shift end"
                        required
                        error={err.shiftEndTime}
                      >
                        <input
                          className={cn(
                            inputCls,
                            err.shiftEndTime && "border-destructive",
                          )}
                          type="time"
                          value={form.shiftEndTime}
                          onChange={(e) => set("shiftEndTime", e.target.value)}
                        />
                      </FormField>
                      <FormField
                        label="Max discount (%)"
                        error={err.maxDiscountPercent}
                        helper="Leave blank if no discount cap."
                      >
                        <input
                          className={cn(
                            inputCls,
                            err.maxDiscountPercent && "border-destructive",
                          )}
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={form.maxDiscountPercent}
                          onChange={(e) =>
                            set("maxDiscountPercent", e.target.value)
                          }
                          placeholder="e.g. 10"
                        />
                      </FormField>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            <hr className="border-border" />

            {/* ── Section 5: Compensation ───────────────────────────────── */}
            <section>
              <SectionTitle
                title="Compensation & Contact"
                desc="Salary and contact info for payroll purposes."
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Phone">
                  <input
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="Optional"
                  />
                </FormField>

                <FormField
                  label="Monthly salary (KSh)"
                  error={err.salary}
                  helper="Used by the monthly payroll run."
                >
                  <input
                    className={cn(
                      inputCls,
                      err.salary && "border-destructive",
                    )}
                    type="number"
                    min="0"
                    step="1"
                    value={form.salary}
                    onChange={(e) => set("salary", e.target.value)}
                    placeholder="e.g. 25000"
                  />
                </FormField>
              </div>
            </section>
          </div>
        </div>

        {/* ── Footer with actions ──────────────────────────────────────── */}
        <div className="sticky bottom-0 flex justify-end gap-3 rounded-b-[inherit] border-t border-border bg-background px-6 py-4 sm:px-8">
          <Button variant="outline" asChild disabled={isSaving}>
            <Link href="/users">Cancel</Link>
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSaving}
          >
            {isSaving ? "Creating…" : "Create User"}
          </Button>
        </div>
      </Card>
    </>
  );
}
