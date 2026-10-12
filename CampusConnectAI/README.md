# Campus Connect AI

A beginner-friendly Flask social learning platform for students.

## Run Locally

1. Install Python.
2. Create a free project at [supabase.com](https://supabase.com).
3. Create the database tables by running `supabase_schema.sql` in the Supabase SQL Editor.
4. In Supabase Storage, create these **public** buckets:
   - `profile-images`
   - `post-files`
   - `resources`
   - `chat-files`
5. Fill in `.env` (copy from `.env.example`) with your Supabase URL, anon key,
   PostgreSQL connection string, and Groq API key.
6. Install packages:

```powershell
pip install -r requirements.txt
```

7. Start the app:

```powershell
python app.py
```

8. Open:

```text
http://127.0.0.1:5001
```

To use a different port, set `PORT` before starting the app, for example:

```bash
PORT=5050 python3 app.py
```

## Environment Variables

Copy `.env.example` values into your hosting platform settings.

- `SUPABASE_URL` / `SUPABASE_KEY`: from Supabase → Settings → API.
- `SUPABASE_DB_URL`: PostgreSQL connection string from Supabase → Settings → Database → Connection string → URI.
- `GROQ_API_KEY`: required for the AI assistant.

Optional: set `GROQ_MODEL` to choose a Groq chat model. The default is `openai/gpt-oss-120b`.

Optional: set `GROQ_VISION_MODEL` to choose the multimodal model used when a
student attaches images. When unset, IVY falls back to `GROQ_MODEL` and then to
built-in Llama 4 vision models.

## Video Learning Rooms

Starting a call from any conversation opens a dedicated room at `/call/<room_id>`
with video, screen sharing, shared chat, and `@ivy` support. WebRTC carries the
audio/video directly between browsers; Flask-SocketIO only relays signaling and
room chat; Supabase stores call metadata and messages.

The `call_rooms` / `call_room_participants` tables come from `supabase_schema.sql`.

## AI Assistant Chats

The `/ai` page hosts unlimited separate IVY conversations. Each chat keeps its
own message history (`ai_conversations` / `ai_messages` tables), gets an
automatic title from your first question, and can be renamed, searched, or
deleted from the sidebar. IVY only ever sees the context of the conversation
you are typing in.

You can attach up to 4 files (10 MB each, 15 MB total) to a message: images
(PNG/JPG/GIF/WEBP) go to a vision-capable model, and documents (PDF/DOCX/TXT)
have their text extracted so IVY can answer about them. Attachments are
processed in memory only and are never written to disk or shared with other
students.

## Password Reset & Moderation

Accounts are usable immediately after registration (no email verification
required); email verification has been removed. Password-reset links are sent
via SMTP when `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` are set; otherwise they
are printed to the console for local development. Registered students can
report posts and users, which admins (users with `is_admin = true`) review at
`/admin/reports`.

Production deployments should set these environment variables (see `.env.example`):

- `STUN_SERVER` — comma-separated STUN URLs.
- `TURN_SERVER`, `TURN_USERNAME`, `TURN_PASSWORD` — a TURN relay is required for
  calls across restrictive NATs or mobile networks. Credentials are read
  server-side and served only to authenticated users via `/api/call/ice`; they
  are never hard-coded.

The app must be served over **HTTPS in production** — browsers block camera,
microphone, and screen-share access on insecure origins.
