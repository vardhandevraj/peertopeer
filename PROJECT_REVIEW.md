# Campus Connect AI (IVY) — Project Review 2.0

> **Version:** 2.0 — full code walkthrough
> **Last updated:** 2026-10-29
> **Reviewed code:** `90f6380` (app code is unchanged by the documentation commits)
> **Repository:** https://github.com/vardhandevraj/peertopeer
> **Scope:** Every file in `CampusConnectAI/`, explained section by section with real line numbers.

This is the same "explain it like I'm new" style as the original review, rebuilt from the
current code. Instead of guessing, every line number below was taken from the actual files at
the reviewed commit. Use it as a map: find the section, jump to the lines, read the plain-English
explanation.

> 📄 The original walkthrough is preserved unchanged at
> [`PROJECT_REVIEW_v1.md`](PROJECT_REVIEW_v1.md).

---

## How to read this document

`app.py` is **5,517 lines** long. Reading it top to bottom is like reading a whole book. So this
review is organised the way the file is organised:

| Part of the app | Where it lives |
|-----------------|----------------|
| Server boot, security, database | `app.py` lines 1–610 |
| Safety nets (CSRF, rate limits, bots, email, tokens) | `app.py` lines 610–1084 |
| Public pages and login/signup | `app.py` lines 1085–2013 |
| Feed, profiles, friends, follows | `app.py` lines 2014–2970 |
| Messaging (HTTP + Socket.IO) | `app.py` lines 2971–3662 |
| Video rooms (WebRTC signalling) | `app.py` lines 3663–4347 |
| Notifications, resources, search | `app.py` lines 4348–4623 |
| IVY AI assistant | `app.py` lines 4624–5479 |
| Error pages | `app.py` lines 5480–5517 |
| Browser-side JavaScript | `static/*.js` |
| Look and feel | `static/style.css` |
| Pages | `templates/*.html` |
| Database | `supabase_schema.sql` |

Each section below gives **line ranges**, the **names of the functions**, and **what they do in
plain English**. You do not need to memorise anything — this is a reference you can come back to.

---

## 1. What is this project?

Imagine a website built only for university students. It combines four things people normally
install four separate apps for:

1. **A social feed** — post updates, photos and study files, like and comment (like Instagram,
   but for coursework).
2. **Real-time chat** — one-to-one and group messages that appear instantly (like WhatsApp).
3. **An AI study helper called IVY** — ask questions, upload lecture PDFs, or generate a study
   plan (like ChatGPT, but wired into your own data).
4. **Video learning rooms** — join a classmate in a browser video call (like Zoom, but nothing to
   install).

The product has three names in the code, and they all mean the same app:

- **Campus Connect AI** — the formal project name.
- **IVY** — the assistant/brand name shown in the UI.
- **PeerVerse** — the label used in the messaging/social area.

---

## 2. What technology is used?

| Tool | Version | What it does, in plain English |
|------|---------|-------------------------------|
| **Python** | 3.12 (on Render) | The language the server is written in |
| **Flask** | `3.1.3` | Turns Python functions into web pages and endpoints |
| **Flask-SocketIO** | `5.4.1` | Keeps a live connection open so chat appears instantly |
| **gevent** | `26.9.0` | Lets one Python process handle many connections at once |
| **gevent-websocket** | latest | The gunicorn worker that speaks WebSocket |
| **gunicorn** | `22.0.0` | The production web server that runs the app |
| **Supabase (PostgreSQL)** | cloud | Stores users, posts, messages, rooms, AI history |
| **Supabase Storage** | cloud | Stores profile pictures, post files, resources |
| **Groq** | SDK | The AI provider behind IVY |
| **Jinja2** | bundled | Fills HTML templates with data |
| **Werkzeug** | `3.1.9` | Password hashing and safe file names |
| **Pillow** | latest | Shrinks and re-encodes uploaded images |
| **pypdf** | latest | Reads text out of uploaded PDFs for IVY |
| **Brevo / SMTP** | external | Sends password-reset emails |
| **WebRTC** | browser API | Sends video/audio directly between students |

> **Correction vs the original review:** this project does **not** use eventlet. It uses
> **gevent + gevent-websocket**. Anything you read online about eventlet does not apply here.

---

## 3. Complete file structure

```
CampusConnectAI/
├── app.py                     5,517 lines  ← the whole backend
├── requirements.txt                         ← Python packages
├── Procfile                                 ← production start command
├── render.yaml                              ← Render deploy blueprint
├── supabase_schema.sql          341 lines   ← database tables + indexes
├── .env                        (ignored)    ← real secrets, never committed
├── .env.example                             ← list of required variables
│
├── templates/                 2,855 lines total
│   ├── base.html                165  ← shared shell (sidebar, nav, socket.io)
│   ├── index.html               120  ← landing page
│   ├── login.html               117  ← sign-in form
│   ├── register.html            171  ← sign-up form
│   ├── forgot_password.html      87  ← request reset link
│   ├── reset_password.html       83  ← set new password
│   ├── feed.html                181  ← social feed
│   ├── messages.html            279  ← inbox + chat thread
│   ├── ai.html                  207  ← IVY chat page
│   ├── call_room.html            95  ← video room
│   ├── students.html            259  ← student directory
│   ├── profile.html             141  ← my profile + edit
│   ├── public_profile.html      207  ← someone else's profile
│   ├── resources.html            89  ← shared study files
│   ├── notifications.html        76  ← alerts
│   ├── search.html               65  ← global search results
│   ├── edit_post.html            35  ← edit a post
│   ├── admin_reports.html        65  ← moderation queue
│   ├── admin_report_detail.html 104  ← one report
│   ├── privacy.html             140  ← privacy policy
│   ├── terms.html               122  ← terms of service
│   └── error.html                47  ← friendly error page
│
└── static/
    ├── style.css              3,913 lines  ← every style in the app
    ├── script.js                372 lines  ← theme, nav, chat, call invites
    ├── ai_chat.js               463 lines  ← IVY chat page behaviour
    ├── call_room.js             811 lines  ← WebRTC video room
    ├── call_room.css            208 bytes  ← intentionally empty (styles moved)
    └── icons.js / images / uploads …
```

**The big picture:** the backend is one large file (`app.py`), the frontend is three JavaScript
files plus one large stylesheet, and the pages are Jinja templates. Twelve templates extend
`base.html`; ten are standalone full documents (landing, login, register, legal pages, errors,
video room).

---

## 4. How the app boots — `app.py` lines 1–114

This is the part that runs before any page is served. If it is wrong, nothing works.

| Lines | What happens |
|-------|--------------|
| 1–36 | **Imports.** Flask, Socket.IO, database, AI, email, image and HTTP libraries are loaded. |
| 37–40 | **Folder + env loading.** `BASE_DIR` is the folder this file lives in. `load_dotenv` reads the project `.env`, then the parent folder's `.env` as a fallback. |
| 42–44 | **`app = Flask(__name__)`** — creates the application object that handles routes, templates, sessions and static files. |
| 46–66 | **Secret-key guard.** If `SECRET_KEY` is missing, the app raises an error and refuses to boot. There is deliberately no fallback, because a public key would let anyone forge a session. |
| 68–93 | **Cookie + proxy configuration.** `HttpOnly`, `SameSite=Lax`, `Secure` when HTTPS, template auto-reload, and `ProxyFix` so Render's reverse proxy is trusted for `https` and client IPs. |
| 94 | **Socket.IO init:** `SocketIO(app, async_mode="gevent", cors_allowed_origins="*")`. This is the object that makes real-time chat possible. |
| 96–114 | **Content-Security-Policy constant.** Allow-lists this site, the Socket.IO CDN and the DOMPurify CDN; blocks everything else. |

> ⚠️ **The single most important line in the project:** the app must be started through
> `socketio.run(...)` (bottom of `app.py`) or through the gunicorn WebSocket worker. Starting it
> with `flask run` gives you a working website **without** real-time chat — messages vanish
> silently. This exact mistake caused the messaging bug fixed in this release.

---

## 5. Shared infrastructure — `app.py` lines 115–610

These are helper functions used by many pages. Think of them as the app's toolbox.

### 5.1 Security headers and HTTPS — lines 115–139

| Lines | Function | Plain English |
|-------|----------|---------------|
| 115–132 | `apply_security_headers` | Runs after every response and adds browser protections: Content-Security-Policy, no MIME sniffing, no framing, referrer rules, permissions policy, and HSTS on HTTPS. |
| 133–139 | `force_https` | If the request is insecure and the app is in production, redirect it to `https://`. |

### 5.2 Redirects and time — lines 140–186

| Lines | Function | Plain English |
|-------|----------|---------------|
| 140–164 | `safe_redirect` | Only redirects to a trusted local path. Blocks attackers from sending users to `evil.com` via a crafted `?next=` link. |
| 165–186 | `campus_time` | Converts stored UTC timestamps into **Asia/Kolkata** and formats them for display. |

### 5.3 Outbound HTTP — lines 187–266

| Lines | Function | Plain English |
|-------|----------|---------------|
| 187–201 | `_http_request` | Wrapper around `requests` for calling Google, Brevo and Groq. |
| 202–266 | `_http_curl` | Fallback that shells out to `curl` when Python's HTTP stack is blocked by a host. |

### 5.4 Supabase and media URLs — lines 267–308

| Lines | Function | Plain English |
|-------|----------|---------------|
| 267–289 | `_build_supabase_client` | Creates the Supabase client used for file storage. |
| 290–308 | `inject_media_url` (context processor) | Makes a `media_url(...)` helper available inside every template so stored file paths become usable URLs. |

### 5.5 Socket data helper — lines 309–319

| Lines | Function | Plain English |
|-------|----------|---------------|
| 309–319 | `socket_conversation_id` | Tidies the conversation id arriving from the browser (string → integer, rejects junk). |

### 5.6 Database connection pool — lines 320–406

This is how the app talks to PostgreSQL without opening a new connection for every request.

| Lines | Function | Plain English |
|-------|----------|---------------|
| 320–326 | `get_db_connection` | Hands out a database connection from the pool. |
| 327–352 | `class _PooledConnection` | A thin wrapper so a returned connection goes back to the pool instead of being closed. |
| 353–372 | `_connection_is_alive` | Checks the connection is still usable before handing it out; replaces dead ones. |
| 373–400 | `_pooled_connection` | The actual pool: creates up to a fixed number of connections and reuses them. |
| 401–406 | `db_cursor` | Context manager that gives you a cursor and cleans up automatically — the standard way every route talks to the DB. |

> **Why a pool?** Opening a fresh database connection on every page load is slow and expensive.
> A pool keeps a handful open and shares them. The trade-off: it is limited (around 10
> connections), so the app is designed as a single worker.

### 5.7 File-upload validation — lines 407–510

| Lines | Function | Plain English |
|-------|----------|---------------|
| 407–435 | `allowed_file` | Checks a file's extension and MIME type against a safe allow-list. |
| 436–459 | `allowed_image` | A stricter allow-list for profile pictures and image posts. |
| 460–482 | `safe_external_url` | Accepts only `http://` or `https://` links, so a "resource" cannot be `javascript:`. |
| 483–510 | `save_uploaded_file` | Validates the upload, compresses images, gives it a safe unique name, and stores it in Supabase Storage. |

### 5.8 Session and login helpers — lines 511–579

| Lines | Function | Plain English |
|-------|----------|---------------|
| 511–525 | `get_logged_in_user` | Looks up the current user from the session and returns their row (or `None`). |
| 526–561 | `session_role` | Returns `admin`, `student`, etc. for permission checks. |
| 562–566 | `login_required` | A decorator: if you are not logged in, it sends you to the login page. |
| 567–579 | `redirect_back` | Sends the user back to the page they came from, safely. |

### 5.9 Notifications and CSRF helpers — lines 580–610

| Lines | Function | Plain English |
|-------|----------|---------------|
| 580–609 | `create_notification` | Inserts a notification row (likes, comments, friend requests, messages) and emits a live Socket.IO update. |
| 611–617 | `generate_csrf_token` | Creates a random token stored in the session. |
| 618–626 | `csrf_valid` | Checks a submitted token matches the session token. |
| 627–641 | `protect_from_csrf` (`before_request`) | Rejects any POST/PUT/PATCH/DELETE without a valid token. Socket.IO polling is exempted because it authenticates via the session itself. |
| 642–656 | `inject_csrf_token` (context processor) | Exposes `csrf_token()` to every template so forms can include the hidden field. |

---

## 6. Rate limiting, bots and quiet errors — `app.py` lines 657–784

### 6.1 Rate limiting — lines 657–726

| Lines | Function | Plain English |
|-------|----------|---------------|
| 657–672 | `rate_subject` | Builds a key from the user id (or IP) plus the action name. |
| 673–691 | `rate_allow` | A sliding-window counter: "has this subject done this too many times?" |
| 692–716 | `rate_limit` | Decorator that applies a limit to a route and returns HTTP 429 when exceeded. |
| 717–720 | `AI_RATE_LIMIT`, `AI_RATE_WINDOW` | Constants: 30 AI requests per 10 minutes. |
| 721–725 | `ai_rate_ok` | The AI-specific check used before calling Groq. |

### 6.2 Bots and error messages — lines 727–784

| Lines | Function | Plain English |
|-------|----------|---------------|
| 727–744 | `flash_db_error` | Logs the real database error but shows the user a friendly message (no secrets leaked). |
| 745–753 | `_bot_serializer` | Creates the signer used for the "human check" timestamp. |
| 754–768 | `bot_field` | Renders a hidden honeypot field plus a signed timestamp into public forms. |
| 769–784 | `bot_valid` | Rejects submissions where the honeypot was filled or the form was submitted too fast/slow. |

> **Why two checks?** A honeypot catches dumb bots that fill every field. The signed timestamp
> catches bots that submit instantly. Real users take a few seconds, so they pass.

---

## 7. Email and one-time tokens — `app.py` lines 785–986

| Lines | Function | Plain English |
|-------|----------|---------------|
| 785–793 | `parse_from_address` | Splits `"IVY <no-reply@…>"` into a name and an address. |
| 794–869 | `send_email` | Tries **Brevo API** first, then **SMTP**, then prints the email to the server console. Three fallbacks means password reset still works even if one provider is down. |
| 870–884 | `send_password_reset_email` | Builds the reset link and sends it. |
| 885–907 | `create_auth_token` | Generates a random single-use token and stores a hash of it with an expiry. |
| 908–944 | `_fetch_auth_token` | Finds a token by looking up its hash, and checks it has not expired. |
| 945–986 | `consume_auth_token` | Marks a token as used so a reset link cannot be replayed. |

> **Why hash the token?** If the database ever leaks, the attacker sees only hashes, not working
> reset links.

---

## 8. Images and online presence — `app.py` lines 987–1084

| Lines | Function | Plain English |
|-------|----------|---------------|
| 987–1014 | `compress_image_bytes` | Downscales a large image (default max 1600 px) and re-encodes it as JPEG/WebP so uploads stay small and fast. |
| 1015–1020 | `ONLINE_USERS`, `ONLINE_LOCK`, `SOCKET_USER` | In-memory sets tracking who is online and which socket belongs to whom. |
| 1021–1025 | `mark_user_online` | Adds a user to the online set when their socket connects. |
| 1026–1030 | `mark_user_offline` | Removes them on disconnect. |
| 1031–1034 | `is_user_online` | Answers "is this person online right now?" |
| 1035–1042 | `inject_presence` | Makes presence available to templates. |
| 1043–1061 | `update_last_seen` | Writes the last-activity time to the database. |
| 1062–1067 | `verification_required` | Placeholder for an email-verification gate (currently not enforced). |
| 1068–1074 | `inject_user_flags` | Adds flags like `is_admin` to templates. |
| 1075–1084 | `inject_current_user` | Makes `current_user` available in every template. |

> **Important limitation:** online status and rate-limit counters live in **memory**. Restarting
> the server clears them, and a second worker would not share them. That is why production runs
> exactly **one** worker.

---

## 9. Public pages and SEO — `app.py` lines 1085–1163

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 1085–1090 | `/` | `index` | Landing page. Signed-in users are sent straight to the feed. |
| 1091–1096 | `/favicon.ico` | `favicon` | Serves the site icon. |
| 1097–1101 | `/privacy` | `privacy` | Privacy policy page. |
| 1102–1106 | `/terms` | `terms` | Terms of service page. |
| 1107–1139 | `/robots.txt` | `robots_txt` | Tells search engines what they may crawl. |
| 1140–1163 | `/sitemap.xml` | `sitemap_xml` | Lists public pages so Google can index them. |

---

## 10. Accounts: register, login, logout — `app.py` lines 1164–1319

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 1164–1241 | `/register` (GET/POST) | `register` | Shows the sign-up form; on submit it checks the bot fields, validates the input, hashes the password, inserts the user, and sends them to login. |
| 1242–1309 | `/login` (GET/POST) | `login` | Verifies email + password; on success it **clears the old session** (prevents session fixation), stores the user id and role, and redirects to the feed. |
| 1310–1318 | `/logout` | `logout` | Clears the session and returns to the landing page. |

**The password flow, in order:**

```
typed password → Werkzeug hash → stored in users.password_hash
typed password → Werkzeug check_hash → match? → session created
```

Plain-text passwords are never stored, logged, or sent back.

---

## 11. Password reset and account deletion — `app.py` lines 1320–1463

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 1320–1354 | `/forgot-password` | `forgot_password` | Rate-limited form: always says "if that email exists, a link was sent" so attackers cannot probe which emails are registered. |
| 1355–1426 | `/reset-password/<token>` | `reset_password` | Verifies the single-use token, lets the user set a new password, consumes the token, and signs them out to log in again. |
| 1427–1459 | `/delete-account` (POST) | `delete_account` | Requires the current password, then removes or anonymises the user's data and ends the session. |
| 1460–1463 | — | `REPORT_STATUSES` | The four moderation states used by the admin pages. |

---

## 12. Reporting and admin moderation — `app.py` lines 1464–1728

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 1464–1514 | `/report` (POST) | `report_content` | Any signed-in student can report a post, comment, message or user, with a reason. |
| 1515–1521 | — | `admin_required` | Decorator that returns 403 unless the session role is admin. |
| 1522–1577 | `/admin` | `admin_reports` | The moderation queue, with counts by status. |
| 1578–1650 | `/admin/report/<id>` | `admin_report_detail` | Shows one report plus the reported content and the reporter. |
| 1651–1688 | `/admin/resolve/<id>` (POST) | `admin_resolve_report` | Marks a report `RESOLVED` or `DISMISSED`. |
| 1689–1727 | `/admin/delete-target/<type>/<id>` (POST) | `admin_delete_target` | Deletes the offending post/comment/message and closes the report. |

> **Why this matters:** moderation endpoints are the most sensitive in any social app. Each one
> is behind `admin_required`, CSRF-protected, and uses parameterised SQL.

---

## 13. AI study planner — `app.py` lines 1729–1797

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 1729–1797 | `/ai/study-plan` (POST) | `ai_study_plan` | Takes a subject, exam date and available hours, asks Groq for a day-by-day plan, and returns it as JSON (or renders it) for the AI page modal. |

---

## 14. Google sign-in — `app.py` lines 1798–2013

| Lines | Function | Plain English |
|-------|----------|---------------|
| 1798–1843 | `_google_oauth_message` | Turns Google's terse error codes into a human message. |
| 1844–1872 | `login_google` | Builds the Google consent URL with a signed `state` value. |
| 1873–2013 | `google_callback` | Verifies `state`, exchanges the code for a token, fetches the user's profile, then logs them in or creates their account. |

> **`state` is important.** It is a random value saved in the session and checked on return. It
> prevents "login CSRF", where an attacker tricks you into completing *their* Google login.

---

## 15. The social feed — `app.py` lines 2014–2406

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 2014–2112 | `/feed` | `feed` | Loads posts (with author, like count, comment count, whether you liked it) and renders the feed. |
| 2113–2165 | `/create-post` (POST) | `create_post` | Validates text and optional attachment, uploads/compresses the file, inserts the post, then redirects to the feed. |
| 2166–2218 | `/edit-post/<id>` (GET/POST) | `edit_post` | Only the author may edit; supports replacing the attachment. |
| 2219–2250 | `/delete-post/<id>` (POST) | `delete_post` | Only the author may delete; comments, likes and files are cleaned up. |
| 2251–2321 | `/like-post/<id>` (POST) | `like_post` | Toggles a like and updates the count (unique per user/post). |
| 2322–2374 | `/add-comment/<id>` (POST) | `add_comment` | Adds a comment and notifies the post author. |
| 2375–2406 | `/delete-comment/<id>` (POST) | `delete_comment` | Deletes a comment if you wrote it or own the post. |

**The feed query, conceptually:**

```
SELECT posts + author name + like count + comment count + "did I like this?"
FROM posts JOIN users … LEFT JOIN likes … LEFT JOIN comments …
ORDER BY created_at DESC
LIMIT …
```

Everything is done with **parameterised queries** (`%s` placeholders), which is the defence
against SQL injection.

---

## 16. Profiles, students and the social graph — `app.py` lines 2407–2970

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 2407–2517 | `/profile` (GET/POST) | `profile` | Your own profile; POST saves bio, department, year, avatar, links. |
| 2518–2662 | `/profile/<user_id>` | `public_profile` | Someone else's profile: posts, friend/follow state, message button. |
| 2663–2754 | `/students` | `students` | The searchable student directory with filters. |
| 2755–2812 | `/send-friend-request/<id>` (POST) | `send_friend_request` | Creates a pending friend row and notifies the recipient. |
| 2813–2860 | `/respond-friend-request/<id>/<status>` (POST) | `respond_friend_request` | Accepts or declines a request. |
| 2861–2897 | `/remove-friend/<id>` (POST) | `remove_friend` | Removes an existing friendship. |
| 2898–2938 | `/follow/<id>` (POST) | `follow` | Adds a follow edge. |
| 2939–2970 | `/unfollow/<id>` (POST) | `unfollow` | Removes it. |

**Friends vs followers:**

- **Friend** = a two-way relationship created by request + accept.
- **Follower** = a one-way subscription, like Twitter/Instagram.

They are stored in separate tables because the rules are different.

---

## 17. Messaging — HTTP routes, `app.py` lines 2971–3335

Messaging has two halves: normal page routes (loading the inbox) and Socket.IO events (sending
messages live). This section covers the page routes; the socket events are in §19.

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 2971–3166 | `/messages` and `/messages/<conversation_id>` | `messages` | Loads the inbox list and, if an id is given, the selected thread. It verifies you are a participant, loads messages in order, renders them, and updates your read position. |
| 3167–3230 | `/conversations/new` (POST) | `new_conversation` | Starts (or reuses) a one-to-one chat with another student. |
| 3231–3291 | `/conversations/group` (POST) | `create_group_conversation` | Creates a group thread with a title and a list of members. |
| 3292–3335 | `/conversations/<id>/members` (POST) | `add_group_members` | Adds people to an existing group (members only). |

### The helper functions behind chat — lines 3336–3482

| Lines | Function | Plain English |
|-------|----------|---------------|
| 3336–3352 | `emit_conversation_update` | Sends `conversation_updated` to each participant's private room so their inbox preview and unread badge refresh. |
| 3353–3408 | `save_and_emit_ivy_message` | Stores an IVY reply with `sender_id = NULL` and broadcasts it into the conversation. |
| 3409–3439 | `recent_conversation_transcript` | Pulls the last N messages to give IVY context. |
| 3440–3457 | `build_ivy_prompt` | Wraps the transcript plus the new message into the instructions sent to Groq. |
| 3458–3482 | `process_ivy_mention` | Detects `@ivy`, calls Groq, and posts the answer back into the chat. |

### The message record, in plain English

```
messages
 ├── id
 ├── conversation_id   → which thread
 ├── sender_id         → who wrote it (NULL means IVY/system)
 ├── receiver_id       → legacy, optional
 ├── message_text      → the content
 ├── message_type      → "text" or "ai"
 ├── is_read           → has it been seen
 └── created_at        → when (UTC)
```

A message is **not** sent straight from browser to browser. It always goes through the server so
it can be authorised, stored, and delivered to everyone — including the sender.

---

## 18. Messaging — the full flow, step by step

This is the flow that was repaired in this release. Read it once and the bug makes sense.

```
1. Browser opens /messages/<id>
   └─ server checks you are a participant, loads history, marks read

2. base.html loads socket.io client + script.js
   └─ socket connects to /socket.io/

3. script.js emits:
   ├─ join_inbox          → private room for unread/inbox updates
   └─ join_chat {conversation_id} → the thread room

4. You type and press Send
   └─ client emits send_chat_message {conversation_id, message_text}

5. Server (send_chat_message):
   ├─ confirms you are logged in
   ├─ confirms you belong to this conversation
   ├─ INSERTs the message
   ├─ updates conversations.updated_at
   ├─ notifies the other participants
   └─ emits receive_chat_message to room "conversation_<id>"
      and conversation_updated to each participant's inbox

6. Everyone in the room (including you) receives receive_chat_message
   └─ creates the bubble, scrolls to the bottom

7. If the text contains "@ivy"
   └─ background task asks Groq and calls save_and_emit_ivy_message
```

**Where it broke before:** if the server was started with `app.run()` (or `flask run`), step 2
connected to a server that was not serving Socket.IO. Step 4 emitted into nothing. The textarea
had already been cleared by the browser, so the message "disappeared into nothing".

**The hardening added in `static/script.js`:**

1. If the socket is already connected, join the room immediately — otherwise a late handler
   registration means the sender never receives their own echo.
2. If the socket is disconnected, **do not clear** the textarea; show a notice instead.
3. If the server replies `chat_error`, restore the text so the user can retry.

---

## 19. Socket.IO events — `app.py` lines 3483–3662 and 4033–4347

| Lines | Event | Function | Plain English |
|-------|-------|----------|---------------|
| 3483–3518 | `join_chat` | `join_chat` | Verifies membership, then puts this socket into the thread room. |
| 3519–3529 | `join_inbox` | `join_inbox` | Puts the socket into the user's private room for inbox badges. |
| 3530–3625 | `send_chat_message` | `send_chat_message` | The heart of chat: validate → insert → notify → broadcast. |
| 3626–3662 | `mark_chat_read` | `mark_chat_read` | Updates `last_read_at` so unread counts clear. |
| 4033–4084 | `join_call` | `join_call` | Adds a socket to a video room and reports existing peers. |
| 4085–4132 | `call_signal` | `call_signal` | Relays WebRTC offers/answers/ICE between two browsers. |
| 4133–4163 | `call_media_state` | `call_media_state` | Tells peers when someone mutes or turns off the camera. |
| 4164–4172 | `leave_call` | `leave_call` | Leaves without ending the room. |
| 4173–4191 | `end_call` | `end_call` | Host ends the room for everyone. |
| 4192–4201 | `disconnect` | `handle_call_disconnect` | Cleans up presence/rooms when a tab closes. |
| 4275–4347 | `send_call_message` | `send_call_message` | In-room chat, including `@ivy`. |

**Events the server sends back to the browser:**

`receive_chat_message`, `conversation_updated`, `chat_joined`, `chat_error`,
`call_invitation`, `call_joined`, `call_peer_joined`, `call_peer_left`, `call_media_state`,
`call_signal`, `receive_call_message`, `ivy_thinking`, `call_error`, `call_ended`.

---

## 20. Video learning rooms — `app.py` lines 3663–4347

Video is split into two ideas:

- **Signalling** goes through the server (tiny JSON messages: "here is my offer", "here is my
  answer", "here is a network path").
- **Media** (actual audio/video) goes **directly between browsers** with WebRTC. The server never
  sees or stores the video.

| Lines | Function / Route | Plain English |
|-------|------------------|---------------|
| 3663–3670 | `CALL_ROOM_SOCKETS`, `valid_call_room_id` | Tracks who is in which room; validates room ids. |
| 3671–3702 | `build_ice_servers` | Builds the STUN/TURN list used to get through firewalls. |
| 3703–3710 | `/api/call/ice` | Returns that ICE config to the browser. |
| 3711–3731 | `user_is_conversation_member` | Permission check reused by call routes. |
| 3732–3771 | `load_call_room` | Loads a room and its conversation. |
| 3772–3838 | `/calls/start/<conversation_id>` | Creates a room, notifies participants, returns the room URL. |
| 3839–3892 | `/call/<room_id>` | Renders the video room page (only for members). |
| 3893–3915 | `live_call_participants` | Lists who is currently connected. |
| 3916–3941 | `mark_call_presence` | Records join/leave presence. |
| 3942–3971 | `mark_call_room_vacant` | Closes a room when the last person leaves. |
| 3972–4001 | `end_call_room` | Host action: end for everyone. |
| 4002–4032 | `release_call_socket` | Removes a socket from all call bookkeeping. |
| 4202–4249 | `save_and_emit_call_ivy_message` | Stores and broadcasts an IVY reply inside a room. |
| 4250–4274 | `process_ivy_room_mention` | Handles `@ivy` in room chat. |

> **Why one worker?** Room membership and signalling state are held in a Python dictionary in
> memory (`CALL_ROOM_SOCKETS`). A second worker would have a different dictionary, so peers would
> not see each other. Scaling out would require a shared broker such as Redis.

---

## 21. Notifications, resources and search — `app.py` lines 4348–4623

### Notifications — lines 4348–4452

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 4348–4389 | `/notifications` | `notifications` | Lists your alerts, newest first. |
| 4390–4428 | `/notifications/delete/<id>` (POST) | `delete_notification` | Deletes one alert you own. |
| 4429–4452 | `/notifications/clear-all` (POST) | `clear_all_notifications` | Clears all your alerts. |

### Resources — lines 4453–4536

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 4453–4536 | `/resources` (GET/POST) | `resources` | Lists shared study material; POST uploads a file or saves an external link (validated to `http(s)`). |

### Search — lines 4537–4623

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 4537–4623 | `/search` | `search` | Searches students, posts and resources and renders grouped results. |

---

## 22. The IVY AI assistant — `app.py` lines 4624–5479

This is the largest feature block. It handles text chat, file attachments, PDF/Word reading,
image understanding, and the study planner.

### 22.1 Model and titles — lines 4624–4706

| Lines | Function | Plain English |
|-------|----------|---------------|
| 4615–4623 | `DEFAULT_GROQ_MODELS` | Fallback list of Groq models to try in order. |
| 4624–4661 | `generate_ai_response` | Calls Groq, falls back to the next model if one is unavailable, and returns the text. |
| 4662–4665 | `AI_DEFAULT_CONVERSATION_TITLE`, `AI_MAX_TITLE_LENGTH` | Defaults for auto-naming chats. |
| 4666–4706 | `derive_ai_chat_title` | Turns the first message into a short chat title. |

### 22.2 Conversation data — lines 4707–4830

| Lines | Function | Plain English |
|-------|----------|---------------|
| 4707–4716 | `fetch_owned_ai_conversation` | Loads a chat **only if it belongs to you** (permission check). |
| 4717–4735 | `fetch_ai_sidebar_conversations` | Loads your chat list for the sidebar. |
| 4736–4773 | `gather_ai_database_context` | Looks up relevant app data (e.g. your posts) to ground the answer. |
| 4774–4830 | `build_ai_chat_prompt` | Assembles system instructions + transcript + context + the new question. |

### 22.3 Attachments — lines 4831–5096

| Lines | Function | Plain English |
|-------|----------|---------------|
| 4831–4851 | `_magic_matches` | Checks the file's real signature bytes, not just its name. |
| 4852–4861 | `ai_visible_content` | Extracts the part of a stored message the user should see. |
| 4862–4877 | `ai_attachment_names` | Lists attachment names for display. |
| 4878–4910 | `preprocess_ai_image` | Validates and shrinks an image before sending it to the vision model. |
| 4911–4922 | `extract_pdf_text` | Reads text out of a PDF with pypdf. |
| 4923–4957 | `extract_docx_text` | Reads text out of a Word document (unzips and parses XML). |
| 4958–4964 | `extract_latin_text` | Decodes plain-text files safely. |
| 4965–4998 | `select_relevant_excerpt` | Picks the most relevant chunk of a long document to fit the model's context window. |
| 4999–5055 | `process_ai_attachments` | Runs the right extractor per file and combines the results. |
| 5056–5096 | `generate_ai_vision_response` | Sends images to a vision-capable Groq model. |

### 22.4 AI routes — lines 5097–5479

| Lines | Route | Function | Plain English |
|-------|-------|----------|---------------|
| 5097–5150 | — | `render_ai_assistant_page` | Shared renderer for the AI page (sidebar + chat + composer). |
| 5151–5184 | `/ai` | `ai_assistant` | The AI home; creates or opens a default chat. |
| 5185–5194 | `/ai/<id>` | `open_ai_conversation` | Opens one of your chats. |
| 5195–5223 | `/ai/conversations/new` (POST) | `create_ai_conversation` | Starts a fresh chat. |
| 5224–5266 | `/ai/conversations/<id>/rename` (POST) | `rename_ai_conversation` | Renames a chat (owner only). |
| 5267–5304 | `/ai/conversations/<id>/delete` (POST) | `delete_ai_conversation` | Deletes a chat and its messages (owner only). |
| 5305–5479 | `/ai/conversations/<id>/message` (POST) | `send_ai_message` | Saves your message + attachments, builds context, calls Groq (text or vision), saves the reply, returns it. |

**The AI request, step by step:**

```
1. Check you own the conversation
2. Save your message
3. Process attachments (PDF → text, image → vision, docx → text)
4. Build the prompt (instructions + last ~16 messages + your data + excerpt)
5. Pick a model, call Groq, retry with a fallback if needed
6. Save IVY's reply
7. Return it to the page
```

---

## 23. Error pages — `app.py` lines 5480–5517

| Lines | Handler | Plain English |
|-------|---------|---------------|
| 5480–5484 | `not_found` (404) | Friendly "page not found" instead of a stack trace. |
| 5485–5497 | `request_too_large` (413) | Explains the 25 MB upload limit. |
| 5498–5517 | `server_error` (500) | Logs the real error, shows a safe message. |

> **Never show tracebacks in production.** They reveal file paths, library versions and sometimes
> secrets. These handlers prevent that.

---

## 24. `static/script.js` — the shared browser code (372 lines)

This file is loaded on **every page** from `base.html`. It powers the theme, the mobile nav, the
chat window, and the "incoming call" popup.

| Lines | Function | Plain English |
|-------|----------|---------------|
| 2–7 | `initializeTheme` | Reads the saved theme from `localStorage` and applies it before paint (avoids a white flash). |
| 8–19 | `formatChatTime` | Turns a timestamp into "14:32" or "Yesterday". |
| 20–26 | `renderIvyMarkdown` | Converts IVY's Markdown to HTML. |
| 27–40 | `showChatNotice` | Shows a small toast above the composer ("Connecting…", "Message not sent"). |
| 41–89 | `createMessageElement` | Builds the DOM for one message bubble: avatar, name, text, time, and the `@ivy` style. |
| 90–119 | `updateConversationItem` | Updates the inbox row preview and unread badge when a message arrives. |
| 120–205 | `initializeChat` | **The chat engine.** Connects the form, joins rooms, sends messages, receives echoes, handles errors. |
| 131–134 | `scrollToLatest` | Smoothly scrolls the timeline to the newest message. |
| 135–150 | `subscribe` | Emits `join_inbox` and `join_chat`; called on connect and again if the socket is already up. |
| 151–159 | `receive_chat_message` handler | Renders an incoming message and scrolls. |
| 160–163 | `conversation_updated` handler | Refreshes the inbox row/badge. |
| 164–173 | `chat_error` handler | Restores the typed text and shows a notice. |
| 174–189 | submit handler | Guards against disconnected sends, emits `send_chat_message`, clears only on success. |
| 190–195 | Enter key handler | Enter sends, Shift+Enter makes a new line. |
| 196–205 | input handler | Auto-grows the textarea. |
| 206–251 | `initializeCallInvitations` | Shows the incoming-call card and join/dismiss buttons. |
| 252–372 | `DOMContentLoaded` | Wires theme button, mobile menu, flash toasts, markdown rendering, modals, Escape-to-close, conversation search, and the student-department filter. |

**The three chat guards added this release** live in `initializeChat`:

```js
// 1. Rejoin if the socket is already connected
if (socket.connected) subscribe();

// 2. Do not lose text while disconnected
if (!socket.connected) { showChatNotice("Reconnecting…"); return; }

// 3. Put the text back if the server rejects it
socket.on("chat_error", (data) => restoreText(data));
```

---

## 25. `static/ai_chat.js` — the IVY page (463 lines)

Two self-contained blocks: the chat page and the study-planner modal.

### 25.1 Chat page — lines 1–406

| Lines | Function | Plain English |
|-------|----------|---------------|
| 2–15 | `initializeAiAssistant` | Finds the form, timeline and composer, then wires everything. |
| 16–29 | `scrollToLatest` | Scrolls to the newest message. |
| 30–35 | `setBusy` | Disables the composer while IVY is thinking. |
| 36–48 | `appendMessageRow` | Adds a message bubble to the timeline. |
| 49–65 | `updateSidebarAfterSend` | Moves the chat to the top with a preview and time. |
| 66–90 | `applyGeneratedTitle` | Applies the auto-generated chat title. |
| 91–102 | `formatBytes` | Shows attachment sizes ("1.2 MB"). |
| 103–134 | `addAttachments` | Validates and queues files (max 4, 10 MB each). |
| 135–141 | `removeAttachment` | Removes one queued file. |
| 142–183 | `renderAttachments` | Draws the attachment chips and previews. |
| 184–208 | drag/drop + picker handlers | Lets you drop files onto the composer. |
| 209–280 | submit handler | Sends text + files via `fetch`, appends the reply, handles errors. |
| 281–287 | Enter key handler | Enter sends, Shift+Enter adds a line. |
| 288–292 | input handler | Auto-grows the textarea. |
| 293–296 | — | Per-chat menu section begins. |
| 297–306 | `openRenameModal` | Opens the rename dialog. |
| 307–318 | rename buttons | Wire each row's rename action. |
| 319–361 | rename submit | Saves the new title. |
| 362–384 | `deleteConversation` | Confirms and deletes a chat. |
| 385–399 | delete buttons | Wire each row's delete action. |
| 400–406 | outside-click handler | Closes any open row menu. |

### 25.2 Study planner — lines 407–463

| Lines | Function | Plain English |
|-------|----------|---------------|
| 407–430 | `initStudyPlanner` | Finds the modal, its open buttons and close buttons. |
| 431–463 | generate button | Sends subject/date/hours to `/ai/study-plan` and renders the returned plan. |

---

## 26. `static/call_room.js` — the video room (811 lines)

This is the most technical frontend file: it manages WebRTC peer connections, the video grid,
media controls, and in-room chat.

| Lines | Section | Plain English |
|-------|---------|---------------|
| 4–56 | `initializeLearningRoom` setup | Reads room/user data from the page, grabs DOM elements, opens the socket. |
| 57–62 | `showBanner` / `hideBanner` | Shows connection or error banners. |
| 63–68 | `notice` | Small transient message. |
| 69–196 | **Tiles** | `refreshGridLayout`, `ensureTile`, `applyTileName`, `dropTile`, `setTileVideoActive`, `renderMediaBadges`, `refreshParticipantCount` — create and update each person's video tile. |
| 197–235 | **Signalling helpers** | `signal`, `flushCandidates`, `negotiate`, `attachRemoteTrack` — send/receive SDP and ICE. |
| 236–390 | **Peer connections** | `cancelPeerRebuild`, `rebuildPeer`, `ensurePeer`, `closePeer`, `dropPeer`, `dropAllPeers` — create one `RTCPeerConnection` per remote person and recover from drops. |
| 391–434 | **Local media** | `startLocalMedia` asks for camera/mic; `continueWithoutMedia` lets you join with neither. |
| 435–473 | **Room lifecycle** | `joinRoom`, `reconcileParticipants`, `finishCall` — enter, sync the list, leave cleanly. |
| 474–588 | **Media controls** | `broadcastMediaState`, mic/camera buttons, `startScreenShare`, `stopScreenShare`, `outgoingVideoSender`, `replaceOutgoingVideoTrack`, `attachLocalTracksToPeers`. |
| 589–657 | **Chat** | `appendMessage`, `removeIvyThinking`, submit/Enter handlers, chat toggle, "Ask IVY", end-call, leave-without-ending. |
| 658–783 | **Socket wiring** | Handlers for `connect`, `disconnect`, `call_joined`, `call_peer_joined`, `call_peer_left`, `call_media_state`, `call_signal`, `receive_call_message`, `ivy_thinking`, `call_error`, `call_ended`. |
| 784–811 | **Boot** | Fetches `/api/call/ice`, starts local media, joins the room, and handles failure. |

**What WebRTC actually does here:**

```
Browser A                          Server                        Browser B
   │  offer (SDP)  ──────────────►  relay  ──────────────────────►  │
   │  ◄──────────────────────────  relay  ◄──── answer (SDP)        │
   │  ICE candidates ◄───────────► relay ◄───────────────────────►  │
   │                                                                 │
   └──────────── audio/video flows directly, peer to peer ──────────┘
```

The server is a matchmaker, not a video middleman. That keeps it fast and cheap.

---

## 27. `static/style.css` — the design system (3,913 lines)

The entire look of the app lives in one stylesheet. It is organised with comment banners, so you
can jump to a section instead of scrolling blindly.

| Lines | Section | What it styles |
|-------|---------|----------------|
| 1–76 | Design tokens (dark) | CSS variables: colours, spacing, radii, shadows |
| 77–101 | Light theme tokens | The same variables for light mode |
| 102–175 | Base | Reset, typography, scrollbars |
| 176–199 | App shell | Overall page layout and sticky footer |
| 200–449 | Sidebar | Desktop navigation, legal links |
| 450–507 | Mobile bottom nav | Phone navigation |
| 508–546 | Floating IVY button | The always-visible assistant button |
| 547–597 | Page scaffolding | Max-widths per page family |
| 598–738 | Buttons | Primary, secondary, danger, icon buttons |
| 739–908 | Forms | Inputs, labels, checkboxes, validation states |
| 909–972 | Cards | The shared surface used across pages |
| 973–1086 | Avatars | Profile images + online dots |
| 1087–1148 | Badges & pills | Status/category chips |
| 1149–1190 | Flash toast | Success/error toasts |
| 1191–1231 | Empty states | Friendly "nothing here yet" blocks |
| 1232–1357 | Modals & popovers | Dialog backdrops and panels |
| 1358–1438 | Context menus | The "…" menus on rows |
| 1439–1476 | Pagination & misc | Page links, link-fallback spans |
| 1477–1697 | Feed | Post cards, composer, attachments |
| 1698–1927 | Students / lists | Directory toolbar, stats, report menu |
| 1928–1967 | Resources | Upload/link cards |
| 1968–1984 | Search | Search results |
| 1985–2178 | Profile | Header, stats, edit form, danger zone |
| 2179–2251 | Auth pages | Login/register/reset cards |
| 2252–2426 | Landing / hero | Marketing page |
| 2427–2530 | Admin | Moderation tables and actions |
| 2531–2715 | Messages / AI workspace | Two-column chat layout |
| 2716–2770 | Conversation panel | Inbox list |
| 2771–2855 | Chat timeline | Message bubbles and day dividers |
| 2856–2932 | Composer | Textarea + send button |
| 2933–3064 | AI attachments | File chips and previews |
| 3065–3099 | Welcome/empty state | "Pick a conversation" panel |
| 3100–3106 | AI extras | Small AI-only tweaks |
| 3107–3190 | Notifications | Alert rows, unread styling |
| 3191–3510 | Call room | Video grid, controls, room chat |
| 3511–3692 | Responsive | Tablet and mobile breakpoints |
| 3693–3719 | Chat notice toast | The "reconnecting" message |
| 3720–3913 | Call invitation card | The incoming-call popup |

> `static/call_room.css` is **intentionally empty** (208 bytes, just a comment). All call-room
> styles were moved into `style.css`, but the `<link>` in `call_room.html` was kept so the page
> does not need changing. It is safe to delete both the file and the link later.

---

## 28. Templates — what each page does

### 28.1 The shared shell — `base.html` (165 lines)

`base.html` is the frame around every signed-in page:

```
<head>  meta, title, CSS, fonts
<body>
  sidebar          ← desktop navigation
  top bar          ← search, profile menu
  <main>
      {% block content %}   ← each page fills this
  </main>
  mobile bottom nav
  floating IVY button
  flash toasts

  <script src=".../socket.io.min.js"></script>   ← line 162
  <script src=".../script.js"></script>          ← line 163
  {% block scripts %}{% endblock %}              ← line 164
</body>
```

**Crucial detail:** the Socket.IO `<script>` is **outside** `{% block scripts %}`. That means
every page that extends `base.html` automatically has real-time support, even if it never touches
the scripts block. (The original review suspected pages were missing it; they were not.)

### 28.2 Pages that extend `base.html`

`admin_report_detail`, `admin_reports`, `ai`, `edit_post`, `feed`, `messages`, `notifications`,
`profile`, `public_profile`, `resources`, `search`, `students`.

These only provide their content block and any page-specific script.

### 28.3 Standalone pages

`index`, `login`, `register`, `forgot_password`, `reset_password`, `privacy`, `terms`, `error`,
`call_room`, `base`.

These write their own full `<html>` document, so they repeat the `<head>`, meta tags and
stylesheet links. That is deliberate for the landing/auth pages (they have no sidebar), but it is
a maintenance cost — update one and you must remember the others.

### 28.4 Page-by-page

| Template | Lines | What the user sees |
|----------|-------|--------------------|
| `index.html` | 120 | Landing hero, features, call to action |
| `login.html` | 117 | Email/password + Google sign-in |
| `register.html` | 171 | Sign-up form with terms checkbox |
| `forgot_password.html` | 87 | "Enter your email" form |
| `reset_password.html` | 83 | "Choose a new password" form |
| `feed.html` | 181 | Post composer + timeline |
| `messages.html` | 279 | Inbox, thread, composer, group tools |
| `ai.html` | 207 | IVY chat, attachments, study planner |
| `call_room.html` | 95 | Video grid, controls, room chat |
| `students.html` | 259 | Directory with search and filters |
| `profile.html` | 141 | Your profile + edit form |
| `public_profile.html` | 207 | Someone else's profile + actions |
| `resources.html` | 89 | Upload/link study material |
| `notifications.html` | 76 | Alert list |
| `search.html` | 65 | Grouped search results |
| `edit_post.html` | 35 | Edit one post |
| `admin_reports.html` | 65 | Moderation queue |
| `admin_report_detail.html` | 104 | One report + actions |
| `privacy.html` | 140 | Privacy policy |
| `terms.html` | 122 | Terms of service |
| `error.html` | 47 | Friendly error page |

---

## 29. Database schema — 17 tables

All tables are defined in `supabase_schema.sql` (341 lines). The script is idempotent
(`CREATE TABLE IF NOT EXISTS`), so it can be run more than once safely.

### 29.1 The tables

| # | Table | What it stores |
|---|-------|----------------|
| 1 | `users` | Accounts, password hash, role/admin flag, profile fields, `last_seen` |
| 2 | `posts` | Feed posts, category, attachment reference |
| 3 | `comments` | Replies to posts |
| 4 | `likes` | One row per user/post like |
| 5 | `friends` | Friend requests and accepted friendships |
| 6 | `followers` | One-way follow edges |
| 7 | `conversations` | Chat threads (1:1 or group), title, avatar |
| 8 | `conversation_participants` | Who is in a thread + `last_read_at` |
| 9 | `messages` | Chat, room chat and IVY messages |
| 10 | `call_rooms` | Video room metadata |
| 11 | `call_room_participants` | Who attended which room |
| 12 | `notifications` | Alert records |
| 13 | `resources` | Study files and external links |
| 14 | `ai_conversations` | IVY chat threads |
| 15 | `ai_messages` | IVY chat messages |
| 16 | `auth_tokens` | Single-use reset/verify tokens (hashed) |
| 17 | `reports` | Content reports + moderation state |

### 29.2 How the tables connect

```
users
 ├── posts ──┬── comments
 │           └── likes
 ├── friends / followers            (both point back at users)
 ├── notifications
 ├── resources
 ├── ai_conversations ── ai_messages
 ├── auth_tokens
 ├── reports                        (reporter + resolver)
 └── conversation_participants ── conversations
                                   ├── messages
                                   └── call_rooms ── call_room_participants
```

### 29.3 The `messages` table, column by column

```sql
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL,                 -- which thread
    sender_id INT,                                -- NULL = IVY / system
    receiver_id INT,                              -- legacy, optional
    message_text TEXT NOT NULL,                   -- the content
    message_type VARCHAR(20) DEFAULT 'text'
        CHECK (message_type IN ('text','ai')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- **`sender_id` is nullable on purpose** so IVY can post into the same table without a fake user.
- **`receiver_id` is legacy.** Membership is decided by `conversation_participants`, not by this
  column. It is kept for backward compatibility.
- **`ON DELETE CASCADE`** means deleting a conversation removes its messages automatically.

### 29.4 Indexes

There are 17 indexes, mostly on foreign keys and `created_at`, so the feed, inbox and message
queries stay fast as data grows. The most important one:

```sql
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at);
```

This is what makes "load this thread's messages in order" cheap.

---

## 30. Data flows — follow one action end to end

### 30.1 Registering

```
Fill form
  → POST /register
  → bot check (honeypot + timestamp)
  → validate fields
  → hash password with Werkzeug
  → INSERT INTO users
  → redirect to /login
```

### 30.2 Logging in

```
Fill form
  → POST /login
  → rate limit check
  → SELECT user by email
  → Werkzeug check_password_hash
  → session.clear()            ← stops session fixation
  → session["user_id"] = id
  → UPDATE users.last_seen
  → redirect to /feed
```

### 30.3 Posting

```
Write text + attach file
  → POST /create-post
  → validate + CSRF
  → compress image / validate file
  → upload to Supabase Storage
  → INSERT INTO posts
  → redirect to /feed
```

### 30.4 Sending a chat message

```
Type + Send
  → socket.emit("send_chat_message")
  → server checks login + membership
  → INSERT INTO messages
  → UPDATE conversations.updated_at
  → notify other participants
  → emit receive_chat_message to the room
  → every browser renders the bubble
```

### 30.5 Asking IVY

```
Type question (+ optional PDF/image)
  → POST /ai/conversations/<id>/message
  → ownership check
  → save your message
  → extract text / prepare image
  → build prompt from last ~16 messages + app context
  → call Groq (fallback model if needed)
  → save IVY's reply
  → return it to the page
```

### 30.6 Starting a video room

```
Click "Start call"
  → POST /calls/start/<conversation_id>
  → INSERT INTO call_rooms
  → notify participants (call_invitation)
  → open /call/<room_id>
  → GET /api/call/ice
  → getUserMedia
  → socket.emit("join_call")
  → exchange SDP/ICE via call_signal
  → audio/video flows browser-to-browser
```

### 30.7 Password reset

```
Enter email
  → POST /forgot-password
  → always the same success message
  → create hashed single-use token (expires)
  → email link via Brevo → SMTP → console
  → open /reset-password/<token>
  → verify + consume token
  → hash and save new password
```

---

## 31. Security review

### 31.1 What is done well ✅

| Protection | Where | What it stops |
|------------|-------|---------------|
| Required `SECRET_KEY` | boot | Forged sessions from a public default |
| `HttpOnly`, `SameSite=Lax`, `Secure` cookies | config | Cookie theft via JavaScript, most CSRF |
| Content-Security-Policy | `apply_security_headers` | Injected scripts and data exfiltration |
| `X-Frame-Options: DENY` | same | Clickjacking |
| HSTS on HTTPS | same | Protocol downgrade |
| CSRF tokens on all writes | `protect_from_csrf` | Cross-site form submissions |
| Sliding-window rate limits | `rate_allow` | Brute force and AI abuse |
| Honeypot + signed timestamp | `bot_field` / `bot_valid` | Form spam bots |
| Parameterised SQL (`%s`) | all routes | SQL injection |
| Werkzeug password hashing | register/login/reset | Password theft from the database |
| Upload allow-list + size cap | `allowed_file` | Malicious file uploads |
| Image downscale/re-encode | `compress_image_bytes` | Huge files, embedded payloads |
| DOMPurify for IVY Markdown | `script.js` | XSS through AI output |
| `safe_external_url` | resources | `javascript:` links |
| `safe_redirect` | navigation | Open redirects |
| Ownership checks | messages, AI, calls | Reading someone else's data |
| `admin_required` | admin routes | Privilege escalation |
| OAuth `state` check | Google login | Login CSRF |

### 31.2 Residual risks ⚠️

1. **In-memory state.** Rate limits, online presence, chat rooms and call rooms live in the
   process. A restart clears them, and a second worker would not share them.
2. **Socket.IO CORS is `*`.** Every event still checks the session, but a same-origin list would
   be tighter.
3. **Schema drift.** The "realtime-style" fallback `INSERT` in messaging suggests the `messages`
   table shape has changed over time. Standardising it would remove a branch.
4. **Partial dependency pinning.** `Flask`, `gunicorn`, `gevent` and `Werkzeug` are pinned;
   `groq`, `supabase`, `psycopg2-binary`, `Pillow`, `pypdf` and `gevent-websocket` are not.
5. **Upload validation is extension/MIME based.** Magic-byte checking exists for AI attachments
   (`_magic_matches`) but not for every upload path.
6. **No automated tests.** Security checks are only as good as the last manual test.

---

## 32. Running and deploying (read this before you start)

### 32.1 Local development

```bash
cd "CampusConnectAI"
# .env must define SECRET_KEY, SUPABASE_*, GROQ_API_KEY, etc.
PORT=5002 python3 app.py
```

Then open http://127.0.0.1:5002.

> ⚠️ **Do NOT use `flask run` and do NOT call `app.run()`.**
> They start a plain HTTP server that does not serve Socket.IO. The site will look fine, but chat
> will silently fail: the textarea clears and nothing arrives. The correct entry point is
> `python3 app.py`, which calls `socketio.run(...)`.

Check that real-time is alive:

```bash
curl -i "http://127.0.0.1:5002/socket.io/?EIO=4&transport=polling"
# expect: 0{"sid":"...","upgrades":["websocket"],...}
```

If you see a normal HTML page instead, you are running the wrong server.

### 32.2 Production (Render)

```
Build:   pip install -r requirements.txt
Start:   gunicorn app:app \
           --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
           --workers 1 --timeout 120 --bind 0.0.0.0:$PORT
```

`render.yaml` sets **`autoDeploy: true`**, so every push to `main` redeploys automatically.

**One worker is required**, because rooms, presence and rate limits are held in memory. If you
ever need more workers, first move that state to Redis and configure a Socket.IO `message_queue`.

---

## 33. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | ✅ | Signs sessions, CSRF tokens and reset timestamps |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase API key (Storage) |
| `SUPABASE_DB_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | IVY responses and study plans |
| `GROQ_MODEL` | optional | Override the default model |
| `GOOGLE_CLIENT_ID` | optional | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | optional | Google sign-in |
| `BREVO_API_KEY` | optional | Email via Brevo |
| `SMTP_HOST` / `SMTP_PORT` | optional | SMTP fallback |
| `SMTP_USER` / `SMTP_PASSWORD` | optional | SMTP credentials |
| `SMTP_FROM` | optional | From address |
| `STUN_SERVER` | optional | WebRTC STUN server |
| `TURN_SERVER` | optional | WebRTC TURN server |
| `TURN_USERNAME` / `TURN_PASSWORD` | optional | TURN credentials |
| `PORT` | optional | Port to listen on (default 5001) |
| `RENDER` | optional | Enables production cookie/HSTS behaviour |
| `SESSION_COOKIE_SECURE` | optional | Force `Secure` cookies |
| `IVY_DEBUG` | optional | Enable Flask debug reloader locally |

Missing `SECRET_KEY` stops the app on purpose. Missing Supabase/Groq keys cause feature-level
failures (feed, AI) rather than a boot failure.

---

## 34. What changed in this release

### Messaging fix (commits `bcb529c`, `3d42ea1`, and follow-ups)

**Symptom.** Pressing Send cleared the textarea, but the message never appeared — it "disappeared
into nothing".

**Root cause.** The local server had been started with Flask's `app.run()`, which does not serve
the Socket.IO endpoint. The browser connected to nothing, so `send_chat_message` went nowhere.

**A wrong turn, corrected.** An earlier theory said child templates were missing the Socket.IO
`<script>`. They were not: `base.html` line 162 loads it outside `{% block scripts %}`, so every
page inherits it. Those redundant tags were reverted.

**The actual code hardening (`static/script.js`).**

1. Join the room immediately if the socket is already connected.
2. Refuse to send while disconnected, and keep the typed text.
3. Restore the text when the server returns `chat_error`.

**Verification.** An authenticated Socket.IO client completed a full
`join_chat → send_chat_message → receive_chat_message` round trip against an isolated temporary
conversation, which was created and deleted during the test.

### Documentation

- `PROJECT_REVIEW.md` rebuilt as this 2.0 walkthrough.
- The original review preserved at `PROJECT_REVIEW_v1.md`.

---

## 35. Findings and recommendations

### High priority

1. **Split `app.py` (5,517 lines) into blueprints/modules** — `auth`, `feed`, `messages`, `calls`,
   `ai`, `admin`, `db`. Biggest maintainability win; makes reviews and tests tractable.
2. **Add a pytest suite** — route smoke tests, auth/CSRF, a socket messaging round trip, and
   permission tests (a user must not read or join another user's conversation/room).
3. **Protect the run command** — a `run.sh` or `Makefile` that always calls `socketio.run` /
   gunicorn, so nobody uses `flask run` by accident.

### Medium priority

4. **Standardise the `messages` schema** and delete the dual-insert fallback.
5. **Pin every dependency** for reproducible builds.
6. **Tighten Socket.IO CORS** to the deployed origin(s).
7. **Move rooms/presence/rate limits to Redis** before scaling past one worker.
8. **Remove the unused `verify_email` token type** and the empty `call_room.css` link.
9. **Reduce template duplication** — standalone pages repeat `<head>` and meta.

### Low priority / polish

10. **Optimistic chat UI** — show the sender's bubble immediately with a pending state, then
    reconcile on echo.
11. **Magic-byte validation on all uploads**, not just AI attachments.
12. **Accessibility pass** — focus traps for modals, `aria-live` on the message timeline,
    light-theme contrast audit.
13. **Observability** — structured logs and a health endpoint that checks the DB pool.
14. **CI** — Ruff lint plus tests on every push (a `.ruff_cache` suggests Ruff is already used).

---

## 36. Manual QA checklist

- [ ] Register → login → logout → login again.
- [ ] Create a post with an image and with a PDF; like, comment, delete.
- [ ] Start a 1:1 chat; send from two browsers; both see it; unread badges update.
- [ ] Create a group; add members; `@ivy` returns an AI reply.
- [ ] Start a video room; join from a second browser; mute, camera, screen share, room chat.
- [ ] Password reset email arrives and the link works exactly once.
- [ ] Report content as a student; resolve/delete as an admin.
- [ ] Signed-out user cannot open `/messages` or join a chat room.
- [ ] HTTPS redirect, security headers and `Secure` cookies in production.
- [ ] `/socket.io/` handshake returns `0{"sid":...}` in the target environment.

---

## 37. Glossary for beginners

| Term | Meaning |
|------|---------|
| **Route** | A URL the server knows how to answer, e.g. `/feed` |
| **Template** | An HTML file with placeholders that Flask fills in |
| **Session** | A signed cookie that remembers who is logged in |
| **CSRF** | An attack that makes your browser submit a form you did not intend |
| **Socket.IO** | A library that keeps a live connection open for instant updates |
| **WebSocket** | The underlying protocol for that live connection |
| **WebRTC** | Browser technology for direct audio/video between people |
| **SDP / ICE** | The "handshake" messages WebRTC uses to connect two browsers |
| **STUN / TURN** | Servers that help WebRTC get through firewalls |
| **ORM / cursor** | Ways to run SQL from Python |
| **Parameterised query** | SQL with `%s` placeholders, which prevents injection |
| **Migration** | A script that changes the database structure |
| **Worker** | A running copy of the server process |
| **Monolith** | One large file/app containing everything |

---

## 38. Summary

IVY is a genuinely full-featured student platform: a social feed, real-time messaging, an AI
assistant that can read your lecture notes, and browser video rooms — all behind a Flask stack
with sensible security defaults.

The code is easy to follow because it is laid out in clear sections, but it has grown into a
**5,517-line monolith** with **17 tables** and **no automated tests**. Nothing here blocks
day-to-day use; these are the investments that make the next features safe and fast to ship.

The messaging bug from this cycle is resolved. It was an **operational** mistake (running a
Socket.IO app without a Socket.IO server) made worse by a client that cleared the input before a
confirmed send. Both are now fixed and documented here so they cannot quietly return.

**The path from "working" to "2.0-grade":**

1. **Decompose** the monolith and **test** it.
2. **Standardise** the schema and **pin** dependencies.
3. **Move shared state out of memory** when you need to scale.
4. **Polish** the real-time UX and accessibility.

---

*End of Project Review 2.0. For the original plain-English walkthrough, see
[`PROJECT_REVIEW_v1.md`](PROJECT_REVIEW_v1.md).*
