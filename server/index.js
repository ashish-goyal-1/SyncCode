const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const WebSocket = require('ws');
const { setupWSConnection } = require('@y/websocket-server/utils');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SyncCode Server Running');
});

const axios = require('axios');

// Environment variables with defaults
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID;
const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET;

// Code Execution Route (Proxies to Glot.io - no API key needed)
app.post('/api/execute', async (req, res) => {
  const { language, code, stdin } = req.body;

  // Language Map (SyncCode ID -> Glot.io language + file extension)
  const LANGUAGE_MAP = {
    javascript: { lang: 'javascript', ext: 'js' },
    python: { lang: 'python', ext: 'py' },
    java: { lang: 'java', ext: 'java' },
    cpp: { lang: 'cpp', ext: 'cpp' },
    c: { lang: 'c', ext: 'c' },
    typescript: { lang: 'typescript', ext: 'ts' },
    go: { lang: 'go', ext: 'go' },
    rust: { lang: 'rust', ext: 'rs' },
  };

  const config = LANGUAGE_MAP[language];

  if (!config) {
    return res.status(400).json({ message: 'Unsupported language' });
  }

  try {
    const response = await axios.post(
      `https://glot.io/run/${config.lang}`,
      {
        files: [{ name: `main.${config.ext}`, content: code }],
        stdin: stdin || '',
      },
      { timeout: 15000 }
    );

    const stdout = response.data.stdout || '';
    const stderr = response.data.stderr || '';
    const error = response.data.error || '';

    res.json({
      run: {
        stdout,
        stderr: stderr || error,
        output: stdout || stderr || error,
      }
    });

  } catch (error) {
    console.error('Glot.io Error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Execution failed',
      error: error.response?.data?.error || error.message
    });
  }
});


const server = http.createServer(app);

// Socket.io server for user presence, lock state, and language changes
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      // Normalize URLs (remove trailing slashes)
      const normalizedOrigin = origin.replace(/\/$/, '');
      const normalizedClientUrl = CLIENT_URL.replace(/\/$/, '');

      // Allow if origin matches CLIENT_URL or is localhost for development
      if (normalizedOrigin === normalizedClientUrl ||
        origin.includes('localhost') ||
        origin.includes('vercel.app')) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// WebSocket server for Yjs CRDT sync
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade requests for Yjs
server.on('upgrade', (request, socket, head) => {
  if (request.url && request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Use official y-websocket server setup - handles all sync protocol correctly
wss.on('connection', (ws, request) => {
  const roomId = request.url?.replace('/yjs/', '') || 'default';
  console.log(`Yjs client connected to room: ${roomId}`);

  // Use the official setupWSConnection which handles:
  // - Sync step 1/2 handshake
  // - Document updates
  // - Awareness protocol
  // - Cleanup on disconnect
  setupWSConnection(ws, request, { docName: roomId });

  ws.on('close', () => {
    console.log(`Yjs client disconnected from room: ${roomId}`);
  });
});

// In-memory storage for rooms
// roomId -> { code, language, users, hostId, isLocked }
const rooms = new Map();

// Generate distinct, bright colors for user avatars
const getRandomColor = () => {
  const colors = [
    '#FF3B30', // Vivid Red
    '#FF9500', // Bright Orange
    '#FFCC00', // Sunny Yellow
    '#4CD964', // Fresh Green
    '#5AC8FA', // Sky Blue
    '#007AFF', // Deep Blue
    '#5856D6', // Purple
    '#FF2D55', // Pink
    '#A2845E', // Brown
    '#00C7BE', // Teal
    '#AF52DE', // Violet
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Simple ping for latency measurement
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') callback();
  });

  // Handle user joining a room
  socket.on('join', ({ roomId, username, color }) => {
    socket.join(roomId);

    // Initialize room if it doesn't exist
    const isNewRoom = !rooms.has(roomId);
    if (isNewRoom) {
      rooms.set(roomId, {
        code: `// JavaScript - Start coding here
console.log("Hello, SyncCode!");
`,
        language: 'javascript',
        users: new Map(),
        messages: [], // Chat history storage
        hostId: socket.id, // First user becomes host
        isLocked: false,
      });
    }

    const room = rooms.get(roomId);
    // Use client's color for perfect sync, fallback to random if not provided
    const userColor = color || getRandomColor();
    const isHost = room.hostId === socket.id || isNewRoom;

    // Update hostId if this is a new room
    if (isNewRoom) {
      room.hostId = socket.id;
    }

    room.users.set(socket.id, { username, color: userColor, isHost });

    // Get list of all clients in the room
    const clients = Array.from(room.users.entries()).map(([socketId, user]) => ({
      socketId,
      username: user.username,
      color: user.color,
      isHost: socketId === room.hostId,
    }));

    // Notify all clients in the room about the new user
    io.in(roomId).emit('joined', {
      clients,
      username,
      socketId: socket.id,
      hostId: room.hostId,
      isLocked: room.isLocked,
    });

    // Send the current code, language, lock state, and chat history to the new user
    socket.emit('sync_code', {
      code: room.code,
      language: room.language,
      hostId: room.hostId,
      isLocked: room.isLocked,
      messages: room.messages, // Send chat history
    });

    console.log(`${username} joined room: ${roomId}${isNewRoom ? ' (as host)' : ''}`);
  });

  // Handle code changes
  socket.on('code_change', ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Check if room is locked and user is not host
      if (room.isLocked && socket.id !== room.hostId) {
        // Reject the change - room is locked
        socket.emit('edit_rejected', { reason: 'Room is locked. Only the host can edit.' });
        return;
      }

      room.code = code;
      // Broadcast to all other users in the room
      socket.in(roomId).emit('code_change', { code });
    }
  });

  // Handle language changes
  socket.on('language_change', ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Only host can change language when locked
      if (room.isLocked && socket.id !== room.hostId) {
        socket.emit('edit_rejected', { reason: 'Room is locked. Only the host can change settings.' });
        return;
      }

      room.language = language;
      // Broadcast to all other users in the room
      socket.in(roomId).emit('language_change', { language });
    }
  });

  // Handle cursor position updates
  socket.on('cursor_change', ({ roomId, username, color, lineNumber, column }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      // Broadcast cursor position to all other users in the room
      socket.in(roomId).emit('cursor_update', {
        socketId: socket.id,
        username: username || user.username,
        color: color || user.color,
        lineNumber,
        column,
      });
    }
  });

  // Handle chat messages with history storage
  socket.on('send_message', ({ roomId, message, username, timestamp }) => {
    const room = rooms.get(roomId);
    if (room) {
      const msgData = { username, message, timestamp, isSystem: false };

      // Store in chat history
      room.messages.push(msgData);

      // Broadcast to everyone in the room
      io.in(roomId).emit('receive_message', msgData);
    }
  });

  // NEW: Handle room lock/unlock toggle
  socket.on('toggle_lock', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Only host can toggle lock
      if (socket.id !== room.hostId) {
        socket.emit('edit_rejected', { reason: 'Only the host can lock/unlock the room.' });
        return;
      }

      room.isLocked = !room.isLocked;

      // Broadcast lock state to all users in the room
      io.in(roomId).emit('lock_changed', {
        isLocked: room.isLocked,
        lockedBy: room.users.get(socket.id)?.username || 'Host',
      });

      console.log(`Room ${roomId} ${room.isLocked ? 'locked' : 'unlocked'} by host`);
    }
  });

  // Handle disconnection
  socket.on('disconnecting', () => {
    const roomsToLeave = Array.from(socket.rooms);

    roomsToLeave.forEach((roomId) => {
      if (roomId === socket.id) return; // Skip the default room (socket's own room)

      const room = rooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        const wasHost = socket.id === room.hostId;
        room.users.delete(socket.id);

        // If host left, transfer host to next user
        if (wasHost && room.users.size > 0) {
          const nextHostId = room.users.keys().next().value;
          room.hostId = nextHostId;
          room.isLocked = false; // Unlock room when host transfers

          const newHost = room.users.get(nextHostId);

          // Notify all about new host
          io.in(roomId).emit('host_changed', {
            newHostId: nextHostId,
            newHostName: newHost.username,
            isLocked: false,
          });

          console.log(`Host transferred to ${newHost.username} in room: ${roomId}`);
        }

        // Notify others in the room
        socket.in(roomId).emit('disconnected', {
          socketId: socket.id,
          username: user.username,
        });

        console.log(`${user.username} left room: ${roomId}`);

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 SyncCode server running on http://localhost:${PORT}`);
});
