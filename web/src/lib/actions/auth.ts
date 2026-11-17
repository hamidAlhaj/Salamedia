"use server";

import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "../api";
import { errorMessage, fieldErrors } from "../errors";
import { clearSessionToken, setSessionToken } from "../session";
import type { AuthResponse } from "../types";

/** useActionState-compatible result. `values` refills the form after React resets it. */
export interface AuthFormState {
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

function failure(err: unknown, values: Record<string, string>): AuthFormState {
  if (err instanceof ApiError) {
    const fields = err.code === "VALIDATION_FAILED" ? fieldErrors(err.details) : {};
    return { message: errorMessage(err.code), fieldErrors: fields, values };
  }
  return { message: errorMessage(null), values };
}

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const identifier = text(form, "identifier").trim();
  const password = text(form, "password");
  const values = { identifier };

  const missing: Record<string, string> = {};
  if (!identifier) missing.identifier = "أدخل البريد الإلكتروني أو اسم المستخدم.";
  if (!password) missing.password = "أدخل كلمة المرور.";
  if (Object.keys(missing).length) return { fieldErrors: missing, values };

  try {
    const res = await apiFetch<AuthResponse>("/auth/login", { method: "POST", json: { identifier, password } });
    await setSessionToken(res.accessToken);
  } catch (err) {
    return failure(err, values);
  }
  redirect("/home");
}

export async function register(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const name = text(form, "name");
  const username = text(form, "username");
  const email = text(form, "email");
  const password = text(form, "password");
  const values = { name, username, email };

  try {
    const res = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      json: { name, username, email, password },
    });
    await setSessionToken(res.accessToken);
  } catch (err) {
    return failure(err, values);
  }
  redirect("/home");
}

export async function logout(): Promise<void> {
  await clearSessionToken();
  redirect("/login");
}
