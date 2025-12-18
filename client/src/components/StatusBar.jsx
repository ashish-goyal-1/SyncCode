/**
 * StatusBar component - Subtle dark footer with connection status and branding
 */
function StatusBar({ language, isConnected, usersCount, latency }) {
    // Color code latency: green < 80ms, yellow < 200ms, red >= 200ms
    const getLatencyColor = (ms) => {
        if (ms < 80) return 'text-green-400';
        if (ms < 200) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="h-8 bg-gray-100 dark:bg-dark-800 border-t border-gray-200 dark:border-dark-600 flex items-center justify-between px-4 select-none transition-colors duration-200">
            {/* Left: Connection Status (Subtle) */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                    <span className={`text-xs font-medium ${isConnected ? 'text-gray-600 dark:text-gray-300' : 'text-red-500 dark:text-red-400'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                {/* Latency indicator */}
                {isConnected && latency > -1 && (
                    <div className={`flex items-center gap-1 ${getLatencyColor(latency)}`}>
                        <span className="text-xs">⚡</span>
                        <span className="text-xs font-mono">{latency}ms</span>
                    </div>
                )}

                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-xs">{usersCount} online</span>
                </div>
            </div>

            {/* Right: Language & Branding */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 uppercase">{language}</span>
                <span className="text-gray-300 dark:text-dark-500">|</span>
                <span className="text-xs text-gray-500 dark:text-gray-600">Built with ❤️ by Ashish Goyal</span>
                <a
                    href="https://github.com/ashish-goyal-1"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    title="GitHub"
                >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                </a>
                <a
                    href="https://www.linkedin.com/in/ashish-goyal-66422b257/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    title="LinkedIn"
                >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                </a>
            </div>
        </div>
    );
}

export default StatusBar;

