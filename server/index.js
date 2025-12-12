const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// Environment variables with defaults
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// In-memory storage for rooms
// roomId -> { code, language, users, hostId, isLocked }
const rooms = new Map();

// Generate a random color for user avatars
const getRandomColor = () => {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
    '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#EC4899', '#F43F5E',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining a room
  socket.on('join', ({ roomId, username }) => {
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
        hostId: socket.id, // First user becomes host
        isLocked: false,
      });
    }

    const room = rooms.get(roomId);
    const userColor = getRandomColor();
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

    // Send the current code, language, and lock state to the new user
    socket.emit('sync_code', {
      code: room.code,
      language: room.language,
      hostId: room.hostId,
      isLocked: room.isLocked,
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
  socket.on('cursor_change', ({ roomId, cursor }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      // Broadcast cursor position to all other users in the room
      socket.in(roomId).emit('cursor_change', {
        socketId: socket.id,
        username: user.username,
        color: user.color,
        cursor, // { lineNumber, column }
      });
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
