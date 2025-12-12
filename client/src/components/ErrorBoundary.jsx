import React from 'react';

/**
 * Error Boundary component to catch React errors gracefully
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen flex items-center justify-center bg-dark-900">
                    <div className="text-center p-8 max-w-md">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-100 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-400 mb-6">
                            The editor encountered an unexpected error. Don&apos;t worry, your code might still be saved in the room.
                        </p>

                        {/* Error details (collapsed) */}
                        {this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
                                    View error details
                                </summary>
                                <pre className="mt-2 p-3 bg-dark-800 rounded-lg text-red-400 text-xs overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="btn-primary"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="btn-secondary"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
