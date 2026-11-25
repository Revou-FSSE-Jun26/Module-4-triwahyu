import { ApiError, type ErrorDetails } from "./errors";

type ErrorBody = { error?: string; code?: string; details?: ErrorDetails };
type SuccessBody<T> = { data: T };

/**
 * Browser code reads NEXT_PUBLIC_API_BASE_URL, server code reads API_BASE_URL (FE-02).
 * Resolved per call so tests and runtime configuration changes are respected.
 */
export function getBaseUrl(): string {
  const isServer = typeof window === "undefined";
  const url = isServer
    ? (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL)
    : process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url)
    throw new Error(
      "API base URL is not configured (NEXT_PUBLIC_API_BASE_URL / API_BASE_URL)",
    );
  return url.replace(/\/+$/, "");
}

/** The single place that calls fetch. Returns the unwrapped `data` of the success envelope. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: init.cache ?? "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the server", 0, "NETWORK_ERROR");
  }

  const payload = (await response.json().catch(() => null)) as
    | (ErrorBody & Partial<SuccessBody<T>>)
    | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? response.statusText ?? "Request failed",
      response.status,
      payload?.code,
      payload?.details,
    );
  }
  if (!payload || !("data" in payload)) {
    throw new ApiError(
      "Invalid API response",
      response.status,
      "INVALID_RESPONSE",
    );
  }
  return payload.data as T;
}
