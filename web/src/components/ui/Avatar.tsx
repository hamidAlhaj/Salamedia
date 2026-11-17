export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, { box: string; px: number; text: string }> = {
  xs: { box: "h-6 w-6", px: 24, text: "text-[10px]" },
  sm: { box: "h-8 w-8", px: 32, text: "text-xs" },
  md: { box: "h-10 w-10", px: 40, text: "text-sm" },
  lg: { box: "h-14 w-14", px: 56, text: "text-lg" },
  xl: { box: "h-28 w-28", px: 112, text: "text-3xl" },
};

// Token-based colour pairs, chosen deterministically from the user id.
const COLORS = [
  "bg-primary text-primary-fg",
  "bg-accent text-accent-fg",
  "bg-success text-primary-fg",
  "bg-primary-soft text-primary",
  "bg-danger text-primary-fg",
  "bg-surface-2 text-text",
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? "");
  return letters.join("") || "؟";
}

/** Round avatar: the image if there is one, otherwise initials on a colour from the user id. */
export function Avatar({
  name,
  userId,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  userId: number;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const s = SIZES[size];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- same-origin /media files, no optimiser needed
      <img
        src={src}
        alt={name}
        width={s.px}
        height={s.px}
        className={`${s.box} shrink-0 rounded-full bg-surface-2 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`${s.box} ${s.text} ${COLORS[Math.abs(userId) % COLORS.length]} inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${className}`}
    >
      {initials(name)}
    </span>
  );
}
