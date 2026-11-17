import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatIcon, HomeIcon, PeopleIcon, ReelsIcon, UserIcon } from "@/components/layout/nav";
import { buttonClasses } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getSessionToken } from "@/lib/session";

const FEATURES = [
  { Icon: ChatIcon, title: "دردشة عامة مفتوحة", text: "غرفة واحدة لكل أهل سلمية، تدخلها تلقائياً وتحكي مع الكل مباشرة." },
  { Icon: ReelsIcon, title: "ريلز من شوارعنا", text: "فيديوهات قصيرة وعمودية من القلعة والسوق والملعب." },
  { Icon: PeopleIcon, title: "تابع مدينتك", text: "تابع من تحب بدون طلبات صداقة، وشوف منشوراتهم أولاً بأول." },
];

/** Guests see the pitch; anyone with a session cookie goes straight to /home (the app layout validates it). */
export default async function Landing() {
  if (await getSessionToken()) redirect("/home");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <span className="text-2xl font-bold tracking-tight text-primary">سلاميديا</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            تسجيل الدخول
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pb-16 pt-6 md:grid-cols-[1fr_auto] md:gap-16 md:pt-10">
        <section className="flex flex-col items-center gap-6 text-center md:items-start md:text-start">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
            من سلمية، لأهل سلمية
          </span>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            مدينتك كلها
            <br />
            <span className="text-primary">بصفحة وحدة</span>
          </h1>
          <p className="max-w-lg text-lg text-muted">
            سلاميديا شبكة اجتماعية عربية صغيرة: انشر صورك وأخبارك، شارك ريلز قصيرة، وادخل الدردشة العامة مع كل أهل البلد.
          </p>
          <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center md:justify-start">
            <Link href="/register" className={buttonClasses({ className: "h-12 px-8 text-base" })}>
              إنشاء حساب جديد
            </Link>
            <Link href="/login" className={buttonClasses({ variant: "secondary", className: "h-12 px-8 text-base" })}>
              عندي حساب
            </Link>
          </div>
          <ul className="mt-4 grid w-full gap-3 sm:grid-cols-3">
            {FEATURES.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="flex flex-col items-center gap-2 rounded-lg bg-surface p-4 text-center shadow-sm md:items-start md:text-start"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary"
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </span>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm leading-6 text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <PhoneMockup />
      </main>
    </div>
  );
}

/** A phone frame drawn with CSS only (no images): mini header, two post cards, bottom tabs. Decorative. */
function PhoneMockup() {
  const bar = "rounded-full bg-surface-2";
  return (
    <div aria-hidden="true" className="mx-auto w-64 shrink-0 select-none sm:w-72">
      <div className="rounded-[2.5rem] bg-text p-2.5 shadow-lg">
        <div className="relative flex aspect-[9/19] flex-col overflow-hidden rounded-[2rem] bg-bg">
          <div className="absolute inset-x-0 top-2 z-10 mx-auto h-5 w-20 rounded-full bg-text" />
          <div className="flex items-center justify-between bg-surface px-3 pb-2 pt-9 shadow-sm">
            <span className="text-sm font-bold text-primary">سلاميديا</span>
            <span className="flex gap-1.5">
              <span className="h-6 w-6 rounded-full bg-surface-2" />
              <span className="h-6 w-6 rounded-full bg-surface-2" />
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden pt-2">
            <div className="flex flex-col gap-2 bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary" />
                <span className="flex flex-col gap-1">
                  <span className={`${bar} h-2 w-16`} />
                  <span className={`${bar} h-1.5 w-10`} />
                </span>
              </div>
              <span className={`${bar} h-2 w-full`} />
              <span className={`${bar} h-2 w-3/4`} />
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-primary to-primary-soft" />
              <div className="flex items-center justify-between text-[10px] leading-4 text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  ٤٢
                </span>
                <span>٧ تعليقات</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-accent" />
                <span className={`${bar} h-2 w-20`} />
              </div>
              <span className={`${bar} h-2 w-5/6`} />
            </div>
          </div>
          <div className="grid grid-cols-5 border-t border-border bg-surface px-1 pb-3 pt-2 text-muted">
            {[HomeIcon, ReelsIcon, PeopleIcon, ChatIcon, UserIcon].map((Icon, i) => (
              <span key={i} className={`flex justify-center ${i === 0 ? "text-primary" : ""}`}>
                <Icon size={18} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
