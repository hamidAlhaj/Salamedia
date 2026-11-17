import type { Metadata } from "next";
import { LogoutIcon, SettingsIcon } from "@/components/layout/nav";
import { PageColumn } from "@/components/layout/SideColumns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logout } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "الإعدادات" };

// Placeholder until Phase 11 (edit name, bio, avatar). Theme and logout already work here,
// which is also how phone users reach them (the account menu is in the md+ header).
export default function SettingsProfilePage() {
  return (
    <PageColumn>
      <div className="flex flex-col gap-2 sm:gap-4">
        <Card flush>
          <EmptyState
            icon={<SettingsIcon size={28} />}
            title="تعديل الملف الشخصي"
            description="قريباً: تعديل الاسم والنبذة والصورة الشخصية."
          />
        </Card>
        <Card flush className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">المظهر</h2>
              <p className="text-sm text-muted">فاتح، داكن، أو حسب إعدادات جهازك.</p>
            </div>
            <ThemeToggle className="bg-surface-2" />
          </div>
          <hr className="border-border" />
          <form action={logout}>
            <Button type="submit" variant="ghost" fullWidth className="text-danger">
              <LogoutIcon size={20} />
              تسجيل الخروج
            </Button>
          </form>
        </Card>
      </div>
    </PageColumn>
  );
}
