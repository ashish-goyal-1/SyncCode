import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

/**
 * Editor component - Monaco Editor wrapper for real-time collaboration
 * with remote cursor presence support, theme switching, and read-only mode
 */
function Editor({ value, onChange, language, editorRef, remoteCursors, onCursorChange, theme = 'dark', readOnly = false }) {
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]);
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Map our theme to Monaco themes
    const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

    const handleEditorMount = (editor, monaco) => {
        if (editorRef) {
            editorRef.current = editor;
        }
        monacoRef.current = monaco;
        setIsEditorReady(true);
        editor.focus();

        // Listen for cursor position changes
        editor.onDidChangeCursorPosition((e) => {
            if (onCursorChange) {
                onCursorChange({
                    lineNumber: e.position.lineNumber,
                    column: e.position.column,
                });
            }
        });
    };

    const handleChange = (newValue) => {
        if (onChange) {
            onChange(newValue);
        }
    };

    // Update remote cursor decorations
    useEffect(() => {
        if (!isEditorReady || !editorRef?.current || !monacoRef.current) return;

        const editor = editorRef.current;
        const monaco = monacoRef.current;

        // Clear previous decorations
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

        if (!remoteCursors || remoteCursors.length === 0) return;

        // Create new decorations for each remote cursor
        const newDecorations = remoteCursors.map((cursor) => {
            const cursorClassName = `remote-cursor-${cursor.socketId.replace(/[^a-zA-Z0-9]/g, '')}`;

            const styleId = `cursor-style-${cursor.socketId}`;
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
        .${cursorClassName} {
          background-color: ${cursor.color} !important;
          width: 2px !important;
          margin-left: -1px;
        }
        .${cursorClassName}-label {
          background-color: ${cursor.color} !important;
          color: white !important;
          padding: 1px 6px !important;
          border-radius: 3px 3px 3px 0 !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          position: relative !important;
          top: -18px !important;
          white-space: nowrap !important;
          z-index: 100 !important;
        }
      `;

            return {
                range: new monaco.Range(
                    cursor.cursor.lineNumber,
                    cursor.cursor.column,
                    cursor.cursor.lineNumber,
                    cursor.cursor.column
                ),
                options: {
                    className: cursorClassName,
                    beforeContentClassName: `${cursorClassName}-label`,
                    before: {
                        content: cursor.username,
                        inlineClassName: `${cursorClassName}-label`,
                    },
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                },
            };
        });

        decorationsRef.current = editor.deltaDecorations([], newDecorations);

        return () => {
            remoteCursors.forEach((cursor) => {
                const styleEl = document.getElementById(`cursor-style-${cursor.socketId}`);
                if (styleEl) {
                    styleEl.remove();
                }
            });
        };
    }, [remoteCursors, isEditorReady]);

    return (
        <div className="h-full w-full">
            <MonacoEditor
                height="100%"
                language={language}
                value={value}
                theme={monacoTheme}
                onChange={handleChange}
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
