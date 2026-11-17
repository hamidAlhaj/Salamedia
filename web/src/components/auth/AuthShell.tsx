import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Shared frame of /login and /register: wordmark, card, and a link to the other page. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 flex-col items-center px-4 pb-12 pt-2 sm:pt-8">
        <Link href="/" className="mb-6 flex flex-col items-center gap-1 rounded-lg">
          <span className="text-4xl font-bold tracking-tight text-primary">سلاميديا</span>
          <span className="text-sm text-muted">من سلمية، لأهل سلمية</span>
        </Link>
        <Card className="w-full max-w-md p-6 sm:p-8">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-[15px] text-muted">{subtitle}</p>
          {children}
        </Card>
        <p className="mt-6 text-[15px] text-muted">{footer}</p>
      </main>
    </div>
  );
}
