const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const WebSocket = require('ws');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
require('dotenv').config();

const app = express();
app.use(cors());

// Environment variables with defaults
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

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

// Store Yjs documents and awareness per room
const docs = new Map();

const getYDoc = (docName) => {
  if (!docs.has(docName)) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    docs.set(docName, { doc, awareness, clients: new Set() });
  }
  return docs.get(docName);
};

// Message types from y-websocket protocol
const messageSync = 0;
const messageAwareness = 1;

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  if (request.url && request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Set up Yjs WebSocket connections with proper protocol handling
wss.on('connection', (ws, request) => {
  const docName = request.url?.replace('/yjs/', '') || 'default';
  console.log(`Yjs client connected to room: ${docName}`);

  const { doc, awareness, clients } = getYDoc(docName);
  clients.add(ws);

  // Send initial sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));

  // Send current awareness states
  const awarenessEncoder = encoding.createEncoder();
  encoding.writeVarUint(awarenessEncoder, messageAwareness);
  encoding.writeVarUint8Array(awarenessEncoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())));
  ws.send(encoding.toUint8Array(awarenessEncoder));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = new Uint8Array(message);
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        // Handle sync message
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null);

        if (encoding.length(encoder) > 1) {
          // Send response back to this client
          ws.send(encoding.toUint8Array(encoder));
        }

        // Broadcast updates to other clients
        if (syncMessageType === syncProtocol.messageYjsUpdate || syncMessageType === syncProtocol.messageYjsSyncStep2) {
          clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      } else if (messageType === messageAwareness) {
        // Handle awareness message
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);

        // Broadcast awareness to other clients
        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    } catch (err) {
      console.error('Error processing message:', err.message);
    }
  });

  // Cleanup on disconnect
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Yjs client disconnected from room: ${docName}`);

    // Clean up awareness for this client
    awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);

    // Clean up empty rooms after 5 minutes
    if (clients.size === 0) {
      setTimeout(() => {
        const room = docs.get(docName);
        if (room && room.clients.size === 0) {
          docs.delete(docName);
          console.log(`Yjs room ${docName} cleaned up`);
        }
      }, 5 * 60 * 1000);
    }
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
