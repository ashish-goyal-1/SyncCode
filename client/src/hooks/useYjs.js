import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

/**
 * Custom hook for Yjs document and WebSocket provider management
 * Handles real-time CRDT sync for collaborative editing
 * 
 * @param {string} roomId - The room identifier
 * @param {string} username - Current user's display name
 * @param {string} userColor - Color for cursor presence
 * @returns {Object} { yDoc, yText, provider, awareness, isConnected }
 */
export function useYjs(roomId, username, userColor) {
    const [isConnected, setIsConnected] = useState(false);
    const yDocRef = useRef(null);
    const providerRef = useRef(null);
    const yTextRef = useRef(null);

    useEffect(() => {
        if (!roomId || !username) return;

        // Create Yjs document
        const yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        // Get shared text type - this is what syncs between users
        const yText = yDoc.getText('monaco');
        yTextRef.current = yText;

        // Determine WebSocket URL for Yjs
        // Uses same server but different path (/yjs)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

        // Convert http(s) URL to ws(s) and append /yjs path
        const baseUrl = serverUrl.replace(/^https?:/, wsProtocol);
        const wsUrl = `${baseUrl}/yjs`;

        // Create WebSocket provider
        // The provider connects to wsUrl and uses roomId as the document name
        const provider = new WebsocketProvider(
            wsUrl,
            roomId, // Room/document name
            yDoc,
            { connect: true }
        );
        providerRef.current = provider;

        // Set up awareness (cursor presence)
        const awareness = provider.awareness;
        awareness.setLocalStateField('user', {
            username: username,  // Must match what Editor.jsx expects
            color: userColor || '#3B82F6',
        });

        // Handle connection status
        provider.on('status', ({ status }) => {
            setIsConnected(status === 'connected');
        });

        // Cleanup on unmount
        return () => {
            awareness.setLocalState(null);
            provider.disconnect();
            provider.destroy();
            yDoc.destroy();
        };
    }, [roomId, username, userColor]);

    return {
        yDoc: yDocRef.current,
        yText: yTextRef.current,
        provider: providerRef.current,
        awareness: providerRef.current?.awareness,
        isConnected,
    };
}

export default useYjs;
