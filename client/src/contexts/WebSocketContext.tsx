import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    const newSocket = getSocket();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('error', (error: any) => {
      console.error('⚠️ WebSocket error:', error);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinGame = (gameCode: string, playerId?: string) => {
    if (socket && connected) {
      socket.emit('join-game', { gameCode, playerId });
      console.log(`🎮 Joining game: ${gameCode}`);
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
