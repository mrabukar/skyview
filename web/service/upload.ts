/**
 * Real delete/upload helpers. Organization-logo endpoints are not part of the
 * current backend scope, so those two helpers return null and components fall
 * back to the built-in logo mark.
 */
import { getApiBaseUrl } from "@/lib/api-base-url";
import { throwIfNotOk } from "@/service/client";

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  await throwIfNotOk(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  init?: Omit<RequestInit, "body">,
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    method: init?.method ?? "POST",
    credentials: "include",
    body: formData,
  });
  await throwIfNotOk(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function organizationLogoUrl(
  _scope: "current" | "organization",
  _organizationId?: string,
  _logoUpdatedAt?: string | null,
): string | null {
  return null;
}

export async function fetchOrganizationLogoBlob(
  _scope: "current" | "organization",
  _organizationId?: string,
  _logoUpdatedAt?: string | null,
): Promise<string | null> {
  return null;
}
