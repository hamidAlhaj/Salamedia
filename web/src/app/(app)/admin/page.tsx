import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldIcon } from "@/components/layout/nav";
import { PageColumn } from "@/components/layout/SideColumns";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchMe } from "@/lib/api";
import { requireSessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "لوحة الإدارة" };

// Placeholder until Phase 12. Non-admins get the 404 page (the page's existence is not revealed);
// the API enforces the role on every /admin endpoint with RoleGuard.
export default async function AdminPage() {
  const me = await fetchMe(await requireSessionToken());
  if (me.role !== "ADMIN") notFound();
  return (
    <PageColumn wide>
      <Card flush>
        <EmptyState
          icon={<ShieldIcon size={28} />}
          title="لوحة الإدارة"
          description="قريباً: إحصاءات المنصة، طابور البلاغات، المحتوى المخفي وإدارة الحسابات."
        />
      </Card>
    </PageColumn>
  );
}
