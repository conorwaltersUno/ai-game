import { Router, Request, Response, NextFunction } from 'express';
import {
  createGame,
  getGameByCode,
  addPlayerToGame,
  startGame,
  deleteGame,
  resetGameToLobby,
} from '../services/gameService';
import {
  broadcastPlayerJoined,
  broadcastGameUpdate,
  broadcastRoundStarted,
} from '../websocket/handlers';

const router = Router();

/**
 * POST /api/games
 * Create a new game
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hostName, totalRounds, gameMode } = req.body;

    const result = await createGame(hostName, totalRounds, gameMode);

    res.status(201).json({
      game: {
        id: result.game.id,
        code: result.game.code,
        hostName: result.game.hostName,
        totalRounds: result.game.totalRounds,
        gameMode: result.game.gameMode,
        status: result.game.status,
        qrCodeUrl: result.qrCodeUrl,
        joinUrl: result.joinUrl,
        createdAt: result.game.createdAt,
        expiresAt: result.game.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/:code/rounds
 * Get all rounds for a game (must be before /:code route)
 */
router.get('/:code/rounds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const game = await getGameByCode(code, false, true);

    res.json({ rounds: game.rounds || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/:code
 * Get game details
 */
router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const game = await getGameByCode(code, true, true);

    res.json({ game });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:code/join
 * Join a game
 */
router.post('/:code/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { playerName } = req.body;

    console.log('====================================');
    console.log('🎮 JOIN GAME REQUEST RECEIVED');
    console.log('====================================');
    console.log('Game Code:', code);
    console.log('Player Name:', playerName);
    console.log('IP Address:', req.ip || req.connection.remoteAddress);
    console.log('User Agent:', req.headers['user-agent']);
    console.log('Origin:', req.headers.origin);
    console.log('Referer:', req.headers.referer);
    console.log('====================================');

    const player = await addPlayerToGame(code, playerName);
    console.log('✅ Player added successfully:', { playerId: player.id, team: player.team });

    // Broadcast to all players that someone joined
    const io = req.app.locals.io;
    if (io) {
      broadcastPlayerJoined(io, code, player);

      // Also broadcast updated game state
      const game = await getGameByCode(code, true, false);
      broadcastGameUpdate(io, code, game);
    }

    // In a real app, you'd generate a JWT token here
    const token = `${player.id}-${Date.now()}`;

    res.status(201).json({
      player,
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:code/start
 * Start a game (host only)
 */
router.post('/:code/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const result = await startGame(code);

    // Broadcast game started and round started to all players
    const io = req.app.locals.io;
    if (io) {
      broadcastGameUpdate(io, code, result);

      // Broadcast round started
      if (result.currentRound) {
        broadcastRoundStarted(io, code, result.currentRound);
      }
    }

    res.json({
      success: true,
      game: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:code/reset
 * Reset game to lobby (host only, after game completion)
 */
router.post('/:code/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const game = await resetGameToLobby(code);

    res.json({ success: true, game });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/games/:code
 * Cancel/delete a game (host only)
 */
router.delete('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    await deleteGame(code);

    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
