import Timer from '../../components/Timer';
import TeamBadge from '../../components/TeamBadge';

interface SpectatorProps {
  round: any;
  game: any;
  player?: any;
}

export default function Spectator({ round, game, player }: SpectatorProps) {
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
            <div className="bg-good/30 border-2 border-good rounded-xl p-4 text-center">
              <div className="text-good-light text-sm font-bold mb-1">🦸 GOOD TEAM</div>
              <div className="text-white text-5xl font-bold">{goodScore}</div>
              <div className="text-green-200 text-xs mt-1">points</div>
            </div>
            <div className="bg-evil/30 border-2 border-evil rounded-xl p-4 text-center">
              <div className="text-evil-light text-sm font-bold mb-1">😈 EVIL TEAM</div>
              <div className="text-white text-5xl font-bold">{evilScore}</div>
              <div className="text-red-200 text-xs mt-1">points</div>
            </div>
          </div>

          {/* Reference Image */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-center mb-4 text-xl">
              📸 Reference Image
            </h3>
            <div className="flex justify-center">
              <img
                src={round.referenceImageUrl}
                alt="Reference"
                className="rounded-xl shadow-2xl max-w-md w-full border-4 border-white/30"
              />
            </div>
          </div>

          {/* Active Players - Anonymous */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-center mb-4 text-lg">
              Battle in Progress
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Good Team */}
              <div className="bg-good/20 border-2 border-good rounded-xl p-4 text-center">
                <TeamBadge team="GOOD" size="md" />
                <p className="text-white font-bold text-lg mt-2">
                  Good Team
                </p>
                <div className="text-green-200 text-sm mt-1 animate-pulse">
                  ✍️ Writing prompt...
                </div>
              </div>

              {/* Evil Team */}
              <div className="bg-evil/20 border-2 border-evil rounded-xl p-4 text-center">
                <TeamBadge team="EVIL" size="md" />
                <p className="text-white font-bold text-lg mt-2">
                  Evil Team
                </p>
                <div className="text-red-200 text-sm mt-1 animate-pulse">
                  ✍️ Writing prompt...
                </div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <Timer seconds={30} className="mb-8" />

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
