"use client";

import { Clock } from "lucide-react";

interface Props {
  message: string | null;
  shiftDays?: string[] | null;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}

/** Full-page block shown when a cashier is not currently on shift. */
export function ShiftBlock({
  message,
  shiftDays,
  shiftStartTime,
  shiftEndTime,
}: Props) {
  const daysLabel = shiftDays?.length
    ? shiftDays
        .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
        .join(", ")
    : null;

  const hasSchedule =
    daysLabel && shiftStartTime && shiftEndTime;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="rounded-full bg-muted p-5">
        <Clock size={40} className="text-muted-foreground" />
      </div>

      <div className="grid gap-2">
        <h2 className="text-xl font-semibold">Your shift hasn&apos;t started</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {message ?? "You are not currently on shift."}
        </p>
        {hasSchedule ? (
          <p className="text-sm text-muted-foreground">
            Scheduled: <strong>{daysLabel}</strong>, {shiftStartTime}–
            {shiftEndTime}
          </p>
        ) : null}
      </div>
    </div>
  );
}
