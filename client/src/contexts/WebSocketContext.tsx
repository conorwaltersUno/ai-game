import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/websocket';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinGame: (gameCode: string, playerId?: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const pendingJoinsRef = useRef<Array<{ gameCode: string; playerId?: string }>>([]);

  useEffect(() => {
    console.log('[WebSocketContext] Initializing WebSocket connection');
    const newSocket = getSocket();
    setSocket(newSocket);

    // Check if socket is already connected
    if (newSocket.connected) {
      console.log('✅ [WebSocketContext] Socket already connected on mount');
      setConnected(true);

      // Process any pending joins immediately if already connected
      if (pendingJoinsRef.current.length > 0) {
        console.log(`🔄 [WebSocketContext] Processing ${pendingJoinsRef.current.length} pending join(s) (already connected)`);
        pendingJoinsRef.current.forEach(({ gameCode, playerId }) => {
          newSocket.emit('join-game', { gameCode, playerId });
          console.log(`🎮 [WebSocketContext] Sent queued join-game for: ${gameCode}`);
        });
        pendingJoinsRef.current = [];
      }
    }

    const handleConnect = () => {
      console.log('✅ [WebSocketContext] WebSocket connected event fired');
      setConnected(true);

      // Process any pending join requests
      if (pendingJoinsRef.current.length > 0) {
        console.log(`🔄 [WebSocketContext] Processing ${pendingJoinsRef.current.length} pending join(s)`);
        pendingJoinsRef.current.forEach(({ gameCode, playerId }) => {
          newSocket.emit('join-game', { gameCode, playerId });
          console.log(`🎮 [WebSocketContext] Sent queued join-game for: ${gameCode}`);
        });
        pendingJoinsRef.current = [];
        console.log('✅ [WebSocketContext] All pending joins processed');
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log('❌ [WebSocketContext] WebSocket disconnected:', reason);
      setConnected(false);
    };

    const handleError = (error: any) => {
      console.error('⚠️ [WebSocketContext] WebSocket error:', error);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('error', handleError);

    return () => {
      console.log('🧹 [WebSocketContext] Cleaning up socket listeners');
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('error', handleError);
      // Don't disconnect the socket - let it persist across component remounts
      // newSocket.disconnect();
    };
  }, []);

  const joinGame = (gameCode: string, playerId?: string) => {
    console.log(`[WebSocketContext] joinGame called - gameCode: ${gameCode}, playerId: ${playerId}`);
    console.log(`[WebSocketContext] socket: ${socket?.id || 'null'}, connected: ${connected}`);

    if (socket && connected) {
      console.log(`🎮 [WebSocketContext] Emitting join-game event to server`);
      socket.emit('join-game', { gameCode, playerId });
      console.log(`✅ [WebSocketContext] join-game event sent for: ${gameCode}`);
    } else {
      // Queue the join request if not connected yet
      console.log(`⏳ [WebSocketContext] WebSocket not connected yet (socket: ${!!socket}, connected: ${connected})`);
      console.log(`⏳ [WebSocketContext] Queueing join for game: ${gameCode}`);
      pendingJoinsRef.current.push({ gameCode, playerId });
      console.log(`📝 [WebSocketContext] Queue length: ${pendingJoinsRef.current.length}`);
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, connected, joinGame }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
