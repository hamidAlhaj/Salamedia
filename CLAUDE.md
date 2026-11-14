# Full-Stack Architecture Agreement & Engineering Work Plan (Next.js 15 + NestJS 11 + Prisma 6)

Act as a Principal Full-Stack Engineer. We are building **Salamedia (سلاميديا): an Arabic-first social network from Salamiyah. People publish posts (text, photos, videos) and short vertical reels, follow each other (no friendship system), and share one always-open public chat room that every user joins automatically, alongside private and group chats.** We use a strictly separated **Monorepo Architecture**: `api/` for the NestJS backend, `web/` for the Next.js App Router frontend, and an optional, last-phase `mobile/` (React Native + Expo).

Follow this **Architecture Agreement** and **Phased Work Plan** strictly. Do not introduce unrequested libraries, extra abstraction layers, or boilerplate files outside the structure defined below.

---

## 1. Core Architectural Principles (Non-Negotiable)

1. **Single Trusted Authority (`api/`):**
   - The NestJS backend is the sole authority for input sanitization, validation, authentication, role/ownership authorization, state-machine rules, and database persistence.
   - Never trust client-side state or UI restrictions alone; every invariant must be enforced on the backend and backed by PostgreSQL constraints/indexes.
   - The **same REST endpoints and the same Bearer JWT** serve the web and the mobile client. The WebSocket gateway authenticates with a JWT too. There is no second backend and no client-only rule.
2. **Evolution Over Replacement:**
   - Every feature module follows one consistent pattern (`Module → Controller → DTO → Service → Prisma`). New features extend existing modules through clean dependency injection rather than rewriting the architecture. The chat gateway lives inside the `chat` module and calls `ChatService`; it never touches Prisma directly.
3. **Zero-Bloat File Discipline:**
   - Do **not** create custom repository wrappers around Prisma (`PrismaService` IS the repository).
   - Do **not** create barrel `index.ts` files, mapper classes, interface-only files, or duplicate client-side state for server data.
   - Create **only** the files required for the active feature module.

---

## 2. Pinned Technology Stack & Libraries

Exact versions are pinned in Phase 1 after checking `npm view <pkg> version`, staying inside the majors below. Record the resolved versions in the Phase 1 report.

### Backend (`api/`): NestJS 11 + PostgreSQL + Prisma 6
- **Core:** `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `reflect-metadata`, `rxjs`
- **Database & ORM:** `prisma` (`^6.7.0`, stay on 6.x, not 7), `@prisma/client` (same version). PostgreSQL 18 (native Windows install, no Docker) with snake_case table/column mapping (`@map` / `@@map`)
- **Validation & Sanitization:** `class-validator`, `class-transformer`, `@nestjs/swagger` (`PartialType` imported from `@nestjs/swagger` so OpenAPI schemas stay intact)
- **Authentication & Security:** `@nestjs/jwt`, `bcrypt` (`10` salt rounds)
- **Uploads:** `FileInterceptor` from `@nestjs/platform-express` (Multer ships with it). Only `@types/multer` is added, as a dev dependency.
- **Real-time (added for Salamedia):** `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (4.x). Justification: the public chat, private chats and group chats need server push. Socket.IO gives rooms, acknowledgements and automatic reconnection with a long-polling fallback. These replace three things we would otherwise hand-write.

### Frontend (`web/`): Next.js 15 App Router + React 19 + Tailwind CSS v3
- **Core:** `next` (`15.x` App Router, latest 15.x, not 16), `react` (`19.x`), `react-dom` (`19.x`), `server-only`
- **Styling:** `tailwindcss` (`^3.4.x` with `darkMode: "class"`), `postcss`, `autoprefixer`
- **Client State (Strictly Scoped):** `@reduxjs/toolkit`, `react-redux`, used **only** for the authenticated `currentUser` snapshot. Salamedia extends the snapshot to `{ id, name, username, email, avatarUrl, role } | null`. Reason: the nav needs the profile link (`username`), the avatar and the admin entry. It is still only the current user. All domain records live on the server and are fetched in async Server Components.
- **Real-time (added for Salamedia):** `socket.io-client` (4.x, same minor as the server). Justification: the browser end of the chat gateway.
- **Fonts:** IBM Plex Sans Arabic via `next/font/google` (part of `next`, no new package).
- **Not used:** `@dnd-kit/core`. There is no drag-and-drop in this product.

### Mobile (`mobile/`): optional, last phases only (15–16)
- Expo (latest stable SDK at the time of Phase 15) with `expo-router`, created with `--no-git` semantics (no nested repository).
- Allowed Expo modules, each needed: `expo-secure-store` (the JWT), `expo-image-picker` (camera and gallery), `expo-video` (the reel and post player). Plus `socket.io-client`.
- Nothing else without written justification in this file.

---

## 3. Canonical Monorepo File Structure

```text
salamedia/
├── .gitattributes                       # * text=auto eol=lf (stable Prisma migration checksums)
├── .gitignore                           # node_modules, .env*, api/uploads/, tmp/, .next, dist, mobile/.expo
├── CLAUDE.md
├── README.md
├── DEMO.md                              # 3-minute English demo script (Phase 14)
├── api/
│   ├── .env.example
│   ├── package.json
│   ├── uploads/                         # git-ignored; media/ served at /media (UUID names), media/avatars/ for avatars
│   ├── prisma/
│   │   ├── schema.prisma                # Models, @map/@@map, onDelete rules, @@unique, @@index
│   │   ├── seed.ts                      # Deterministic seed (TRUNCATE ... RESTART IDENTITY CASCADE) + resets api/uploads/
│   │   ├── seed-media/                  # Committed sample images and short vertical H.264 videos used by the seed
│   │   └── migrations/                  # Versioned SQL migrations (including CHECKs and partial unique indexes)
│   └── src/
│       ├── main.ts                      # Global ValidationPipe, AllExceptionsFilter, Swagger (/docs), static /media, CORS
│       ├── app.module.ts                # Root module wiring ConfigModule, PrismaModule & feature modules
│       ├── prisma/
│       │   ├── prisma.module.ts         # @Global() module exporting PrismaService
│       │   └── prisma.service.ts        # Extends PrismaClient with OnModuleInit / OnModuleDestroy
│       ├── common/
│       │   ├── decorators/              # @CurrentUser(), @RequireRole() (via SetMetadata)
│       │   ├── filters/                 # AllExceptionsFilter (@Catch() preserving HttpException, adds stable `code`)
│       │   ├── guards/                  # JwtAuthGuard (verifyAsync + live status lookup), RoleGuard (Reflector + live DB lookup)
│       │   ├── interceptors/            # RemoveUploadOnError (deletes the saved file when the request fails)
│       │   ├── errors.ts                # AppError(code, status) helper + the ErrorCode string union
│       │   └── transitions.ts           # assertTransition(machine, from, transitionName)
│       ├── auth/                        # auth.module.ts, auth.controller.ts, auth.service.ts, dto/
│       ├── users/                       # users.module.ts, users.controller.ts, users.service.ts (toSafeUser, toPublicUser)
│       ├── media/                       # media.module.ts, media.controller.ts, media.service.ts, mp4-probe.ts, magic-bytes.ts
│       ├── posts/                       # posts (POST + REEL kinds), feed, reposts, likes, comments, reel views
│       ├── follows/
│       ├── chat/                        # chat.module.ts, chat.controller.ts, chat.service.ts, chat.gateway.ts, rate-limiter.ts, dto/
│       ├── moderation/                  # reports, admin queue, hide/unhide, suspend/reinstate, stats
│       └── <feature>/                   # <feature>.module.ts, .controller.ts, .service.ts, dto/
├── web/
│   ├── package.json
│   ├── next.config.ts                   # serverActions.bodySizeLimit, allowedDevOrigins, rewrites /media/* -> API
│   ├── tailwind.config.ts               # darkMode: "class", semantic color tokens from CSS variables
│   ├── public/
│   │   ├── sw.js                        # Hand-written service worker (offline page + static assets only) — Phase 13
│   │   └── offline.html
│   └── src/
│       ├── lib/
│       │   ├── api.ts                   # Central apiFetch(path, { token, ...init }) + 401 -> redirect("/login")
│       │   ├── session.ts               # "server-only" httpOnly cookie helpers (get/set/clear/requireSessionToken)
│       │   ├── errors.ts                # API error `code` -> Arabic message map
│       │   ├── format.ts                # Relative time (ar), compact counts, durations
│       │   ├── types.ts                 # Shared TypeScript domain interfaces
│       │   └── actions/                 # "use server" mutations grouped by domain (auth.ts, posts.ts, chat.ts, ...)
│       ├── context/
│       │   └── ThemeContext.tsx         # light/dark/system provider (localStorage + documentElement.classList)
│       ├── store/
│       │   ├── currentUserSlice.ts      # Redux slice ONLY for CurrentUser
│       │   ├── store.ts                 # Per-request makeStore() factory (prevents SSR cross-request leaks)
│       │   ├── StoreProvider.tsx        # Client provider hydrating storeRef.current once from (app)/layout.tsx
│       │   └── hooks.ts                 # Typed useAppDispatch & useAppSelector
│       ├── components/
│       │   ├── ui/                      # Button, Card, Badge, Field, Tabs, StatCard, Avatar, ThemeToggle, EmptyState, Spinner
│       │   ├── layout/                  # Header (FB-style, centre tabs >= md), BottomTabs (< md), SideColumns (lg+), AccountMenu
│       │   └── <feature>/               # Focused Client Components (composer, post card, reel player, chat room, ...)
│       └── app/
│           ├── layout.tsx               # Root layout: <html lang="ar" dir="rtl">, font, no-flash theme script, ThemeProvider
│           ├── manifest.ts              # PWA manifest (Phase 13)
│           ├── icon.tsx, apple-icon.tsx # Generated icons with next/og ImageResponse (Phase 13)
│           ├── page.tsx                 # Public landing (signed-in users are redirected to /home)
│           ├── login/                   # Public /login page + LoginForm.tsx (useActionState)
│           ├── register/                # Public /register page + RegisterForm.tsx (useActionState)
│           ├── p/[id]/                  # Public read-only post page (the share link)
│           └── (app)/                   # Protected route group
│               ├── layout.tsx           # Calls requireSessionToken(), fetches /auth/me, hydrates StoreProvider, renders Header + BottomTabs
│               └── <feature>/           # Async Server Component pages (+ loading.tsx, not-found.tsx, error.tsx)
└── mobile/                              # Phases 15–16 only (optional)
    ├── app/                             # expo-router: (tabs)/home, reels, following, chat, profile; login
    └── src/lib/                         # api.ts (same endpoints, Bearer token from secure-store), socket.ts
```

---

## 4. Project Specification — Salamedia

### 4.1 Product in one paragraph

Salamedia is a small, Arabic-first social network. A signed-in user writes posts with text, up to four photos, or one short video, and publishes short vertical reels. People **follow** each other; there are no friend requests. **Home** shows the posts of people you follow plus your own, newest first. **Reels** shows everyone's reels, newest first, as a full-height vertical scroller. **Public Chat** is one room that every signed-in user is automatically part of, with real-time messages. Private chats are possible only between two people who follow each other, and groups are built from those mutual follows. Free speech is the default; abuse is handled by **reports, an admin queue, hiding content and suspending accounts**, plus a rate limit in the chat.

### 4.2 Roles

| Role | How it is determined | Can do |
| --- | --- | --- |
| Guest | No session | Landing page, `/login`, `/register`, and the public read-only post page `/p/[id]` (visible posts only) |
| User | `users.role = USER`, `users.status = ACTIVE` | Post, reel, like, comment, repost, follow, chat (public, private with mutual follows, groups), report, edit own profile |
| Content owner | Ownership: `posts.author_id` / `comments.author_id` / `messages.sender_id` = current user (not a separate role) | Delete own post / comment; soft-delete own message; the post author can also delete comments on their post |
| Group owner | `conversation_members.role = OWNER` | Rename the group, add members (from own mutual follows), remove members, delete the group |
| Admin | `users.role = ADMIN` (checked with a live DB lookup in `RoleGuard`) | Everything a user can do, plus the report queue, hide/unhide posts, comments and messages, suspend/reinstate users, and platform stats |
| Suspended user | `users.status = SUSPENDED` | Nothing. `JwtAuthGuard` loads the user's status on each request and returns `403 ACCOUNT_SUSPENDED`. Login returns the same code. Open sockets are disconnected at the moment of suspension. |

### 4.3 Domain model (Prisma, PostgreSQL, snake_case via `@map`/`@@map`)

Integer autoincrement ids everywhere (they double as stable cursors), except `Media.id`, which is a UUID that is also the file name. Every model with `updated_at` uses `@updatedAt`.

- **User**: `id`, `username` (unique, stored lowercase, `^[a-z0-9_]{3,20}$`), `name` (display name, 2–50), `email` (unique, stored lowercase), `password_hash`, `bio?` (≤160), `avatar_path?`, `role` (`USER` | `ADMIN`, default `USER`), `status` (`ACTIVE` | `SUSPENDED`, default `ACTIVE`), `suspended_at?`, `suspension_reason?`, `created_at`, `updated_at`.
- **Follow**: `follower_id` → User (`Cascade`), `followee_id` → User (`Cascade`), `created_at`. `@@id([followerId, followeeId])`, `@@index([followeeId])`.
- **Post**: `id`, `author_id` → User (`Restrict`), `kind` (`POST` | `REEL`), `body?` (≤2000; reels ≤300), `repost_of_id?` → Post (`Cascade`: deleting the original removes its reposts), `moderation_state` (`VISIBLE` | `HIDDEN`, default `VISIBLE`), `hidden_at?`, `hidden_by_id?` → User, `hidden_reason?`, `created_at`, `updated_at`. `@@index([authorId, id])`, `@@index([kind, id])`.
- **Media**: `id` (UUID, also the stored file name stem), `owner_id` → User (`Cascade`), `post_id?` → Post (`Cascade`), `kind` (`IMAGE` | `VIDEO`), `file_name` (unique, e.g. `<uuid>.jpg`), `mime_type`, `size_bytes`, `width?`, `height?`, `duration_ms?`, `position?` (0–3 inside a post), `created_at`. `@@unique([postId, position])`, `@@index([ownerId, postId])`. A media row is uploaded first (`post_id = NULL`, "pending") and attached when the post is created.
- **Like**: `user_id` → User (`Cascade`), `post_id` → Post (`Cascade`), `created_at`. `@@id([userId, postId])`, `@@index([postId])`.
- **Comment**: `id`, `post_id` → Post (`Cascade`), `author_id` → User (`Restrict`), `body` (≤500), `moderation_state`, `hidden_at?`, `hidden_by_id?`, `hidden_reason?`, `created_at`, `updated_at`. `@@index([postId, id])`. Comments are flat (no threads).
- **ReelView**: `reel_id` → Post (`Cascade`), `user_id` → User (`Cascade`), `viewed_on` (`@db.Date`). `@@id([reelId, userId, viewedOn])`. Views = row count, i.e. at most one view per user per reel per day. Inserted with `createMany({ skipDuplicates: true })`.
- **Conversation**: `id`, `kind` (`PUBLIC` | `DIRECT` | `GROUP`), `title?` (groups, 1–60), `direct_key?` (unique; `"<minUserId>:<maxUserId>"` for DIRECT), `created_by_id?` → User, `last_message_at?`, `created_at`, `updated_at`. `@@index([lastMessageAt])`.
- **ConversationMember** (DIRECT and GROUP only; the PUBLIC room has **no member rows**, because everyone is in it): `conversation_id` → Conversation (`Cascade`), `user_id` → User (`Cascade`), `role` (`OWNER` | `MEMBER`), `last_read_message_id?`, `joined_at`. `@@id([conversationId, userId])`, `@@index([userId])`.
- **Message**: `id`, `conversation_id` → Conversation (`Cascade`), `sender_id` → User (`Restrict`), `body` (1–1000, **text only**), `moderation_state`, `hidden_at?`, `hidden_by_id?`, `hidden_reason?`, `deleted_at?`, `created_at`. `@@index([conversationId, id])`.
- **Report**: `id`, `reporter_id` → User (`Cascade`), `target_type` (`POST` | `COMMENT` | `MESSAGE` | `USER`), `post_id?` → Post (`Cascade`), `comment_id?` → Comment (`Cascade`), `message_id?` → Message (`Cascade`), `user_id?` → User (`Cascade`, the reported user), `reason` (`SPAM` | `HATE` | `HARASSMENT` | `VIOLENCE` | `NUDITY` | `OTHER`), `details?` (≤500), `status` (`OPEN` | `ACTIONED` | `DISMISSED`), `resolved_by_id?` → User, `resolved_at?`, `created_at`. `@@index([status, createdAt])`.

**Database-level guarantees** (in a dedicated migration with raw SQL where Prisma cannot express them). Every CHECK on a nullable column must be NULL-safe (`col IS NOT NULL AND ...`), because a NULL CHECK result passes.

- Users: `CHECK (username ~ '^[a-z0-9_]{3,20}$')`, `CHECK (email = lower(email))`, `CHECK (status <> 'SUSPENDED' OR (suspended_at IS NOT NULL AND suspension_reason IS NOT NULL))`.
- Follows: `CHECK (follower_id <> followee_id)`.
- Posts: `CHECK (kind = 'POST' OR repost_of_id IS NULL)` (a reel is never a repost); `CHECK (repost_of_id IS NULL OR repost_of_id <> id)`; `CHECK (kind <> 'REEL' OR body IS NULL OR char_length(body) <= 300)`; `CHECK (moderation_state <> 'HIDDEN' OR hidden_at IS NOT NULL)`.
- **Partial unique index**: `UNIQUE (author_id, repost_of_id) WHERE repost_of_id IS NOT NULL`. One repost per user per post.
- Media: `CHECK (size_bytes > 0)`; `CHECK (kind <> 'VIDEO' OR (duration_ms IS NOT NULL AND duration_ms > 0))`; `CHECK ((post_id IS NULL) = (position IS NULL))`; `CHECK (position IS NULL OR position BETWEEN 0 AND 3)`.
- Comments and messages: `CHECK (char_length(btrim(body)) > 0)`; the same `moderation_state`/`hidden_at` CHECK as posts.
- Conversations: `CHECK ((kind = 'DIRECT') = (direct_key IS NOT NULL))`; `CHECK (kind <> 'GROUP' OR (title IS NOT NULL AND char_length(btrim(title)) > 0))`.
- **Partial unique index**: `CREATE UNIQUE INDEX one_public_room ON conversations ((true)) WHERE kind = 'PUBLIC'`. Exactly one public room can exist.
- **Partial unique index**: `UNIQUE (conversation_id) WHERE role = 'OWNER'` on conversation members. One owner per group.
- Reports: `CHECK (num_nonnulls(post_id, comment_id, message_id, user_id) = 1)`; a CHECK that the non-null column matches `target_type`; `CHECK (status = 'OPEN' OR (resolved_by_id IS NOT NULL AND resolved_at IS NOT NULL))`.
- **Partial unique indexes** (four): `UNIQUE (reporter_id, post_id) WHERE status = 'OPEN' AND post_id IS NOT NULL`, and the same for `comment_id`, `message_id` and `user_id`. One open report per reporter per target.

**Clarifications (agreed after the Message 0 review):**
- **Reposts** carry an optional quote `body` (≤2000) and **never media**. The original may be a `POST` or a `REEL`, but never another repost (a repost of a repost points to its original).
- **DIRECT members** are both `MEMBER`. `OWNER` exists only in groups.
- **Audit FKs** `hidden_by_id`, `resolved_by_id` and `created_by_id` use `onDelete: Restrict` (there is no user deletion, and `SetNull` would break the report CHECK).
- **Deleting a post**: read the media file names **before** deleting the post (the cascade removes the media rows), then delete the files after the commit.
- **`ReelView.viewed_on`** is the **UTC** date.
- **Deleting a group** cascades its messages and their reports. This is accepted and documented in the README (groups are small and owner-managed).

Rules the database cannot express (enforced in services, each with a stable error code): a post has a non-blank body **or** media **or** is a repost (`POST_EMPTY`); a post's media is either 1–4 images or exactly 1 video, never mixed (`POST_MEDIA_INVALID`); a reel has exactly one vertical video (`REEL_REQUIRES_VIDEO`, `REEL_NOT_VERTICAL`); attached media must be owned by the author and still pending (`MEDIA_NOT_OWNED`, `MEDIA_ALREADY_ATTACHED`); a repost always points to an original, never to another repost, and never to your own post (`CANNOT_REPOST`); `ReelView.reel_id` must be a `REEL`.

### 4.4 State machines (named transitions; illegal transition → `409 INVALID_TRANSITION`)

Every status change goes through **one helper**, `assertTransition(machine, from, transitionName)` in `common/transitions.ts`. Each machine is a map of **named transitions** (`{ hide: { from: ['VISIBLE'], to: 'HIDDEN' } }`), not a from→to table. Every write is **race-safe**: a single conditional `updateMany({ where: { id, <statusColumn>: expectedFrom }, data: { ..., updatedAt: new Date() } })` followed by `count === 1`, otherwise `409`. Always set `updatedAt` explicitly so the update is never an empty no-op.

**Content moderation** (Post, Comment, Message: `moderation_state`)

```text
VISIBLE ──hide (admin, reason required)──▶ HIDDEN
HIDDEN  ──unhide (admin)──▶ VISIBLE
```

- Hidden content disappears from feeds, reels, comment lists, the public post page and chat history for everyone **except its author and admins**. The author sees it with a "hidden by moderation" badge. Hidden chat messages are replaced in history by a placeholder (`أُخفيت هذه الرسالة من قِبل الإدارة`), and a live `message:hidden` event updates open clients.
- Hiding a target, through the queue or directly, marks **all its OPEN reports `ACTIONED`** in the same transaction.

**User status**

```text
ACTIVE    ──suspend (admin, reason required; not self, not another admin)──▶ SUSPENDED
SUSPENDED ──reinstate (admin)──▶ ACTIVE
```

- Suspension: all OPEN `USER` reports on that user become `ACTIONED`, the user's sockets get `session:revoked` and are disconnected, and every request returns `403 ACCOUNT_SUSPENDED`. Content from suspended authors stays in the database, but for non-admins it is excluded from **every** list (feeds, reels, profile grids, comments, followers/following, search, suggestions), and their posts return `404` on `/posts/:id` and `/p/:id`. Their profile (`GET /users/:username`) returns `404` to non-admins. **Old chat messages stay** (with the sender's name), because removing them would break conversations. Admins see everything, with a "suspended" badge.

**Report**

```text
OPEN ──action (admin; hides the target, or suspends for USER targets)──▶ ACTIONED
OPEN ──dismiss (admin)──▶ DISMISSED
```

- You can report only what you can see: a MESSAGE report requires the public room or membership of that conversation, otherwise `404 NOT_FOUND`. You cannot report your own content or yourself (`CANNOT_REPORT_OWN`). A second OPEN report on the same target by the same user is `409 REPORT_ALREADY_OPEN` (backed by the partial unique index; map Prisma `P2002` to that code).

**Message deletion** is not a moderation state. The sender sets `deleted_at` once (a second time is `409 INVALID_TRANSITION`). The body is kept for moderation, but every API response replaces it with `null` and `deleted: true`.

### 4.5 Feeds, counts and pagination

- **Cursor pagination everywhere**: `?cursor=<lastId>&limit=<n>` (default 10 for posts and reels, 20 for comments, 50 for messages, max 50). Order by `id DESC`, where `id < cursor`. The response is `{ items, nextCursor }` (`null` at the end). No offset pagination.
- **Home feed**: `kind = POST` (originals and reposts), author ∈ (people I follow ∪ me), `moderation_state = VISIBLE` (or authored by me), author `status = ACTIVE`. A repost renders the original inside a card; if the original is hidden or its author is suspended, the repost shows "this post is no longer available" (a deleted original removes its reposts by cascade).
- **Reels feed**: all `kind = REEL`, visible, from active authors, newest first. Everyone's reels, not just followed accounts.
- **Counts computed, never stored**: like, comment, repost and view counts use Prisma's filtered `_count` in the same query. `likedByMe` and `repostedByMe` use a relation filtered to the current user (`take: 1`). Follower and following counts use `_count`. **No N+1**: one query per page, verified by turning on Prisma query logging in the phase report.

### 4.6 Media pipeline (Phase 4)

- **Endpoints**: `POST /media/images` (field `file`, limit 5 MB) and `POST /media/videos` (field `file`, limit 50 MB). Each returns the Media row (`id`, `url`, `kind`, `width`, `height`, `durationMs`). Over the limit → **`413 MEDIA_TOO_LARGE`** (Multer `LIMIT_FILE_SIZE`).
- **Real type from magic bytes**, never the client's declared MIME: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP`, video ISO-BMFF `....ftyp` (brands `isom`, `iso2`, `mp41`, `mp42`, `avc1`, `M4V `, `qt  `). Mismatch → **`415 MEDIA_TYPE_UNSUPPORTED`**. Stored extension comes from the detected type (videos are always stored as `.mp4` and served as `video/mp4`).
- **Video probe without transcoding or new libraries**: `mp4-probe.ts` walks ISO-BMFF boxes with `fs` reads (the `moov` box may be at the end of the file). It reads the duration from `mvhd`, the width, height and rotation matrix from the video track's `tkhd` (90°/270° swaps width and height), and the codec fourcc from `stsd`.
  - Duration > 60 s → **`422 VIDEO_TOO_LONG`**.
  - Codec not `avc1` (H.264) → **`422 VIDEO_CODEC_UNSUPPORTED`**. HEVC (`hvc1`/`hev1`, the iPhone default) does not play in many desktop browsers, and we do not transcode. The Arabic message tells iPhone users to choose Settings → Camera → Formats → "Most Compatible".
  - Probe failure → `415 MEDIA_TYPE_UNSUPPORTED`.
- **Saved before validated**: Multer writes the file to disk before the probe runs. The `RemoveUploadOnError` interceptor deletes it whenever the request ends in an error (including `413`/`415`/`422`), so no orphan files are left behind.
- **Pending media sweep**: media rows still unattached after 24 h are deleted with their files. Files on disk with no row are deleted too. This runs on API start and with `npm run media:sweep`.
- **Serving**: files live in `api/uploads/media/` and are served by `express.static` at `/media/<file_name>`. That supports **HTTP Range** (`206 Partial Content`) so videos stream and seek, plus ETag and long `Cache-Control` (names are immutable UUIDs). The web app rewrites `/media/:path*` to the API, so media URLs are same-origin and work from a phone on the LAN. Range must survive the rewrite (verified in Phase 4).
- **Avatars**: `POST /users/me/avatar` (image rules, 5 MB). Stored in `api/uploads/media/avatars/` and served at `/media/avatars/...`. The old avatar file is deleted after the new one is saved.
- Deleting a post deletes its media files **after** the DB transaction commits.

### 4.7 Real-time chat (Phases 9–10)

- **Transport**: Socket.IO namespace `/chat` on the API port. CORS allows the origins in `WEB_ORIGINS` (localhost plus the LAN IP).
- **Handshake auth**: `auth: { token }` is verified with `JwtService.verifyAsync`. The web keeps the session JWT in an httpOnly cookie that browser JS cannot read, so the web uses a **socket ticket**: `POST /auth/socket-ticket` returns a 5-minute JWT with `aud: "socket"`, fetched through a Server Action (`getSocketTicket()`) and requested again on every reconnect. Mobile passes its normal Bearer token. Invalid token or suspended user → the connection is refused with `UNAUTHENTICATED` / `ACCOUNT_SUSPENDED`.
- **Rooms**: on connect, every socket joins `public` and `user:<id>`. A socket joins `conv:<id>` only after a membership check (`conversation:join`).
- **Client → server**: `message:send { conversationId, body, clientId }` with an ack `{ ok: true, message } | { ok: false, code, retryAfterMs? }`; `conversation:join { conversationId }`; `typing { conversationId }` (DIRECT/GROUP only, not stored); `read { conversationId, messageId }`.
- **Server → client**: `message:new`, `message:hidden`, `message:deleted`, `typing`, `conversation:new` (to `user:<id>` when you are added to a chat), `session:revoked`.
- **History**: REST `GET /chat/conversations/:id/messages?cursor=&limit=` (the public room uses its own id from `GET /chat/public`). Newest page first, rendered oldest→newest, "load older" at the top.
- **Rate limit** (all rooms): in-memory sliding window per user, **5 messages per 10 seconds** → ack `{ ok: false, code: "RATE_LIMITED", retryAfterMs }`. In-memory is acceptable because we run one API instance; this is documented in the README.
- **Private chats (DIRECT)**: `POST /chat/direct { userId }` creates or returns the conversation (upsert on `direct_key`). It is allowed only when **both users follow each other** (`403 DM_REQUIRES_MUTUAL_FOLLOW`). The same check runs on **every send**: if either side unfollows, the history stays readable but sending returns `403 DM_REQUIRES_MUTUAL_FOLLOW`, and the UI shows a notice instead of the input.
- **Groups**: `POST /chat/groups { title, memberIds }`. The creator becomes OWNER. Every added member must be a **mutual follow of the person adding them** (`403 DM_REQUIRES_MUTUAL_FOLLOW`). A group holds at most 30 members including the owner (`409 GROUP_FULL`). The owner can rename, add, remove and delete; members can leave; the owner cannot leave (`409 OWNER_CANNOT_LEAVE`) but can delete the group. Mutual follow is checked only when someone is added, not on every send.
- **Unread**: `last_read_message_id` per member; the conversation list returns `unreadCount` (messages with `id > last_read` not sent by me). The public room has no unread tracking.
- **Admins in the public room** see a "hide" action on each message, which runs the same `hide` transition.

### 4.8 Errors

- Every API error body is `{ statusCode, code, message, details? }`. `code` is a stable UPPER_SNAKE string (`AppError(code, status)` from `common/errors.ts`). The `AllExceptionsFilter` maps `ValidationPipe` errors to `VALIDATION_FAILED` (with field details), Multer size errors to `MEDIA_TOO_LARGE`, Prisma `P2002` to the matching `*_TAKEN` / `ALREADY_*` / `REPORT_ALREADY_OPEN` code, and anything unknown to `INTERNAL_ERROR` (no stack traces in responses).
- The web maps codes to Arabic in `lib/errors.ts`. Unknown codes fall back to a generic Arabic message. Socket acks use the same codes.
- Core codes: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `USERNAME_TAKEN`, `ACCOUNT_SUSPENDED`, `MEDIA_TOO_LARGE`, `MEDIA_TYPE_UNSUPPORTED`, `VIDEO_TOO_LONG`, `VIDEO_CODEC_UNSUPPORTED`, `REEL_REQUIRES_VIDEO`, `REEL_NOT_VERTICAL`, `MEDIA_NOT_OWNED`, `MEDIA_ALREADY_ATTACHED`, `POST_EMPTY`, `POST_MEDIA_INVALID`, `CANNOT_REPOST`, `ALREADY_REPOSTED`, `CANNOT_FOLLOW_SELF`, `DM_REQUIRES_MUTUAL_FOLLOW`, `NOT_A_MEMBER`, `GROUP_FULL`, `OWNER_CANNOT_LEAVE`, `RATE_LIMITED`, `INVALID_TRANSITION`, `CANNOT_REPORT_OWN`, `REPORT_ALREADY_OPEN`, `CANNOT_SUSPEND`, `INTERNAL_ERROR`.

### 4.9 Auth

- **Socket tickets are not REST tokens**: `JwtAuthGuard` rejects any token with `aud: "socket"` (`401 UNAUTHENTICATED`). The gateway accepts both a ticket and a normal access token.
- `POST /auth/register { name, username, email, password }`: username and email are lowercased and trimmed; the password is at least 8 characters. Returns `{ accessToken, user }`.
- `POST /auth/login { identifier, password }`: the identifier is the email **or** the username. A wrong password and an unknown user return the same `401 INVALID_CREDENTIALS`. A suspended user gets `403 ACCOUNT_SUSPENDED`.
- `GET /auth/me`. `POST /auth/socket-ticket`.
- Access JWT: `HS256`, 7-day expiry, `sub = userId`. No refresh tokens. Web: httpOnly `SameSite=Lax` cookie `salamedia_session`. Mobile: `expo-secure-store`.
- `toSafeUser` never returns `password_hash`. `toPublicUser` (used for other people) also omits `email`, `role` and suspension fields.

### 4.10 UI language and design system

- **Arabic-first and RTL**: `<html lang="ar" dir="rtl">`. Use Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) and never `ml/mr/pl/pr/left/right/text-left`. Code, identifiers and the API stay in English. Usernames and URLs are wrapped in `dir="ltr"` spans.
- **Formatting** (`lib/format.ts`): relative times with `Intl.RelativeTimeFormat('ar')` ("منذ ٥ دقائق"), absolute dates with `Intl.DateTimeFormat('ar-SY')`, counts with `Intl.NumberFormat('ar-SY', { notation: 'compact' })`, video durations as `m:ss`.
- **Tokens**: semantic CSS variables in `globals.css` (`:root` for light, `.dark` for dark), exposed in `tailwind.config.ts` as `hsl(var(--token) / <alpha-value>)`. Components use **only** semantic classes (`bg-surface`, `text-muted`, `border-border`, `bg-primary text-primary-fg`, ...) and never raw palette colors such as `bg-indigo-600`.
- **Look: Facebook-style, in "Euphrates blue" (أزرق فراتي)**. The structure and density follow Facebook: a light grey page, white cards, a top header with section tabs, a three-column desktop layout, and cards with full-width media and a counts row above an action row. The colour is our own: a **blue-green primary** (hue ~196) that is clearly bluer than Sanad's teal (hue ~175), with a coral accent for likes and the live dot. Never use Facebook's blue (`#1877F2`), its logo, wordmark or icons. Starting values (HSL triplets); adjust only to pass WCAG AA (4.5:1 for body text, 3:1 for large text and UI):

  | Token | Light | Dark |
  | --- | --- | --- |
  | `--bg` (page) | `210 20% 95%` | `216 18% 8%` |
  | `--surface` (cards, header) | `0 0% 100%` | `216 14% 13%` |
  | `--surface-2` (inputs, hover, chips) | `210 18% 92%` | `216 12% 19%` |
  | `--border` | `210 14% 86%` | `216 10% 25%` |
  | `--text` | `215 25% 12%` | `210 20% 92%` |
  | `--muted` | `215 10% 40%` | `214 10% 68%` |
  | `--primary` | `196 85% 34%` | `194 75% 55%` |
  | `--primary-fg` | `0 0% 100%` | `216 30% 8%` |
  | `--primary-soft` (active tab bg, selected chips) | `196 70% 93%` | `196 40% 20%` |
  | `--accent` (likes, live dot) | `8 80% 54%` | `8 85% 64%` |
  | `--accent-fg` | `0 0% 100%` | `216 30% 8%` |
  | `--danger` | `0 72% 46%` | `0 80% 66%` |
  | `--success` | `152 60% 30%` | `152 50% 55%` |
  | `--ring` | `196 85% 34%` | `194 75% 55%` |

- **Typography**: IBM Plex Sans Arabic via `next/font/google` (weights 400/500/600/700, subsets `arabic` + `latin`, `display: 'swap'`), exposed as a CSS variable and set as Tailwind's `font-sans`. Body text is 16px with `leading-[1.75]`. Headings are tighter (1.3–1.4).
- **Theme**: light / dark / system, stored in `localStorage` (`theme`). A tiny inline script in `<head>` sets the `dark` class **before first paint**, so there is no flash. `<html suppressHydrationWarning>`. `ThemeContext` follows `prefers-color-scheme` changes while the setting is `system`. `ThemeToggle` cycles through the three modes.
- **Motion**: CSS only (transitions and keyframes in Tailwind, no animation library). Everything non-essential is disabled under `@media (prefers-reduced-motion: reduce)`, including the reel scroll-snap smoothing and the like "pop".
- **One radius rule**: cards, inputs, buttons, menus and media inside cards use `rounded-lg` (8px, Facebook-like); avatars, pills, search fields and icon buttons use `rounded-full`. Nothing else. On mobile, feed cards are edge-to-edge (`rounded-none`, separated by an 8px gap of `bg`), as on Facebook's app.
- **One elevation rule**: cards and the header use `shadow-sm` with no border (white on the grey page); floating layers (menus, sheets, dialogs, toasts) use `shadow-lg`. Nothing else.
- **Shared components** (`components/ui`): `Button` (primary / secondary / ghost / danger, sizes sm/md, a `pending` state), `Card`, `Badge`, `Field` (label + input/textarea + hint + Arabic error, `aria-describedby`), `Tabs` (URL-driven via `?tab=`, so they work without JS), `StatCard` (admin stats), `Avatar` (image, or initials on a deterministic color from the user id), `EmptyState`, `Spinner`, `ThemeToggle`. Every feature screen is built from these.
- **Layout (Facebook-style)**:
  - **Header** (all sizes, sticky, `bg-surface shadow-sm`, 56px): the Salamedia wordmark and a rounded search field (`/following?q=`) on the start side; on `md+` the **5 section tabs as icons in the centre**, each with a 3px `primary` bar under the active one and a tooltip label; on the end side, round icon buttons (new post "+", chat with unread badge) and the account avatar opening `AccountMenu`.
  - **Below `md`**: the header shows the wordmark, search and chat icons only, and a **fixed bottom tab bar** carries the 5 tabs (icons + small labels, active in `primary`, safe-area padding `env(safe-area-inset-bottom)`).
  - **`lg+` three columns** on the feed pages (`/home`, `/posts/[id]`): the **start column** (~280px, sticky) holds shortcuts with avatars/icons (my profile, Reels, Following, my groups, Admin for admins); the **centre** is the feed (max 680px); the **end column** (~300px, sticky) holds "جهات الاتصال", my mutual follows (opens a private chat), and a **public chat preview card** with the last 3 messages and a "انضم للدردشة" button. `md`–`lg` shows the centre only.
  - The tabs are الرئيسية `/home`, ريلز `/reels`, المتابَعون `/following`, الدردشة `/chat`, حسابي `/u/<me>`. The admin entry (`/admin`) shows only for admins (start column and account menu). Icons are inline SVG components (no icon library).
  - **Post card**: a header (avatar 40px, name in semibold, time · public icon under it, "…" menu on the end side), the body, then media **edge to edge** inside the card, then a counts row (coral heart + count on the start side; "x تعليقاً · y مشاركة" on the end side), a divider, and an action row of three equal-width ghost buttons: أعجبني / تعليق / مشاركة.
  - **Composer card** at the top of Home: my avatar + a rounded `bg-surface-2` field "بماذا تفكر يا <name>؟" that opens the composer dialog, and a row of "صورة" / "فيديو" / "ريل" buttons under a divider.
- **Accessibility**: visible focus rings (`ring-ring`), labelled icon buttons (`aria-label` in Arabic), `aria-current="page"` on the active tab, and a muted-by-default reel video with a labelled unmute button.

### 4.11 Route map (web)

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing: what Salamedia is, sign in / register (signed-in users are redirected to `/home`) |
| `/login`, `/register` | Public | Auth (login by email or username) |
| `/p/[id]` | Public | Read-only post or reel (visible only), the share-link target; "sign in to like and comment" |
| `(app)/home` | Signed in | Composer (text, up to 4 photos or 1 video) + Home feed with infinite "load more" |
| `(app)/posts/[id]` | Signed in | Post with comments, like, repost, share, report |
| `(app)/reels` | Signed in | Full-height vertical reels with scroll-snap, autoplay in view, like/comment/share |
| `(app)/reels/new` | Signed in | Upload a reel (vertical video ≤60 s) + caption |
| `(app)/following` | Signed in | Tabs: following / followers / suggestions, plus user search |
| `(app)/chat` | Signed in | The public room (the default chat screen), with the list of my conversations beside it on desktop |
| `(app)/chat/[id]` | Member | A private or group conversation |
| `(app)/chat/new` | Signed in | Start a private chat or create a group (pick from mutual follows) |
| `(app)/u/[username]` | Signed in | Profile: avatar, name, bio, counts, follow/message buttons, tabs posts/reels grid |
| `(app)/settings/profile` | Signed in | Edit name, bio, avatar; theme setting |
| `(app)/admin` | Admin | Stats (StatCards) |
| `(app)/admin/reports` | Admin | Report queue by target type (tabs), action / dismiss |
| `(app)/admin/users` | Admin | Search users, suspend / reinstate |
| `(app)/admin/hidden` | Admin | Hidden content, unhide |

### 4.12 API surface (summary; Swagger at `/docs` is the source of truth)

`/auth/*` (4.9) · `GET /users/:username`, `GET /users/search?q=`, `PATCH /users/me`, `POST /users/me/avatar` · `POST /media/images`, `POST /media/videos` · `POST /posts`, `POST /posts/reels`, `GET /posts/:id`, `DELETE /posts/:id`, `GET /feed/home`, `GET /feed/reels`, `GET /users/:username/posts?kind=POST|REEL` · `POST|DELETE /posts/:id/like`, `POST|DELETE /posts/:id/repost`, `GET|POST /posts/:id/comments`, `DELETE /comments/:id`, `POST /posts/:id/view` · `POST|DELETE /users/:id/follow`, `GET /users/:username/followers`, `GET /users/:username/following`, `GET /follows/suggestions` · `GET /chat/public`, `GET /chat/conversations`, `GET /chat/conversations/:id`, `GET /chat/conversations/:id/messages`, `POST /chat/direct`, `POST /chat/groups`, `PATCH /chat/groups/:id`, `POST /chat/groups/:id/members`, `DELETE /chat/groups/:id/members/:userId`, `POST /chat/groups/:id/leave`, `DELETE /chat/groups/:id`, `DELETE /chat/messages/:id` · `POST /reports`, `GET /admin/reports`, `POST /admin/reports/:id/action`, `POST /admin/reports/:id/dismiss`, `POST /admin/{posts|comments|messages}/:id/hide|unhide`, `POST /admin/users/:id/suspend|reinstate`, `GET /admin/users`, `GET /admin/hidden`, `GET /admin/stats`.

Public (no JWT): `POST /auth/register`, `POST /auth/login`, `GET /posts/:id/public`, `GET /media/*`. Everything else requires `JwtAuthGuard`.

### 4.13 Seed (deterministic)

- `TRUNCATE ... RESTART IDENTITY CASCADE` on all tables, then **empty `api/uploads/media` (including `avatars/`)** and copy files from `prisma/seed-media/` under fixed UUID names, so a re-seed always produces identical rows and files.
- **Users** (password `Password123!` for all): `admin` (Admin, `admin@salamedia.test`), the team (`hamid`, `rami`, `badr`, `yousef`, `nawar`), and about 8 Salamiyah residents with realistic Arabic names and bios. `demo` (`demo@salamedia.test`) is the presenter account: it follows several people, has mutual follows (so private chats work), and belongs to one group. One extra user, `troll`, has content that has been reported (open reports exist for the demo).
- **Content** in natural Syrian Arabic, set in Salamiyah: Shmemis Castle trips, the old city, local cafés, the bootcamp, football, weather, the market, poetry evenings. About 40 posts (some with photos, a few with a video, some reposts), about 8 reels, likes and comments spread realistically, a public chat history of about 60 messages, 2 private chats and 1 group, and reports in several states (OPEN, ACTIONED, DISMISSED). Timestamps are spread across the last 14 days relative to a **fixed seed anchor date**, not `now()`, so the data stays deterministic.
- **Seed media**: `prisma/seed-media/images/*.jpg|png` and `prisma/seed-media/videos/*.mp4` (vertical, H.264, ≤15 s, ≤8 MB each). The team supplies real photos and clips. If no photos are present, the seed generates simple gradient PNGs with Node's built-in `zlib` (no new library). If no videos are present, it skips video posts and reels and prints a clear warning.

### 4.14 Out of scope (do not build)

Stories, live streaming, algorithmic or ranked feeds, push notifications, email/SMS (including password reset and verification), a notifications centre, post editing, hashtags and mentions, post search (user search only), chat media, voice notes, message editing and reactions, blocking (DMs already require mutual follows), friend requests, video transcoding or thumbnails generation, external/cloud storage, social login, i18n switching, analytics, multiple API instances.

---

## 5. Phased Work Plan

Build in this order. Each phase arrives as a separate prompt. Finish one phase, verify it, report, and **stop**. Do not start the next phase until asked. **Web first**: phases 1–14 make the web app fully demo-ready (including the mobile-responsive layout and an installable PWA). Phases 15–16 (Expo) are **optional** and run only if time allows.

1. Monorepo scaffold (`api/`, `web/`), Prisma schema, constraints migration, deterministic seed
2. Design foundation + auth (tokens, font, theme, UI primitives; register/login/me; web session)
3. App shell and navigation (Facebook-style header with centre tabs, bottom tabs on phones, side columns on lg+, protected layout, account menu, error map, placeholders)
4. Media pipeline (images and videos, magic bytes, mp4 probe, 413/415/422, Range streaming, orphan cleanup)
5. Posts and the Home feed (composer, cursor pagination, post page, delete, public share page)
6. Likes, comments, reposts and share link (counts without N+1)
7. Follows (follow/unfollow, lists, suggestions, user search, Following tab)
8. Reels (upload, vertical snap feed, autoplay in view, view counts)
9. Real-time foundation + the public chat (gateway, JWT/ticket handshake, history, rate limit)
10. Private and group chats (mutual-follow rule, groups, unread counts, typing)
11. Profile (view, edit, avatar, posts/reels grid, counts)
12. Moderation (reports, admin queue, hide/unhide, suspend/reinstate, stats)
13. PWA and mobile-web polish (manifest, icons, service worker, offline page, LAN phone testing, responsive audit)
14. Hardening, README and the 3-minute `DEMO.md`
15. *(Optional)* Mobile part 1: Expo scaffold, auth with secure-store, 5-tab navigator, Home, Profile
16. *(Optional)* Mobile part 2: Reels player, Public Chat over sockets, posting with camera and gallery

### Definition of done (every phase)

- `npm run build` passes in `api/` and in `web/` (and `npx tsc --noEmit` in `mobile/` for phases 15–16); `npx prisma validate` passes.
- Every new endpoint appears in Swagger (`/docs`) with DTOs and documented error responses.
- Every business rule in this phase is enforced in the API, not only in the UI, and has been exercised manually (curl or a Node script) for the happy path **and** at least one rejection path. Report the exact commands and the status codes / error codes you got.
- New UI uses only semantic tokens, logical (RTL-safe) utilities and the shared `components/ui` primitives, and works in light and dark at 375 px and 1280 px wide.
- No files outside the canonical structure, and no new libraries beyond those listed.
- The DB and the upload folders are restored to seed state at the end (`npm run db:seed` in `api/`).
- The report ends with a short **"For your click-through pass"** list: 5–10 concrete things for the human to click in the browser, with the account to use.

---

## 6. Working Rules (lessons from Sanad — apply in every phase)

**Environment and scripts**
- We are on **Windows / PowerShell**. Use Windows-style paths in test scripts. Keep npm scripts cross-platform (no `rm -rf`, no `export`, no `&&` assumptions that break in PowerShell; use Node one-liners or `node scripts/...` when needed).
- Send Arabic request bodies from **UTF-8 JSON files** (`curl.exe --data-binary "@tmp\body.json" -H "Content-Type: application/json; charset=utf-8"`) or from a Node script. Arabic in command-line arguments gets mangled. Use `curl.exe`, not the PowerShell `curl` alias. Put temporary test files in a git-ignored `tmp/` at the repo root.
- Start test servers with **`node` directly** (`node dist/main.js`, `node node_modules/next/dist/bin/next start -p 3000`), not `npx`, so stopping the task really stops them. Stop only the processes you started (by PID). **Never kill all `node.exe` processes.**
- Ports: API `4000`, web `3000`. The dev machine's LAN IP is currently `192.168.1.180` (DHCP; may change). Disconnect any VPN (e.g. ProTUN) while testing from a phone. Env: `api/.env` (`DATABASE_URL`, `JWT_SECRET`, `PORT=4000`, `WEB_ORIGINS`), `web/.env.local` (`API_URL=http://localhost:4000`). Commit only the `.example` files.

**Scaffolding**
- Scaffold inside the existing repo, with **no nested git**: `npx @nestjs/cli new api --skip-git --package-manager npm`; `npx create-next-app@15 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --disable-git --use-npm`, then pin Tailwind to v3 and replace any v4 config; Expo (phase 15) the same way, and delete any `.git` it creates.
- `.gitattributes` forces LF (`* text=auto eol=lf`) so Prisma migration checksums stay stable.

**Git**
- Commit messages: `phase N: short summary` (e.g. `phase 4: add mp4 probe`). The very first commit (`CLAUDE.md` only) is `chore: add CLAUDE.md`.
- One branch per phase: `phase-<n>-<name>` (e.g. `phase-4-media`), created from an up-to-date `main`. Small, meaningful commits. Never commit `.env*` (except `.example`), `api/uploads/`, `tmp/` or build output.
- **No push and no merge until the human writes "approved".** Then: `git checkout main`, `git merge --no-ff phase-<n>-<name>`, push `main` and the phase branch. No pull requests.

**Database**
- `prisma migrate dev --name <name>` for schema changes. Raw-SQL constraints go in their own migration (`--create-only`, edit, then apply).
- **`prisma migrate reset` needs the human's explicit consent in a fresh message.** Ask, then wait.
- DB CHECKs on nullable columns are NULL-safe (`col IS NOT NULL AND col > 0`).
- Race-safe status updates use a single conditional `updateMany` + `count === 1`, and always set `updatedAt`.

**Next.js / Server Actions**
- **Never pass ids with `.bind()`** to Server Actions. Bound actions hang forever when a form is submitted before hydration (Next 15.5). Use hidden form fields and validate them as untrusted input (parse to positive integer, else return the `VALIDATION_FAILED` message).
- curl tests of Server Actions need an `Origin` header.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit: '60mb'` (videos are forwarded through actions). **Do not add `middleware.ts`**, because middleware caps request bodies at 10 MB. Protected pages call `requireSessionToken()` in the `(app)` layout instead.
- `allowedDevOrigins` in `next.config.ts` lists the LAN IP for phone testing.
- Data reads happen in async Server Components through `apiFetch`. Client components that need more data (load more, chat history) call a Server Action that returns plain JSON.

**API**
- Errors carry a stable `code` (4.8), and the web maps codes to Arabic.
- Status changes go through `assertTransition(machine, from, transitionName)` with **named transitions**.
- Uploads are saved before validation, so `RemoveUploadOnError` removes the file on any error.

**Testing and reporting**
- After testing, restore the DB and the upload folders to seed state (`npm run db:seed`).
- When the browser pane is hidden or unavailable, do the API checks and server-render checks (fetch the page HTML and assert on content) and leave the clicking to the human. **Every report ends with "For your click-through pass".**
- Report format: what was built (files), the commands run with their status codes, any deviation from this file and why, known limitations, then the click-through list. Then **stop**.
