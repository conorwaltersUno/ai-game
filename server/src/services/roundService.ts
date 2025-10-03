import { PrismaClient, RoundStatus, TeamType } from '@prisma/client';
import { selectRoundPlayers } from '../utils/teamBalancer';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { generateImage, generateReferenceImage as generateAIReferenceImage } from './aiService';

const prisma = new PrismaClient();

/**
 * Create and start a new round
 */
export async function createRound(gameId: string, roundNumber: number) {
  // Get game with players
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true, rounds: true },
  });

  if (!game) {
    throw new NotFoundError('Game');
  }

  console.log(`📊 [Create Round] Game ${gameId} fetched:`);
  console.log(`   Players: ${game.players?.length || 0}`);
  console.log(`   Player details:`, game.players?.map(p => ({ id: p.id, name: p.name, team: p.team })) || []);

  // Get recently selected players (from last 2 rounds)
  const recentRounds = game.rounds
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .slice(0, 2);

  const recentlySelected = recentRounds
    .flatMap(r => [r.goodPlayerId, r.evilPlayerId])
    .filter(Boolean) as string[];

  // Select random players from each team
  let selectedPlayers = selectRoundPlayers(game.players, recentlySelected);

  // If no players available (due to recently selected filter), try again without filter
  if (!selectedPlayers && recentlySelected.length > 0) {
    console.log(`⚠️  [Create Round] No eligible players with recency filter, retrying without filter`);
    selectedPlayers = selectRoundPlayers(game.players, []);
  }

  if (!selectedPlayers) {
    console.error(`❌ [Create Round] Failed to select players for game ${gameId}`);
    console.error(`   Available players: ${game.players?.length || 0}`);
    console.error(`   Good team: ${game.players?.filter(p => p.team === 'GOOD').length || 0}`);
    console.error(`   Evil team: ${game.players?.filter(p => p.team === 'EVIL').length || 0}`);
    throw new ValidationError('Not enough players in each team to start round');
  }

  // Validate the selection
  const goodPlayerSelected = game.players.find(p => p.id === selectedPlayers.goodPlayerId);
  const evilPlayerSelected = game.players.find(p => p.id === selectedPlayers.evilPlayerId);

  console.log(`✅ [Create Round] Players selected for round ${roundNumber}:`);
  console.log(`   Good player: ${goodPlayerSelected?.name} (${selectedPlayers.goodPlayerId})`);
  console.log(`   - Actual team: ${goodPlayerSelected?.team}`);
  console.log(`   Evil player: ${evilPlayerSelected?.name} (${selectedPlayers.evilPlayerId})`);
  console.log(`   - Actual team: ${evilPlayerSelected?.team}`);

  // CRITICAL: Validate team assignments
  if (goodPlayerSelected?.team !== 'GOOD') {
    console.error(`🚨 CRITICAL: Good player slot assigned to ${goodPlayerSelected?.team} team player!`);
    throw new ValidationError('Player selection error: Good team player not selected for good slot');
  }
  if (evilPlayerSelected?.team !== 'EVIL') {
    console.error(`🚨 CRITICAL: Evil player slot assigned to ${evilPlayerSelected?.team} team player!`);
    throw new ValidationError('Player selection error: Evil team player not selected for evil slot');
  }

  // Generate reference image using DALL-E 3 or mock
  const { imageUrl: referenceImageUrl, prompt: referencePrompt } = await generateAIReferenceImage();

  // Create round
  const round = await prisma.round.create({
    data: {
      gameId,
      roundNumber,
      referenceImageUrl,
      referencePrompt,
      goodPlayerId: selectedPlayers.goodPlayerId,
      evilPlayerId: selectedPlayers.evilPlayerId,
      status: RoundStatus.PROMPTING,
      startedAt: new Date(),
    },
    include: {
      game: {
        include: {
          players: true,
        },
      },
    },
  });

  return round;
}

/**
 * Get current round for a game
 */
export async function getCurrentRound(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
  });

  if (!game) {
    throw new NotFoundError('Game');
  }

  const round = await prisma.round.findFirst({
    where: {
      gameId,
      roundNumber: game.currentRound,
    },
    include: {
      submissions: {
        include: {
          player: true,
        },
      },
      votes: true,
    },
  });

  return round;
}

/**
 * Submit a prompt for a round
 */
export async function submitPrompt(
  roundId: string,
  playerId: string,
  prompt: string
) {
  // Validate round exists and is in PROMPTING state
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      submissions: true,
    },
  });

  if (!round) {
    throw new NotFoundError('Round');
  }

  if (round.status !== RoundStatus.PROMPTING) {
    throw new ValidationError('Round is not accepting prompts');
  }

  // Check if player is selected for this round
  if (playerId !== round.goodPlayerId && playerId !== round.evilPlayerId) {
    throw new ValidationError('You are not selected for this round');
  }

  // Fetch player to get their actual team assignment
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new NotFoundError('Player');
  }

  // CRITICAL: Validate that player's team matches their expected role in this round
  const expectedTeamForPlayer = playerId === round.goodPlayerId ? TeamType.GOOD : TeamType.EVIL;

  if (player.team !== expectedTeamForPlayer) {
    console.error(`🚨 [Submit Prompt] TEAM MISMATCH DETECTED!`);
    console.error(`   Player: ${player.name} (${playerId})`);
    console.error(`   Player's actual team: ${player.team}`);
    console.error(`   Expected team for this round: ${expectedTeamForPlayer}`);
    console.error(`   Round goodPlayerId: ${round.goodPlayerId}`);
    console.error(`   Round evilPlayerId: ${round.evilPlayerId}`);
    throw new ValidationError(
      `Team assignment error: ${player.team} team player cannot play for ${expectedTeamForPlayer} team`
    );
  }

  // Use the player's actual team (now validated to match)
  const team = player.team;

  // Check if already submitted
  const existingSubmission = round.submissions.find(s => s.team === team);
  if (existingSubmission) {
    throw new ValidationError('Prompt already submitted for this team');
  }

  // Create submission
  const submission = await prisma.submission.create({
    data: {
      roundId,
      playerId,
      team,
      prompt: prompt.trim(),
    },
  });

  // Check if both teams have submitted
  const allSubmissions = await prisma.submission.findMany({
    where: { roundId },
  });

  if (allSubmissions.length === 2) {
    // Both teams submitted, move to GENERATING state
    await prisma.round.update({
      where: { id: roundId },
      data: { status: RoundStatus.GENERATING },
    });

    // Trigger image generation immediately (non-blocking)
    // Images will be generated in parallel for maximum speed
    // Note: We'll broadcast voting-started event after images complete
    setImmediate(async () => {
      try {
        await generateImagesForSubmissions(roundId);
        // Broadcast will happen inside generateImagesForSubmissions via global io reference
      } catch (err) {
        console.error('Error generating images:', err);
      }
    });
  }

  return submission;
}

/**
 * Generate images for submitted prompts
 * This will be replaced with actual AI service
 *
 * OPTIMIZED: Generates images in PARALLEL for maximum speed
 */
async function generateImagesForSubmissions(roundId: string) {
  console.log(`🎨 [Image Generation] Starting parallel generation for round ${roundId}`);
  const startTime = Date.now();

  const submissions = await prisma.submission.findMany({
    where: { roundId },
  });

  // Generate images in PARALLEL using Promise.all
  // DALL-E 3 API calls will run concurrently for maximum speed!
  const updatePromises = submissions.map(async (submission) => {
    console.log(`🎨 Generating image for ${submission.team} team...`);
    console.log(`   Prompt: "${submission.prompt}"`);

    // Generate image using DALL-E 3 (or mock if configured)
    const imageUrl = await generateImage(submission.prompt, {
      quality: 'standard',  // Use 'hd' for higher quality (but slower/more expensive)
      size: '1024x1024',
    });

    return prisma.submission.update({
      where: { id: submission.id },
      data: {
        imageUrl,
        generatedAt: new Date(),
      },
    });
  });

  // Wait for ALL images to generate in parallel
  await Promise.all(updatePromises);

  const duration = Date.now() - startTime;
  console.log(`✅ [Image Generation] Completed in ${duration}ms (parallel processing)`);

  // Update round status to VOTING
  const updatedRound = await prisma.round.update({
    where: { id: roundId },
    data: { status: RoundStatus.VOTING },
    include: {
      game: true,
      submissions: {
        include: {
          player: true,
        },
      },
      votes: true,
    },
  });

  // Broadcast voting started event to all players
  // We need to import the io instance, but services shouldn't depend on websocket layer
  // So we'll emit a custom event that the app can listen to
  // For now, we'll use a global io reference (set in index.ts)
  const io = (global as any).io;
  if (io && updatedRound.game) {
    const gameCode = updatedRound.game.code;
    console.log(`📡 Broadcasting voting-started for game ${gameCode}`);
    io.to(`game:${gameCode}`).emit('round:voting-started', {
      round: updatedRound,
      submissions: updatedRound.submissions,
    });
  }

  return true;
}

/**
 * Submit a vote for a round
 */
export async function submitVote(
  roundId: string,
  playerId: string,
  votedTeam: TeamType
) {
  // Validate round exists and is in VOTING state
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      votes: true,
    },
  });

  if (!round) {
    throw new NotFoundError('Round');
  }

  if (round.status !== RoundStatus.VOTING) {
    throw new ValidationError('Round is not accepting votes');
  }

  // Check if player already voted
  const existingVote = round.votes.find(v => v.playerId === playerId);
  if (existingVote) {
    throw new ValidationError('You have already voted');
  }

  // Check if player is not one of the prompt creators
  if (playerId === round.goodPlayerId || playerId === round.evilPlayerId) {
    throw new ValidationError('Prompt creators cannot vote');
  }

  // Create vote
  const vote = await prisma.vote.create({
    data: {
      roundId,
      playerId,
      votedTeam,
    },
  });

  // Check if all eligible players have voted
  const game = await prisma.game.findUnique({
    where: { id: round.gameId },
    include: { players: true },
  });

  if (!game) {
    throw new NotFoundError('Game');
  }

  // Eligible voters = all players except the 2 prompt creators
  const eligibleVoters = game.players.length - 2;
  const currentVotes = await prisma.vote.count({
    where: { roundId },
  });

  if (currentVotes >= eligibleVoters) {
    // All votes in, complete the round
    await completeRound(roundId);
  }

  return vote;
}

/**
 * Complete a round and calculate winner
 */
async function completeRound(roundId: string) {
  // Get all votes
  const votes = await prisma.vote.findMany({
    where: { roundId },
  });

  // Count votes per team
  const goodVotes = votes.filter(v => v.votedTeam === TeamType.GOOD).length;
  const evilVotes = votes.filter(v => v.votedTeam === TeamType.EVIL).length;

  const winningTeam = goodVotes > evilVotes ? TeamType.GOOD : TeamType.EVIL;

  // Update round
  const round = await prisma.round.update({
    where: { id: roundId },
    data: {
      status: RoundStatus.COMPLETE,
      endedAt: new Date(),
      winningTeam,
    },
    include: {
      game: true,
      submissions: {
        include: {
          player: true,
        },
      },
      votes: true,
    },
  });

  // Update player score (award 1 point ONLY to the active player who won)
  const winningPlayerId = winningTeam === TeamType.GOOD ? round.goodPlayerId : round.evilPlayerId;

  if (winningPlayerId) {
    await prisma.player.update({
      where: {
        id: winningPlayerId,
      },
      data: {
        score: {
          increment: 1,
        },
      },
    });
  }

  console.log(`✅ [Round Complete] Round ${roundId} winner: ${winningTeam}`);
  console.log(`   Good votes: ${goodVotes}, Evil votes: ${evilVotes}`);

  // Fetch updated game with players (to get updated scores)
  const updatedGame = await prisma.game.findUnique({
    where: { id: round.gameId },
    include: {
      players: true,
    },
  });

  console.log(`📊 [Round Complete] Fetched game ${round.gameId}:`);
  console.log(`   Players count: ${updatedGame?.players?.length || 0}`);
  console.log(`   Player IDs:`, updatedGame?.players?.map(p => p.id) || []);

  // Broadcast round completed event with full round data
  const io = (global as any).io;
  if (io && round.game) {
    const gameCode = round.game.code;
    console.log(`📡 Broadcasting round:completed for game ${gameCode}`);

    // Include updated players in the round data
    const roundWithPlayers = {
      ...round,
      game: {
        ...round.game,
        players: updatedGame?.players || [],
      },
    };

    io.to(`game:${gameCode}`).emit('round:completed', {
      round: roundWithPlayers,
      winner: winningTeam,
      votes: { good: goodVotes, evil: evilVotes },
    });

    // Also broadcast updated game state with new scores
    if (updatedGame) {
      console.log(`📡 Broadcasting game:updated with new scores`);
      console.log(`   Updated game players: ${updatedGame.players?.length || 0}`);
      // Attach current round object (using any to override type)
      const gameWithRound: any = {
        ...updatedGame,
        currentRound: round, // Override with full round object
      };
      io.to(`game:${gameCode}`).emit('game:updated', { game: gameWithRound });
    }
  }

  return round;
}

// Removed generateReferenceImage - now using aiService.generateReferenceImage()

/**
 * Get round by ID
 */
export async function getRoundById(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      game: true,
      submissions: {
        include: {
          player: true,
        },
      },
      votes: true,
    },
  });

  if (!round) {
    throw new NotFoundError('Round');
  }

  return round;
}
