const WEEKDAYS = [
  { value: "monday", short: "Mon", label: "Monday" },
  { value: "tuesday", short: "Tue", label: "Tuesday" },
  { value: "wednesday", short: "Wed", label: "Wednesday" },
  { value: "thursday", short: "Thu", label: "Thursday" },
  { value: "friday", short: "Fri", label: "Friday" },
  { value: "saturday", short: "Sat", label: "Saturday" },
  { value: "sunday", short: "Sun", label: "Sunday" },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]["value"];

export const SHIFT_DAY_OPTIONS = WEEKDAYS.map((d) => ({
  value: d.value,
  label: d.label,
}));

/** Compact weekday summary, e.g. "Mon–Fri" or "Mon, Wed, Fri". */
export function formatShiftDays(days: string[] | null | undefined): string {
  if (!days?.length) return "—";
  const order = WEEKDAYS.map((d) => d.value);
  const ordered = order.filter((d) => days.includes(d));
  if (!ordered.length) return "—";

  const shorts = ordered.map(
    (d) => WEEKDAYS.find((w) => w.value === d)?.short ?? d,
  );
  const firstIdx = order.indexOf(ordered[0]);
  const lastIdx = order.indexOf(ordered[ordered.length - 1]);
  const consecutive = ordered.length === lastIdx - firstIdx + 1;

  if (consecutive && shorts.length >= 3) {
    return `${shorts[0]}–${shorts[shorts.length - 1]}`;
  }
  return shorts.join(", ");
}

export function formatShiftWindow(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return "—";
  return `${start}–${end}`;
}
