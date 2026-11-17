"use client";

import { PageColumn } from "@/components/layout/SideColumns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** Any unexpected error inside the app frame (the header and tabs stay usable). */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageColumn>
      <Card flush>
        <EmptyState
          title="حدث خطأ غير متوقع"
          description="لم نتمكن من تحميل هذه الصفحة. تأكد من اتصالك وحاول مرة أخرى."
          icon={
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.5h.01" />
            </svg>
          }
          action={<Button onClick={reset}>إعادة المحاولة</Button>}
        />
      </Card>
    </PageColumn>
  );
}
