"use client";

import { useMemo, useState } from "react";
import { Dialog } from "radix-ui";
import { Eye, EyeOff, X } from "lucide-react";

import { CameraCapturePanel } from "@/components/receipts/camera-capture-panel";
import { Button } from "@/components/ui/button";
import { Combobox, MultiCombobox } from "@/components/ui/combobox";
import { MANAGER_PAGES } from "@/lib/auth/pages";
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "@/lib/auth/password";
import { cn } from "@/lib/utils";
import { ROLE_ITEMS, type User, type UserRole } from "@/types/users/user";
import { SHIFT_DAY_OPTIONS } from "@/lib/format-shift";
import { UserAttachmentsManager } from "./user-attachments-manager";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  /** Assigned branches; first is primary. Cashiers use a single id. */
  storeIds: string[];
  phone: string;
  salary: string;
  /** Page keys hidden from this branch manager. */
  disabledPages: string[];
  shiftDays: string[];
  shiftStartTime: string;
  shiftEndTime: string;
  /** Empty string = no discount cap. */
  maxDiscountPercent: string;
}

interface UserModalProps {
  open: boolean;
  mode: "add" | "edit";
  user?: User;
  storeItems: { value: string; label: string }[];
  showStoreField?: boolean;
  hideRoleField?: boolean;
  withPasswordConfirm?: boolean;
  onClose: () => void;
  onSave: (data: UserFormValues) => void;
  isSaving: boolean;
}

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

const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const dialogContentClassName = cn(
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200 max-h-[90dvh] overflow-y-auto",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  "sm:rounded-lg",
);

function initialForm(user?: User): UserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "branch_manager",
    storeIds:
      user?.storeIds?.length
        ? user.storeIds
        : user?.storeId
          ? [user.storeId]
          : [],
    phone: user?.phone ?? "",
    salary: user?.salary != null ? String(user.salary) : "",
    disabledPages: user?.disabledPages ?? [],
    shiftDays: user?.shiftDays ?? [],
    shiftStartTime: user?.shiftStartTime ?? "",
    shiftEndTime: user?.shiftEndTime ?? "",
    maxDiscountPercent:
      user?.maxDiscountPercent != null ? String(user.maxDiscountPercent) : "",
  };
}

export function UserModal({
  open,
  mode,
  user,
  storeItems,
  showStoreField = true,
  hideRoleField = false,
  withPasswordConfirm = false,
  onClose,
  onSave,
  isSaving,
}: UserModalProps) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<UserFormValues>(() => initialForm(user));
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [err, setErr] = useState<Partial<Record<keyof UserFormValues, string>>>(
    {},
  );
  const [confirmErr, setConfirmErr] = useState<string | undefined>();
  // Swaps the dialog body for CameraCapturePanel (no nested Dialog on mobile).
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraCapture, setCameraCapture] = useState<
    ((file: File) => void) | null
  >(null);

  const openCamera = (onCapture: (file: File) => void) => {
    setCameraCapture(() => onCapture);
    setCameraOpen(true);
  };

  const roleItems = useMemo(() => {
    const items = ROLE_ITEMS.map((item) => ({
      value: item.value,
      label: item.label,
    }));
    return showStoreField
      ? items
      : items.filter(
          (item) => item.value !== "branch_manager" && item.value !== "cashier",
        );
  }, [showStoreField]);

  const set = (key: keyof UserFormValues, value: string) =>
    setForm((state) => ({ ...state, [key]: value }));

  const togglePage = (key: string) =>
    setForm((state) => ({
      ...state,
      disabledPages: state.disabledPages.includes(key)
        ? state.disabledPages.filter((k) => k !== key)
        : [...state.disabledPages, key],
    }));

  const setRole = (role: UserRole | undefined) => {
    const nextRole = role ?? "branch_manager";
    setForm((state) => ({
      ...state,
      role: nextRole,
      storeIds:
        nextRole === "admin"
          ? []
          : nextRole === "cashier"
            ? state.storeIds.slice(0, 1)
            : state.storeIds,
      disabledPages: nextRole === "branch_manager" ? state.disabledPages : [],
    }));
  };

  const toggleShiftDay = (day: string) =>
    setForm((state) => ({
      ...state,
      shiftDays: state.shiftDays.includes(day)
        ? state.shiftDays.filter((d) => d !== day)
        : [...state.shiftDays, day],
    }));

  const save = () => {
    const next: Partial<Record<keyof UserFormValues, string>> = {};

    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) next.email = "Email is required";

    if (!isEdit) {
      if (!form.password) next.password = "Password is required";
      else if (form.password.length < 8)
        next.password = "Password must be at least 8 characters";
      else if (!isStrongPassword(form.password))
        next.password = STRONG_PASSWORD_MESSAGE;
    } else if (form.password) {
      if (form.password.length < 8)
        next.password = "Password must be at least 8 characters";
      else if (!isStrongPassword(form.password))
        next.password = STRONG_PASSWORD_MESSAGE;
    }

    if (showStoreField && form.role === "branch_manager" && form.storeIds.length === 0) {
      next.storeIds = "Select at least one branch";
    }

    if (showStoreField && form.role === "cashier") {
      if (form.storeIds.length === 0) next.storeIds = "Select a branch";
      if (form.shiftDays.length === 0) next.shiftDays = "Select at least one working day";
      if (!form.shiftStartTime) next.shiftStartTime = "Start time is required";
      if (!form.shiftEndTime) next.shiftEndTime = "End time is required";
      else if (form.shiftStartTime && form.shiftEndTime <= form.shiftStartTime) {
        next.shiftEndTime = "End time must be after start time";
      }
      if (form.maxDiscountPercent) {
        const n = Number(form.maxDiscountPercent);
        if (Number.isNaN(n) || n < 0 || n > 100) {
          next.maxDiscountPercent = "Must be between 0 and 100";
        }
      }
    }

    if (form.salary && Number(form.salary) < 0) {
      next.salary = "Salary cannot be negative";
    }

    setErr(next);
    let nextConfirmErr: string | undefined;
    if (
      withPasswordConfirm &&
      form.password &&
      form.password !== confirmPassword
    ) {
      nextConfirmErr = "Passwords do not match";
    } else if (
      withPasswordConfirm &&
      !isEdit &&
      form.password !== confirmPassword
    ) {
      nextConfirmErr = "Passwords do not match";
    }
    setConfirmErr(nextConfirmErr);

    if (Object.keys(next).length || nextConfirmErr) return;

    onSave({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      shiftStartTime: form.shiftStartTime.slice(0, 5),
      shiftEndTime: form.shiftEndTime.slice(0, 5),
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (cameraOpen) {
            setCameraOpen(false);
            setCameraCapture(null);
            return;
          }
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={dialogContentClassName}>
          <div className="flex flex-col gap-1.5 text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {cameraOpen
                ? "Take a photo"
                : isEdit
                  ? "Edit User"
                  : "Add User"}
            </Dialog.Title>
            <Dialog.Description
              className={cn(
                "text-sm text-muted-foreground",
                cameraOpen && "sr-only",
              )}
            >
              {cameraOpen
                ? "Capture a document photo for this user."
                : isEdit
                  ? "Update account details. Leave password blank to keep the current one."
                  : "Create an admin, branch manager, or cashier account."}
            </Dialog.Description>
          </div>

          {cameraOpen ? (
            <CameraCapturePanel
              onCapture={(file) => {
                cameraCapture?.(file);
                setCameraOpen(false);
                setCameraCapture(null);
              }}
              onClose={() => {
                setCameraOpen(false);
                setCameraCapture(null);
              }}
            />
          ) : (
          <div className="grid gap-4 py-2">
            <FormField label="Name" required error={err.name}>
              <input
                className={cn(inputClassName, err.name && "border-destructive")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Full name"
              />
            </FormField>

            <FormField label="Email" required error={err.email}>
              <input
                className={cn(
                  inputClassName,
                  err.email && "border-destructive",
                )}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@company.com"
              />
            </FormField>

            <FormField
              label="Password"
              required={!isEdit}
              error={err.password}
              helper={
                isEdit
                  ? "Leave blank to keep the current password."
                  : STRONG_PASSWORD_MESSAGE
              }
            >
              <div className="relative">
                <input
                  className={cn(
                    inputClassName,
                    "pr-10",
                    err.password && "border-destructive",
                  )}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => {
                    set("password", e.target.value);
                    setConfirmErr(undefined);
                  }}
                  placeholder={isEdit ? "Unchanged" : "Min. 8 characters"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((show) => !show)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </FormField>

            {withPasswordConfirm ? (
              <FormField
                label="Confirm password"
                required={!isEdit || Boolean(form.password)}
                error={confirmErr}
              >
                <div className="relative">
                  <input
                    className={cn(
                      inputClassName,
                      "pr-10",
                      confirmErr && "border-destructive",
                    )}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmErr(undefined);
                    }}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowConfirmPassword((show) => !show)}
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </FormField>
            ) : null}

            {!hideRoleField ? (
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
                  popoverClassName="z-[200]"
                />
              </FormField>
            ) : null}

            {showStoreField && form.role === "branch_manager" ? (
              <FormField
                label="Branches"
                required
                error={err.storeIds}
              >
                <MultiCombobox
                  values={form.storeIds}
                  onValuesChange={(storeIds) =>
                    setForm((state) => ({ ...state, storeIds }))
                  }
                  items={storeItems}
                  placeholder="Select branches"
                  searchPlaceholder="Search branches…"
                  emptyText="No branches found."
                  className="w-full"
                  popoverClassName="z-[200]"
                />
              </FormField>
            ) : null}

            {showStoreField && form.role === "cashier" ? (
              <FormField label="Branch" required error={err.storeIds}>
                <Combobox
                  value={form.storeIds[0]}
                  onValueChange={(value) =>
                    setForm((state) => ({
                      ...state,
                      storeIds: value ? [value] : [],
                    }))
                  }
                  items={storeItems}
                  placeholder="Select branch"
                  searchPlaceholder="Search branches…"
                  emptyText="No branches found."
                  className="w-full"
                  popoverClassName="z-[200]"
                />
              </FormField>
            ) : null}

            {showStoreField && form.role === "branch_manager" ? (
              <FormField
                label="Modules this manager can access"
                helper="Unchecked modules are hidden from this manager."
              >
                <div className="grid gap-1.5">
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
              </FormField>
            ) : null}

            {form.role === "cashier" ? (
              <>
                <FormField
                  label="Working days"
                  required
                  error={err.shiftDays}
                >
                  <div className="grid gap-1.5">
                    {SHIFT_DAY_OPTIONS.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center gap-2.5 rounded-md border border-input px-3 py-2 text-sm"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Shift start"
                    required
                    error={err.shiftStartTime}
                  >
                    <input
                      className={cn(
                        inputClassName,
                        err.shiftStartTime && "border-destructive",
                      )}
                      type="time"
                      value={form.shiftStartTime}
                      onChange={(e) => set("shiftStartTime", e.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Shift end"
                    required
                    error={err.shiftEndTime}
                  >
                    <input
                      className={cn(
                        inputClassName,
                        err.shiftEndTime && "border-destructive",
                      )}
                      type="time"
                      value={form.shiftEndTime}
                      onChange={(e) => set("shiftEndTime", e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField
                  label="Max discount (%)"
                  error={err.maxDiscountPercent}
                  helper="Leave blank if this cashier cannot apply discounts."
                >
                  <input
                    className={cn(
                      inputClassName,
                      err.maxDiscountPercent && "border-destructive",
                    )}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.maxDiscountPercent}
                    onChange={(e) => set("maxDiscountPercent", e.target.value)}
                    placeholder="e.g. 10"
                  />
                </FormField>
              </>
            ) : null}

            <FormField label="Phone">
              <input
                className={inputClassName}
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
                  inputClassName,
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

            {isEdit && user?.id ? (
              <UserAttachmentsManager
                userId={user.id}
                onRequestCamera={openCamera}
              />
            ) : null}
          </div>
          )}

          {!cameraOpen ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Add User"}
            </Button>
          </div>
          ) : null}

          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => {
              if (cameraOpen) {
                setCameraOpen(false);
                setCameraCapture(null);
                return;
              }
              onClose();
            }}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
