import { Server as SocketIOServer, Socket } from 'socket.io';
import { getGameByCode } from '../services/gameService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store socket-to-game mapping
const socketGameMap = new Map<string, string>();

// Track games currently creating rounds (prevent race conditions)
const roundCreationLocks = new Set<string>();

/**
 * Cleanup players who haven't sent heartbeat in 2+ minutes
 * Runs every 5 seconds to check for inactive players
 */
async function cleanupDisconnectedPlayers() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 120000);

    // Find players who haven't sent heartbeat in 2+ minutes
    const disconnectedPlayers = await prisma.player.findMany({
      where: {
        connectionStatus: 'CONNECTED',
        lastHeartbeat: {
          lt: twoMinutesAgo,
        },
      },
      include: {
        game: true,
      },
    });

    if (disconnectedPlayers.length === 0) return;

    console.log(`🧹 [Cleanup] Found ${disconnectedPlayers.length} disconnected players (no heartbeat for 2+ minutes)`);

    for (const player of disconnectedPlayers) {
      console.log(`🗑️ [Cleanup] Removing player ${player.name} from game ${player.game.code}`);

      // Mark as disconnected (soft delete for now)
      await prisma.player.update({
        where: { id: player.id },
        data: {
          connectionStatus: 'DISCONNECTED',
          disconnectedAt: new Date(),
        },
      });

      // Broadcast to game that player left
      const io = (global as any).io;
      if (io) {
        const roomName = `game:${player.game.code}`;

        // Get updated game state
        const updatedGame = await getGameByCode(player.game.code, true, false);

        io.to(roomName).emit('player:removed', {
          playerId: player.id,
          playerName: player.name,
          reason: 'disconnected',
        });

        io.to(roomName).emit('game:updated', { game: updatedGame });
      }
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

// Cleanup interval - runs every 5 seconds to check for inactive players (2 minute timeout)
setInterval(() => {
  cleanupDisconnectedPlayers();
}, 5000);

// Server-side ping mechanism - actively ping all connected sockets every 10 seconds
setInterval(async () => {
  try {
    const allSockets = await (global as any).io?.fetchSockets();
    if (!allSockets) return;

    console.log(`🏓 [Server Ping] Pinging ${allSockets.length} connected sockets`);

    for (const socket of allSockets) {
      // Send ping, expect pong response within 3 seconds
      const timeout = setTimeout(() => {
        console.log(`⚠️ [Server Ping] Socket ${socket.id} didn't respond to ping - disconnecting`);
        socket.disconnect(true);
      }, 3000);

      socket.once('pong', () => {
        clearTimeout(timeout);
      });

      socket.emit('ping');
    }
  } catch (error) {
    console.error('Error in server ping:', error);
  }
}, 10000);

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

        // UPDATE: Set player socket ID and heartbeat in database
        if (playerId) {
          await prisma.player.update({
            where: { id: playerId },
            data: {
              socketId: socket.id,
              lastHeartbeat: new Date(),
              connectionStatus: 'CONNECTED',
              disconnectedAt: null,
            },
          }).catch(err => {
            console.error('Failed to update player socket:', err);
          });
        }

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
        const normalizedGameCode = gameCode.toUpperCase();

        // Check if round creation is already in progress for this game
        if (roundCreationLocks.has(normalizedGameCode)) {
          console.log(`⏳ Round creation already in progress for game ${gameCode}, ignoring duplicate request`);
          return;
        }

        // Acquire lock
        roundCreationLocks.add(normalizedGameCode);
        console.log(`🔒 Acquired round creation lock for game ${gameCode}`);

        try {
          console.log(`🎮 Host requested next round for game ${gameCode}`);
          const gameService = await import('../services/gameService');
          const result = await gameService.startNextRound(gameCode);

          const roomName = `game:${normalizedGameCode}`;

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
        } finally {
          // Always release lock
          roundCreationLocks.delete(normalizedGameCode);
          console.log(`🔓 Released round creation lock for game ${gameCode}`);
        }
      } catch (error) {
        console.error('Error starting next round:', error);
        socket.emit('error', {
          message: 'Failed to start next round',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle prompt timeout from clients
    socket.on('round:prompt-timeout', async ({ roundId, gameCode }) => {
      try {
        console.log(`⏰ Prompt timeout for round ${roundId} in game ${gameCode}`);
        const roundService = await import('../services/roundService');
        await roundService.autoCompleteRoundOnTimeout(roundId);
      } catch (error) {
        console.error('Error handling prompt timeout:', error);
      }
    });

    // Handle client heartbeat
    socket.on('heartbeat', async ({ playerId }) => {
      try {
        if (!playerId) return;

        // Update last heartbeat timestamp
        await prisma.player.update({
          where: { id: playerId },
          data: {
            lastHeartbeat: new Date(),
            connectionStatus: 'CONNECTED',
          },
        }).catch(err => {
          // Ignore errors for players no longer in database
          if (!err.message.includes('Record to update not found')) {
            console.error('Heartbeat update failed:', err);
          }
        });
      } catch (error) {
        // Silent fail - heartbeat errors shouldn't crash server
      }
    });

    // Handle explicit player leaving (tab close, navigation away)
    socket.on('player-leaving', async ({ playerId, gameCode }) => {
      try {
        console.log(`👋 [Explicit Leave] Player ${playerId} explicitly leaving game ${gameCode}`);

        // Immediately mark as disconnected
        const player = await prisma.player.update({
          where: { id: playerId },
          data: {
            connectionStatus: 'DISCONNECTED',
            disconnectedAt: new Date(),
            lastHeartbeat: null,
          },
          include: { game: true },
        });

        // Broadcast immediate removal
        const roomName = `game:${gameCode.toUpperCase()}`;
        io.to(roomName).emit('player:removed', {
          playerId: player.id,
          playerName: player.name,
          reason: 'left',
        });

        // Get updated game state
        const updatedGame = await getGameByCode(gameCode, true, false);
        io.to(roomName).emit('game:updated', { game: updatedGame });

        console.log(`✅ [Explicit Leave] Player ${player.name} removed immediately`);
      } catch (error) {
        console.error('Error handling player leaving:', error);
      }
    });

    // Handle host resetting game to lobby
    socket.on('host:reset-to-lobby', async ({ gameCode }) => {
      try {
        console.log(`🔄 Host resetting game ${gameCode} to lobby`);
        const gameService = await import('../services/gameService');
        const game = await gameService.resetGameToLobby(gameCode);

        const roomName = `game:${gameCode.toUpperCase()}`;

        // Broadcast to all players that game was reset
        io.to(roomName).emit('game:reset-to-lobby', {
          game,
          message: 'Game reset - ready for next round!',
        });
      } catch (error) {
        console.error('Error resetting game:', error);
        socket.emit('error', {
          message: 'Failed to reset game',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle player disconnection
    socket.on('disconnect', async () => {
      const gameCode = socketGameMap.get(socket.id);

      if (gameCode) {
        console.log(`❌ Client disconnected: ${socket.id} from game ${gameCode}`);

        // Find player by socket ID
        try {
          const player = await prisma.player.findFirst({
            where: { socketId: socket.id },
            include: { game: true },
          });

          if (player) {
            console.log(`👤 Player ${player.name} disconnected - IMMEDIATELY removing from game`);

            // Immediately mark as disconnected - NO grace period
            await prisma.player.update({
              where: { id: player.id },
              data: {
                connectionStatus: 'DISCONNECTED',
                disconnectedAt: new Date(),
                lastHeartbeat: null,
              },
            });

            const roomName = `game:${gameCode}`;

            // IMMEDIATELY broadcast removal (no grace period)
            io.to(roomName).emit('player:removed', {
              playerId: player.id,
              playerName: player.name,
              reason: 'disconnected',
            });

            // CRITICAL: Broadcast updated game state with filtered players
            // This ensures all clients see the updated player list WITHOUT the disconnected player
            try {
              const updatedGame = await getGameByCode(gameCode, true, false);
              console.log(`📡 Broadcasting updated game - ${updatedGame.players?.length || 0} active players`);
              io.to(roomName).emit('game:updated', { game: updatedGame });
            } catch (error) {
              console.error('Failed to broadcast updated game:', error);
            }

            console.log(`✅ Player ${player.name} removed immediately from game ${gameCode}`);
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }

        socketGameMap.delete(socket.id);
      }
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

  // CRITICAL: Log reference image URL to verify it's included
  console.log(`📡 [round:started] Broadcasting to ${roomName}:`);
  console.log(`   Round ${round.roundNumber} - Reference Image URL: ${round.referenceImageUrl || 'MISSING!!!'}`);
  console.log(`   Round Status: ${round.status}`);

  if (!round.referenceImageUrl) {
    console.error(`❌ CRITICAL: Round ${round.id} has NO reference image URL!`);
  }

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
