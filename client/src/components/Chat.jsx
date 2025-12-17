import { useState, useEffect, useRef } from 'react';

/**
 * Chat component - Real-time room chat
 * Allows users in the same room to communicate
 */
const Chat = ({ messages, sendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark-800">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-gray-500 text-center text-sm mt-4 italic">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.isLocal
                                    ? 'bg-accent-blue text-white rounded-br-none'
                                    : 'bg-dark-700 text-gray-200 rounded-bl-none'
                                }`}>
                                {!msg.isLocal && (
                                    <span className="text-[10px] text-accent-blue block mb-1 font-bold">
                                        {msg.username}
                                    </span>
                                )}
                                {msg.message}
                            </div>
                            <span className="text-[10px] text-gray-500 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-dark-900 border-t border-dark-600">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue placeholder-gray-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-accent-blue text-white rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
