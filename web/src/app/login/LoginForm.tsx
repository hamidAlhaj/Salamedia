"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { login, type AuthFormState } from "@/lib/actions/auth";

const initial: AuthFormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.message && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      <Field
        label="البريد الإلكتروني أو اسم المستخدم"
        name="identifier"
        type="text"
        dir="ltr"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={state.values?.identifier}
        error={state.fieldErrors?.identifier}
      />
      <Field
        label="كلمة المرور"
        name="password"
        type="password"
        dir="ltr"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <Button type="submit" fullWidth pending={pending} className="mt-2 h-11">
        تسجيل الدخول
      </Button>
    </form>
  );
}
