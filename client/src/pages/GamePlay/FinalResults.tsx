import { useState, useEffect } from 'react';
import TeamBadge from '../../components/TeamBadge';

interface FinalResultsProps {
  game: any;
}

export default function FinalResults({ game }: FinalResultsProps) {
  const [rounds, setRounds] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all completed rounds for this game
    const fetchRounds = async () => {
      try {
        const response = await fetch(`/api/games/${game.code}/rounds`);
        const data = await response.json();
        setRounds(data.rounds || []);
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      }
    };

    if (game?.code) {
      fetchRounds();
    }
  }, [game?.code]);

  // Calculate team scores
  const goodPlayers = game.players?.filter((p: any) => p.team === 'GOOD') || [];
  const evilPlayers = game.players?.filter((p: any) => p.team === 'EVIL') || [];
  const goodScore = goodPlayers.reduce((sum: number, p: any) => sum + p.score, 0);
  const evilScore = evilPlayers.reduce((sum: number, p: any) => sum + p.score, 0);

  const overallWinner = goodScore > evilScore ? 'GOOD' : goodScore < evilScore ? 'EVIL' : 'TIE';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">
              🏆 Game Complete! 🏆
            </h1>
            {overallWinner !== 'TIE' ? (
              <>
                <div className="inline-block mb-4">
                  <TeamBadge team={overallWinner as any} size="lg" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {overallWinner === 'GOOD' ? 'Good' : 'Evil'} Team Wins!
                </p>
              </>
            ) : (
              <p className="text-3xl font-bold text-white">It's a Tie!</p>
            )}
          </div>

          {/* Final Scores */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className={`rounded-xl p-6 text-center border-4 ${
              overallWinner === 'GOOD' ? 'bg-good/30 border-good' : 'bg-good/10 border-good/30'
            }`}>
              <TeamBadge team="GOOD" size="lg" />
              <p className="text-5xl font-bold text-white mt-4">{goodScore}</p>
              <p className="text-green-200 mt-2">Final Score</p>
              {overallWinner === 'GOOD' && <div className="text-6xl mt-4">👑</div>}
            </div>

            <div className={`rounded-xl p-6 text-center border-4 ${
              overallWinner === 'EVIL' ? 'bg-evil/30 border-evil' : 'bg-evil/10 border-evil/30'
            }`}>
              <TeamBadge team="EVIL" size="lg" />
              <p className="text-5xl font-bold text-white mt-4">{evilScore}</p>
              <p className="text-red-200 mt-2">Final Score</p>
              {overallWinner === 'EVIL' && <div className="text-6xl mt-4">👑</div>}
            </div>
          </div>

          {/* Round Breakdown */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              Round Breakdown
            </h2>
            <div className="space-y-8">
              {rounds.map((round) => {
                const goodSubmission = round.submissions?.find((s: any) => s.team === 'GOOD');
                const evilSubmission = round.submissions?.find((s: any) => s.team === 'EVIL');
                const goodPlayer = game.players?.find((p: any) => p.id === round.goodPlayerId);
                const evilPlayer = game.players?.find((p: any) => p.id === round.evilPlayerId);
                const goodVotes = round.votes?.filter((v: any) => v.votedTeam === 'GOOD').length || 0;
                const evilVotes = round.votes?.filter((v: any) => v.votedTeam === 'EVIL').length || 0;
                const winningPlayer = round.winningTeam === 'GOOD' ? goodPlayer : evilPlayer;
                const losingPlayer = round.winningTeam === 'GOOD' ? evilPlayer : goodPlayer;

                return (
                  <div
                    key={round.id}
                    className="bg-white/5 rounded-xl p-6 border border-white/10"
                  >
                    {/* Round Header with Winner/Loser Info */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-3xl font-bold text-white">
                          Round {round.roundNumber}
                        </h3>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <TeamBadge team={round.winningTeam} size="sm" />
                            <span className="text-green-400 font-bold text-lg">
                              🏆 {winningPlayer?.name || 'Unknown'} wins!
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-end text-sm">
                            <TeamBadge team={round.winningTeam === 'GOOD' ? 'EVIL' : 'GOOD'} size="sm" />
                            <span className="text-red-400">
                              {losingPlayer?.name || 'Unknown'} loses
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Vote Score */}
                      <div className="flex items-center justify-center gap-4 bg-white/10 rounded-lg py-3">
                        <div className="flex items-center gap-2">
                          <TeamBadge team="GOOD" size="sm" />
                          <span className="text-white font-bold">{goodPlayer?.name}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {goodVotes} - {evilVotes}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{evilPlayer?.name}</span>
                          <TeamBadge team="EVIL" size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Images and Players */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Reference Image */}
                      <div className="text-center">
                        <p className="text-purple-200 mb-2 font-bold text-lg">📸 Reference</p>
                        <img
                          src={round.referenceImageUrl}
                          alt="Reference"
                          className="rounded-xl shadow-lg w-full border-2 border-purple-400/50"
                        />
                        <div className="mt-2 bg-purple-500/20 rounded-lg p-2">
                          <p className="text-xs text-purple-200">
                            {round.referencePrompt}
                          </p>
                        </div>
                      </div>

                      {/* Good Submission */}
                      <div className="text-center">
                        <div className="mb-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <TeamBadge team="GOOD" size="md" />
                            <p className="text-white font-bold text-lg">{goodPlayer?.name || 'Unknown'}</p>
                          </div>
                          {round.winningTeam === 'GOOD' && (
                            <div className="text-3xl">👑</div>
                          )}
                        </div>
                        <img
                          src={goodSubmission?.imageUrl}
                          alt="Good team"
                          className={`rounded-xl shadow-lg w-full border-4 ${
                            round.winningTeam === 'GOOD' ? 'border-good shadow-good/50' : 'border-good/30'
                          }`}
                        />
                        <div className="mt-2 bg-white/10 rounded-lg p-3">
                          <p className="text-sm text-gray-300 italic">
                            "{goodSubmission?.prompt}"
                          </p>
                        </div>
                        <div className={`mt-2 px-4 py-2 rounded-lg font-bold ${
                          round.winningTeam === 'GOOD'
                            ? 'bg-green-500/30 text-green-200'
                            : 'bg-red-500/30 text-red-200'
                        }`}>
                          {goodVotes} vote{goodVotes !== 1 ? 's' : ''}
                          {round.winningTeam === 'GOOD' ? ' ✓' : ''}
                        </div>
                      </div>

                      {/* Evil Submission */}
                      <div className="text-center">
                        <div className="mb-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <TeamBadge team="EVIL" size="md" />
                            <p className="text-white font-bold text-lg">{evilPlayer?.name || 'Unknown'}</p>
                          </div>
                          {round.winningTeam === 'EVIL' && (
                            <div className="text-3xl">👑</div>
                          )}
                        </div>
                        <img
                          src={evilSubmission?.imageUrl}
                          alt="Evil team"
                          className={`rounded-xl shadow-lg w-full border-4 ${
                            round.winningTeam === 'EVIL' ? 'border-evil shadow-evil/50' : 'border-evil/30'
                          }`}
                        />
                        <div className="mt-2 bg-white/10 rounded-lg p-3">
                          <p className="text-sm text-gray-300 italic">
                            "{evilSubmission?.prompt}"
                          </p>
                        </div>
                        <div className={`mt-2 px-4 py-2 rounded-lg font-bold ${
                          round.winningTeam === 'EVIL'
                            ? 'bg-green-500/30 text-green-200'
                            : 'bg-red-500/30 text-red-200'
                        }`}>
                          {evilVotes} vote{evilVotes !== 1 ? 's' : ''}
                          {round.winningTeam === 'EVIL' ? ' ✓' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return to Lobby Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-10 rounded-lg text-xl hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
