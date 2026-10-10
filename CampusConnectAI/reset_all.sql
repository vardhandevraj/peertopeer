-- IVY complete reset: wipes all tables, then rebuilds them from the
-- current schema (users through reports) plus storage RLS policies.
-- Paste this ENTIRE file into the Supabase SQL Editor and run it.
-- NOTE: Storage buckets (profile-images, post-files, resources, chat-files)
-- must exist in the dashboard, otherwise uploads will still fail at runtime.

DROP TABLE IF EXISTS
    users,
    posts,
    comments,
    likes,
    friends,
    followers,
    conversations,
    conversation_participants,
    messages,
    call_rooms,
    call_room_participants,
    notifications,
    resources,
    chat_history,
    ai_conversations,
    ai_messages,
    auth_tokens,
    reports
CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
