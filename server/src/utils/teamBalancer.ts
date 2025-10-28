import { TeamType } from '@prisma/client';

interface Player {
  team: TeamType;
}

/**
 * Assign team to new player based on current team balance
 * Assigns to team with fewer players, or random if equal
 */
export function assignTeam(currentPlayers: Player[]): TeamType {
  const goodCount = currentPlayers.filter(p => p.team === TeamType.GOOD).length;
  const evilCount = currentPlayers.filter(p => p.team === TeamType.EVIL).length;

  // If teams are equal, assign randomly
  if (goodCount === evilCount) {
    return Math.random() < 0.5 ? TeamType.GOOD : TeamType.EVIL;
  }

  // Assign to team with fewer players
  return goodCount < evilCount ? TeamType.GOOD : TeamType.EVIL;
}

/**
 * Get team counts
 */
export function getTeamCounts(players: Player[]): { good: number; evil: number } {
  return {
    good: players.filter(p => p.team === TeamType.GOOD).length,
    evil: players.filter(p => p.team === TeamType.EVIL).length,
  };
}

/**
 * Select random player from each team for a round
 * Prioritizes players who haven't played yet (timesPlayed = 0)
 * Then prioritizes players who have played the least
 * Excludes recently selected players if provided
 */
export function selectRoundPlayers(
  players: Player[],
  recentlySelected: string[] = []
): { goodPlayerId: string; evilPlayerId: string } | null {
  // Filter by team and exclude recently selected
  const goodPlayers = players.filter(
    (p: any) => p.team === TeamType.GOOD && !recentlySelected.includes(p.id)
  );
  const evilPlayers = players.filter(
    (p: any) => p.team === TeamType.EVIL && !recentlySelected.includes(p.id)
  );

  // Need at least one player from each team
  if (goodPlayers.length === 0 || evilPlayers.length === 0) {
    return null;
  }

  // Helper function to select player with fewest plays
  const selectPlayer = (teamPlayers: any[]) => {
    // Sort by timesPlayed (ascending), then randomize within same play count
    const sorted = teamPlayers.sort((a, b) => {
      if (a.timesPlayed !== b.timesPlayed) {
        return a.timesPlayed - b.timesPlayed;
      }
      return Math.random() - 0.5; // Random if equal
    });

    // Get all players with the minimum play count
    const minPlays = sorted[0].timesPlayed;
    const leastPlayedPlayers = sorted.filter(p => p.timesPlayed === minPlays);

    // Randomly select from players with least plays
    return leastPlayedPlayers[Math.floor(Math.random() * leastPlayedPlayers.length)];
  };

  const goodPlayer = selectPlayer(goodPlayers);
  const evilPlayer = selectPlayer(evilPlayers);

  return {
    goodPlayerId: goodPlayer.id,
    evilPlayerId: evilPlayer.id,
  };
}
