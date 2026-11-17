"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { register, type AuthFormState } from "@/lib/actions/auth";

const initial: AuthFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.message && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      <Field
        label="الاسم"
        name="name"
        autoComplete="name"
        dir="auto"
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />
      <Field
        label="اسم المستخدم"
        name="username"
        dir="ltr"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        hint="أحرف إنجليزية صغيرة وأرقام و _ ، من ٣ إلى ٢٠ حرفاً."
        defaultValue={state.values?.username}
        error={state.fieldErrors?.username}
      />
      <Field
        label="البريد الإلكتروني"
        name="email"
        type="email"
        dir="ltr"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="كلمة المرور"
        name="password"
        type="password"
        dir="ltr"
        autoComplete="new-password"
        hint="٨ أحرف على الأقل."
        error={state.fieldErrors?.password}
      />
      <Button type="submit" fullWidth pending={pending} className="mt-2 h-11">
        إنشاء الحساب
      </Button>
    </form>
  );
}
