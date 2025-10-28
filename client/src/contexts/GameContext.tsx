import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  const gameCodeRef = useRef<string | null>(null);

  // Keep gameCodeRef in sync with current game
  useEffect(() => {
    gameCodeRef.current = game?.code || null;
  }, [game?.code]);

  useEffect(() => {
    if (!socket) {
      console.log('⚠️ GameContext: No socket available yet');
      return;
    }

    console.log('🔌 GameContext: Setting up WebSocket listeners on socket:', socket.id);

    // Listen for game state updates
    const handleGameState = ({ game: updatedGame }: { game: Game }) => {
      console.log('📡 [GameContext] Received game:state event');
      console.log('   Current players:', game?.players?.length || 0);
      console.log('   Updated players:', updatedGame.players?.length || 0);
      setGame(updatedGame);
      console.log('✅ [GameContext] State updated after game:state');
    };

    const handleGameUpdated = ({ game: updatedGame }: { game: Game }) => {
      console.log('📡 [GameContext] Received game:updated event');
      console.log('   Current status:', game?.status || 'none');
      console.log('   Updated status:', updatedGame.status);
      console.log('   Current players:', game?.players?.length || 0);
      console.log('   Updated players:', updatedGame.players?.length || 0);
      console.log('   Current round:', game?.currentRound || 'none');
      console.log('   Updated round:', updatedGame.currentRound || 'none');

      // Force a new object reference to ensure React detects the change
      setGame({ ...updatedGame });
      console.log('✅ [GameContext] State updated after game:updated');
    };

    const handlePlayerJoined = (data: any) => {
      console.log('👤 [GameContext] Received player:joined event:', data);
      // Note: player:joined can come in two formats from server
      // 1. { player: Player } from broadcastPlayerJoined
      // 2. { socketId, playerId, timestamp } from join-game handler

      // Request fresh game state to ensure we have the latest player list
      if (gameCodeRef.current) {
        console.log('🔄 [GameContext] Requesting fresh game state after player joined');
        socket.emit('request:game-state', { gameCode: gameCodeRef.current });
      }
    };

    const handleJoinedGame = (data: any) => {
      console.log('✅ [GameContext] Received joined-game confirmation:', data);
    };

    socket.on('game:state', handleGameState);
    socket.on('game:updated', handleGameUpdated);
    socket.on('player:joined', handlePlayerJoined);
    socket.on('joined-game', handleJoinedGame);

    console.log('✅ [GameContext] All listeners registered');

    return () => {
      console.log('🧹 [GameContext] Cleaning up listeners');
      socket.off('game:state', handleGameState);
      socket.off('game:updated', handleGameUpdated);
      socket.off('player:joined', handlePlayerJoined);
      socket.off('joined-game', handleJoinedGame);
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
