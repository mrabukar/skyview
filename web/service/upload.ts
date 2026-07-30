/**
 * DEMO MODE — uploads, deletes, and logo fetches are simulated locally.
 */
import { apiFetch } from "@/service/client";

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

export async function apiUpload<T>(
  path: string,
  _formData: FormData,
  init?: Omit<RequestInit, "body">,
): Promise<T> {
  return apiFetch<T>(path, { method: init?.method ?? "POST" });
}

export function organizationLogoUrl(
  _scope: "current" | "organization",
  _organizationId?: string,
  _logoUpdatedAt?: string | null,
): string | null {
  // Demo: no uploaded logo — components fall back to the built-in logo mark.
  return null;
}

export async function fetchOrganizationLogoBlob(
  _scope: "current" | "organization",
  _organizationId?: string,
  _logoUpdatedAt?: string | null,
): Promise<string | null> {
  return null;
}
