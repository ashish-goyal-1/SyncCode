import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import socket from '../socket';
import Editor from '../components/Editor';
import Client from '../components/Client';
import Terminal from '../components/Terminal';
import StatusBar from '../components/StatusBar';
import { ThemeToggle, useTheme } from '../components/ThemeToggle';

// Language options for the editor
const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', version: '18.15.0', extension: 'js' },
    { id: 'python', name: 'Python', version: '3.10.0', extension: 'py' },
    { id: 'java', name: 'Java', version: '15.0.2', extension: 'java' },
    { id: 'cpp', name: 'C++', version: '10.2.0', extension: 'cpp' },
    { id: 'c', name: 'C', version: '10.2.0', extension: 'c' },
    { id: 'typescript', name: 'TypeScript', version: '5.0.3', extension: 'ts' },
    { id: 'go', name: 'Go', version: '1.16.2', extension: 'go' },
    { id: 'rust', name: 'Rust', version: '1.68.2', extension: 'rs' },
];

// Language-specific starter templates
const LANGUAGE_TEMPLATES = {
    javascript: `// JavaScript - Start coding here
console.log("Hello, SyncCode!");
`,
    python: `# Python - Start coding here
print("Hello, SyncCode!")
`,
    java: `// Java - Start coding here
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, SyncCode!");
    }
}
`,
    cpp: `// C++ - Start coding here
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, SyncCode!" << endl;
    return 0;
}
`,
    c: `// C - Start coding here
#include <stdio.h>

int main() {
    printf("Hello, SyncCode!\\n");
    return 0;
}
`,
    typescript: `// TypeScript - Start coding here
const greeting: string = "Hello, SyncCode!";
console.log(greeting);
`,
    go: `// Go - Start coding here
package main

import "fmt"

func main() {
    fmt.Println("Hello, SyncCode!")
}
`,
    rust: `// Rust - Start coding here
fn main() {
    println!("Hello, SyncCode!");
}
`,
};

function EditorPage() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const editorRef = useRef(null);
    const { theme } = useTheme();

    // State
    const [clients, setClients] = useState([]);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isError, setIsError] = useState(false);
    const [stdin, setStdin] = useState('');
    const [remoteCursors, setRemoteCursors] = useState([]);

    // Read-Only Mode state
    const [hostId, setHostId] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    // Flag to prevent infinite loops during sync
    const isRemoteUpdate = useRef(false);

    // Get username from navigation state
    const username = location.state?.username;

    // Computed: Am I the host?
    const isHost = socket.id === hostId;

    // Computed: Can I edit?
    const canEdit = !isLocked || isHost;

    // Redirect if no username
    useEffect(() => {
        if (!username) {
            toast.error('Please enter your username first');
            navigate('/');
        }
    }, [username, navigate]);

    // Socket connection and event handlers
    useEffect(() => {
        if (!username) return;

        // Connect socket
        socket.connect();

        // Join the room
        socket.emit('join', { roomId, username });

        // Handle successful join
        const handleJoined = ({ clients: roomClients, username: joinedUser, socketId, hostId: roomHostId, isLocked: roomLocked }) => {
            setClients(roomClients);
            setHostId(roomHostId);
            if (roomLocked !== undefined) setIsLocked(roomLocked);

            if (socketId !== socket.id) {
                toast.success(`${joinedUser} joined the room`);
            }
        };

        // Handle code sync (initial sync when joining)
        const handleSyncCode = ({ code: syncedCode, language: syncedLanguage, hostId: roomHostId, isLocked: roomLocked }) => {
            isRemoteUpdate.current = true;
            setCode(syncedCode);
            setLanguage(syncedLanguage);
            if (roomHostId) setHostId(roomHostId);
            if (roomLocked !== undefined) setIsLocked(roomLocked);
            setTimeout(() => {
                isRemoteUpdate.current = false;
            }, 0);
        };

        // Handle real-time code changes from others
        const handleCodeChange = ({ code: newCode }) => {
            isRemoteUpdate.current = true;
            setCode(newCode);
            setTimeout(() => {
                isRemoteUpdate.current = false;
            }, 0);
        };

        // Handle language changes from others
        const handleLanguageChange = ({ language: newLanguage }) => {
            setLanguage(newLanguage);
            toast(`Language changed to ${LANGUAGES.find(l => l.id === newLanguage)?.name || newLanguage}`, {
                icon: '🔄',
            });
        };

        // Handle remote cursor updates
        const handleCursorChange = ({ socketId, username, color, cursor }) => {
            setRemoteCursors((prev) => {
                const existing = prev.findIndex((c) => c.socketId === socketId);
                if (existing !== -1) {
                    const updated = [...prev];
                    updated[existing] = { socketId, username, color, cursor };
                    return updated;
                }
                return [...prev, { socketId, username, color, cursor }];
            });
        };

        // Handle user disconnect
        const handleDisconnected = ({ socketId, username: leftUser }) => {
            setClients((prev) => prev.filter((client) => client.socketId !== socketId));
            setRemoteCursors((prev) => prev.filter((c) => c.socketId !== socketId));
            toast(`${leftUser} left the room`, {
                icon: '👋',
            });
        };

        // Handle lock state changes
        const handleLockChanged = ({ isLocked: locked, lockedBy }) => {
            setIsLocked(locked);
            toast(locked ? `🔒 Room locked by ${lockedBy}` : `🔓 Room unlocked by ${lockedBy}`, {
                duration: 3000,
            });
        };

        // Handle host transfer
        const handleHostChanged = ({ newHostId, newHostName, isLocked: locked }) => {
            setHostId(newHostId);
            setIsLocked(locked);
            toast(`👑 ${newHostName} is now the host`, {
                duration: 4000,
            });
        };

        // Handle edit rejection (when locked)
        const handleEditRejected = ({ reason }) => {
            toast.error(reason);
        };

        // Register event listeners
        socket.on('joined', handleJoined);
        socket.on('sync_code', handleSyncCode);
        socket.on('code_change', handleCodeChange);
        socket.on('language_change', handleLanguageChange);
        socket.on('cursor_change', handleCursorChange);
        socket.on('disconnected', handleDisconnected);
        socket.on('lock_changed', handleLockChanged);
        socket.on('host_changed', handleHostChanged);
        socket.on('edit_rejected', handleEditRejected);

        // Handle connection errors
        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            toast.error('Failed to connect to server');
        });

        // Cleanup on unmount
        return () => {
            socket.off('joined', handleJoined);
            socket.off('sync_code', handleSyncCode);
            socket.off('code_change', handleCodeChange);
            socket.off('language_change', handleLanguageChange);
            socket.off('cursor_change', handleCursorChange);
            socket.off('disconnected', handleDisconnected);
            socket.off('lock_changed', handleLockChanged);
            socket.off('host_changed', handleHostChanged);
            socket.off('edit_rejected', handleEditRejected);
            socket.disconnect();
        };
    }, [roomId, username]);

    // Keyboard shortcut handler (Ctrl+Enter to run)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runCode();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [code, language, stdin]);

    // Handle local code changes
    const handleCodeChange = useCallback((newCode) => {
        if (isRemoteUpdate.current) return;
        if (!canEdit) {
            toast.error('Room is locked. Only the host can edit.');
            return;
        }
        setCode(newCode);
        socket.emit('code_change', { roomId, code: newCode });
    }, [roomId, canEdit]);

    // Handle cursor position changes
    const handleCursorChange = useCallback((cursor) => {
        socket.emit('cursor_change', { roomId, cursor });
    }, [roomId]);

    // Handle language change
    const handleLanguageChange = (e) => {
        if (!canEdit) {
            toast.error('Room is locked. Only the host can change settings.');
            return;
        }
        const newLanguage = e.target.value;
        const newCode = LANGUAGE_TEMPLATES[newLanguage] || '';

        setLanguage(newLanguage);
        setCode(newCode);

        // Emit both language and code change
        socket.emit('language_change', { roomId, language: newLanguage });
        socket.emit('code_change', { roomId, code: newCode });
    };

    // Toggle room lock (host only)
    const toggleLock = () => {
        if (!isHost) {
            toast.error('Only the host can lock/unlock the room');
            return;
        }
        socket.emit('toggle_lock', { roomId });
    };

    // Copy room ID to clipboard
    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard!');
        } catch (err) {
            toast.error('Failed to copy Room ID');
        }
    };

    // Download code as file
    const downloadCode = () => {
        const langConfig = LANGUAGES.find((l) => l.id === language);
        const extension = langConfig?.extension || 'txt';
        const filename = `synccode.${extension}`;

        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Downloaded ${filename}`);
    };

    // Run code using Piston API
    const runCode = async () => {
        if (!code.trim()) {
            toast.error('Please write some code first');
            return;
        }

        setIsRunning(true);
        setOutput('');
        setIsError(false);

        try {
            const langConfig = LANGUAGES.find((l) => l.id === language);

            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: language,
                    version: langConfig?.version || '*',
                    files: [
                        {
                            content: code,
                        },
                    ],
                    stdin: stdin,
                }),
            });

            const data = await response.json();

            if (data.run) {
                const result = data.run.stdout || data.run.stderr || 'No output';
                const hasError = data.run.stderr && data.run.stderr.length > 0;

                setOutput(hasError ? data.run.stderr : result);
                setIsError(hasError);
            } else if (data.message) {
                setOutput(data.message);
                setIsError(true);
            }
        } catch (error) {
            console.error('Execution error:', error);
            setOutput('Failed to execute code. Please try again.');
            setIsError(true);
        } finally {
            setIsRunning(false);
        }
    };

    // Leave room
    const leaveRoom = () => {
        navigate('/');
    };

    if (!username) {
        return null;
    }

    return (
        <div className="h-screen flex flex-col bg-dark-900">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-dark-800 border-b border-dark-600">
                {/* Left section - Logo + Lock Status */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold gradient-text">SyncCode</span>

                    {/* Lock Status Badge */}
                    {isLocked && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Read-Only
                        </span>
                    )}

                    {/* Host Badge */}
                    {isHost && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs rounded-full">
                            👑 Host
                        </span>
                    )}
                </div>

                {/* Center section - Language selector, stdin, & Run button */}
                <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        disabled={!canEdit}
                        className={`bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-accent-blue ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.id} value={lang.id}>
                                {lang.name}
                            </option>
                        ))}
                    </select>

                    {/* Stdin Input */}
                    <div className="relative">
                        <input
                            type="text"
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            placeholder="stdin input"
                            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-accent-blue w-40 placeholder-gray-500"
                            title="Enter input for programs that use input() or scanf()"
                        />
                    </div>

                    {/* Run Code Button */}
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Run Code (Ctrl+Enter)"
                    >
                        {isRunning ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Running...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Run
                                <span className="text-xs opacity-70 ml-1 hidden sm:inline">(Ctrl+↵)</span>
                            </>
                        )}
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={downloadCode}
                        className="btn-secondary flex items-center gap-2 text-sm"
                        title="Download Code"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </button>
                </div>

                {/* Right section - Lock Toggle, Room ID, Theme & Leave */}
                <div className="flex items-center gap-3">
                    {/* Lock/Unlock Toggle (Host Only) */}
                    {isHost && (
                        <button
                            onClick={toggleLock}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${isLocked
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600'
                                }`}
                            title={isLocked ? 'Unlock room (allow editing)' : 'Lock room (read-only for others)'}
                        >
                            {isLocked ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Unlock
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    Lock
                                </>
                            )}
                        </button>
                    )}

                    {/* Copy Room ID */}
                    <button
                        onClick={copyRoomId}
                        className="btn-secondary flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Room ID
                    </button>

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Leave Room */}
                    <button
                        onClick={leaveRoom}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Leave
                    </button>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor area */}
                <div className="flex-1 flex flex-col">
                    {/* Monaco Editor */}
                    <div className="flex-1 min-h-0 relative">
                        {/* Read-only overlay indicator */}
                        {!canEdit && (
                            <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/90 text-black text-xs font-medium rounded-full shadow-lg">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                View Only
                            </div>
                        )}
                        <Editor
                            value={code}
                            onChange={handleCodeChange}
                            language={language}
                            editorRef={editorRef}
                            remoteCursors={remoteCursors}
                            onCursorChange={handleCursorChange}
                            theme={theme}
                            readOnly={!canEdit}
                        />
                    </div>

                    {/* Terminal */}
                    <div className="h-48 border-t border-dark-600">
                        <Terminal output={output} isLoading={isRunning} isError={isError} />
                    </div>
                </div>

                {/* Sidebar - Connected users */}
                <div className="w-56 bg-dark-800 border-l border-dark-600 flex flex-col">
                    <div className="p-4 border-b border-dark-600">
                        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></span>
                            Connected ({clients.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                                color={client.color}
                                isHost={client.socketId === hostId}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Status Bar - Footer with branding */}
            <StatusBar
                language={LANGUAGES.find(l => l.id === language)?.name || language}
                isConnected={clients.length > 0}
                usersCount={clients.length}
            />
        </div>
    );
}

export default EditorPage;
