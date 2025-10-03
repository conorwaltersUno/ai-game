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
 * Excludes recently selected players if provided
 */
export function selectRoundPlayers(
  players: Player[],
  recentlySelected: string[] = []
): { goodPlayerId: string; evilPlayerId: string } | null {
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

  const goodPlayer = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
  const evilPlayer = evilPlayers[Math.floor(Math.random() * evilPlayers.length)];

  return {
    goodPlayerId: (goodPlayer as any).id,
    evilPlayerId: (evilPlayer as any).id,
  };
}
