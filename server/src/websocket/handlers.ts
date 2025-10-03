import { Server as SocketIOServer, Socket } from 'socket.io';
import { getGameByCode } from '../services/gameService';

// Store socket-to-game mapping
const socketGameMap = new Map<string, string>();

export function setupWebSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Handle player joining a game
    socket.on('join-game', async ({ gameCode, playerId }) => {
      try {
        const roomName = `game:${gameCode.toUpperCase()}`;
        socket.join(roomName);
        socketGameMap.set(socket.id, gameCode.toUpperCase());

        console.log(`🎮 Player ${playerId || 'unknown'} (${socket.id}) joined game ${gameCode}`);

        // Get current game state
        const game = await getGameByCode(gameCode, true, false);

        // Broadcast to other players in the room that someone joined
        socket.to(roomName).emit('player:joined', {
          socketId: socket.id,
          playerId,
          timestamp: new Date().toISOString(),
        });

        // Send full game state to the joining player
        socket.emit('game:state', {
          game,
        });

        // Acknowledge connection
        socket.emit('joined-game', {
          gameCode: gameCode.toUpperCase(),
          roomName,
          message: 'Successfully joined game',
        });
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', {
          message: 'Failed to join game',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle game state update requests
    socket.on('request:game-state', async ({ gameCode }) => {
      try {
        const game = await getGameByCode(gameCode, true, true);
        socket.emit('game:state', { game });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch game state',
        });
      }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
      const gameCode = socketGameMap.get(socket.id);
      if (gameCode) {
        const roomName = `game:${gameCode}`;
        io.to(roomName).emit('player:disconnected', {
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });
        socketGameMap.delete(socket.id);
      }
      console.log(`❌ Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`⚠️  Socket error for ${socket.id}:`, error);
    });
  });

  console.log('🔌 WebSocket handlers initialized');
}

/**
 * Broadcast game update to all players in a game
 */
export function broadcastGameUpdate(io: SocketIOServer, gameCode: string, game: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  io.to(roomName).emit('game:updated', { game });
}

/**
 * Broadcast player joined event
 */
export function broadcastPlayerJoined(io: SocketIOServer, gameCode: string, player: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  io.to(roomName).emit('player:joined', { player });
}

export { SocketIOServer };
