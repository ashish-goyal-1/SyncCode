# SyncCode Architecture

> A real-time collaborative code editor with CRDT-based synchronization

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Communication Architecture](#communication-architecture)
5. [Data Flow](#data-flow)
6. [State Management](#state-management)
7. [Room Lifecycle](#room-lifecycle)
8. [Code Execution Pipeline](#code-execution-pipeline)
9. [Security Considerations](#security-considerations)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

SyncCode is a browser-based collaborative code editor that enables multiple users to edit code simultaneously with real-time synchronization. It uses a **dual-channel communication architecture**:

- **Yjs/WebSocket** — CRDT-based document synchronization
- **Socket.io** — User presence, chat, and room management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              SyncCode                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐  │
│  │   Monaco    │    │    Yjs      │    │      Socket.io              │  │
│  │   Editor    │◄──►│   CRDT      │◄──►│   (Presence/Chat)           │  │
│  └─────────────┘    └─────────────┘    └─────────────────────────────┘  │
│         │                  │                        │                    │
│         └──────────────────┴────────────────────────┘                    │
│                            │                                             │
│                   ┌────────▼────────┐                                    │
│                   │   Piston API    │                                    │
│                   │ (Code Execution)│                                    │
│                   └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## High-Level Architecture

```
                                   ┌─────────────────┐
                                   │   Vercel CDN    │
                                   │  (React Client) │
                                   └────────┬────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │    Browser      │          │    Browser      │          │    Browser      │
    │    (User A)     │          │    (User B)     │          │    (User C)     │
    └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
             │                            │                            │
             │  WebSocket (ws://)         │                            │
             │  Socket.io                 │                            │
             └────────────────────────────┼────────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │   Render Server     │
                               │   (Node.js)         │
                               │                     │
                               │  ┌───────────────┐  │
                               │  │ WebSocket     │  │  ← Yjs Protocol
                               │  │ Server        │  │
                               │  └───────────────┘  │
                               │                     │
                               │  ┌───────────────┐  │
                               │  │ Socket.io     │  │  ← Presence/Chat
                               │  │ Server        │  │
                               │  └───────────────┘  │
                               │                     │
                               │  ┌───────────────┐  │
                               │  │ In-Memory     │  │  ← Room State
                               │  │ Storage       │  │
                               │  └───────────────┘  │
                               └─────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │   Piston API        │
                               │   (External)        │
                               │   Code Execution    │
                               └─────────────────────┘
```

---

## Technology Stack

### Frontend (Client)

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **Vite** | Build tool and dev server |
| **Monaco Editor** | VS Code's editor component |
| **Yjs** | CRDT library for conflict-free sync |
| **y-monaco** | Monaco↔Yjs binding |
| **y-websocket** | WebSocket provider for Yjs |
| **Socket.io Client** | Real-time event communication |
| **Tailwind CSS** | Utility-first styling |
| **React Router** | Client-side routing |
| **React Hot Toast** | Notification system |

### Backend (Server)

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express** | HTTP server framework |
| **Socket.io** | WebSocket library for presence/chat |
| **ws** | Raw WebSocket server for Yjs |
| **@y/websocket-server** | Official Yjs server-side sync handling |
| **Yjs** | Server-side document management |

### External Services

| Service | Purpose |
|---------|---------|
| **Piston API** | Sandboxed code execution (8+ languages) |
| **Vercel** | Frontend hosting (CDN) |
| **Render** | Backend hosting (WebSocket support) |

---

## Communication Architecture

### Dual-Channel Design

SyncCode uses two separate communication channels optimized for their specific purposes:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │   Yjs WebSocket      │      │      Socket.io               │ │
│  │   Provider           │      │      Client                  │ │
│  │                      │      │                              │ │
│  │  • Document sync     │      │  • User list                 │ │
│  │  • Cursor awareness  │      │  • Chat messages             │ │
│  │  • Binary protocol   │      │  • Language changes          │ │
│  │                      │      │  • Lock/unlock               │ │
│  │  Path: /yjs/:roomId  │      │  • Join/leave events         │ │
│  └──────────┬───────────┘      └──────────────┬───────────────┘ │
│             │                                  │                 │
└─────────────┼──────────────────────────────────┼─────────────────┘
              │                                  │
              │  wss://server/yjs/:roomId        │  wss://server/socket.io
              │                                  │
┌─────────────┼──────────────────────────────────┼─────────────────┐
│             ▼                                  ▼                 │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │   WebSocket Server   │      │      Socket.io Server        │ │
│  │   (ws library)       │      │                              │ │
│  │                      │      │  • Room state (Map)          │ │
│  │  • Yjs docs (Map)    │      │  • Host management           │ │
│  │  • Awareness state   │      │  • Message broadcasting      │ │
│  │  • Protocol parsing  │      │  • Event routing             │ │
│  └──────────────────────┘      └──────────────────────────────┘ │
│                                                                  │
│                        SERVER                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Why Two Channels?

| Channel | Optimized For | Protocol |
|---------|---------------|----------|
| **Yjs WebSocket** | High-frequency document changes | Binary (efficient) |
| **Socket.io** | Low-frequency events, reliability | JSON (flexible) |

---

## Data Flow

### Code Synchronization Flow

```
User A types character
       │
       ▼
┌─────────────────┐
│ Monaco Editor   │ ← User input
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MonacoBinding   │ ← Captures change
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Yjs Y.Text      │ ← Applies operation to CRDT
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebsocketProvider│ ← Encodes update
└────────┬────────┘
         │
         ▼ (Binary message, ~30 bytes)
┌─────────────────┐
│ Server          │ ← Applies to doc, broadcasts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User B's        │ ← Receives update
│ WebsocketProvider│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Yjs Y.Text      │ ← Merges with local state
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MonacoBinding   │ ← Updates editor
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Monaco Editor   │ ← User B sees change
└─────────────────┘
```

### Cursor Presence Flow

```
User A moves cursor
       │
       ▼
┌─────────────────┐
│ Monaco Editor   │ ← onDidChangeCursorPosition
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Yjs Awareness   │ ← setLocalStateField('customCursor', {...})
└────────┬────────┘
         │
         ▼ (Awareness update)
┌─────────────────┐
│ Server          │ ← Broadcasts to room
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User B's        │
│ Awareness       │ ← awareness.on('change', ...)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Remote Cursor   │ ← Decorations rendered
│ Decorations     │    (caret, gutter bar, name label)
└─────────────────┘
```

---

## State Management

### Client-Side State

```javascript
// EditorPage.jsx - Key State Variables

// From Yjs (CRDT)
const { yText, awareness, isConnected } = useYjs(roomId, username, userColor);

// From Socket.io (Presence)
const [clients, setClients] = useState([]);        // User list
const [messages, setMessages] = useState([]);       // Chat history
const [hostId, setHostId] = useState(null);         // Room host
const [isLocked, setIsLocked] = useState(false);    // Edit lock

// Local UI State
const [language, setLanguage] = useState('javascript');
const [output, setOutput] = useState('');
const [isRunning, setIsRunning] = useState(false);
const [latency, setLatency] = useState(-1);
```

### Server-Side State

```javascript
// Yjs Documents (WebSocket)
const docs = new Map();
// Structure: docName → { doc: Y.Doc, awareness: Awareness, clients: Set }

// Room State (Socket.io)
const rooms = new Map();
// Structure: roomId → { code, language, users: Map, messages[], hostId, isLocked }
```

---

## Room Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROOM LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     User A joins     ┌─────────────┐
  │   No Room   │ ──────────────────► │  Room       │
  │   Exists    │                      │  Created    │
  └─────────────┘                      │  (A = Host) │
                                       └──────┬──────┘
                                              │
                      User B joins            ▼
                 ┌────────────────────────────────────┐
                 │          Active Room               │
                 │  • Host: User A                    │
                 │  • Users: [A, B]                   │
                 │  • Yjs doc syncing                 │
                 │  • Chat enabled                    │
                 └────────────────┬───────────────────┘
                                  │
          User A leaves           │          User B leaves
          (Host transfer)         │          (Room empty)
                 │                │                │
                 ▼                │                ▼
  ┌──────────────────────┐       │       ┌──────────────────────┐
  │  Host → User B       │       │       │  Cleanup Timer       │
  │  Room unlocked       │       │       │  Started (5 min)     │
  └──────────────────────┘       │       └──────────┬───────────┘
                                 │                  │
                                 │       5 minutes  │  User rejoins
                                 │       pass       │  within 5 min
                                 │          │       │       │
                                 │          ▼       │       ▼
                                 │  ┌─────────────┐ │  ┌─────────────┐
                                 │  │ Room        │ │  │ Room Still  │
                                 │  │ Deleted     │ │  │ Exists      │
                                 │  │ (Code Lost) │ │  │ (Code Intact)│
                                 │  └─────────────┘ │  └─────────────┘
                                 │                  │
                                 └──────────────────┘
```

---

## Code Execution Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CODE EXECUTION FLOW                                │
└──────────────────────────────────────────────────────────────────────┘

 User clicks "Run"
       │
       ▼
 ┌─────────────────────────┐
 │ Read code from Monaco   │ ← editorRef.current.getValue()
 │ (NOT from Yjs)          │    Ensures visual = executed
 └───────────┬─────────────┘
             │
             ▼
 ┌─────────────────────────┐
 │ Build Piston Request    │
 │ {                       │
 │   language: "cpp",      │
 │   version: "*",         │
 │   files: [{ content }], │
 │   stdin: userInput      │
 │ }                       │
 └───────────┬─────────────┘
             │
             ▼ HTTPS POST
 ┌─────────────────────────┐
 │ Piston API              │ ← https://emkc.org/api/v2/piston/execute
 │ (Sandboxed Execution)   │
 │                         │
 │ • Compile (if needed)   │
 │ • Execute in container  │
 │ • Return stdout/stderr  │
 └───────────┬─────────────┘
             │
             ▼
 ┌─────────────────────────┐
 │ Parse Response          │
 │ {                       │
 │   run: {                │
 │     stdout: "Hello!",   │
 │     stderr: "",         │
 │     code: 0             │
 │   }                     │
 │ }                       │
 └───────────┬─────────────┘
             │
             ▼
 ┌─────────────────────────┐
 │ Display in Terminal     │ ← setOutput(result)
 │ (Local only, not synced)│
 └─────────────────────────┘
```

### Supported Languages

| Language | Piston ID | File Extension |
|----------|-----------|----------------|
| JavaScript | `javascript` | `.js` |
| Python | `python` | `.py` |
| Java | `java` | `.java` |
| C++ | `cpp` | `.cpp` |
| C | `c` | `.c` |
| TypeScript | `typescript` | `.ts` |
| Go | `go` | `.go` |
| Rust | `rust` | `.rs` |

---

## Security Considerations

### Client-Side

| Concern | Mitigation |
|---------|------------|
| XSS in chat | React's automatic escaping |
| Username injection | Validation + sanitization |
| Code injection | Code runs in Piston sandbox, not browser |

### Server-Side

| Concern | Mitigation |
|---------|------------|
| CORS | Origin validation (whitelist) |
| DoS | In-memory limits, room timeouts |
| WebSocket hijacking | Origin checking on upgrade |

### Code Execution

| Concern | Mitigation |
|---------|------------|
| Malicious code | Piston runs in isolated containers |
| Resource exhaustion | Piston enforces CPU/memory/time limits |
| Infinite loops | Piston timeout (~30 seconds) |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
└─────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   GitHub Repo   │
                         │   goyal-1/      │
                         │   SyncCode      │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
         ┌─────────────────┐         ┌─────────────────┐
         │     Vercel      │         │     Render      │
         │   (Frontend)    │         │   (Backend)     │
         │                 │         │                 │
         │  Auto-deploy    │         │  Auto-deploy    │
         │  on push        │         │  on push        │
         └────────┬────────┘         └────────┬────────┘
                  │                           │
                  ▼                           ▼
         ┌─────────────────┐         ┌─────────────────┐
         │ synccode-five.  │         │ synccode-server │
         │ vercel.app      │◄───────►│ -3xzv.onrender  │
         │                 │   API   │ .com            │
         │ • Static files  │         │                 │
         │ • CDN cached    │         │ • Node.js       │
         │ • HTTPS         │         │ • WebSocket     │
         │ • Instant load  │         │ • 5min cold     │
         │                 │         │   start (free)  │
         └─────────────────┘         └─────────────────┘
```

### Environment Variables

**Vercel (Client)**
```
VITE_SERVER_URL=https://synccode-server-3xzv.onrender.com
```

**Render (Server)**
```
PORT=10000
CLIENT_URL=https://synccode-five.vercel.app
```

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| **y-monaco position edge case** | The y-monaco binding library has a known issue where position translation can occasionally drift at specific character boundaries. This is a [documented limitation](https://github.com/yjs/y-monaco/issues) in the library, not in SyncCode's implementation. |
| **Render cold start** | Free tier server takes 50-60 seconds to wake up after inactivity. |
| **Single file only** | Designed for algorithm problems and code snippets, not multi-file projects. |
| **In-memory storage** | Server: Room data lost on restart. Client: Page refresh resets local state (session-based by design). |

---

## Future Enhancements (Roadmap)

| Feature | Complexity | Description |
|---------|------------|-------------|
| **Database Persistence** | High | MongoDB/PostgreSQL for room state |
| **User Authentication** | Medium | OAuth login, room ownership |
| **File Tabs** | Medium | Multiple files per room |
| **Syntax Linting** | Low | ESLint/Prettier integration |
| **Shared Output** | Low | Sync terminal output across users |
| **Voice Chat** | High | WebRTC audio channels |

---

## File Structure

```
SyncCode/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Editor.jsx     # Monaco + Yjs binding
│   │   │   ├── Terminal.jsx   # Output display
│   │   │   ├── Chat.jsx       # Real-time chat
│   │   │   ├── Client.jsx     # User avatar
│   │   │   └── StatusBar.jsx  # Connection status
│   │   ├── hooks/
│   │   │   └── useYjs.js      # Yjs provider hook
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Room join/create
│   │   │   └── EditorPage.jsx # Main editor view
│   │   ├── App.jsx            # Router
│   │   └── socket.js          # Socket.io config
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── index.js               # Express + Socket.io + Yjs
│   └── package.json
│
├── ARCHITECTURE.md            # This file
└── README.md                  # Project overview
```

---

*Last updated: December 2024*
