import { io, Socket } from 'socket.io-client';

// Use relative URL if VITE_WS_URL is not set (for production with tunnel)
// Otherwise use the provided URL (for local development)
const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;

console.log('[WebSocket Service] Initializing with WS_URL:', WS_URL);
console.log('[WebSocket Service] VITE_WS_URL:', import.meta.env.VITE_WS_URL);
console.log('[WebSocket Service] Window Origin:', window.location.origin);

let socket: Socket | null = null;

export function getSocket(): Socket {
  // If socket exists but is disconnected, clear it and create new one
  if (socket && !socket.connected) {
    console.log('[WebSocket Service] Socket exists but disconnected, creating new connection');
    socket.removeAllListeners();
    socket = null;
  }

  if (!socket) {
    console.log('[WebSocket Service] Creating new socket connection to:', WS_URL);
    socket = io(WS_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    socket.on('connect', () => {
      console.log('====================================');
      console.log('[WebSocket Service] ✅ CONNECTED');
      console.log('====================================');
      console.log('Socket ID:', socket?.id);
      console.log('Connected to:', WS_URL);
      console.log('Transport:', socket?.io.engine?.transport?.name);
      console.log('====================================');
    });

    socket.on('connect_error', (error) => {
      console.error('====================================');
      console.error('[WebSocket Service] ❌ CONNECTION ERROR');
      console.error('====================================');
      console.error('Error:', error);
      console.error('Error Message:', error.message);
      console.error('Attempting to connect to:', WS_URL);
      console.error('User Agent:', navigator.userAgent);
      console.error('Online Status:', navigator.onLine);
      console.error('====================================');
    });

    socket.on('disconnect', (reason) => {
      console.log('====================================');
      console.log('[WebSocket Service] ⚠️ DISCONNECTED');
      console.log('====================================');
      console.log('Reason:', reason);
      console.log('Will reconnect:', socket?.io.reconnection);
      console.log('====================================');
    });
  } else {
    console.log('[WebSocket Service] Reusing existing socket:', socket.id, 'connected:', socket.connected);
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { getSocket, disconnectSocket };
