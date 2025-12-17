import { useState } from 'react';

/**
 * Terminal component - Tabbed console with Output and Input views
 * Professional IDE-style layout with execution stats and clear button
 */
function Terminal({ output, stdin, setStdin, isLoading, isError, onClear, executionTime }) {
    const [activeTab, setActiveTab] = useState('output');

    return (
        <div className="h-full flex flex-col bg-dark-900 rounded-lg overflow-hidden border border-dark-600">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-0 bg-dark-800 border-b border-dark-600 min-h-[40px]">
                <div className="flex items-center gap-4 h-full">
                    {/* Traffic lights */}
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>

                    {/* Tabs */}
                    <div className="flex h-full">
                        <button
                            onClick={() => setActiveTab('output')}
                            className={`px-4 text-sm font-medium h-full border-b-2 transition-colors ${activeTab === 'output'
                                    ? 'border-accent-blue text-white bg-dark-700/50'
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            Output
                        </button>
                        <button
                            onClick={() => setActiveTab('input')}
                            className={`px-4 text-sm font-medium h-full border-b-2 transition-colors ${activeTab === 'input'
                                    ? 'border-accent-blue text-white bg-dark-700/50'
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            Input (stdin)
                        </button>
                    </div>
                </div>

                {/* Right Actions: Loading, Time, Clear */}
                <div className="flex items-center gap-4">
                    {isLoading && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-gray-400 text-xs">Running...</span>
                        </div>
                    )}

                    {/* Execution Time Badge */}
                    {!isLoading && executionTime > 0 && (
                        <span className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
                            ⚡ {executionTime}ms
                        </span>
                    )}

                    {/* Clear Button */}
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Clear Console"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto terminal font-mono text-sm">
                {activeTab === 'output' ? (
                    <div className="h-full">
                        {isLoading ? (
                            <div className="text-gray-400 animate-pulse">Running code...</div>
                        ) : output ? (
                            <pre className={`whitespace-pre-wrap ${isError ? 'text-red-400' : 'text-green-400'}`}>
                                {output}
                            </pre>
                        ) : (
                            <div className="text-gray-500 italic">
                                Click "Run" to execute and see output here...
                            </div>
                        )}
                    </div>
                ) : (
                    <textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        placeholder="Enter input here (e.g., for scanner/cin)...&#10;&#10;Example:&#10;5&#10;1 2 3 4 5"
                        className="w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none placeholder-gray-600 font-mono"
                        spellCheck="false"
                    />
                )}
            </div>
        </div>
    );
}

export default Terminal;
