import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

/**
 * Editor component - Monaco Editor wrapper for real-time collaboration
 * Now uses Yjs for CRDT-based conflict-free sync with y-monaco binding
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
    onEditorReady
}) {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const bindingRef = useRef(null);
    const [isEditorReady, setIsEditorReady] = useState(false);

    // Map our theme to Monaco themes
    const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        setIsEditorReady(true);
        editor.focus();

        // Notify parent that editor is ready (for ref access if needed)
        if (onEditorReady) {
            onEditorReady(editor);
        }
    };

    // Set up Yjs Monaco binding when both editor and yText are ready
    useEffect(() => {
        if (!isEditorReady || !editorRef.current || !yText) {
            return;
        }

        const editor = editorRef.current;
        const model = editor.getModel();

        if (!model) return;

        // Create Monaco binding - this is the magic!
        // It syncs the Y.Text with Monaco's model automatically
        const binding = new MonacoBinding(
            yText,
            model,
            new Set([editor]),
            awareness || null
        );

        bindingRef.current = binding;

        // Cleanup binding on unmount or when yText changes
        return () => {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
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
