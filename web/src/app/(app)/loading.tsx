import { PageColumn } from "@/components/layout/SideColumns";
import { Card } from "@/components/ui/Card";

const BLOCK = "animate-pulse bg-surface-2 motion-reduce:animate-none";

/** Skeleton while a section loads: two card-shaped placeholders. */
export default function Loading() {
  return (
    <PageColumn>
      <div role="status" aria-label="جارٍ التحميل" className="flex flex-col gap-2 sm:gap-4">
        {[0, 1].map((i) => (
          <Card key={i} flush className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`${BLOCK} h-10 w-10 rounded-full`} />
              <div className="flex flex-1 flex-col gap-2">
                <div className={`${BLOCK} rounded-lg h-3.5 w-32`} />
                <div className={`${BLOCK} rounded-lg h-3 w-20`} />
              </div>
            </div>
            <div className={`${BLOCK} rounded-lg h-3.5 w-full`} />
            <div className={`${BLOCK} rounded-lg h-3.5 w-4/5`} />
            <div className={`${BLOCK} rounded-lg h-48 w-full`} />
          </Card>
        ))}
      </div>
    </PageColumn>
  );
}
