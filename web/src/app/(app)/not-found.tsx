import Link from "next/link";
import { PageColumn } from "@/components/layout/SideColumns";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/layout/nav";

export default function AppNotFound() {
  return (
    <PageColumn>
      <Card flush>
        <EmptyState
          title="الصفحة غير موجودة"
          description="ربما حُذف ما تبحث عنه، أو أن الرابط غير صحيح."
          icon={<SearchIcon size={28} />}
          action={
            <Link href="/home" className={buttonClasses()}>
              العودة إلى الرئيسية
            </Link>
          }
        />
      </Card>
    </PageColumn>
  );
}
