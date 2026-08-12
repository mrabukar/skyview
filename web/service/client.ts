/**
 * Real API client for the Skyview backend, with a thin translation seam.
 *
 * The backend speaks `branch`/`branchId` and mounts branches at
 * `/api/branches`; the frontend keeps its internal `store`/`storeId` naming.
 * This layer bridges the two so no component or type had to change:
 *   - request path : /api/stores → /api/branches, storeId= → branchId=
 *   - request body : storeId → branchId (keys)
 *   - response body: branchId → storeId, branch → store, branchName → storeName
 */
import { getApiBaseUrl } from "@/lib/api-base-url";
import { notifyUnauthorized } from "@/lib/auth/unauthorized";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) {
    notifyUnauthorized();
  }
  let message = res.statusText;
  try {
    const body = (await res.json()) as { message?: string | string[]; error?: string };
    const raw = body.message ?? body.error;
    message = Array.isArray(raw) ? raw.join(", ") : (raw ?? message);
  } catch {
    // ignore JSON parse errors
  }
  throw new ApiError(res.status, message);
}

/* ---------------- branch ↔ store bridge ---------------- */

const REQ_KEYS: Record<string, string> = {
  storeId: "branchId",
  store: "branch",
  storeName: "branchName",
  storeIds: "branchIds",
  stores: "branches",
};
const RES_KEYS: Record<string, string> = {
  branchId: "storeId",
  branch: "store",
  branchName: "storeName",
  branchIds: "storeIds",
  branches: "stores",
};

function renameKeys(value: unknown, map: Record<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => renameKeys(v, map));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[map[k] ?? k] = renameKeys(v, map);
    }
    return out;
  }
  return value;
}

function bridgePath(path: string): string {
  return path
    .replace("/api/stores", "/api/branches")
    .replace(/storeId=/g, "branchId=");
}

function bridgeRequestBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (typeof body !== "string") return body;
  try {
    return JSON.stringify(renameKeys(JSON.parse(body), REQ_KEYS));
  } catch {
    return body;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${bridgePath(path)}`, {
    ...init,
    body: bridgeRequestBody(init?.body),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  await throwIfNotOk(res);

  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json()) as unknown;
  return renameKeys(json, RES_KEYS) as T;
}
