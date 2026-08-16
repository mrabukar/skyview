/** Parses a comma-separated id list (e.g. `?vendorId=a,b,c`) into distinct ids. */
export function parseIdList(value?: string): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
