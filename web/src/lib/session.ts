import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "salamedia_session";
const MAX_AGE = 7 * 24 * 60 * 60; // matches the 7-day JWT

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from a Server Action or Route Handler. */
export async function setSessionToken(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Only callable from a Server Action or Route Handler. */
export async function clearSessionToken(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** For protected pages: the token, or a redirect to /login. */
export async function requireSessionToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect("/login");
  return token;
}
