-- Salamedia database-level guarantees (CLAUDE.md §4.3).
-- Prisma cannot express CHECK constraints or partial unique indexes, so they live here.
-- Every CHECK that touches a nullable column is written NULL-safe, because a NULL CHECK result passes.

-- ───────────── users ─────────────

-- Usernames are lowercase a-z, 0-9 and underscore, 3 to 20 characters.
ALTER TABLE "users" ADD CONSTRAINT "users_username_format_chk"
  CHECK (username ~ '^[a-z0-9_]{3,20}$');

-- Emails are stored lowercase.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_chk"
  CHECK (email = lower(email));

-- A suspended user always has a suspension time and a reason.
ALTER TABLE "users" ADD CONSTRAINT "users_suspension_fields_chk"
  CHECK (status <> 'SUSPENDED' OR (suspended_at IS NOT NULL AND suspension_reason IS NOT NULL));

-- ───────────── follows ─────────────

-- Nobody follows themselves.
ALTER TABLE "follows" ADD CONSTRAINT "follows_no_self_follow_chk"
  CHECK (follower_id <> followee_id);

-- ───────────── posts ─────────────

-- A reel is never a repost.
ALTER TABLE "posts" ADD CONSTRAINT "posts_reel_not_repost_chk"
  CHECK (kind = 'POST' OR repost_of_id IS NULL);

-- A post never reposts itself.
ALTER TABLE "posts" ADD CONSTRAINT "posts_repost_not_self_chk"
  CHECK (repost_of_id IS NULL OR repost_of_id <> id);

-- A reel caption is at most 300 characters (posts allow 2000 via VARCHAR).
ALTER TABLE "posts" ADD CONSTRAINT "posts_reel_body_length_chk"
  CHECK (kind <> 'REEL' OR body IS NULL OR char_length(body) <= 300);

-- Hidden posts record when they were hidden.
ALTER TABLE "posts" ADD CONSTRAINT "posts_hidden_has_time_chk"
  CHECK (moderation_state <> 'HIDDEN' OR hidden_at IS NOT NULL);

-- One repost per user per original post.
CREATE UNIQUE INDEX "posts_one_repost_per_user_uq"
  ON "posts" (author_id, repost_of_id)
  WHERE repost_of_id IS NOT NULL;

-- ───────────── media ─────────────

-- Files are never empty.
ALTER TABLE "media" ADD CONSTRAINT "media_size_positive_chk"
  CHECK (size_bytes > 0);

-- Videos always carry a positive duration.
ALTER TABLE "media" ADD CONSTRAINT "media_video_duration_chk"
  CHECK (kind <> 'VIDEO' OR (duration_ms IS NOT NULL AND duration_ms > 0));

-- Pending media has neither post nor position; attached media has both.
ALTER TABLE "media" ADD CONSTRAINT "media_post_position_pair_chk"
  CHECK ((post_id IS NULL) = (position IS NULL));

-- A post holds positions 0 to 3.
ALTER TABLE "media" ADD CONSTRAINT "media_position_range_chk"
  CHECK (position IS NULL OR position BETWEEN 0 AND 3);

-- ───────────── comments ─────────────

-- A comment body is never blank.
ALTER TABLE "comments" ADD CONSTRAINT "comments_body_not_blank_chk"
  CHECK (char_length(btrim(body)) > 0);

-- Hidden comments record when they were hidden.
ALTER TABLE "comments" ADD CONSTRAINT "comments_hidden_has_time_chk"
  CHECK (moderation_state <> 'HIDDEN' OR hidden_at IS NOT NULL);

-- ───────────── messages ─────────────

-- A message body is never blank.
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_not_blank_chk"
  CHECK (char_length(btrim(body)) > 0);

-- Hidden messages record when they were hidden.
ALTER TABLE "messages" ADD CONSTRAINT "messages_hidden_has_time_chk"
  CHECK (moderation_state <> 'HIDDEN' OR hidden_at IS NOT NULL);

-- ───────────── conversations ─────────────

-- Exactly the DIRECT conversations have a direct_key ("<minUserId>:<maxUserId>").
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_direct_key_chk"
  CHECK ((kind = 'DIRECT') = (direct_key IS NOT NULL));

-- A group always has a non-blank title.
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_title_chk"
  CHECK (kind <> 'GROUP' OR (title IS NOT NULL AND char_length(btrim(title)) > 0));

-- Exactly one public room can exist.
CREATE UNIQUE INDEX "one_public_room"
  ON "conversations" ((true))
  WHERE kind = 'PUBLIC';

-- ───────────── conversation_members ─────────────

-- One owner per conversation (only groups have an owner).
CREATE UNIQUE INDEX "conversation_members_one_owner_uq"
  ON "conversation_members" (conversation_id)
  WHERE role = 'OWNER';

-- ───────────── reports ─────────────

-- A report targets exactly one thing.
ALTER TABLE "reports" ADD CONSTRAINT "reports_single_target_chk"
  CHECK (num_nonnulls(post_id, comment_id, message_id, user_id) = 1);

-- The filled target column matches target_type.
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_matches_type_chk"
  CHECK (
    (target_type = 'POST'    AND post_id    IS NOT NULL) OR
    (target_type = 'COMMENT' AND comment_id IS NOT NULL) OR
    (target_type = 'MESSAGE' AND message_id IS NOT NULL) OR
    (target_type = 'USER'    AND user_id    IS NOT NULL)
  );

-- A resolved report records who resolved it and when.
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolution_fields_chk"
  CHECK (status = 'OPEN' OR (resolved_by_id IS NOT NULL AND resolved_at IS NOT NULL));

-- One OPEN report per reporter per target (four partial unique indexes).
CREATE UNIQUE INDEX "reports_one_open_post_uq"
  ON "reports" (reporter_id, post_id)
  WHERE status = 'OPEN' AND post_id IS NOT NULL;

CREATE UNIQUE INDEX "reports_one_open_comment_uq"
  ON "reports" (reporter_id, comment_id)
  WHERE status = 'OPEN' AND comment_id IS NOT NULL;

CREATE UNIQUE INDEX "reports_one_open_message_uq"
  ON "reports" (reporter_id, message_id)
  WHERE status = 'OPEN' AND message_id IS NOT NULL;

CREATE UNIQUE INDEX "reports_one_open_user_uq"
  ON "reports" (reporter_id, user_id)
  WHERE status = 'OPEN' AND user_id IS NOT NULL;
