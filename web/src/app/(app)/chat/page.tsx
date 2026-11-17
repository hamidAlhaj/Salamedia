import type { Metadata } from "next";
import { ChatIcon } from "@/components/layout/nav";
import { PageColumn } from "@/components/layout/SideColumns";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "الدردشة" };

// Placeholder until Phase 9 (public room) and Phase 10 (private and group chats).
export default function ChatPage() {
  return (
    <PageColumn>
      <Card flush>
        <EmptyState
          icon={<ChatIcon size={28} />}
          title="الدردشة العامة"
          description="غرفة واحدة مفتوحة لكل أهل سلاميديا، ومحادثات خاصة مع من تتابعون بعضكم. قريباً هنا."
        />
      </Card>
    </PageColumn>
  );
}
