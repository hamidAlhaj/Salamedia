import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ApiErrorBody, SafeUser } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Route Handler that clears a dead session cookie and sends the user to /login (or /login?suspended=1). */
export const END_SESSION_PATH = "/auth/end-session";

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
 * A 401 (session gone) or 403 ACCOUNT_SUSPENDED on an authenticated call ends the session through
 * the end-session Route Handler, because cookies are read-only while a Server Component renders.
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

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  const code = body?.code ?? "INTERNAL_ERROR";
  if (token && (res.status === 401 || code === "ACCOUNT_SUSPENDED")) {
    // The Route Handler re-checks the token, clears the cookie and picks /login or /login?suspended=1.
    redirect(END_SESSION_PATH);
  }
  throw new ApiError(res.status, code, body?.message ?? res.statusText, body?.details);
}

/** GET /auth/me, deduplicated per request (the (app) layout and a page may both need it). */
export const fetchMe = cache((token: string) => apiFetch<SafeUser>("/auth/me", { token }));
