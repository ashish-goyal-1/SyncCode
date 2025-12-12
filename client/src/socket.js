import { io } from 'socket.io-client';

// Use environment variable or default to localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// Create a singleton socket instance
export const socket = io(SERVER_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

export default socket;
