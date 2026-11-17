import "server-only";
import { redirect } from "next/navigation";
import { clearSessionToken } from "./session";
import type { ApiErrorBody } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** A non-2xx API response, carrying the stable error `code`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** Session JWT, sent as `Authorization: Bearer`. */
  token?: string | null;
  /** JSON body (serialised for you). */
  json?: unknown;
  /** Raw body (e.g. FormData for uploads). */
  body?: BodyInit;
}

/**
 * The one way the web talks to the API. Throws ApiError on any error response.
 * A 401 on an authenticated call means the session is gone: clear it and go to /login.
 */
export async function apiFetch<T>(path: string, { token, json, headers, ...init }: ApiFetchOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json; charset=utf-8" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch {
    throw new ApiError(503, "INTERNAL_ERROR", "API unreachable");
  }

  if (res.status === 401 && token) {
    try {
      await clearSessionToken();
    } catch {
      // Cookies are read-only while rendering a Server Component; the redirect still happens.
    }
    redirect("/login");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body?.code ?? "INTERNAL_ERROR", body?.message ?? res.statusText, body?.details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
