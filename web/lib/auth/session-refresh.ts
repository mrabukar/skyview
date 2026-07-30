/**
 * DEMO MODE — there is no server session to refresh.
 */
export const SESSION_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export async function refreshAuthSession(): Promise<void> {
  // no-op in demo mode
}
