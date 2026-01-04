import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

function Home() {
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const usernameInputRef = useRef(null);

    // Auto-fill Room ID if redirected from invite link
    useEffect(() => {
        if (location.state?.roomId) {
            setRoomId(location.state.roomId);
            // Auto-focus username field since Room ID is already filled
            setTimeout(() => usernameInputRef.current?.focus(), 100);
        }
    }, [location.state]);

    const generateRoomId = () => {
        const newRoomId = uuidv4();
        setRoomId(newRoomId);
        toast.success('New Room ID generated!');
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();

        if (!roomId.trim()) {
            toast.error('Please enter a Room ID');
            return;
        }

        if (!username.trim()) {
            toast.error('Please enter your username');
            return;
        }

        // Navigate to editor with username as state
        navigate(`/editor/${roomId}`, { state: { username: username.trim() } });
    };


    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl"></div>
            </div>

            {/* Main content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-blue to-accent-purple rounded-xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold gradient-text">SyncCode</h1>
                    </div>
                    <p className="text-gray-400">Real-time collaborative code editor</p>
                </div>

                {/* Card */}
                <div className="card">
                    <form onSubmit={handleJoinRoom}>
                        {/* Room ID Input */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Room ID
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="Enter room ID or generate new"
                                    className="input-dark flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={generateRoomId}
                                    className="btn-secondary whitespace-nowrap"
                                >
                                    New
                                </button>
                            </div>
                        </div>

                        {/* Username Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                ref={usernameInputRef}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your name"
                                className="input-dark w-full"
                                maxLength={20}
                            />
                        </div>

                        {/* Join Button */}
                        <button type="submit" className="btn-primary w-full py-3 text-lg">
                            Join Room
                        </button>
                    </form>

                    {/* Footer text */}
                    <p className="text-center text-gray-500 text-sm mt-6">
                        Share the Room ID with others to collaborate
                    </p>
                </div>

                {/* Credits */}
                <p className="text-center text-gray-600 text-xs mt-8">
                    Built with ❤️ using React, Monaco Editor & Socket.io
                </p>
            </div>
        </div>
    );
}

export default Home;
