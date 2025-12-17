import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

/**
 * Editor component - Monaco Editor wrapper for real-time collaboration
 * Uses Yjs for CRDT-based conflict-free sync with y-monaco binding
 * y-monaco handles cursor presence via Yjs Awareness protocol
 * 
 * Props:
 * - yText: Yjs Y.Text shared type for code content
 * - awareness: Yjs awareness instance for cursor presence
 * - language: Programming language for syntax highlighting
 * - theme: 'dark' or 'light'
 * - readOnly: Whether editor is in read-only mode
 * - onEditorReady: Callback when Monaco editor is mounted
 */
function Editor({
    yText,
    awareness,
    language,
    theme = 'dark',
    readOnly = false,
    onEditorReady,
}) {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const bindingRef = useRef(null);
    const decorationsRef = useRef([]);
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Map our theme to Monaco themes
    const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        setIsEditorReady(true);
        editor.focus();

        // Notify parent that editor is ready
        if (onEditorReady) {
            onEditorReady(editor);
        }
    };

    // Set up Yjs Monaco binding and custom cursor rendering
    useEffect(() => {
        if (!isEditorReady || !editorRef.current || !yText || !awareness) {
            return;
        }

        const editor = editorRef.current;
        const model = editor.getModel();
        const monaco = monacoRef.current; // Need monaco instance for Ranges

        if (!model) return;

        // Create Monaco binding for CRDT sync
        // We pass awareness to let it handle local cursor -> remote state sync (standard behavior)
        const binding = new MonacoBinding(
            yText,
            model,
            new Set([editor]),
            awareness
        );

        bindingRef.current = binding;

        // --- Custom Gutter Cursor Logic ---
        // We broadcast an explicit 'lineNumber' to ensure we can render the exact visual the user wants (Screenshot 2).
        // We use a separate field 'customCursor' to avoid interfering with y-monaco's internal 'selection' state.

        // 1. Listen for local cursor moves -> broadcast 'customCursor' state
        const localCursorListener = editor.onDidChangeCursorPosition((e) => {
            // Use setLocalStateField to safely update only our field
            awareness.setLocalStateField('customCursor', {
                lineNumber: e.position.lineNumber,
                column: e.position.column
            });
        });

        // 2. Listen for awareness changes -> render MODERN CURSORS (Caret + Name Flag + Gutter)
        const awarenessListener = () => {
            const states = Array.from(awareness.getStates().entries());
            const newDecorations = [];

            states.forEach(([clientId, state]) => {
                // Ignore our own cursor and clients without data
                if (clientId === awareness.clientID || !state.user) return;

                const { username, color } = state.user;
                if (!username) return;

                const cursorColor = color || '#f59e0b';

                // Fallback: try 'customCursor' first, then 'cursor'
                const cursorData = state.customCursor || state.cursor;
                if (!cursorData || !cursorData.lineNumber) return;

                const { lineNumber, column } = cursorData;
                const safeUsername = username.replace(/[^a-zA-Z0-9]/g, '') || 'user';
                const cursorClassName = `remote-cursor-${clientId}-${safeUsername}`;

                // Helper for text contrast
                const isLightColor = (hex) => {
                    const c = hex.replace('#', '');
                    const r = parseInt(c.substr(0, 2), 16);
                    const g = parseInt(c.substr(2, 2), 16);
                    const b = parseInt(c.substr(4, 2), 16);
                    return ((r * 299) + (g * 587) + (b * 114)) / 1000 > 155;
                };
                const textColor = isLightColor(cursorColor) ? '#000' : '#fff';

                // --- DYNAMIC CSS GENERATION ---
                // We add '-v5' to ensure the browser loads new styles
                const styleId = `cursor-style-${cursorClassName}-v5`;
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.innerHTML = `
                        /* 1. Gutter Bar */
                        .${cursorClassName}-gutter {
                            background-color: ${cursorColor} !important;
                            width: 4px !important;
                            margin-left: 2px;
                            border-radius: 2px;
                        }
                        
                        /* 2. Modern Caret (Zero-Layout / Overlay Mode) */
                        .${cursorClassName}-caret {
                            position: absolute;
                            top: 0;
                            height: 100%;
                            border-left: 2px solid ${cursorColor} !important;
                            background-color: transparent !important;
                            
                            /* Hitbox for hovering (Invisible) */
                            outline: 4px solid transparent !important;
                            
                            /* Reset layout properties so it takes 0 physical space */
                            margin: 0 !important; 
                            padding: 0 !important;
                            width: 0 !important;
                            
                            animation: cursor-blink-${clientId} 1.2s ease-in-out infinite;
                            pointer-events: auto;
                        }
                        
                        /* 3. Name Flag (polished positioning) */
                        .${cursorClassName}-name::before {
                            content: "${username}";
                            position: absolute;
                            top: -20px;
                            left: -2px;
                            background-color: ${cursorColor};
                            color: ${textColor};
                            font-size: 10px;
                            font-weight: bold;
                            padding: 2px 6px;
                            border-radius: 4px;
                            white-space: nowrap;
                            pointer-events: none;
                            z-index: 100;
                            font-family: 'Inter', sans-serif;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            
                            /* Animation */
                            opacity: 0; 
                            transform: translateY(5px);
                            transition: all 0.2s ease;
                        }

                        /* Show name on hover */
                        .${cursorClassName}-caret:hover ~ .${cursorClassName}-name::before,
                        .${cursorClassName}-name:hover::before {
                            opacity: 1;
                            transform: translateY(0);
                        }
                        
                        @keyframes cursor-blink-${clientId} {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.5; }
                        }
                    `;
                    document.head.appendChild(style);
                }

                // --- DECORATIONS ---
                newDecorations.push({
                    range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: { isWholeLine: true, linesDecorationsClassName: `${cursorClassName}-gutter` }
                });

                newDecorations.push({
                    range: new monaco.Range(lineNumber, column || 1, lineNumber, column || 1),
                    options: { beforeContentClassName: `${cursorClassName}-caret`, stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }
                });

                newDecorations.push({
                    range: new monaco.Range(lineNumber, column || 1, lineNumber, column || 1),
                    options: { beforeContentClassName: `${cursorClassName}-name`, zIndex: 100 }
                });
            });

            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
        };

        awareness.on('change', awarenessListener);

        // Initial render check
        awarenessListener();

        return () => {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
            localCursorListener.dispose();
            awareness.off('change', awarenessListener);
            // Clear decorations on unmount
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        };
    }, [isEditorReady, yText, awareness]);

    // Handle readOnly changes
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({ readOnly });
        }
    }, [readOnly]);

    return (
        <div className="h-full w-full">
            <MonacoEditor
                height="100%"
                language={language}
                theme={monacoTheme}
                onMount={handleEditorMount}
                options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    cursorStyle: 'line',
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 16 },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    renderLineHighlight: 'all',
                    formatOnPaste: true,
                    formatOnType: true,
                    readOnly: readOnly,
                }}
            />
        </div>
    );
}

export default Editor;
