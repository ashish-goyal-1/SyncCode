/**
 * SyncCode Load Test Script
 * 
 * Tests WebSocket connection handling with simulated user sessions
 * Run with: node load-test.js [target] [numConnections]
 * 
 * Examples:
 *   node load-test.js local 50     # Test localhost with 50 connections
 *   node load-test.js render 20    # Test Render with 20 connections
 */

const io = require('socket.io-client');

// Configuration
const targets = {
    local: 'http://localhost:5000',
    render: 'https://synccode-server-3xzv.onrender.com'
};

const target = process.argv[2] || 'local';
const numConnections = parseInt(process.argv[3]) || 50;
const SERVER_URL = targets[target] || targets.local;

console.log(`\n🚀 SyncCode Load Test`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Target: ${target} (${SERVER_URL})`);
console.log(`Connections: ${numConnections}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Metrics
const metrics = {
    connected: 0,
    failed: 0,
    disconnected: 0,
    messagessSent: 0,
    latencies: [],
    startTime: Date.now()
};

const connections = [];
const ROOM_ID = 'load-test-room-' + Date.now();

// Random color generator
const getColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

// Create a single connection
function createConnection(index) {
    return new Promise((resolve) => {
        const username = `LoadUser_${index}`;
        const startTime = Date.now();

        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: false,
            timeout: 10000
        });

        socket.on('connect', () => {
            const latency = Date.now() - startTime;
            metrics.connected++;
            metrics.latencies.push(latency);

            // Join room
            socket.emit('join', {
                roomId: ROOM_ID,
                username: username,
                color: getColor()
            });

            connections.push(socket);
            process.stdout.write(`\r✅ Connected: ${metrics.connected}/${numConnections} | ❌ Failed: ${metrics.failed}`);
            resolve(true);
        });

        socket.on('connect_error', (err) => {
            metrics.failed++;
            process.stdout.write(`\r✅ Connected: ${metrics.connected}/${numConnections} | ❌ Failed: ${metrics.failed}`);
            resolve(false);
        });

        socket.on('disconnect', () => {
            metrics.disconnected++;
        });

        // Timeout fallback
        setTimeout(() => {
            if (!socket.connected) {
                metrics.failed++;
                socket.close();
                resolve(false);
            }
        }, 15000);
    });
}

// Simulate activity
function simulateActivity() {
    console.log(`\n\n📤 Simulating activity (cursor moves, messages)...`);

    let messageCount = 0;

    connections.forEach((socket, index) => {
        // Send cursor updates every 500ms for 10 seconds
        const interval = setInterval(() => {
            socket.emit('cursor_change', {
                roomId: ROOM_ID,
                username: `LoadUser_${index}`,
                color: getColor(),
                lineNumber: Math.floor(Math.random() * 20) + 1,
                column: Math.floor(Math.random() * 50) + 1
            });

            // Randomly send chat messages
            if (Math.random() < 0.1) {
                socket.emit('send_message', {
                    roomId: ROOM_ID,
                    message: `Test message ${messageCount++}`,
                    username: `LoadUser_${index}`,
                    timestamp: new Date().toISOString()
                });
                metrics.messagessSent++;
            }
        }, 500);

        setTimeout(() => clearInterval(interval), 10000);
    });

    return new Promise(resolve => setTimeout(resolve, 12000));
}

// Print results
function printResults() {
    const duration = (Date.now() - metrics.startTime) / 1000;
    const avgLatency = metrics.latencies.length > 0
        ? (metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length).toFixed(2)
        : 'N/A';
    const minLatency = metrics.latencies.length > 0 ? Math.min(...metrics.latencies) : 'N/A';
    const maxLatency = metrics.latencies.length > 0 ? Math.max(...metrics.latencies) : 'N/A';

    console.log(`\n\n📊 LOAD TEST RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Target:               ${target} (${SERVER_URL})`);
    console.log(`Test Duration:        ${duration.toFixed(2)}s`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Connections Attempted: ${numConnections}`);
    console.log(`✅ Successful:         ${metrics.connected}`);
    console.log(`❌ Failed:             ${metrics.failed}`);
    console.log(`🔌 Disconnected:       ${metrics.disconnected}`);
    console.log(`📤 Messages Sent:      ${metrics.messagessSent}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Connection Latency:`);
    console.log(`   Average: ${avgLatency}ms`);
    console.log(`   Min:     ${minLatency}ms`);
    console.log(`   Max:     ${maxLatency}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Success Rate: ${((metrics.connected / numConnections) * 100).toFixed(1)}%`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// Cleanup
function cleanup() {
    console.log(`\n🧹 Cleaning up connections...`);
    connections.forEach(socket => socket.close());
}

// Main
async function main() {
    console.log(`⏳ Creating ${numConnections} connections...`);

    // Create connections with slight stagger to avoid overwhelming
    const batchSize = 10;
    for (let i = 0; i < numConnections; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, numConnections); j++) {
            batch.push(createConnection(j));
        }
        await Promise.all(batch);

        // Small delay between batches
        await new Promise(r => setTimeout(r, 100));
    }

    if (metrics.connected > 0) {
        await simulateActivity();
    }

    printResults();
    cleanup();

    process.exit(0);
}

main().catch(console.error);
