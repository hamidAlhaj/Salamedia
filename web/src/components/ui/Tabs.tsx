import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

/**
 * URL-driven tabs (`?tab=<key>`), plain links, so they work without JavaScript.
 * The page reads `searchParams.tab` and passes it as `active`.
 */
export function Tabs({
  items,
  active,
  basePath,
  label,
}: {
  items: TabItem[];
  active: string;
  basePath: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const current = item.key === active;
        return (
          <Link
            key={item.key}
            href={`${basePath}?tab=${encodeURIComponent(item.key)}`}
            aria-current={current ? "page" : undefined}
            scroll={false}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-[3px] px-4 py-3 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              current
                ? "border-primary text-primary"
                : "rounded-lg border-transparent text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`rounded-full px-2 text-xs leading-5 ${current ? "bg-primary-soft" : "bg-surface-2"}`}>
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
