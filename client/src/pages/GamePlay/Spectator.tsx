import Timer from '../../components/Timer';
import TeamBadge from '../../components/TeamBadge';

interface SpectatorProps {
  round: any;
  game: any;
  player?: any;
}

export default function Spectator({ round, game, player }: SpectatorProps) {
  // CRITICAL DEBUG
  console.log('🔍 [Spectator] Rendering with round:', {
    roundId: round?.id,
    roundNumber: round?.roundNumber,
    referenceImageUrl: round?.referenceImageUrl || '❌ MISSING!!!',
    status: round?.status,
    hasRound: !!round,
  });

  const isHost = !player;
  // Calculate team scores
  const goodScore = game.players?.filter((p: any) => p.team === 'GOOD').reduce((sum: number, p: any) => sum + p.score, 0) || 0;
  const evilScore = game.players?.filter((p: any) => p.team === 'EVIL').reduce((sum: number, p: any) => sum + p.score, 0) || 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Round {round.roundNumber} of {game.totalRounds}
            </h1>
            <div className="inline-block bg-yellow-500/20 border-2 border-yellow-500 text-yellow-200 px-6 py-3 rounded-full">
              <span className="text-2xl">👀</span>
              <span className="ml-2 font-bold">Spectating</span>
            </div>
          </div>

          {/* Team Scores */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-team1/30 border-2 border-team1 rounded-xl p-4 text-center">
              <div className="text-team1-light text-sm font-bold mb-1">TEAM 1</div>
              <div className="text-white text-5xl font-bold">{goodScore}</div>
              <div className="text-blue-200 text-xs mt-1">points</div>
            </div>
            <div className="bg-team2/30 border-2 border-team2 rounded-xl p-4 text-center">
              <div className="text-team2-light text-sm font-bold mb-1">TEAM 2</div>
              <div className="text-white text-5xl font-bold">{evilScore}</div>
              <div className="text-purple-200 text-xs mt-1">points</div>
            </div>
          </div>

          {/* Reference Image */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-center mb-4 text-xl">
              📸 Reference Image
            </h3>
            <div className="flex justify-center">
              {round.referenceImageUrl ? (
                <img
                  src={round.referenceImageUrl}
                  alt="Reference"
                  className="rounded-xl shadow-2xl max-w-md w-full border-4 border-white/30"
                  onError={(e) => {
                    console.error('❌ Reference image failed to load:', round.referenceImageUrl);
                    // Replace with fallback image
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://picsum.photos/512/512?random=fallback';
                  }}
                />
              ) : (
                <div className="rounded-xl shadow-2xl max-w-md w-full border-4 border-white/30 bg-gray-700 flex items-center justify-center h-64">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2 animate-pulse">🎨</div>
                    <p>Loading reference image...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Players - Anonymous */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-center mb-4 text-lg">
              Battle in Progress
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Team 1 */}
              <div className="bg-team1/20 border-2 border-team1 rounded-xl p-4 text-center">
                <TeamBadge team="GOOD" size="md" />
                <p className="text-white font-bold text-lg mt-2">
                  Team 1
                </p>
                <div className="text-blue-200 text-sm mt-1 animate-pulse">
                  ✍️ Writing prompt...
                </div>
              </div>

              {/* Team 2 */}
              <div className="bg-team2/20 border-2 border-team2 rounded-xl p-4 text-center">
                <TeamBadge team="EVIL" size="md" />
                <p className="text-white font-bold text-lg mt-2">
                  Team 2
                </p>
                <div className="text-purple-200 text-sm mt-1 animate-pulse">
                  ✍️ Writing prompt...
                </div>
              </div>
            </div>
          </div>

          {/* Timer - Server-synced */}
          <Timer deadline={round.promptingDeadline} className="mb-8" />

          {/* Spectator Message */}
          <div className="text-center text-purple-200">
            <p className="text-lg mb-2">
              Sit back and relax while the players create their prompts!
            </p>
            <p className="text-sm">
              {isHost
                ? "You're observing this round as the host 👀"
                : "You'll get to vote on the best image once they're generated 🗳️"
              }
            </p>
          </div>

          {/* Fun Facts / Tip */}
          <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-purple-200 font-bold mb-2">💡 Did you know?</h4>
            <p className="text-purple-100 text-sm">
              The AI will generate images based on their prompts. The better the description,
              the closer the match to the reference image!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
