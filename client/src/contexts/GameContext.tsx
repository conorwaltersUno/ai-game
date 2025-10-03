import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Game, Player } from '@shared/types';
import { useWebSocket } from './WebSocketContext';

interface GameContextType {
  game: Game | null;
  player: Player | null;
  setGame: (game: Game | null) => void;
  setPlayer: (player: Player | null) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for game state updates
    socket.on('game:state', ({ game: updatedGame }: { game: Game }) => {
      console.log('📡 Received game state:', updatedGame);
      setGame(updatedGame);
    });

    socket.on('game:updated', ({ game: updatedGame }: { game: Game }) => {
      console.log('📡 Game updated:', updatedGame);
      setGame(updatedGame);
    });

    socket.on('player:joined', ({ player: newPlayer }: { player: Player }) => {
      console.log('👤 Player joined:', newPlayer);
      // Game state will be updated via game:updated event
    });

    return () => {
      socket.off('game:state');
      socket.off('game:updated');
      socket.off('player:joined');
    };
  }, [socket]);

  return (
    <GameContext.Provider value={{ game, player, setGame, setPlayer }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
