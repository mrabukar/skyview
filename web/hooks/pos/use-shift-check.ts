"use client";

import { useAppStore } from "@/store/app";

export interface ShiftStatus {
  /** True if the current cashier is within their shift window right now. */
  onShift: boolean;
  /**
   * Human-readable message when onShift is false.
   * null when the user is on shift or is not a cashier.
   */
  message: string | null;
  /** True when the current user is a cashier (regardless of shift status). */
  isCashier: boolean;
}

/**
 * Derives the current cashier's shift status from the session user stored in
 * the app store. The `onShift` flag is set server-side in GET /api/me and
 * reflects whether the cashier is within their configured shift window at the
 * time the session was last fetched.
 *
 * For non-cashier roles, `isCashier` is false and `onShift` is false.
 */
export function useShiftCheck(): ShiftStatus {
  const user = useAppStore((s) => s.user);

  if (!user || user.role !== "cashier") {
    return { onShift: false, message: null, isCashier: false };
  }

  const onShift = user.onShift === true;

  let message: string | null = null;
  if (!onShift) {
    if (!user.shiftDays?.length || !user.shiftStartTime || !user.shiftEndTime) {
      message = "Your shift schedule has not been configured";
    } else {
      message = `Your shift hours are ${user.shiftStartTime}–${user.shiftEndTime}`;
    }
  }

  return { onShift, message, isCashier: true };
}
