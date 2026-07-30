/**
 * DEMO MODE — Skyview Coffee (Bubble Tea Palace).
 * All requests are answered locally by service/mock/handlers.ts.
 * No backend is contacted. Restore the fetch-based implementation
 * (see inventory/web/service/client.ts) when wiring a real API.
 */
import { notifyUnauthorized } from "@/lib/auth/unauthorized";
import { mockRoute, MockHttpError } from "@/service/mock/handlers";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Kept for compatibility with modules that import it. */
export async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  throw new ApiError(res.status, res.statusText);
}

const MOCK_DELAY_MS = 220;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  await delay(MOCK_DELAY_MS);
  try {
    return (await mockRoute(init?.method ?? "GET", path, init?.body)) as T;
  } catch (err) {
    if (err instanceof MockHttpError) {
      if (err.status === 401) notifyUnauthorized();
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}
