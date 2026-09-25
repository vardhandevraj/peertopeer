# Campus Connect AI (IVY) — Complete Project Explanation for Beginners

## What Is This Project?

Imagine a website where university students can:
1. **Post updates** like a social media feed (think Instagram or Facebook, but for studying)
2. **Message each other** in real-time (like WhatsApp)
3. **Chat with an AI assistant** named IVY that helps with homework (like ChatGPT, but built-in)
4. **Join video calls** with classmates to study together (like Zoom, but built into the app)

That is what this project is: **Campus Connect AI** (also called **IVY** or **PeerVerse**). It is a social learning platform made for university students to connect, share resources, and learn together.

---

## What Technology Is Used?

Here is a simple breakdown of the tools used:

| Tool | What It Does (in plain English) |
|------|--------------------------------|
| **Python** | The programming language the server is written in |
| **Flask** | A Python tool that creates the website server (handles page requests) |
| **Supabase** | A cloud database where all user data, posts, messages, etc. are stored |
| **Groq AI** | A service that powers the IVY AI assistant (like ChatGPT's brain) |
| **WebRTC** | Technology that lets browsers connect directly for video calls |
| **Socket.IO** | Allows real-time communication (instant messages, call signals) |
| **HTML/CSS/JS** | The standard web languages that make up the pages and interactivity |
| **Jinja2** | A Python tool that lets you put dynamic data into HTML pages |
| **Gunicorn** | A tool that runs the website for real users (in production) |

**Think of it this way:**
- Flask = the kitchen (processes requests)
- Supabase = the pantry (stores data)
- Groq AI = the smart assistant (answers questions)
- Socket.IO = the walkie-talkie (instant communication)
- WebRTC = the video camera system (peer-to-peer video calls)

---

## The Big Picture: How Files Are Organized

```
CampusConnectAI/          ← This is the main project folder
│
├── app.py                ← THE BRAIN of the website (all server logic, ~2967 lines)
│                           This file handles EVERYTHING: user login, posts, messages,
│                           AI chat, video calls, file uploads
│
├── requirements.txt      ← A shopping list of Python packages needed to run the app
│
├── Procfile              ← Instructions for how to launch the website in production
│
├── supabase_schema.sql   ← The "blueprint" for the database (defines what tables exist
│                           and what data they hold)
│
├── .env                  ← SECRET file with passwords and API keys (never commit to git!)
│
├── templates/            ← HTML pages (what users see in their browser)
│   ├── index.html        ← The homepage / landing page people see first
│   ├── login.html        ← The "sign in" page
│   ├── register.html     ← The "create account" page
│   ├── feed.html         ← The social feed (like a Facebook wall)
│   ├── edit_post.html    ← Page to edit a post you already made
│   ├── profile.html      ← Your student profile page
│   ├── students.html     ← Directory of all students (find friends)
│   ├── messages.html     ← Chat inbox (like WhatsApp web)
│   ├── notifications.html← List of notifications (who liked your post, etc.)
│   ├── resources.html    ← Shared files and links (PDFs, slides, notes)
│   ├── search.html       ← Search bar to find students, posts, resources
│   ├── ai.html           ← Chat with IVY AI assistant
│   └── call_room.html    ← Video call room (like Zoom)
│
├── static/               ← Files the browser downloads (CSS, JS, images)
│   ├── style.css         ← How the website LOOKS (colors, fonts, layout)
│   ├── call_room.css     ← How the video room LOOKS specifically
│   ├── script.js         ← Shared JavaScript (navigation, theme, chat)
│   ├── ai_chat.js        ← JavaScript for the AI chat page
│   ├── call_room.js      ← JavaScript for the video call room
│   └── images/logo.png   ← The IVY logo image
│
├── migrations/           ← Database upgrade scripts (add new tables/features over time)
│
└── archive/              ← Old files from an earlier version (not used anymore)
```

**Key insight:** `app.py` is the single file that contains ALL the backend logic. It is a "monolith" — meaning everything is in one place rather than split across many files.

---

## File-by-File Explanation

---

## Understanding `app.py` — The Heart of the Website

`app.py` is a single, large file (~2967 lines) that contains ALL the backend logic. When you run this file, it starts a web server that responds to user requests. Think of it as the "brain" of the entire application.

### What Does `app.py` Do?

When a user visits a page or clicks a button, their browser sends a "request" to `app.py`. The app then:
1. Figures out what the user wants
2. Talks to the database (Supabase) to get or save data
3. Sends back an HTML page or JSON data

Let me break down the major sections:

---

### Configuration & Initialization (lines 1–70)
**What happens when the app starts:**

```python
# Loads secret keys and passwords from .env file
dotenv.load_dotenv()

# Creates the Flask web server
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")

# Enables real-time communication
socketio = SocketIO(app, cors_allowed_origins="*")
```

**In plain English:**
- The app reads a secret `.env` file that contains passwords and API keys
- It creates a Flask web server
- It sets up real-time communication (for instant messages)
- It defines which file types users can upload (images, PDFs, PowerPoint files)
- It connects to Supabase for storing files

---

### Database Helpers (lines 83–91)
**What they do:**
- `get_db_connection()` — Opens a connection to the Supabase database
- `db_cursor(connection, dictionary)` — Gets a "cursor" (like a pointer) to run SQL queries

**Think of it like:** Opening a filing cabinet drawer (connection) and getting a handle to pull out files (cursor)

---

### File Upload Helpers (lines 93–124)
**What they do:**
- `allowed_file()` — Checks if a file has the right extension (like .pdf or .jpg)
- `save_uploaded_file()` — Sends a file to Supabase Storage (cloud file storage) and returns a link to it

**In plain English:** When a user uploads a profile picture or a PDF, this code saves it to the cloud and gives back a URL so the browser can display it.

---

### Session & Auth Helpers (lines 127–142)
**What they do:**
- `get_logged_in_user()` — Checks who is currently logged in
- `login_required()` — Makes sure only logged-in users can access certain pages

**Think of it like:** A bouncer at a club door checking if you're on the guest list

---

### Notification System (lines 144–172)
**What it does:**
When someone likes your post, comments on it, or sends you a message, this code creates a "notification" (like a little alert badge) in the database.

**Example:** If Alice likes Bob's post, the system creates a notification that says "Alice liked your post" and sends it to Bob.

### HTTP Routes — The "Pages" of the Website

When you type a URL in your browser, you are making an HTTP request. Here is what each route does:

#### Authentication Routes (Login/Signup)
| Route       | What It Does  | Plain English                                          |
|-------------|---------------|--------------------------------------------------------|
| `/`         | Landing page  | The homepage people see before logging in              |
| `/register` | Create account| Form where students sign up with name, email, password |
| `/login`    | Sign in       | Form where students enter email and password           |
| `/logout`   | Sign out      | Logs the student out and clears their session          |

#### Social Feed Routes (Posts & Interactions)
| Route                  | What It Does     | Plain English                                        |
|------------------------|------------------|------------------------------------------------------|
| `/feed`                | View all posts   | Shows a scrollable feed of posts from all students   |
| `/create-post`         | Make a new post  | Submit text, photos, or files to share with everyone |
| `/edit-post/<id>`      | Edit your post   | Change what you wrote in an existing post            |
| `/delete-post/<id>`    | Delete your post | Remove a post you created                            |
| `/like-post/<id>`      | Like/unlike      | Toggle a heart/like on someone's post                |
| `/add-comment/<id>`    | Comment          | Write a reply on someone's post                      |
| `/delete-comment/<id>` | Delete comment   | Remove your own comment                              |

#### Profile & Social Routes
| Route                                   | What It Does | Plain English                                    |
|-----------------------------------------|--------------|--------------------------------------------------|
| `/profile`                              | Your profile | View and edit your bio, skills, interests, photo |
| `/students`                             | Find people  | Browse all students, send friend requests        |
| `/send-friend-request/<id>`             | Add friend   | Send a friend request to another student         |
| `/respond-friend-request/<id>/<status>` | Accept/Reject| Respond to a friend request                      |
| `/follow/<id>`                          | Follow       | Follow a student to see their posts              |
| `/unfollow/<id>`                        | Unfollow     | Stop following a student                         |

#### Messaging Routes
| Route                    | What It Does          | Plain English                                    |
|--------------------------|-----------------------|--------------------------------------------------|
| `/messages`              | Inbox                 | See all your conversations (like WhatsApp inbox) |
| `/messages/<id>`         | Open chat             | Open a specific conversation and see all messages|
| `/conversations/new`     | New chat              | Start a 1-on-1 conversation with someone         |
| `/conversations/group`   | New group             | Create a group chat with multiple people         |

#### Video Call Routes
| Route                          | What It Does           | Plain English                                    |
|--------------------------------|------------------------|--------------------------------------------------|
| `/calls/start/<conversation_id>` | Start call           | Create a video room and invite people            |
| `/call/<room_id>`              | Join call              | Enter the video call room                        |

#### AI Assistant Routes
| Route                         | What It Does              | Plain English                                    |
|-------------------------------|---------------------------|--------------------------------------------------|
| `/ai`                         | AI chat                   | Open the IVY AI assistant                        |
| `/ai/<conversation_id>`       | Specific chat             | Open a specific AI conversation                  |
| `/ai/conversations/new`       | New AI chat               | Start a fresh conversation with IVY              |

#### Other Routes
| Route                          | What It Does     | Plain English                                    |
|--------------------------------|------------------|--------------------------------------------------|
| `/notifications`               | Alerts           | See who liked your post, commented, etc.         |
| `/resources`                   | Shared files     | Upload and download study materials              |
| `/search`                      | Search           | Find students, posts, or resources               |

---

### Socket.IO Events — The "Walkie-Talkie" System

Regular web pages work like this: browser asks, server responds. But for real-time features (instant messages, video calls), we need a persistent connection — like a walkie-talkie that stays on.

**How Socket.IO works:**
1. Browser connects to server and stays connected
2. Either side can send messages at any time
3. No need to refresh the page

**Events used in this app:**

| Event               | What Happens                  | Plain English                                               |
|---------------------|-------------------------------|-------------------------------------------------------------|
| `join_chat`         | User opens a chat             | "Hey server, I'm joining this conversation"                 |
| `join_inbox`        | User opens inbox              | "I want to see unread counts update live"                   |
| `send_chat_message` | User sends a message          | "Save this to database and show it to everyone in the chat" |
| `mark_chat_read`    | User opens a conversation     | "Mark all messages as read so the unread badge goes away"   |
| `join_call`         | User enters video room        | "I'm here! Show my video to everyone"                       |
| `call_signal`       | WebRTC signaling              | "Here's my video connection info (SDP offer/answer/ICE)"    |
| `call_media_state`  | Mic/cam toggled               | "I muted my mic, let everyone know"                         |
| `leave_call`        | User leaves room              | "I'm leaving but don't end the call for others"             |
| `end_call`          | Host ends room                | "End this call for everyone"                                |

---

### AI / IVY Integration — The Smart Assistant

IVY is an AI assistant powered by Groq (a fast AI service). It can answer questions about anything — homework, study tips, explanations of topics.

**How it works in two places:**

#### 1. Standalone AI Chat (`/ai` page)
- Student opens a conversation with IVY
- Types a question like "Explain photosynthesis"
- App sends the question to Groq API with the conversation history
- IVY's response is saved in the database and shown in the chat

#### 2. @ivy Mention (in any chat)
- In a regular chat, if someone types "@ivy" followed by a question
- The app detects this pattern
- It calls the Groq API in the background
- IVY's response is sent as a message in that chat

**Key functions:**
- `generate_ai_response()` — Calls the Groq API (tries multiple AI models as backup)
- `process_ivy_mention()` — Handles @ivy mentions in chats
- `build_ai_chat_prompt()` — Creates the prompt sent to the AI
- `gather_ai_database_context()` — Finds related posts/resources to give IVY context about campus life

---

### Video Learning Room Logic — The Zoom-Like Feature

This is the most complex part of the app. It lets students join video calls directly in the browser.

**How WebRTC works (simplified):**
1. Two browsers want to connect directly (peer-to-peer)
2. They need to exchange connection info (called SDP offers/answers and ICE candidates)
3. This exchange happens through the server (signaling)
4. Once connected, video/audio flows directly between browsers (not through the server)

**Key concepts:**

| Term | What It Means |
|------|---------------|
| `CALL_ROOM_SOCKETS` | A list tracking who is in each room |
| `build_ice_servers()` | Gets the server addresses needed for video connections |
| `load_call_room()` | Fetches room info from the database |
| `mark_call_presence()` | Records that a user joined the room |
| `end_call_room()` | Closes the room when everyone leaves |
| `SDP offer/answer` | "Here's how we can connect" messages between browsers |
| `ICE candidates` | "Here are my network addresses" messages |
| `STUN/TURN servers` | Help browsers find each other across the internet |

---

## Frontend Files — What the User Sees and Interacts With

The "frontend" is everything that runs in the user's browser. It is the visual part of the website.

### `static/script.js` — The Shared Brain of All Pages (326 lines)

This JavaScript file runs on almost every page. It handles common things that all pages need.

**What it does:**

1. **Theme Toggle** (lines 1–6)
   - Lets users switch between dark mode and light mode
   - Saves preference in browser storage so it remembers next time

2. **Time Formatting** (`formatChatTime()`)
   - Converts a timestamp like "2024-03-15T14:30:00" to "2:30 PM"

3. **Markdown Rendering** (`renderIvyMarkdown()`)
   - Converts text with markdown syntax (like `**bold**` or `# Heading`) into formatted HTML
   - Uses `marked.js` library for conversion and `DOMPurify` to prevent XSS attacks

4. **Chat Messages** (`createMessageElement()`)
   - Creates the HTML for a single chat message bubble
   - Handles three types: your messages, other people's messages, and IVY AI messages

5. **Real-time Chat** (`initializeChat()`)
   - Connects to Socket.IO for instant messaging
   - Listens for new messages and adds them to the screen
   - Handles sending messages when you press Enter or click Send

6. **Call Invitations** (`initializeCallInvitations()`)
   - When someone invites you to a video call, shows a popup card
   - You can click "Join" or "Dismiss"

7. **Navigation & Menu** (lines 302–326)
   - Hamburger menu for mobile
   - Search filters for students and conversations
   - Theme toggle button
   - Ambient cursor glow effect (subtle visual flair)

---

### `static/ai_chat.js` — AI Chat Page Logic (245 lines)

This runs only on the `/ai` page (the IVY assistant chat).

**What it does:**

1. **Send Messages**
   - When you type a message and press Enter:
     - Sends it to `/ai/conversations/<id>/message`
     - Your message appears in the chat
     - IVY's response appears after a short delay
     - Updates the sidebar with the new message preview

2. **Auto-generate Title**
   - After your first message in a new conversation, it automatically generates a short title
   - For example, if you ask "Explain photosynthesis", the title becomes "Explain photosynthesis"

3. **Rename Conversations**
   - Click the "..." menu on a conversation → Rename
   - Opens a modal where you can type a new name
   - Sends the new name to the server

4. **Delete Conversations**
   - Click "..." → Delete
   - Shows a confirmation dialog
   - If confirmed, deletes the conversation and all its messages

---

### `static/call_room.js` — Video Call Room Logic (703 lines)

This is the most complex JavaScript file. It handles everything for video calls.

**Key Concepts:**

| Concept                     | Plain English                                             |
|-----------------------------|-----------------------------------------------------------|
| `RTCPeerConnection`         | A direct browser-to-browser connection for video/audio    |
| `getUserMedia()`            | Gets access to your camera and microphone                 |
| `getDisplayMedia()`         | Gets access to your screen for screen sharing             |
| `RTCSessionDescription`     | Your video connection info (SDP)                          |
| `RTCIceCandidate`           | Your network address info                                 |

**What it does:**

1. **Joining a Room**
   - Requests camera/mic access
   - Connects to Socket.IO
   - Tells the server "I'm joining room X"
   - Gets a list of everyone already in the room

2. **Connecting to Peers**
   - For each person already in the room:
     - Creates a peer connection
     - Sends a "video offer" (if you joined first)
     - Receives a "video answer" (if you joined second)
     - Exchanges network addresses (ICE candidates)
   - Once connected, video/audio streams directly between browsers

3. **Managing Video Tiles**
   - Each participant gets a "tile" (a video element)
   - Tiles are arranged in a grid:
     - 1 person: centered, large
     - 2 people: side by side
     - 3+ people: grid layout

4. **Controls**
   - **Mute/Unmute**: Toggles your microphone
   - **Camera On/Off**: Toggles your camera
   - **Screen Share**: Shares your screen instead of camera
   - **Chat**: Opens a chat panel inside the call
   - **End Call**: Leaves the room for you (or ends it for everyone if you're the host)

5. **In-Room Chat**
   - You can send text messages during a video call
   - Supports @ivy mentions (just like regular chat)

6. **Reconnection**
   - If the connection drops, it automatically tries to reconnect
   - On reconnect, it rebuilds all peer connections from scratch

---

### `static/style.css` — The Design System (~2000+ lines)

This file makes the website look beautiful. It defines colors, fonts, layouts, and all visual styling.

**Key Sections:**

1. **CSS Variables** (lines 8–69)
   - Defines all the colors, gradients, and spacing used throughout
   - Example: `--bg-primary: #0d0f12` means the main background is very dark gray
   - Changes when you switch themes

2. **Light Theme** (lines 74–213)
   - Overrides the dark theme with light colors when you toggle the theme switch

3. **Typography** (lines 262–334)
   - Sets fonts: Plus Jakarta Sans for headings, Space Grotesk for body, JetBrains Mono for code
   - Styles scrollbars

4. **Navigation Bar** (lines 355–455)
   - The sticky top bar that stays visible when scrolling
   - Has logo, navigation links, and mobile hamburger menu

5. **Hero Section** (lines 458–612)
   - The big headline on the landing page with gradient text

6. **Buttons** (lines 515–611)
   - Primary buttons (gradient fill), secondary buttons (glass effect), small action buttons

7. **Feed & Posts** (lines 947–1200)
   - Two-column layout for the social feed
   - Post cards with author info, content, like/comment buttons

8. **Messages/Chat** (lines 1352–1943)
   - Chat sidebar (conversation list, search)
   - Chat panel (message bubbles, composer, typing indicator)
   - Modal dialogs (new chat, group creation, add members)

9. **AI Assistant** (lines 1484–1717)
   - AI response cards with markdown formatting
   - Code blocks, tables, blockquotes styling

10. **Responsive Design** (lines 1722–1765)
    - Adjusts layout for tablets (960px breakpoint) and phones

---

### `static/call_room.css` — Video Room Styles (372 lines)

Specific styles for the video call room page.

**Key Sections:**

1. **Layout**
   - Full-screen height (100vh)
   - Header at top, video grid in middle, controls at bottom

2. **Video Grid**
   - CSS Grid for arranging video tiles
   - Different layouts for 1, 2, or 3+ people

3. **Video Tiles**
   - Rounded containers for each person's video
   - Shows name label at bottom
   - Shows "Muted" badge when mic is off

4. **Control Bar**
   - Circular buttons for mic, camera, screen share, chat, IVY, end call
   - Active state (green) when feature is on
   - Red state for end call button

5. **Responsive**
   - On small screens, chat becomes a slide-in panel

---

## HTML Templates — The Pages Users See

Each template is a complete HTML page that gets filled with data from the server.

### `templates/index.html` — Landing Page (128 lines)

The first page people see when they visit the website.

**What it shows:**
- A top navigation bar with "Campus Connect AI" logo
- A hero section with a big headline and description
- Call-to-action buttons ("Get Started")
- A preview of what the feed looks like (mock cards)
- Feature descriptions (Resource Exchange, Peer Network, AI Learning Companion)

---

### `templates/login.html` — Login Page (80 lines)

Two-column layout:
- **Left side:** Branding intro (IVY logo, description)
- **Right side:** Email and password form

When you click "Sign In", it sends your credentials to `/login` which checks them against the database.

---

### `templates/register.html` — Registration Page (108 lines)

Two-column layout:
- **Left side:** Branding intro
- **Right side:** Form with:
  - Full name
  - Email address
  - Department (Computer Science, Engineering, etc.)
  - Year (1-4)
  - Password
  - Bio (optional)

When you click "Create Account", it hashes your password and saves you to the database.

---

### `templates/feed.html` — Social Feed (193 lines)

The main page after logging in.

**Layout:**
- **Left sidebar:** Current user card, quick navigation links
- **Main area:**
  - Post creation form (text, category dropdown, file attachment)
  - Feed list showing all posts with:
    - Author avatar, name, department, year, timestamp
    - Post type badge (Text, Video, Discussion, etc.)
    - Post content
    - Image or PDF attachment (if any)
    - Like count, comment count
    - Like/Edit/Delete buttons
    - Comment list with reply form

---

### `templates/edit_post.html` — Edit Post (77 lines)

Simple form to edit an existing post's content and category.

---

### `templates/profile.html` — Profile Page (157 lines)

**Top section:**
- Cover photo (editable)
- Profile picture (image or initial letter)
- Name, department, year, email
- Stats badges (followers, following, friends)

**Bottom section:**
- Left column: Bio, skills, interests
- Right column: Edit form with all profile fields

---

### `templates/students.html` — Student Directory (114 lines)

Two-column layout:
- **Left:** Pending friend requests with Accept/Decline buttons
- **Right:** All other students with Connect/Follow buttons

---

### `templates/messages.html` — Real-time Messaging (318 lines)

The most complex template.

**Layout:**
- **Sidebar:**
  - "New chat" and "New group" buttons
  - Search bar
  - Conversation list (avatar, name, preview, timestamp, unread badge)

- **Chat Panel:**
  - Header with avatar, name, member count, call button
  - Message timeline (user/peer/IVY messages)
  - Message composer (textarea, @ivy hint, send button)

- **Modals:**
  - New chat (student picker)
  - New group (title, image, member checkboxes)
  - Add members (admin-only)

---

### `templates/notifications.html` — Notifications (69 lines)

Simple list of all notifications with type, message, and timestamp.

---

### `templates/resources.html` — Academic Resources (125 lines)

Upload form (title, type, description, file, URL) and a grid of shared resources with download/open links.

---

### `templates/search.html` — Global Search (104 lines)

Search form with results displayed in three cards: Students, Posts, Resources.

---

### `templates/ai.html` — AI Assistant (207 lines)

ChatGPT-style layout:
- **Sidebar:** "New Chat" button, search, conversation list with menus
- **Chat Panel:** Header with title, message timeline, composer with thinking indicator
- **Rename Modal:** For renaming conversations

---

### `templates/call_room.html` — Video Learning Room (107 lines)

Full-page video call interface:
- **Header:** Room title, participant count, leave link
- **Video Stage:** Dynamic grid for video tiles, permission overlay
- **Chat Panel:** Room chat with @ivy support
- **Control Bar:** Mic, camera, screen share, chat, IVY, end call buttons

---

## Database Schema — How Data Is Organized

The database is like a collection of spreadsheets (called "tables"). Each spreadsheet holds a specific type of data.

### All 16 Tables Explained

| Table               | What It Stores                                       | Example                                    |
|---------------------|--------------------------------- ---------------------|--------------------------------------------|
| `users`             | Student accounts                                     | Name, email, password, department, bio, profile picture |
| `posts`             | Feed posts                                           | "I just aced my exam!" with optional photo |
| `comments`          | Comments on posts                                    | "Congrats! What textbook did you use?"     |
| `likes`             | Who liked which post                                 | Alice liked Bob's post #5                  |
| `friends`           | Friend relationships                                 | "Alice sent Bob a friend request" (pending/accepted) |
| `followers`         | Follow relationships                                 | "Alice follows Bob"                        |
| `conversations`              | Chat threads                                         | "Study Group Chat" or "Alice & Bob chat" |
| `conversation_participants` | Who is in each chat                                  | Links users to conversations                 |
| `messages`                   | Chat messages                                        | "Hey, are you free for a study session?"   |
| `call_rooms`             | Video call rooms                                     | "CS101 Study Session" (active/ended)       |
| `call_room_participants` | Who joined which call                                | "Alice joined room X at 2pm"               |
| `notifications`             | Alert badges                                         | "Bob liked your post"                      |
| `resources`                 | Shared files                                         | "CS101 Midterm Notes.pdf"                |
| `chat_history`              | Legacy IVY Q&A                                       | Old AI chat history (kept for compatibility) |
| `ai_conversations`          | AI chat threads                                      | "Photosynthesis Explanation"               |
| `ai_messages`               | AI chat messages                                     | User: "What is photosynthesis?" / IVY: "Photosynthesis is..." |

### How Tables Relate to Each Other

```
users ──┬── posts ──┬── comments
        │           └── likes
        ├── friends (sender_id → users, receiver_id → users)
        ├── followers (follower_id → users, following_id → users)
        ├── messages (sender_id → users)
        ├── notifications (user_id → users, from_user_id → users)
        ├── resources (uploaded_by → users)
        ├── ai_messages (conversation_id → ai_conversations)
        └── conversation_participants (user_id → users, conversation_id → conversations)
            └── conversations ── messages
            └── call_rooms ── call_room_participants
```

**In plain English:**
- A `user` can have many `posts`
- A `post` can have many `comments` and `likes`
- A `user` can be in many `conversations`
- A `conversation` has many `messages` and `participants`
- A `user` can have many `ai_conversations` with `ai_messages`

---

## Data Flow — How Information Moves Through the App

### Flow 1: User Registration
1. Student fills out form (name, email, password, department, year)
2. Browser sends form data to `POST /register`
3. Server checks if email already exists
4. Server hashes the password (so it's never stored in plain text)
5. Server inserts new row into `users` table
6. Server redirects to login page

### Flow 2: User Login
1. Student enters email and password
2. Browser sends credentials to `POST /login`
3. Server finds the user by email
4. Server verifies password hash matches
5. Server stores `user_id`, `full_name`, `email` in Flask session (a cookie)
6. Server redirects to `/feed`

### Flow 3: Creating a Post
1. Student types text, selects category, optionally attaches a file
2. Browser sends data to `POST /create-post`
3. Server validates the data
4. If file attached: uploads to Supabase Storage, gets public URL
5. Server inserts row into `posts` table
6. Server redirects to `/feed`

### Flow 4: Real-time Messaging
1. Student opens `/messages/<id>`
2. Server loads conversation and messages from database
3. Browser connects to Socket.IO
4. Browser joins the conversation room
5. Student types message and presses Enter
6. Socket.IO sends message to server
7. Server saves message to `messages` table
8. Server broadcasts message to all connected users in that conversation
9. All browsers in that conversation see the new message instantly

### Flow 5: AI Assistant (IVY)
1. Student opens `/ai` page
2. Student types a question
3. Browser sends message to `POST /ai/conversations/<id>/message`
4. Server fetches last 16 messages for context
5. Server calls Groq API with the question and context
6. Groq API returns IVY's response
7. Server saves both messages to `ai_messages` table
8. Server returns response to browser
9. Browser displays both messages in the chat

### Flow 6: Video Call
1. Student starts call from a conversation
2. Server creates `call_rooms` row in database
3. Server sends `call_invitation` to all conversation participants via Socket.IO
4. Recipients see a popup card
5. They click "Join" → browser enters the call room
6. Browser requests camera/mic access
7. Browser connects to Socket.IO room
8. For each existing participant:
   a. New participant creates a peer connection
   b. Sends SDP offer (video connection info)
   c. Existing participant responds with SDP answer
   d. Both exchange ICE candidates (network addresses)
9. Video/audio now flows directly between browsers (peer-to-peer)
10. When someone leaves:
    - If host leaves: room closes for everyone
    - If participant leaves: they just disconnect, room stays open
11. When everyone leaves: room marked as "ended" in database

---

## Dependencies — What Packages Are Used

### `requirements.txt` — Python Packages

```
Flask==3.0.3              ← The web framework (creates the server)
Flask-SocketIO==5.3.6     ← Real-time communication (instant messages)
groq                      ← AI service (powers IVY assistant)
psycopg2-binary           ← Database connector (talks to Supabase PostgreSQL)
supabase                  ← File storage (stores profile pics, PDFs, etc.)
python-dotenv             ← Reads .env file (loads secret keys)
Werkzeug                  ← Security tools (password hashing, file sanitization)
eventlet                  ← Async worker (handles multiple users at once)
gunicorn==21.2.0          ← Production server (runs the app for real users)
```

**In plain English:**
- Flask = the website server
- Flask-SocketIO = instant messaging
- Groq = AI brain
- psycopg2 = database connection
- Supabase = file storage
- dotenv = secret key loader
- Werkzeug = security
- eventlet/gunicorn = production server

### `Procfile` — How to Run in Production

```
web: gunicorn app:app --workers 1 --worker-class eventlet --bind 0.0.0.0:$PORT
```

**What this means:**
- `gunicorn app:app` = Run the Flask app
- `--workers 1` = Use 1 worker (required for Socket.IO)
- `--worker-class eventlet` = Use eventlet for async (handles real-time)
- `--bind 0.0.0.0:$PORT` = Listen on all network interfaces

### `.gitignore` — What NOT to Upload to Git

```
__pycache__/    ← Python cache files (generated automatically)
.env            ← SECRET FILE with passwords (never share!)
.venv/          ← Python virtual environment (large, not needed)
static/uploads/* ← Uploaded files (user data, not code)
```

---

## Environment Variables — The Secret Keys

The `.env` file contains sensitive information. Here is what each variable does:

| Variable | What It Is | Where to Get It |
|----------|------------|-----------------|
| `SUPABASE_URL` | Your Supabase project address | Supabase Dashboard → Settings → API |
| `SUPABASE_KEY` | Your Supabase public key | Supabase Dashboard → Settings → API |
| `SUPABASE_DB_URL` | PostgreSQL connection string | Supabase Dashboard → Settings → Database |
| `GROQ_API_KEY` | Your Groq AI API key | Groq Console → API Keys |
| `GROQ_MODEL` | (Optional) AI model to use | Default: `openai/gpt-oss-120b` |
| `SECRET_KEY` | Flask session secret | Any random string |
| `PORT` | Server port | Default: 5001 |
| `STUN_SERVER` | Video call helper server | Free STUN servers available online |
| `TURN_SERVER` | Video call relay server | (Optional) For strict networks |
| `TURN_USERNAME` | TURN server username | (Optional) For TURN server |
| `TURN_PASSWORD` | TURN server password | (Optional) For TURN server |

**Example `.env` file:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
GROQ_API_KEY=gsk_abc123def456...
SECRET_KEY=your-super-secret-key-here
PORT=5001
```

---

## Security — How the App Protects Users

### Password Protection
- When a user registers, their password is **hashed** (converted to an unreadable format)
- The original password is never stored
- When logging in, the entered password is hashed and compared to the stored hash
- Uses Werkzeug's `pbkdf2` algorithm (industry standard)

### SQL Injection Prevention
- All database queries use **parameterized statements** (placeholders)
- User input is never directly inserted into SQL queries
- Example: `SELECT * FROM users WHERE email = %s` (not `f"SELECT * FROM users WHERE email = '{email}'"`)

### XSS Prevention
- Markdown rendering uses **DOMPurify** to sanitize HTML
- User input is escaped before display
- Prevents malicious scripts from running in the browser

### File Upload Security
- Only allows specific file types (images, PDFs, PowerPoint)
- Filenames are sanitized using `werkzeug.utils.secure_filename()`
- Files are stored in Supabase Storage (cloud), not on the server

### Session Security
- Flask sessions are signed with `SECRET_KEY`
- Session data is stored in a signed cookie
- Cannot be tampered with by users

### Socket.IO Security
- All events validate session authentication
- Events check database membership before allowing actions
- Users can only join rooms they are members of

---

## Migrations — Database Upgrades Over Time

Migrations are SQL scripts that add new features or fix issues in the database.

| Migration | What It Does | When to Use |
|-----------|--------------|-------------|
| `001_conversation_upgrade.sql` | Adds columns for group chats | When upgrading from old version |
| `002_legacy_message_nullability.sql` | Allows NULL sender for AI messages | When adding IVY support |
| `003_storage_rls_policies.sql` | Sets up file storage permissions | When setting up Supabase Storage |
| `004_video_learning_rooms.sql` | Creates video call tables | When adding video calls |
| `005_ai_conversations.sql` | Creates AI chat tables | When adding IVY assistant |

**For new installations:** Run `supabase_schema.sql` (creates everything from scratch).
**For existing installations:** Run migrations one by one (adds new features without losing data).

---

## Archive — Legacy Files (Not Used Anymore)

These files are from an earlier version of the app that used MySQL instead of Supabase:

| File             | What It Was                    |
|------------------|--------------------------------|
| `database.sql`   | Original MySQL schema          |
| `fix_socket.py`  | Old Socket.IO fix script       |
| `fix_strings.py` | Old string formatting fix      |
| `patch_app.py`   | Old app patch script           |
| `recover.py`     | Old data recovery script       |

**These files are kept for reference only. They are NOT used in the current version.**

---

## Summary: How Everything Connects

```
User's Browser
    ↓ (HTTP requests)
Flask Server (app.py)
    ↓ (SQL queries)
Supabase PostgreSQL Database
    ↓ (file uploads)
Supabase Storage (profile pics, PDFs)
    ↓ (AI requests)
Groq API (IVY assistant)
    ↓ (Socket.IO events)
Real-time Communication
    ↓ (WebRTC)
Video Call Connections
```

**The flow:**
1. User visits the website in their browser
2. Browser sends request to Flask server
3. Flask server talks to database, processes logic, generates response
4. Flask server sends back HTML page
5. Browser renders the page
6. For real-time features, Socket.IO maintains a live connection
7. For video calls, WebRTC establishes direct browser-to-browser connections
8. For AI, Groq API processes questions and returns answers
