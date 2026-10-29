# Campus Connect AI (IVY) — Project Review 2.0

> **Version:** 2.0
> **Last updated:** 2026-10-29
> **Reviewed commit:** `90f6380` (`main`)
> **Repository:** https://github.com/vardhandevraj/peertopeer
> **Scope:** Full review of the Flask + Socket.IO application in `CampusConnectAI/`

This document replaces the original beginner walkthrough (v1). It keeps the plain-English
explanations but corrects outdated numbers, adds the features that have shipped since v1,
records the messaging fix from this release, and finishes with a prioritised assessment and
roadmap.

> 📄 The original beginner-friendly walkthrough is preserved unchanged at
> [`PROJECT_REVIEW_v1.md`](PROJECT_REVIEW_v1.md).

---

## 1. Executive summary

**Verdict: a capable, feature-complete student collaboration platform with solid security
fundamentals. The main risks are architectural (one very large `app.py`, single-process
state) and operational (no automated tests, deployment must use a Socket.IO-aware server).**

Highlights:

| Area | Status |
|------|--------|
| Authentication (email/password + Google OAuth) | ✅ Implemented |
| Social feed (posts, likes, comments, files) | ✅ Implemented |
| Real-time 1:1 and group messaging | ✅ Implemented (hardened this release) |
| AI assistant (IVY) + `@ivy` mentions + study planner | ✅ Implemented |
| WebRTC video learning rooms | ✅ Implemented |
| Notifications, reports, admin moderation | ✅ Implemented |
| Password reset, account deletion, rate limiting | ✅ Implemented |
| Automated test suite | ❌ Missing |
| Multi-worker / horizontal scaling | ⚠️ Limited by in-memory rooms |

---

## 2. What is this project?

**Campus Connect AI** (branded **IVY**, with the messaging area labelled **PeerVerse**) is a
social learning platform for university students. Students can:

1. **Post updates** to a social feed, with images and PDF/PPT attachments.
2. **Message** each other in real time, one-to-one or in study groups.
3. **Chat with IVY**, an AI assistant (Groq-powered) for explanations and study help.
4. **Join video learning rooms** with classmates (browser-to-browser WebRTC).
5. **Share resources**, follow classmates, and moderate reported content.

---

## 3. Technology stack (as of this review)

| Layer | Tool | Version / Notes |
|-------|------|-----------------|
| Language | Python | 3.12 target (Render) |
| Web framework | Flask | `3.1.3` |
| Real-time | Flask-SocketIO | `5.4.1` |
| Async / WSGI | gevent + gevent-websocket | `gevent 26.9.0` |
| Production server | gunicorn | `22.0.0` |
| Database | Supabase PostgreSQL | via `psycopg2-binary` |
| File storage | Supabase Storage | via `supabase` client |
| AI provider | Groq | via `groq` SDK |
| Templating | Jinja2 | bundled with Flask |
| Passwords / uploads | Werkzeug | `3.1.9` |
| Images | Pillow | downscale + re-encode on upload |
| PDF parsing | pypdf | AI context extraction |
| Email | Brevo API → SMTP → console | for password reset |
| HTTP client | requests + curl subprocess | OAuth / Brevo transport |

> **Important correction vs v1:** the project no longer uses **eventlet**. It uses **gevent**
> with the **`geventwebsocket`** gunicorn worker. Anything that assumes eventlet is outdated.

---

## 4. Repository map (actual line counts)

```
CampusConnectAI/
├── app.py                    5,517 lines   ← all backend logic (monolith)
├── requirements.txt                          ← Python dependencies
├── Procfile                                  ← production start command
├── supabase_schema.sql         341 lines     ← full DB schema (17 tables, 17 indexes)
├── .env                    (ignored)         ← secrets; must exist for boot
├── .env.example                              ← documented variable names
├── render.yaml                               ← Render blueprint (autoDeploy: true)
│
├── templates/                  2,855 lines total
│   ├── base.html               165  ← shell: sidebar, nav, socket.io + script.js
│   ├── index.html              120  ← landing page (standalone, not base.html)
│   ├── login.html              117  ← sign in
│   ├── register.html           171  ← sign up
│   ├── feed.html               181  ← social feed
│   ├── messages.html           279  ← inbox + chat thread
│   ├── ai.html                 207  ← IVY chat
│   ├── call_room.html           95  ← video room
│   ├── profile.html            141  ← profile + edit
│   ├── public_profile.html     207  ← other students' profiles
│   ├── students.html           259  ← student directory
│   ├── resources.html           89  ← shared files
│   ├── notifications.html       76  ← alert list
│   ├── search.html              65  ← global search
│   ├── admin_reports.html       65  ← moderation queue
│   ├── admin_report_detail.html 104 ← moderation detail
│   ├── edit_post.html           35
│   ├── forgot_password.html     87
│   ├── reset_password.html      83
│   ├── privacy.html            140
│   ├── terms.html              122
│   └── error.html               47
│
└── static/
    ├── style.css             3,913 lines   ← full design system
    ├── script.js               372 lines   ← theme, nav, chat, call invites
    ├── ai_chat.js              463 lines   ← IVY chat page
    ├── call_room.js            811 lines   ← WebRTC room logic
    ├── call_room.css           208 bytes   ← intentionally empty (styles moved to style.css)
    └── icons.js / images/ ...
```

**Key insight:** `app.py` is a monolith — every route, helper, socket handler, and AI call
lives in one file. That keeps early development simple but is now the largest maintainability
cost in the project (see §16).

---

## 5. Architecture overview

```
Browser (HTML/CSS/JS)
   │  HTTP requests                 │  Socket.IO (persistent)        │  WebRTC (peer-to-peer)
   ▼                                ▼                                ▼
Flask app (app.py)  ──►  Socket.IO server (gevent)  ──►  Video/audio directly between browsers
   │
   ├── PostgreSQL (Supabase)          ← users, posts, messages, rooms, AI history, reports
   ├── Supabase Storage               ← profile images, post files, resources, chat files
   ├── Groq API                       ← IVY responses + study plans
   └── Brevo / SMTP                   ← password-reset email
```

- **Rooms and presence live in process memory.** The app is deliberately pinned to **one
  worker**; multiple workers would not share rooms or call signalling.
- **Signalling via Socket.IO, media via WebRTC.** Video never passes through the server.
- **Timestamps** are stored UTC and rendered in **Asia/Kolkata** (`campus_time`).

---

## 6. Backend (`app.py`) by concern

| Section | Lines (approx.) | Responsibility |
|---------|-----------------|----------------|
| Configuration, security headers, proxy | 1–257 | App boot, CSP, cookie hardening, upload limits |
| Database pool + helpers | 320–404 | Threaded connection pool, liveness check, `db_cursor` |
| Upload helpers | 407–508 | Extension/MIME checks, image compression, Supabase upload |
| Session / auth helpers | 511–564 | `get_logged_in_user`, `session_role`, `login_required` |
| Notifications | 580–607 | `create_notification` |
| CSRF + rate limiting | 610–723 | Token generation/validation, sliding-window limiter, AI quota |
| Bot mitigation | 726–781 | Honeypot + signed timestamp for public forms |
| Email + auth tokens | 785–985 | Brevo/SMTP delivery, single-use reset tokens |
| Presence | 1015–1039 | Online-user set, `SOCKET_USER` map |
| Auth routes | 1164–1317 | Register, login, logout, Google OAuth |
| Password reset / account deletion | 1319–1462 | Reset flow, self-service deletion |
| Reporting + admin moderation | 1464–1727 | Report content, admin resolve/delete |
| Feed + posts + interactions | 2014–2406 | Create/edit/delete posts, likes, comments |
| Profile + social graph | 2407–2970 | Profile, students, friends, follow |
| Messaging | 2971–3655 | Inbox, threads, group creation, socket chat |
| Video rooms | 3656–4347 | ICE config, start/join room, signalling, call chat |
| Notifications routes | 4348–4452 | List / delete / clear |
| Resources | 4453–4536 | Upload and list study material |
| Search | 4537–4797 | Students, posts, resources |
| IVY AI | 4798–5478 | Conversations, prompts, study plan, Groq calls |
| Error pages | 5479–5517 | Friendly 400/404/413/500 |

---

## 7. HTTP routes (actual)

### Public / SEO
`/` · `/favicon.ico` · `/privacy` · `/terms` · `/robots.txt` · `/sitemap.xml`

### Authentication
`/register` · `/login` · `/logout` · `/login/google` · `/login/google/callback` ·
`/forgot-password` · `/reset-password/<token>` · `/delete-account`

### Feed & posts
`/feed` · `/create-post` · `/edit-post/<id>` · `/delete-post/<id>` ·
`/like-post/<id>` · `/add-comment/<id>` · `/delete-comment/<id>`

### Profile & social
`/profile` · `/profile/<user_id>` · `/students` · `/send-friend-request/<id>` ·
`/respond-friend-request/<id>/<status>` · `/remove-friend/<id>` · `/follow/<id>` · `/unfollow/<id>`

### Messaging
`/messages` · `/messages/<conversation_id>` · `/conversations/new` ·
`/conversations/group` · `/conversations/<id>/members`

### Video rooms
`/api/call/ice` · `/calls/start/<conversation_id>` · `/call/<room_id>`

### AI assistant
`/ai` · `/ai/<conversation_id>` · `/ai/conversations/new` ·
`/ai/conversations/<id>/rename` · `/ai/conversations/<id>/delete` ·
`/ai/conversations/<id>/message` · `/ai/study-plan`

### Notifications, resources, search
`/notifications` · `/notifications/delete/<id>` · `/notifications/clear-all` ·
`/resources` · `/search`

### Moderation
`/report` · `/admin` · `/admin/report/<id>` · `/admin/resolve/<id>` ·
`/admin/delete-target/<type>/<id>`

---

## 8. Socket.IO events (actual)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_chat` | client → server | Join an authorised conversation room |
| `join_inbox` | client → server | Join the private user room (unread/live updates) |
| `send_chat_message` | client → server | Persist a message and broadcast to the room |
| `mark_chat_read` | client → server | Advance the participant's read position |
| `join_call` | client → server | Enter a video room and list peers |
| `call_signal` | both | WebRTC SDP/ICE relay |
| `call_media_state` | client → server | Mic/camera state changes |
| `leave_call` | client → server | Leave without ending the room |
| `end_call` | client → server | Host ends the room for everyone |
| `send_call_message` | client → server | In-room chat (supports `@ivy`) |
| `disconnect` | server | Cleanup presence and room membership |

Client-bound helper events: `receive_chat_message`, `conversation_updated`, `chat_joined`,
`chat_error`, `call_invitation`, and call-presence events.

---

## 9. Data model — 17 tables

| Table | Stores |
|-------|--------|
| `users` | Accounts, role/admin flag, profile fields, `last_seen` |
| `posts` | Feed posts with category and attachment reference |
| `comments` | Replies to posts |
| `likes` | Post likes (unique per user/post) |
| `friends` | Friend requests and relationships |
| `followers` | Follow graph |
| `conversations` | Chat threads (1:1 or group, title, avatar) |
| `conversation_participants` | Membership + per-user `last_read_at` |
| `messages` | Chat + in-room chat + IVY messages (`sender_id NULL` = IVY) |
| `call_rooms` | Video room metadata (media never stored) |
| `call_room_participants` | Room attendance |
| `notifications` | Alert records |
| `resources` | Shared study files/links |
| `ai_conversations` | IVY chat threads |
| `ai_messages` | IVY chat messages |
| `auth_tokens` | Single-use reset/verify tokens |
| `reports` | Content reports + moderation state |

```
users ─┬─ posts ─┬─ comments
       │         └─ likes
       ├─ friends / followers          (self-referencing to users)
       ├─ notifications
       ├─ resources
       ├─ ai_conversations ── ai_messages
       ├─ auth_tokens
       ├─ reports (reporter / resolver)
       └─ conversation_participants ── conversations ─┬─ messages
                                                      └─ call_rooms ── call_room_participants
```

Notes:
- `messages.sender_id` is nullable so the same table can hold IVY/system messages.
- `messages.receiver_id` is kept for backward compatibility but is optional; membership is
  derived from `conversation_participants`.
- `auth_tokens.token_type` still allows `verify_email`, even though email verification is no
  longer enforced (see recommendations).

---

## 10. Frontend

### `static/script.js` (372 lines)
Shared across the app: theme toggle, mobile nav, modal handling, conversation/student search,
time formatting, IVY markdown rendering (marked + DOMPurify), chat element creation, the
Socket.IO chat lifecycle, and call-invitation cards.

### `static/ai_chat.js` (463 lines)
IVY chat page: send messages via `/ai/conversations/<id>/message`, attachments (drag/drop and
picker, 4 files × 10 MB), auto-title, rename, delete, and the study-plan modal.

### `static/call_room.js` (811 lines)
WebRTC room: `getUserMedia`/`getDisplayMedia`, peer connection mesh, SDP/ICE exchange, video
tile grid, mute/camera/screen-share, in-room chat with `@ivy`, and reconnect handling.

### `static/style.css` (3,913 lines)
The complete design system: CSS variables, dark/light themes, layout, feed, messaging, AI,
call room, responsive breakpoints. `call_room.css` is intentionally empty (kept only for the
existing `<link>`), with all call styles now in `style.css`.

### Templates
`base.html` is the authenticated shell and **loads the Socket.IO client globally**:

```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script src="{{ url_for('static', filename='script.js') }}"></script>
{% block scripts %}{% endblock %}
```

Because the Socket.IO `<script>` sits **outside** `{% block scripts %}`, child pages that
override the block still inherit it. (This is why adding extra copies of the script was
unnecessary — see §15.)

---

## 11. Security review

### Strengths ✅
- **No insecure default secret.** The app refuses to boot without `SECRET_KEY`; it is not
  committed to the repo.
- **Hardened session cookie:** `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS.
- **Strong security headers** via `after_request`: CSP, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP, and HSTS on HTTPS.
- **CSRF protection** on all state-changing HTTP methods; Socket.IO polling is exempted
  because it performs its own session auth.
- **Rate limiting** on register/login/reset/AI (sliding window).
- **Bot mitigation** on public forms (honeypot + signed timestamp).
- **Parameterised SQL everywhere** — no string-built queries observed.
- **Password hashing** with Werkzeug.
- **Upload controls:** extension + MIME allow-list, `secure_filename`, 25 MB request cap,
  and image downscale/re-encode.
- **Output safety:** Jinja auto-escaping; IVY markdown sanitised with DOMPurify; external
  resource URLs validated to `http(s)` by `safe_external_url`.
- **Open-redirect protection** via `safe_redirect` for referrer-based navigation.
- **Socket authorisation:** every chat/call event checks session identity and, for chat,
  conversation membership.

### Notes / residual risks ⚠️
- Rate limiting and online presence are **process-local memory**; they reset on restart and do
  not coordinate across workers. Acceptable for a single worker, not for scale-out.
- `cors_allowed_origins="*"` on Socket.IO is permissive. Auth still gates every event, but a
  same-origin-only list would be tighter.
- The legacy fallback `INSERT` in messaging (used when the first insert fails) suggests schema
  drift between the simple and "realtime-style" `messages` shapes. Standardising the table
  would remove this fallback.
- `MAX_CONTENT_LENGTH` caps the whole request at 25 MB, but per-file validation is the only
  content-type check; consider magic-byte sniffing for uploads.
- No dependency pinning for `groq`, `psycopg2-binary`, `supabase`, `Pillow`, `pypdf` (only
  loosely constrained). Pin them to avoid surprise breakage.

---

## 12. Data flows (updated)

### Registration
Form → `POST /register` → bot check → validate → hash password → insert `users` → login page.

### Login
`POST /login` → find user → verify hash → **rotate session** (`session.clear()`) → store
identity + role → `update_last_seen` → `/feed`.

### Posting
`POST /create-post` → validate → optional Supabase upload/compress → insert `posts` → `/feed`.

### Real-time messaging (the flow fixed this release)
1. `GET /messages/<id>` loads the thread and marks it read.
2. Socket.IO connects; client emits `join_inbox` **and** `join_chat`.
3. Compose → `send_chat_message`.
4. Server verifies membership, inserts `messages`, updates `conversations.updated_at`,
   notifies other participants, and emits `receive_chat_message` to
   `conversation_<id>` plus `conversation_updated` to each inbox.
5. Every participant in the room — **including the sender** — renders the message.
6. If the text contains `@ivy`, a background task asks Groq and posts IVY's reply.

### IVY assistant
`POST /ai/conversations/<id>/message` → last ~16 messages for context → Groq → save both
messages → return reply to the browser.

### Video room
Start call → `call_rooms` row → `call_invitation` to participants → join → Socket.IO
`join_call` → SDP/ICE via `call_signal` → media flows peer-to-peer → leave/end updates
presence and room state.

---

## 13. Running it (important)

### Local development
```bash
cd "CampusConnectAI"
# .env must define SECRET_KEY, SUPABASE_*, GROQ_API_KEY, etc.
PORT=5002 python3 app.py
```

> ⚠️ **Do not run this project with `flask run` or `app.run()`.**
> Those start a plain HTTP server that **does not serve Socket.IO**. Chat then fails silently:
> the composer clears, but no message ever comes back. The correct entry point is
> `python3 app.py`, which calls `socketio.run(...)`, or gunicorn with the WebSocket worker.

### Production (Render — already configured)
```bash
gunicorn app:app \
  --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
  --workers 1 --timeout 120 --bind 0.0.0.0:$PORT
```

`render.yaml` sets **`autoDeploy: true`**, so every push to `main` redeploys. **One worker is
required** because rooms and call signalling are held in memory.

---

## 14. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | ✅ | Signs sessions/tokens; app won't boot without it |
| `SUPABASE_URL` / `SUPABASE_KEY` | ✅ | Database + Storage client |
| `SUPABASE_DB_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | IVY responses |
| `GROQ_MODEL` | optional | Override the default model |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google sign-in |
| `BREVO_API_KEY` / `SMTP_*` | optional | Password-reset email |
| `STUN_SERVER` / `TURN_*` | optional | WebRTC connectivity |
| `PORT` | optional | Server port (default 5001) |
| `RENDER` / `SESSION_COOKIE_SECURE` | optional | Enable Secure cookies + HSTS |
| `IVY_DEBUG` | optional | Enable Flask debug reloader locally |

---

## 15. What changed in this release (changelog)

**Messaging fix (commits `bcb529c`, `3d42ea1`, and related):**

- **Reported symptom:** pressing Send cleared the textarea but the message never appeared —
  it "disappeared into nothing".
- **Root cause:** the local server had been started with Flask's `app.run()`, which does not
  serve the Socket.IO endpoint. The client connected to nothing and its `send_chat_message`
  event went nowhere.
- **Correction to an earlier theory:** adding extra `socket.io` `<script>` tags to child
  templates was **not** the fix and has been reverted. `base.html` already loads the client
  outside the `scripts` block, so every page inherits it.
- **Client hardening (`static/script.js`):**
  1. **Rejoin the room if the socket is already connected** (`if (socket.connected) subscribe()`)
     — otherwise a late handler registration would mean the sender never joins the
     conversation room and never receives their own echo.
  2. **Refuse to send while disconnected** and keep the typed text (with a visible notice)
     instead of clearing it.
  3. **Restore the text on `chat_error`** so failed sends are recoverable.
- **Verification:** an authenticated Socket.IO client completed a full
  `join_chat → send_chat_message → receive_chat_message` round trip against an isolated
  temporary conversation (created and deleted during the test).
- **Database:** the "realtime-style" `messages` insert fallback from `bcb529c` remains for
  schema compatibility.

---

## 16. Findings & recommendations (prioritised)

### High priority
1. **Split `app.py` (5,517 lines) into modules/blueprints** — `auth`, `feed`, `messages`,
   `calls`, `ai`, `admin`, `db`. This is the single biggest maintainability win and makes
   reviews and tests tractable.
2. **Add an automated test suite (pytest)** — at minimum route smoke tests, auth/CSRF,
   messaging round-trip (socket test client), and permission checks (a user cannot read or
   join another user's conversation/room).
3. **Lock the run command** — document and enforce `socketio.run` / gunicorn WebSocket worker
   in the README and any scripts. Consider a `Makefile` or `run.sh` so `flask run` is never
   used by mistake.

### Medium priority
4. **Standardise the `messages` schema** and drop the dual-insert fallback.
5. **Pin all dependencies** (`groq`, `supabase`, `psycopg2-binary`, `Pillow`, `pypdf`,
   `gevent-websocket`) for reproducible builds.
6. **Tighten Socket.IO CORS** from `*` to the deployed origin(s).
7. **Move presence/rate-limit state to Redis** (and configure a Socket.IO `message_queue`) if
   you ever need more than one worker.
8. **Remove or repurpose the unused `verify_email` token type**, and either delete the empty
   `call_room.css` link or document why it stays.
9. **Reduce template duplication** — several pages (`index`, `login`, `register`, `privacy`,
   `terms`) are standalone rather than extending `base.html`, duplicating `<head>`/meta.

### Low priority / polish
10. **Optimistic UI for chat** — render the sender's bubble immediately (with a pending state)
    and reconcile on echo; today the sender waits for the server round trip.
11. **Magic-byte upload validation** in addition to extension/MIME checks.
12. **Accessibility pass** — focus traps for modals, `aria-live` on the message timeline,
    colour-contrast audit for light theme.
13. **Operational observability** — structured logging and a health endpoint that also checks
    the DB pool.
14. **Add CI** (lint with Ruff — a `.ruff_cache` already suggests Ruff usage — plus tests) on
    every push.

---

## 17. QA checklist (manual, post-deploy)

- [ ] Register → login → logout → login persists correctly.
- [ ] Create post with image and with PDF; like/comment/delete.
- [ ] Start 1:1 chat; send from two browsers; both see the message and unread counts update.
- [ ] Create a group; add members; `@ivy` mention returns an AI reply.
- [ ] Start a video room; join from a second browser; mute/camera/screen-share; in-room chat.
- [ ] Password reset email arrives (Brevo/SMTP) and the link works once.
- [ ] Report content as a student; resolve/delete as an admin.
- [ ] Confirm a signed-out user cannot open `/messages` or join a socket room.
- [ ] Verify HTTPS redirect, security headers, and `Secure` cookies in production.

---

## 18. Conclusion & roadmap

IVY is a genuinely full-featured student platform: social feed, real-time messaging, AI
assistance, and WebRTC study rooms, all behind a reasonably hardened Flask stack. The
messaging issue from this cycle is resolved — it was an operational mistake (running without
Socket.IO) compounded by a client that cleared input before a confirmed send; both are now
addressed.

The path to "2.0-grade" engineering maturity is clear:

1. **Decompose** the monolith and **test** it.
2. **Standardise** the schema and **pin** dependencies.
3. **Scale** state (rooms/presence/rate limits) out of process memory when needed.
4. **Polish** the real-time UX with optimistic sends and stronger accessibility.

None of these block day-to-day use — they are the investments that make the next features
safe and fast to ship.
