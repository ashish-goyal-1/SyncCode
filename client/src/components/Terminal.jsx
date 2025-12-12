/**
 * Terminal component - displays code execution output
 */
function Terminal({ output, isLoading, isError }) {
    return (
        <div className="h-full flex flex-col bg-dark-900 rounded-lg overflow-hidden border border-dark-600">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 border-b border-dark-600">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">Output</span>
                {isLoading && (
                    <div className="ml-auto flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-400 text-xs">Running...</span>
                    </div>
                )}
            </div>

            {/* Output content */}
            <div className="flex-1 p-4 overflow-auto terminal">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                        <span>Executing code...</span>
                    </div>
                ) : output ? (
                    <pre className={`whitespace-pre-wrap ${isError ? 'text-red-400' : 'text-green-400'}`}>
                        {output}
                    </pre>
                ) : (
                    <span className="text-gray-500 italic">
                        Click "Run Code" to execute and see output here...
                    </span>
                )}
            </div>
        </div>
    );
}

export default Terminal;
