import { PrismaClient, GameStatus, GameMode } from '@prisma/client';
import { generateGameCode } from '../utils/generateCode';
import { generateQRCode, getJoinUrl } from './qrService';
import { assignTeam } from '../utils/teamBalancer';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { createRound } from './roundService';

const prisma = new PrismaClient();

/**
 * Create a new game
 */
export async function createGame(
  hostName: string,
  totalRounds: number = 5,
  gameMode: 'standard' | 'everyone' = 'standard'
) {
  // Validate input
  if (!hostName || hostName.trim().length === 0) {
    throw new ValidationError('Host name is required');
  }

  // For standard mode, validate rounds
  if (gameMode === 'standard' && (totalRounds < 1 || totalRounds > 10)) {
    throw new ValidationError('Total rounds must be between 1 and 10');
  }

  // For everyone plays mode, rounds will be calculated when game starts
  const prismaGameMode = gameMode === 'everyone' ? GameMode.EVERYONE_PLAYS : GameMode.STANDARD;

  // Generate unique game code
  let gameCode = generateGameCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.game.findUnique({
      where: { code: gameCode },
    });

    if (!existing) break;

    gameCode = generateGameCode();
    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new Error('Failed to generate unique game code');
  }

  // Create game in database
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2); // Expire in 2 hours

  const game = await prisma.game.create({
    data: {
      code: gameCode,
      hostName: hostName.trim(),
      totalRounds: prismaGameMode === GameMode.EVERYONE_PLAYS ? 1 : totalRounds, // Placeholder for everyone mode
      gameMode: prismaGameMode,
      expiresAt,
      status: GameStatus.WAITING,
    },
  });

  // Generate join URL and QR code
  const joinUrl = getJoinUrl(gameCode);
  const qrCodeUrl = await generateQRCode(joinUrl);

  return {
    game,
    joinUrl,
    qrCodeUrl,
  };
}

/**
 * Get game by code with optional includes
 * IMPORTANT: Only returns CONNECTED players (filters out disconnected/removed)
 */
export async function getGameByCode(code: string, includePlayers = false, includeRounds = false) {
  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: includePlayers
        ? {
            where: {
              connectionStatus: 'CONNECTED', // Only include active players
            },
          }
        : false,
      rounds: includeRounds
        ? {
            include: {
              submissions: true,
              votes: true,
            },
            orderBy: {
              roundNumber: 'asc',
            },
          }
        : false,
    },
  });

  if (!game) {
    throw new NotFoundError('Game');
  }

  return game;
}

/**
 * Add player to game
 */
export async function addPlayerToGame(gameCode: string, playerName: string) {
  // Validate input
  if (!playerName || playerName.trim().length === 0) {
    throw new ValidationError('Player name is required');
  }

  if (playerName.length > 20) {
    throw new ValidationError('Player name must be 20 characters or less');
  }

  // Get game
  const game = await getGameByCode(gameCode, true);

  // Check game status
  if (game.status !== GameStatus.WAITING) {
    throw new ValidationError('Game has already started');
  }

  // Check if game has expired
  if (new Date() > game.expiresAt) {
    throw new ValidationError('Game has expired');
  }

  // Check if name is already taken
  const nameTaken = game.players?.some(
    p => p.name.toLowerCase() === playerName.trim().toLowerCase()
  );

  if (nameTaken) {
    throw new ValidationError('Player name already taken');
  }

  // Assign team based on balance
  const team = assignTeam(game.players || []);

  // Create player
  const player = await prisma.player.create({
    data: {
      gameId: game.id,
      name: playerName.trim(),
      team,
      isHost: game.players?.length === 0, // First player is host
    },
  });

  return player;
}

/**
 * Start game
 */
export async function startGame(gameCode: string) {
  const game = await getGameByCode(gameCode, true);

  // Validate game can start
  if (game.status !== GameStatus.WAITING) {
    throw new ValidationError('Game has already started');
  }

  if (!game.players || game.players.length < 2) {
    throw new ValidationError('Need at least 2 players to start');
  }

  // Check teams are balanced
  const goodCount = game.players.filter(p => p.team === 'GOOD').length;
  const evilCount = game.players.filter(p => p.team === 'EVIL').length;

  if (goodCount === 0 || evilCount === 0) {
    throw new ValidationError('Each team must have at least one player');
  }

  // Calculate total rounds for EVERYONE_PLAYS mode
  let totalRounds = game.totalRounds;
  if (game.gameMode === GameMode.EVERYONE_PLAYS) {
    // Each round has 2 players (1 GOOD, 1 EVIL)
    // So we need ceil(playerCount / 2) rounds to ensure everyone plays at least once
    const playerCount = game.players.length;
    totalRounds = Math.ceil(playerCount / 2);
    console.log(`🎮 [Everyone Plays Mode] ${playerCount} players → ${totalRounds} rounds`);
  }

  // Update game status
  const updatedGame = await prisma.game.update({
    where: { id: game.id },
    data: {
      status: GameStatus.IN_PROGRESS,
      currentRound: 1,
      totalRounds, // Update with calculated rounds for everyone mode
    },
    include: {
      players: {
        where: {
          connectionStatus: 'CONNECTED', // Only include active players
        },
      },
    },
  });

  // Create first round
  const firstRound = await createRound(updatedGame.id, 1);

  return {
    ...updatedGame,
    currentRound: firstRound,
  };
}

/**
 * Delete game (host only)
 */
export async function deleteGame(gameCode: string) {
  const game = await getGameByCode(gameCode);

  await prisma.game.delete({
    where: { id: game.id },
  });

  return { success: true };
}

/**
 * Start next round or complete game
 */
export async function startNextRound(gameCode: string) {
  const game = await getGameByCode(gameCode, true, true);

  // Validate game is in progress
  if (game.status !== GameStatus.IN_PROGRESS) {
    throw new ValidationError('Game is not in progress');
  }

  // Check if all rounds are complete
  if (game.currentRound >= game.totalRounds) {
    // Game is complete
    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: GameStatus.COMPLETED,
      },
      include: {
        players: {
          where: {
            connectionStatus: 'CONNECTED', // Only include active players
          },
        },
      },
    });

    // Calculate final scores
    const goodScore = updatedGame.players
      .filter(p => p.team === 'GOOD')
      .reduce((sum, p) => sum + p.score, 0);
    const evilScore = updatedGame.players
      .filter(p => p.team === 'EVIL')
      .reduce((sum, p) => sum + p.score, 0);

    return {
      gameComplete: true,
      game: updatedGame,
      finalScores: {
        good: goodScore,
        evil: evilScore,
        winner: goodScore > evilScore ? 'GOOD' : 'EVIL',
      },
    };
  }

  // Start next round
  const nextRoundNumber = game.currentRound + 1;

  // Update game current round
  const updatedGame = await prisma.game.update({
    where: { id: game.id },
    data: {
      currentRound: nextRoundNumber,
    },
    include: {
      players: {
        where: {
          connectionStatus: 'CONNECTED', // Only include active players
        },
      },
    },
  });

  // Create next round
  const nextRound = await createRound(updatedGame.id, nextRoundNumber);

  return {
    gameComplete: false,
    game: updatedGame,
    round: nextRound,
  };
}

/**
 * Reset game to WAITING state without clearing players
 * Allows host to start a new game with same lobby
 */
export async function resetGameToLobby(gameCode: string) {
  const game = await getGameByCode(gameCode, true);

  // Can only reset completed games
  if (game.status !== GameStatus.COMPLETED) {
    throw new ValidationError('Can only reset completed games');
  }

  // Reset all player scores
  await prisma.player.updateMany({
    where: { gameId: game.id },
    data: { score: 0 },
  });

  // Delete all rounds for this game
  await prisma.round.deleteMany({
    where: { gameId: game.id },
  });

  // Reset game to WAITING status
  const updatedGame = await prisma.game.update({
    where: { id: game.id },
    data: {
      status: GameStatus.WAITING,
      currentRound: 0,
    },
    include: {
      players: {
        where: {
          connectionStatus: 'CONNECTED', // Only include active players
        },
      },
    },
  });

  console.log(`🔄 Game ${gameCode} reset to WAITING - ${updatedGame.players.length} active players retained`);

  return updatedGame;
}

/**
 * Clean up expired games (run periodically)
 */
export async function cleanupExpiredGames() {
  const result = await prisma.game.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`🧹 Cleaned up ${result.count} expired games`);
  return result.count;
}
