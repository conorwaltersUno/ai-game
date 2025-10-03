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
        console.log(`📍 Socket ${socket.id} joined room: ${roomName}`);

        // Log all sockets in room
        const socketsInRoom = await io.in(roomName).fetchSockets();
        console.log(`👥 Total sockets in ${roomName}: ${socketsInRoom.length}`, socketsInRoom.map(s => s.id));

        // Get current game state (include rounds if game is in progress)
        const game = await getGameByCode(gameCode, true, true);
        console.log(`📊 Game state: ${game.players?.length || 0} players, status: ${game.status}`);

        // If game is in progress, attach the current round object
        let gameToSend: any = game;
        if (game.status === 'IN_PROGRESS' && game.currentRound > 0) {
          const currentRoundObj = game.rounds?.find(r => r.roundNumber === game.currentRound);
          if (currentRoundObj) {
            gameToSend = {
              ...game,
              currentRound: currentRoundObj as any, // Override with full object
            };
            console.log(`📊 Attached current round ${game.currentRound} to game state`);
          }
        }

        // Broadcast to other players in the room that someone joined
        socket.to(roomName).emit('player:joined', {
          socketId: socket.id,
          playerId,
          timestamp: new Date().toISOString(),
        });
        console.log(`📡 Broadcasted player:joined to room ${roomName} (excluding ${socket.id})`);

        // Send full game state to the joining player
        socket.emit('game:state', {
          game: gameToSend,
        });
        console.log(`📤 Sent game:state to ${socket.id}`);

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

        // If game is in progress, attach the current round object
        let gameToSend: any = game;
        if (game.status === 'IN_PROGRESS' && game.currentRound > 0) {
          const currentRoundObj = game.rounds?.find(r => r.roundNumber === game.currentRound);
          if (currentRoundObj) {
            gameToSend = {
              ...game,
              currentRound: currentRoundObj as any, // Override with full object
            };
          }
        }

        socket.emit('game:state', { game: gameToSend });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch game state',
        });
      }
    });

    // Handle next round request from host
    socket.on('host:next-round', async ({ gameCode }) => {
      try {
        console.log(`🎮 Host requested next round for game ${gameCode}`);
        const gameService = await import('../services/gameService');
        const result = await gameService.startNextRound(gameCode);

        const roomName = `game:${gameCode.toUpperCase()}`;

        if (result.gameComplete) {
          // Game is complete
          console.log(`🏁 Game ${gameCode} is complete!`);
          io.to(roomName).emit('game:completed', {
            game: result.game,
            finalScores: result.finalScores,
          });
        } else if (result.round) {
          // Next round started
          console.log(`🎮 Round ${result.round.roundNumber} started for game ${gameCode}`);
          io.to(roomName).emit('round:started', { round: result.round });

          // Also broadcast updated game state
          const gameWithRound: any = {
            ...result.game,
            currentRound: result.round as any,
          };
          io.to(roomName).emit('game:updated', { game: gameWithRound });
        }
      } catch (error) {
        console.error('Error starting next round:', error);
        socket.emit('error', {
          message: 'Failed to start next round',
          error: error instanceof Error ? error.message : 'Unknown error',
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
export async function broadcastGameUpdate(io: SocketIOServer, gameCode: string, game: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  const socketsInRoom = await io.in(roomName).fetchSockets();
  console.log(`📡 Broadcasting game:updated to ${roomName} (${socketsInRoom.length} sockets)`);
  console.log(`   Players in game: ${game.players?.length || 0}`);
  console.log(`   Game status: ${game.status}`);
  console.log(`   Current round: ${typeof game.currentRound === 'object' ? game.currentRound.roundNumber : game.currentRound}`);
  console.log(`   Socket IDs:`, socketsInRoom.map(s => s.id));
  io.to(roomName).emit('game:updated', { game });
}

/**
 * Broadcast player joined event
 */
export async function broadcastPlayerJoined(io: SocketIOServer, gameCode: string, player: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  const socketsInRoom = await io.in(roomName).fetchSockets();
  console.log(`📡 Broadcasting player:joined to ${roomName} (${socketsInRoom.length} sockets)`);
  console.log(`   Player: ${player.name} (${player.id})`);
  io.to(roomName).emit('player:joined', { player });
}

/**
 * Broadcast round started event
 */
export function broadcastRoundStarted(io: SocketIOServer, gameCode: string, round: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  io.to(roomName).emit('round:started', { round });
}

/**
 * Broadcast round updated event
 */
export function broadcastRoundUpdated(io: SocketIOServer, gameCode: string, round: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  io.to(roomName).emit('round:updated', { round });
}

/**
 * Broadcast voting started event
 */
export function broadcastVotingStarted(io: SocketIOServer, gameCode: string, round: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  io.to(roomName).emit('round:voting-started', { round });
}

/**
 * Broadcast round completed event
 */
export function broadcastRoundCompleted(io: SocketIOServer, gameCode: string, round: any) {
  const roomName = `game:${gameCode.toUpperCase()}`;
  io.to(roomName).emit('round:completed', { round });
}

export { SocketIOServer };
