/**
 * Categorical palette for donut slices. Ordered so the first few slices —
 * which is all most breakdowns have — land on visibly different hues rather
 * than three neighbouring browns.
 */
export const DONUT_COLORS = [
  "var(--brand-indigo)",
  "var(--brand-teal)",
  "var(--status-emerald)",
  "var(--brand-violet)",
  "var(--status-rose)",
  "var(--status-amber)",
] as const;
