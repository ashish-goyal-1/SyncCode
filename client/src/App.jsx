import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';

function App() {
    // Console Easter Egg - Developer branding
    useEffect(() => {
        console.log(
            '%c🚀 SyncCode',
            'color: #007ACC; font-size: 24px; font-weight: bold;'
        );
        console.log(
            '%cBuilt with ❤️ by Ashish Goyal',
            'color: #00ff00; font-size: 14px;'
        );
        console.log(
            '%cGitHub: https://github.com/ashish-goyal-1',
            'color: #888; font-size: 12px;'
        );
        console.log(
            '%cLinkedIn: https://www.linkedin.com/in/ashish-goyal-66422b257/',
            'color: #888; font-size: 12px;'
        );
    }, []);

    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor/:roomId" element={<EditorPage />} />
        </Routes>
    );
}

export default App;
