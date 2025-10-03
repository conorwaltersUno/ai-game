import { Router, Request, Response, NextFunction } from 'express';
import {
  submitPrompt,
  submitVote,
  getRoundById,
} from '../services/roundService';

const router = Router();

/**
 * GET /api/rounds/:roundId
 * Get round details
 */
router.get('/:roundId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roundId } = req.params;

    const round = await getRoundById(roundId);

    res.json({ round });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rounds/:roundId/submit
 * Submit a prompt for a round
 */
router.post('/:roundId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roundId } = req.params;
    const { playerId, prompt } = req.body;

    const submission = await submitPrompt(roundId, playerId, prompt);

    // Get updated round
    const round = await getRoundById(roundId);

    // Broadcast round update
    const io = req.app.locals.io;
    if (io && round && round.game) {
      const gameCode = round.game.code;
      io.to(`game:${gameCode}`).emit('round:updated', { round });

      // If both prompts submitted, notify that images are generating
      if (round.submissions.length === 2 && round.status === 'GENERATING') {
        io.to(`game:${gameCode}`).emit('round:generating', {
          message: 'Both prompts submitted! Generating images...',
        });
      }

      // If moved to VOTING, broadcast voting started
      if (round.status === 'VOTING') {
        io.to(`game:${gameCode}`).emit('round:voting-started', {
          round,
          submissions: round.submissions,
        });
      }
    }

    res.status(201).json({ submission });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rounds/:roundId/vote
 * Submit a vote for a round
 */
router.post('/:roundId/vote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roundId } = req.params;
    const { playerId, votedTeam } = req.body;

    const vote = await submitVote(roundId, playerId, votedTeam);

    // Get updated round
    const round = await getRoundById(roundId);

    // Broadcast vote update
    const io = req.app.locals.io;
    if (io && round && round.game) {
      const gameCode = round.game.code;

      // Count votes
      const goodVotes = round.votes.filter(v => v.votedTeam === 'GOOD').length;
      const evilVotes = round.votes.filter(v => v.votedTeam === 'EVIL').length;

      // Only broadcast vote update if round is NOT complete
      // (completeRound() already handles all broadcasts when round completes)
      if (round.status !== 'COMPLETE') {
        io.to(`game:${gameCode}`).emit('round:vote-updated', {
          votes: { good: goodVotes, evil: evilVotes },
        });
      }
    }

    res.status(201).json({ vote });
  } catch (error) {
    next(error);
  }
});

export default router;
