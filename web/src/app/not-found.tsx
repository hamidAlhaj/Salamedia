import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

/** Unknown URLs outside the app frame (e.g. a mistyped link). Replaces Next's English 404. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-4xl font-bold tracking-tight text-primary">سلاميديا</span>
      <h1 className="text-xl font-bold">الصفحة غير موجودة</h1>
      <p className="max-w-sm text-muted">ربما حُذف ما تبحث عنه، أو أن الرابط غير صحيح.</p>
      <Link href="/" className={buttonClasses()}>
        العودة إلى البداية
      </Link>
    </main>
  );
}
