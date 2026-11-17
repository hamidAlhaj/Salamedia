import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { errorMessage } from "@/lib/errors";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول" };

/**
 * `?suspended=1` is where /auth/end-session lands after clearing the session of a suspended
 * account (the cookie is already gone by the time this renders).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suspended?: string }> }) {
  const suspended = (await searchParams).suspended === "1";
  return (
    <AuthShell
      title={suspended ? "حسابك موقوف" : "أهلاً من جديد"}
      subtitle={suspended ? "تم تسجيل خروجك." : "سجّل الدخول بالبريد الإلكتروني أو اسم المستخدم."}
      footer={
        <>
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            أنشئ حساباً
          </Link>
        </>
      }
    >
      {suspended && (
        <div role="alert" className="mb-6 flex flex-col gap-1 rounded-lg bg-danger/10 px-4 py-3 text-danger">
          <p className="font-semibold">{errorMessage("ACCOUNT_SUSPENDED")}</p>
          <p className="text-sm leading-6">
            لا يمكنك النشر أو الدردشة أو تصفح سلاميديا بهذا الحساب. إذا كنت تظن أن هذا خطأ، تواصل مع إدارة سلاميديا.
          </p>
        </div>
      )}
      <LoginForm />
    </AuthShell>
  );
}
