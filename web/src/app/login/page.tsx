import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <AuthShell
      title="أهلاً من جديد"
      subtitle="سجّل الدخول بالبريد الإلكتروني أو اسم المستخدم."
      footer={
        <>
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            أنشئ حساباً
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
