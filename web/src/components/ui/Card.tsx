import type { HTMLAttributes } from "react";

/**
 * White card on the grey page: rounded-lg + shadow-sm, no border (one radius, one elevation rule).
 * `flush`: edge-to-edge on phones (rounded-none below sm), like feed cards in Facebook's app.
 */
export function Card({
  padded = true,
  flush = false,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean; flush?: boolean }) {
  const radius = flush ? "rounded-none sm:rounded-lg" : "rounded-lg";
  return <div className={`${radius} bg-surface shadow-sm ${padded ? "p-4" : ""} ${className}`} {...rest} />;
}
