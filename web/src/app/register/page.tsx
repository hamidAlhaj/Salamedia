import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="انضم إلى سلاميديا"
      subtitle="شارك يومياتك وتابع أهل سلمية."
      footer={
        <>
          لديك حساب؟{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            سجّل الدخول
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
