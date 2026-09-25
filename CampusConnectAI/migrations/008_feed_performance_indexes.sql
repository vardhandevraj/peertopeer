-- Feed/homepage performance indexes.
-- Run this file ONCE in the Supabase SQL Editor against an existing database.
-- Fresh installs get these indexes automatically from supabase_schema.sql,
-- so running it there is harmless (each statement is a no-op if it exists).

CREATE INDEX IF NOT EXISTS idx_posts_created
    ON posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user
    ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post
    ON comments (post_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_comments_user
    ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_resources_user
    ON resources (user_id);
CREATE INDEX IF NOT EXISTS idx_friends_sender_status
    ON friends (sender_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_receiver_status
    ON friends (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_followers_following
    ON followers (following_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user
    ON chat_history (user_id);