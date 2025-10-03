import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

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
    });

    socket.on('connect', () => {
      console.log('[WebSocket Service] ✅ Connected with ID:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket Service] ❌ Connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket Service] ⚠️ Disconnected:', reason);
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
