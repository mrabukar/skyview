import { getApiBaseUrl } from "@/lib/api-base-url";
import { ApiError } from "@/service/client";
import type { MeResponse } from "@/types/auth/me";

/**
 * Real call to the backend session endpoint. Kept separate from the mock
 * data client so authentication is live while data screens migrate.
 */
export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/me`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 401) {
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText);
  }
  return res.json() as Promise<MeResponse>;
}
