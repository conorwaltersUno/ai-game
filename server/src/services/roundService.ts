import { PrismaClient, RoundStatus, TeamType } from '@prisma/client';
import { selectRoundPlayers } from '../utils/teamBalancer';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { generateReferenceImage as generateAIReferenceImage, generateImageWithRetry } from './aiService';
import { enhancePrompt } from './promptEnhancerService';

const prisma = new PrismaClient();

/**
 * Helper function to create a timeout promise
 */
function createTimeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Generate reference image with retry logic and 60s timeout
 */
async function generateAIReferenceImageWithRetry(
  customPrompt?: string,
  maxRetries: number = 3,
  timeoutMs: number = 60000 // 60 seconds total timeout
): Promise<{ imageUrl: string; prompt: string }> {

  const startTime = Date.now();
  console.log(`🎨 [Reference Image] Starting with ${timeoutMs}ms timeout (${maxRetries} retries max)`);

  try {
    const result = await Promise.race([
      // Main retry logic
      (async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const elapsed = Date.now() - startTime;
          const remaining = timeoutMs - elapsed;

          if (remaining <= 0) {
            throw new Error('Overall timeout exceeded before attempt could start');
          }

          try {
            console.log(`🎨 [Reference Image] Attempt ${attempt}/${maxRetries} (${Math.round(remaining / 1000)}s remaining)`);

            // Race this attempt against remaining time
            const result = await Promise.race([
              generateAIReferenceImage(customPrompt),
              createTimeout(remaining, `Reference image attempt ${attempt} timeout`)
            ]);

            if (!result.imageUrl || result.imageUrl.includes('undefined')) {
              throw new Error('Invalid reference image URL');
            }

            const duration = Date.now() - startTime;
            console.log(`✅ [Reference Image] Generated successfully (took ${Math.round(duration / 1000)}s)`);
            return result;

          } catch (error: any) {
            const elapsed = Date.now() - startTime;
            console.error(`❌ [Reference Image] Attempt ${attempt} failed after ${Math.round(elapsed / 1000)}s:`, error.message);

            const timeLeft = timeoutMs - elapsed;
            if (attempt === maxRetries || timeLeft <= 0) {
              console.error(`🚫 [Reference Image] Giving up after ${attempt} attempts, using fallback`);
              return {
                imageUrl: 'https://picsum.photos/512/512?random=fallback',
                prompt: customPrompt || 'Fallback image due to generation failure'
              };
            }

            // Wait before retry (exponential backoff, but respect timeout)
            const waitTime = Math.min(
              1000 * Math.pow(2, attempt - 1),
              3000,
              timeLeft - 1000
            );

            if (waitTime > 0) {
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }

        // Fallback if all retries exhausted
        return {
          imageUrl: 'https://picsum.photos/1024/1024?random=fallback',
          prompt: customPrompt || 'Fallback image due to generation failure'
        };
      })(),
      // Overall timeout
      createTimeout(timeoutMs, `Reference image generation timeout after ${timeoutMs}ms`)
    ]);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`⏰ [Reference Image] Timeout after ${Math.round(duration / 1000)}s, using fallback`);
    return {
      imageUrl: 'https://picsum.photos/1024/1024?random=fallback',
      prompt: customPrompt || 'Fallback image due to timeout'
    };
  }
}

/**
 * Create and start a new round
 */
export async function createRound(gameId: string, roundNumber: number) {
  // Get game with CONNECTED players only
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        where: {
          connectionStatus: 'CONNECTED', // Only active players
        },
      },
      rounds: true,
    },
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

  // Generate reference image WITH RETRY and STATUS TRACKING
  console.log(`🎨 [Create Round] Generating reference image...`);

  const round1Prompt = roundNumber === 1
    ? "Will Smith eating spaghetti on a tricycle on a race track"
    : undefined;

  // Try to generate reference image with retries
  const { imageUrl: referenceImageUrl, prompt: referencePrompt } =
    await generateAIReferenceImageWithRetry(round1Prompt, 3);

  // Determine if generation was successful
  const imageGenerationSucceeded = referenceImageUrl && !referenceImageUrl.includes('fallback');

  // Increment timesPlayed for selected players
  await prisma.player.updateMany({
    where: {
      id: {
        in: [selectedPlayers.goodPlayerId, selectedPlayers.evilPlayerId],
      },
    },
    data: {
      timesPlayed: {
        increment: 1,
      },
    },
  });

  console.log(`📈 [Create Round] Incremented timesPlayed for selected players`);

  // Create round with safety tracking
  const round = await prisma.round.create({
    data: {
      gameId,
      roundNumber,
      referenceImageUrl,
      referencePrompt,
      referenceImageStatus: imageGenerationSucceeded ? 'COMPLETED' : 'FAILED',
      referenceImageError: imageGenerationSucceeded ? null : 'Failed to generate reference image',
      referenceImageAttempts: 3,
      goodPlayerId: selectedPlayers.goodPlayerId,
      evilPlayerId: selectedPlayers.evilPlayerId,
      status: RoundStatus.PROMPTING,
      startedAt: new Date(),
      promptingDeadline: new Date(Date.now() + 50000), // 50 seconds from now
      autoCompleted: false,
      allImagesReady: false,  // NEW: Not ready until voting starts
    },
    include: {
      game: {
        include: {
          players: true,
        },
      },
    },
  });

  // Log warning if reference image failed
  if (!imageGenerationSucceeded) {
    console.error(`🚨 [Create Round] CRITICAL: Reference image generation failed, using fallback`);
  }

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
 * Generate images for submitted prompts with SAFETY TRACKING
 * OPTIMIZED: Generates images in PARALLEL for maximum speed
 * SAFE: Waits for ALL images before proceeding to voting
 */
async function generateImagesForSubmissions(roundId: string) {
  console.log(`🎨 [Image Generation] Starting SAFE parallel generation for round ${roundId}`);
  const startTime = Date.now();

  // Fetch round with game
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true },
  });

  if (!round) {
    throw new Error(`Round ${roundId} not found`);
  }

  const gameCode = round.game.code;
  const io = (global as any).io;

  // Update round to track generation start
  await prisma.round.update({
    where: { id: roundId },
    data: { imageGenerationStartedAt: new Date() },
  });

  const submissions = await prisma.submission.findMany({
    where: { roundId },
  });

  // Generate images in PARALLEL with RETRY logic and PROGRESS tracking
  const updatePromises = submissions.map(async (submission) => {
    console.log(`🎨 Generating image for ${submission.team} team...`);

    // Update status to GENERATING
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        imageStatus: 'GENERATING',
        generationAttempts: { increment: 1 }
      },
    });

    // Broadcast progress to clients
    if (io) {
      io.to(`game:${gameCode}`).emit('image:generation-progress', {
        team: submission.team,
        status: 'generating',
        roundId,
      });
    }

    // Enhance prompt
    const { enhanced, original } = await enhancePrompt(submission.prompt);
    console.log(`   Original: "${original}"`);
    if (enhanced !== original) {
      console.log(`   Enhanced: "${enhanced}"`);
    }

    // Generate with retry logic
    const result = await generateImageWithRetry(enhanced, {
      quality: 'standard',
      size: '1024x1024',  // SeedDream-4 requires minimum 1024x1024
      team: submission.team,
      gameCode: gameCode,
    }, 3); // 3 retries max

    // Update submission based on result
    if (result.error) {
      console.error(`❌ Failed to generate image for ${submission.team}:`, result.error);

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          imageStatus: 'FAILED',
          imageError: result.error,
          imageUrl: 'https://picsum.photos/1024/1024?random=error', // Fallback
        },
      });

      // Broadcast error to clients
      if (io) {
        io.to(`game:${gameCode}`).emit('image:generation-error', {
          team: submission.team,
          error: result.error,
          roundId,
        });
      }

      return null;
    }

    // Success! Update submission
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        imageUrl: result.imageUrl,
        imageStatus: 'COMPLETED',
        generatedAt: new Date(),
        imageError: null,
      },
    });

    // Broadcast success to clients
    if (io) {
      io.to(`game:${gameCode}`).emit('image:generation-complete', {
        team: submission.team,
        imageUrl: result.imageUrl,
        roundId,
      });
    }

    return updated;
  });

  // SAFETY BLOCKER: Wait for ALL images before proceeding
  const results = await Promise.allSettled(updatePromises);

  // Check if all succeeded
  const allSucceeded = results.every(r => r.status === 'fulfilled' && r.value !== null);

  const duration = Date.now() - startTime;
  console.log(`✅ [Image Generation] Completed in ${duration}ms`);
  console.log(`   Success: ${allSucceeded ? 'YES' : 'NO (some failures)'}`);

  // Update round with completion status
  const updatedRound = await prisma.round.update({
    where: { id: roundId },
    data: {
      status: RoundStatus.VOTING,
      allImagesReady: true,  // SAFETY FLAG SET
      imageGenerationCompletedAt: new Date(),
    },
    include: {
      game: true,
      submissions: { include: { player: true } },
      votes: true,
    },
  });

  // ONLY NOW broadcast voting started (with all images ready)
  if (io) {
    console.log(`📡 Broadcasting voting-started (ALL IMAGES READY) for game ${gameCode}`);
    io.to(`game:${gameCode}`).emit('round:voting-started', {
      round: updatedRound,
      submissions: updatedRound.submissions,
      allImagesReady: true,  // Explicit confirmation
    });
  }

  // Start 50-second timer to auto-complete voting if not all players vote
  setTimeout(async () => {
    try {
      // Check if round is still in voting (hasn't been completed yet)
      const currentRound = await prisma.round.findUnique({
        where: { id: roundId },
      });

      if (currentRound && currentRound.status === RoundStatus.VOTING) {
        console.log(`⏰ Voting timer expired for round ${roundId} - auto-completing`);
        await completeRound(roundId);
      }
    } catch (error) {
      console.error('Error in voting timer:', error);
    }
  }, 50000); // 50 seconds

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
    include: {
      players: {
        where: {
          connectionStatus: 'CONNECTED', // Only count connected players
        },
      },
    },
  });

  if (!game) {
    throw new NotFoundError('Game');
  }

  // Eligible voters = all CONNECTED players except the 2 prompt creators
  const eligibleVoters = game.players.length - 2;
  const currentVotes = await prisma.vote.count({
    where: { roundId },
  });

  console.log(`🗳️ Voting progress: ${currentVotes}/${eligibleVoters} votes (${game.players.length} connected players, 2 are prompt creators)`);

  if (currentVotes >= eligibleVoters) {
    // All votes in, complete the round
    console.log('✅ All eligible voters have voted - completing round');
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
  const totalVotes = votes.length;

  // Determine winner based on votes
  let winningTeam: TeamType | null = null;
  let roundMessage = '';

  if (totalVotes === 0) {
    // No votes received - no winner, no points
    winningTeam = null;
    roundMessage = 'No votes received - round complete with no winner';
    console.log(`⚠️ [Round Complete] ${roundMessage}`);
  } else if (goodVotes === evilVotes) {
    // Tie vote - no winner, no points
    winningTeam = null;
    roundMessage = `Tie vote (${goodVotes}-${evilVotes}) - no winner`;
    console.log(`⚖️ [Round Complete] ${roundMessage}`);
  } else {
    // Clear winner
    winningTeam = goodVotes > evilVotes ? TeamType.GOOD : TeamType.EVIL;
    roundMessage = `${winningTeam} team wins (Good: ${goodVotes}, Evil: ${evilVotes})`;
    console.log(`✅ [Round Complete] ${roundMessage}`);
  }

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

  // Update player score (award 1 point ONLY if there's a winner)
  if (winningTeam) {
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
      console.log(`🎉 [Points Awarded] Player ${winningPlayerId} on ${winningTeam} team gets +1 point`);
    }
  } else {
    console.log(`🚫 [No Points] ${roundMessage} - no points awarded`);
  }

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

/**
 * Auto-complete round when timer expires
 * Handles three cases:
 * 1. Both submitted: Do nothing (normal flow continues)
 * 2. One submitted: Winner is the team that submitted
 * 3. None submitted: Move to next round with no winner
 */
export async function autoCompleteRoundOnTimeout(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      submissions: true,
      game: { include: { players: true } },
    },
  });

  if (!round) {
    throw new NotFoundError('Round');
  }

  // Already completed or not in prompting phase
  if (round.status !== RoundStatus.PROMPTING) {
    console.log(`⏰ [Auto-Complete] Round ${roundId} is not in PROMPTING status (${round.status})`);
    return null;
  }

  const hasGoodSubmission = round.submissions.some((s: any) => s.team === TeamType.GOOD);
  const hasEvilSubmission = round.submissions.some((s: any) => s.team === TeamType.EVIL);

  console.log(`⏰ [Auto-Complete] Round ${roundId} timeout - Good: ${hasGoodSubmission}, Evil: ${hasEvilSubmission}`);

  // Case 1: Both submitted (normal flow - don't auto-complete)
  if (hasGoodSubmission && hasEvilSubmission) {
    console.log(`✅ [Auto-Complete] Both teams submitted - continuing normal flow`);
    return null;
  }

  // Case 2: One team submitted, other didn't - Auto-win
  if (hasGoodSubmission || hasEvilSubmission) {
    const winningTeam = hasGoodSubmission ? TeamType.GOOD : TeamType.EVIL;
    const winningPlayerId = winningTeam === TeamType.GOOD
      ? round.goodPlayerId
      : round.evilPlayerId;

    console.log(`🏆 [Auto-Complete] ${winningTeam} team wins by default (opponent didn't submit)`);

    // Award point to winner
    if (winningPlayerId) {
      await prisma.player.update({
        where: { id: winningPlayerId },
        data: { score: { increment: 1 } },
      });
    }

    // Complete round
    const completedRound = await prisma.round.update({
      where: { id: roundId },
      data: {
        status: RoundStatus.COMPLETE,
        endedAt: new Date(),
        winningTeam,
        autoCompleted: true,
      },
      include: {
        game: true,
        submissions: { include: { player: true } },
        votes: true,
      },
    });

    // Fetch updated game with players (to get updated scores)
    const updatedGame = await prisma.game.findUnique({
      where: { id: round.gameId },
      include: { players: true },
    });

    // Broadcast round completed
    const io = (global as any).io;
    if (io && round.game) {
      const gameCode = round.game.code;
      console.log(`📡 Broadcasting round:auto-completed for game ${gameCode}`);

      const roundWithPlayers = {
        ...completedRound,
        game: {
          ...completedRound.game,
          players: updatedGame?.players || [],
        },
      };

      io.to(`game:${gameCode}`).emit('round:auto-completed', {
        round: roundWithPlayers,
        winner: winningTeam,
        reason: 'timeout',
        message: `${winningTeam === TeamType.GOOD ? 'Good' : 'Evil'} team wins by default!`,
      });

      // Also broadcast updated game state with new scores
      if (updatedGame) {
        const gameWithRound: any = {
          ...updatedGame,
          currentRound: completedRound,
        };
        io.to(`game:${gameCode}`).emit('game:updated', { game: gameWithRound });
      }
    }

    return completedRound;
  }

  // Case 3: Neither submitted - skip round
  console.log(`⏭️ [Auto-Complete] Neither team submitted - skipping round`);

  const skippedRound = await prisma.round.update({
    where: { id: roundId },
    data: {
      status: RoundStatus.COMPLETE,
      endedAt: new Date(),
      winningTeam: null, // No winner
      autoCompleted: true,
    },
    include: {
      game: true,
      submissions: { include: { player: true } },
      votes: true,
    },
  });

  // Fetch game for broadcast
  const game = await prisma.game.findUnique({
    where: { id: round.gameId },
    include: { players: true },
  });

  // Broadcast round skipped
  const io = (global as any).io;
  if (io && round.game) {
    const gameCode = round.game.code;
    console.log(`📡 Broadcasting round:skipped for game ${gameCode}`);

    const roundWithPlayers = {
      ...skippedRound,
      game: {
        ...skippedRound.game,
        players: game?.players || [],
      },
    };

    io.to(`game:${gameCode}`).emit('round:skipped', {
      round: roundWithPlayers,
      reason: 'no-submissions',
      message: 'Round skipped - no prompts submitted',
    });

    // Broadcast updated game state
    if (game) {
      const gameWithRound: any = {
        ...game,
        currentRound: skippedRound,
      };
      io.to(`game:${gameCode}`).emit('game:updated', { game: gameWithRound });
    }
  }

  return skippedRound;
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
