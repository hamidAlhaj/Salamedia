import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "primary" | "accent" | "danger" | "success";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent text-accent-fg",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${TONES[tone]} ${className}`}
      {...rest}
    />
  );
}
