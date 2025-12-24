/**
 * Client component - displays user avatar with initials and host indicator
 */
function Client({ username, color, isHost = false }) {
    // Get initials from username (up to 2 characters)
    const getInitials = (name) => {
        if (!name) return '?';
        const words = name.trim().split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            {/* Avatar */}
            <div className="relative">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg"
                    style={{ backgroundColor: color }}
                >
                    {getInitials(username)}
                </div>
                {/* Host Crown */}
                {isHost && (
                    <span className="absolute -top-1 -right-1 text-xs" title="Room Host">
                        👑
                    </span>
                )}
            </div>

            {/* Username */}
            <div className="flex flex-col min-w-0">
                <span className="text-gray-800 dark:text-gray-300 text-sm font-medium truncate">
                    {username}
                </span>
                {isHost && (
                    <span className="text-purple-700 dark:text-accent-purple text-xs">Host</span>
                )}
            </div>
        </div>
    );
}

export default Client;
