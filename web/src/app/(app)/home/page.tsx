import type { Metadata } from "next";
import Link from "next/link";
import { HomeIcon } from "@/components/layout/nav";
import { SideColumns } from "@/components/layout/SideColumns";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchMe } from "@/lib/api";
import { requireSessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "الرئيسية" };

// Placeholder until Phase 5 (composer + Home feed). Feed pages use the three-column frame.
export default async function HomePage() {
  const me = await fetchMe(await requireSessionToken());
  return (
    <SideColumns>
      <Card flush>
        <EmptyState
          icon={<HomeIcon size={28} />}
          title={`أهلاً يا ${me.name}`}
          description="هنا ستظهر منشورات من تتابعهم ومنشوراتك، الأحدث أولاً."
          action={
            <Link href="/following" className={buttonClasses()}>
              اكتشف أشخاصاً لتتابعهم
            </Link>
          }
        />
      </Card>
    </SideColumns>
  );
}
