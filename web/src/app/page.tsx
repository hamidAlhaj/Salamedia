import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Minimal landing until Phase 3 (which also redirects signed-in users to /home).
export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-primary">سلاميديا</h1>
        <p className="max-w-md text-lg text-muted">
          شبكة اجتماعية من سلمية ولأهل سلمية: منشورات وصور وريلز، ودردشة عامة مفتوحة للجميع.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link href="/register" className={buttonClasses({ className: "h-11 px-6" })}>
            إنشاء حساب
          </Link>
          <Link href="/login" className={buttonClasses({ variant: "secondary", className: "h-11 px-6" })}>
            تسجيل الدخول
          </Link>
        </div>
      </main>
    </div>
  );
}
