"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppSelector } from "@/store/hooks";
import { ChatIcon, GroupIcon, PeopleIcon, ReelsIcon, ShieldIcon } from "./nav";

const SHORTCUT =
  "flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SHORTCUT_ICON = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary";
const STICKY = "sticky top-[72px] hidden max-h-[calc(100dvh-88px)] self-start overflow-y-auto lg:block";

/**
 * The lg+ three-column frame used by feed pages (/home, /posts/[id]). Start column: shortcuts.
 * End column: contacts (mutual follows, Phase 7) and the public chat preview (Phase 9).
 * Below lg only the centre column shows.
 */
export function SideColumns({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 justify-center gap-6 lg:grid-cols-[240px_minmax(0,1fr)_260px] xl:grid-cols-[280px_minmax(0,680px)_300px]">
      <StartColumn />
      <div className="mx-auto w-full min-w-0 max-w-[680px]">{children}</div>
      <EndColumn />
    </div>
  );
}

/** Pages that do not use the side columns: just the centre column. */
export function PageColumn({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full min-w-0 ${wide ? "max-w-5xl" : "max-w-[680px]"}`}>{children}</div>;
}

function StartColumn() {
  const user = useAppSelector((s) => s.currentUser);
  if (!user) return <div className="hidden lg:block" />;
  return (
    <aside aria-label="اختصارات" className={STICKY}>
      <nav className="flex flex-col gap-0.5">
        <Link href={`/u/${user.username}`} className={SHORTCUT}>
          <Avatar name={user.name} userId={user.id} src={user.avatarUrl} size="md" />
          <span className="truncate">{user.name}</span>
        </Link>
        <Link href="/reels" className={SHORTCUT}>
          <span className={SHORTCUT_ICON}>
            <ReelsIcon size={20} />
          </span>
          ريلز
        </Link>
        <Link href="/following" className={SHORTCUT}>
          <span className={SHORTCUT_ICON}>
            <PeopleIcon size={20} />
          </span>
          المتابَعون
        </Link>
        <Link href="/chat" className={SHORTCUT}>
          <span className={SHORTCUT_ICON}>
            <GroupIcon size={20} />
          </span>
          مجموعاتي
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/admin" className={SHORTCUT}>
            <span className={SHORTCUT_ICON}>
              <ShieldIcon size={20} />
            </span>
            لوحة الإدارة
          </Link>
        )}
      </nav>
      <p className="mt-4 px-2 text-xs leading-5 text-muted">سلاميديا · من سلمية، لأهل سلمية</p>
    </aside>
  );
}

function EndColumn() {
  return (
    <aside aria-label="جهات الاتصال والدردشة" className={STICKY}>
      <section aria-labelledby="contacts-heading" className="px-2">
        <h2 id="contacts-heading" className="text-[15px] font-semibold text-muted">
          جهات الاتصال
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          هنا سيظهر من تتابعه ويتابعك، لتبدأ معه محادثة خاصة بضغطة.
        </p>
      </section>
      <hr className="mx-2 my-4 border-border" />
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <h2 className="text-[15px] font-semibold">الدردشة العامة</h2>
        </div>
        <p className="text-sm leading-6 text-muted">غرفة واحدة مفتوحة لكل أهل سلاميديا. آخر الرسائل ستظهر هنا.</p>
        <Link href="/chat" className={buttonClasses({ variant: "secondary", size: "sm", fullWidth: true })}>
          <ChatIcon size={16} />
          انضم للدردشة
        </Link>
      </Card>
    </aside>
  );
}
