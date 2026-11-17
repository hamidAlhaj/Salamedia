import type { HTMLAttributes } from "react";

/** White card on the grey page: rounded-lg + shadow-sm, no border (one radius, one elevation rule). */
export function Card({
  padded = true,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={`rounded-lg bg-surface shadow-sm ${padded ? "p-4" : ""} ${className}`} {...rest} />;
}
