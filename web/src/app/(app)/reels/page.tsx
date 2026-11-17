import type { Metadata } from "next";
import { ReelsIcon } from "@/components/layout/nav";
import { PageColumn } from "@/components/layout/SideColumns";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "ريلز" };

// Placeholder until Phase 8 (vertical reels feed).
export default function ReelsPage() {
  return (
    <PageColumn>
      <Card flush>
        <EmptyState
          icon={<ReelsIcon size={28} />}
          title="ريلز سلمية"
          description="فيديوهات قصيرة وعمودية من كل أهل سلاميديا، الأحدث أولاً. قريباً هنا."
        />
      </Card>
    </PageColumn>
  );
}
