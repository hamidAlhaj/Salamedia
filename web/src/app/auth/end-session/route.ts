import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { clearSessionToken, getSessionToken } from "@/lib/session";

/**
 * Ends a dead session. Server Components cannot clear cookies while rendering, so apiFetch
 * redirects here on a 401 or 403 ACCOUNT_SUSPENDED. The token is re-checked first: a still-valid
 * session is never cleared (a cross-site link to this URL cannot log anyone out).
 */
export async function GET() {
  const token = await getSessionToken();
  if (!token) redirect("/login");

  let outcome: "valid" | "suspended" | "invalid" | "unreachable";
  try {
    // Header passed by hand, not via `token`, so apiFetch does not redirect back here.
    await apiFetch("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    outcome = "valid";
  } catch (err) {
    if (err instanceof ApiError && err.code === "ACCOUNT_SUSPENDED") outcome = "suspended";
    else if (err instanceof ApiError && err.status === 401) outcome = "invalid";
    else outcome = "unreachable";
  }

  if (outcome === "valid") redirect("/home");
  if (outcome === "unreachable") redirect("/login"); // keep the cookie; the API may come back
  await clearSessionToken();
  redirect(outcome === "suspended" ? "/login?suspended=1" : "/login");
}
