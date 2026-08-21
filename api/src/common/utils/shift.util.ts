import { DateTime } from "luxon";
import { getAppTimezone } from "./app-timezone.util";

export interface ShiftStatus {
  onShift: boolean;
  /** Human-readable explanation, present only when onShift is false. */
  message?: string;
}

/**
 * Determines whether a cashier is currently within their shift window.
 *
 * Shift days are stored as lowercase weekday names
 * (e.g. ["monday", "tuesday", "saturday"]).
 * Times are stored as "HH:mm" strings in the app timezone (Africa/Nairobi).
 * No overnight shifts (BR-POS-1.3): shiftStartTime < shiftEndTime always.
 *
 * @param shiftDays       - Weekday names the cashier works.
 * @param shiftStartTime  - Start of shift window, "HH:mm".
 * @param shiftEndTime    - End of shift window, "HH:mm".
 * @param _now            - Overrides the current instant; used in tests.
 */
export function isOnShift(
  shiftDays: string[],
  shiftStartTime: string | null | undefined,
  shiftEndTime: string | null | undefined,
  _now?: DateTime,
): ShiftStatus {
  if (!shiftDays.length || !shiftStartTime || !shiftEndTime) {
    return { onShift: false, message: "Shift schedule not configured" };
  }

  const tz = getAppTimezone();
  const now = (_now ?? DateTime.now()).setZone(tz);

  // Luxon weekdayLong: "Monday" … "Sunday". We store lowercase.
  const todayName = now.weekdayLong?.toLowerCase() ?? "";
  const normalised = shiftDays.map((d) => d.toLowerCase());

  if (!normalised.includes(todayName)) {
    return {
      onShift: false,
      message: "Your shift does not include today",
    };
  }

  // HH:mm string comparison works correctly for zero-padded times.
  const currentHHmm = now.toFormat("HH:mm");

  if (currentHHmm < shiftStartTime) {
    return {
      onShift: false,
      message: `Your shift starts at ${shiftStartTime}`,
    };
  }

  if (currentHHmm > shiftEndTime) {
    return {
      onShift: false,
      message: `Your shift ended at ${shiftEndTime}`,
    };
  }

  return { onShift: true };
}
