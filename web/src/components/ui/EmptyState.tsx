/** A friendly "nothing here yet" block with an optional icon and action. */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description && <p className="max-w-sm text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
