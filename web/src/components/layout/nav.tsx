// The 5 sections and the inline SVG icons used by Header, BottomTabs and SideColumns (no icon library).

type IconProps = { size?: number; className?: string };

function Svg({ size = 24, className = "", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </Svg>
);

export const ReelsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
    <path d="m10 9 5 3-5 3z" />
  </Svg>
);

export const PeopleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </Svg>
);

export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20.5l1.5-5.1A8.5 8.5 0 1 1 21 11.5z" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const GroupIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="7.5" r="3" />
    <circle cx="5" cy="10" r="2.2" />
    <circle cx="19" cy="10" r="2.2" />
    <path d="M7 20a5 5 0 0 1 10 0M1.5 18.5a3.5 3.5 0 0 1 4.5-3.3M22.5 18.5a3.5 3.5 0 0 0-4.5-3.3" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);

export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    {/* Arrow points to the start side (right in RTL): "leaving". */}
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M9 8 5 12l4 4M5 12h10" />
  </Svg>
);

export interface Section {
  key: "home" | "reels" | "following" | "chat" | "profile";
  label: string;
  href: string;
  Icon: (p: IconProps) => React.ReactElement;
  isActive: (pathname: string) => boolean;
}

/** The 5 section tabs (CLAUDE.md §4.10). Same order in the header and the bottom bar. */
export function sections(username: string): Section[] {
  const profile = `/u/${username}`;
  return [
    {
      key: "home",
      label: "الرئيسية",
      href: "/home",
      Icon: HomeIcon,
      isActive: (p) => p === "/home" || p.startsWith("/posts/"),
    },
    { key: "reels", label: "ريلز", href: "/reels", Icon: ReelsIcon, isActive: (p) => p.startsWith("/reels") },
    {
      key: "following",
      label: "المتابَعون",
      href: "/following",
      Icon: PeopleIcon,
      isActive: (p) => p.startsWith("/following"),
    },
    { key: "chat", label: "الدردشة", href: "/chat", Icon: ChatIcon, isActive: (p) => p.startsWith("/chat") },
    {
      key: "profile",
      label: "حسابي",
      href: profile,
      Icon: UserIcon,
      isActive: (p) => p === profile || p.startsWith("/settings"),
    },
  ];
}

/** Round icon button look (header actions). */
export const ICON_BUTTON =
  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
