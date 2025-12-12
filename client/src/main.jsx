import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeToggle';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <ErrorBoundary>
                <BrowserRouter>
                    <App />
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#21262d',
                                color: '#c9d1d9',
                                border: '1px solid #30363d',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#3fb950',
                                    secondary: '#0d1117',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#f85149',
                                    secondary: '#0d1117',
                                },
                            },
                        }}
                    />
                </BrowserRouter>
            </ErrorBoundary>
        </ThemeProvider>
    </React.StrictMode>
);
