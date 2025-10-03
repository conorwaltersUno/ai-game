import { PrismaClient, GameStatus } from '@prisma/client';
import { generateGameCode } from '../utils/generateCode';
import { generateQRCode, getJoinUrl } from './qrService';
import { assignTeam } from '../utils/teamBalancer';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

/**
 * Create a new game
 */
export async function createGame(hostName: string, totalRounds: number = 5) {
  // Validate input
  if (!hostName || hostName.trim().length === 0) {
    throw new ValidationError('Host name is required');
  }

  if (totalRounds < 1 || totalRounds > 10) {
    throw new ValidationError('Total rounds must be between 1 and 10');
  }

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
      totalRounds,
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
 */
export async function getGameByCode(code: string, includePlayers = false, includeRounds = false) {
  const game = await prisma.game.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: includePlayers,
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

  if (!game.players || game.players.length < 4) {
    throw new ValidationError('Need at least 4 players to start (2 per team)');
  }

  // Check teams are balanced
  const goodCount = game.players.filter(p => p.team === 'GOOD').length;
  const evilCount = game.players.filter(p => p.team === 'EVIL').length;

  if (goodCount === 0 || evilCount === 0) {
    throw new ValidationError('Each team must have at least one player');
  }

  // Update game status
  const updatedGame = await prisma.game.update({
    where: { id: game.id },
    data: {
      status: GameStatus.IN_PROGRESS,
      currentRound: 1,
    },
    include: {
      players: true,
    },
  });

  return updatedGame;
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
