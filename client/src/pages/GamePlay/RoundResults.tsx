import { useEffect, useState, useCallback } from 'react';
import TeamBadge from '../../components/TeamBadge';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useGame } from '../../contexts/GameContext';

interface RoundResultsProps {
  round: any;
  game: any;
}

export default function RoundResults({ round, game }: RoundResultsProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [autoAdvanceIn, setAutoAdvanceIn] = useState(10); // Changed from 5 to 10 seconds
  const { socket } = useWebSocket();
  const { player } = useGame();

  // Only host can advance rounds (host has no player object)
  const isHost = !player;

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const isGameComplete = game.currentRound >= game.totalRounds;

  const handleNextRound = useCallback(() => {
    if (!socket || !game?.code) {
      console.log('⚠️ [RoundResults] Cannot advance: missing socket or game code');
      return;
    }

    // Don't emit next round if game is complete
    if (isGameComplete) {
      console.log('🏁 [RoundResults] Game complete, not requesting next round');
      return;
    }

    console.log('🎮 [RoundResults] Requesting next round for game:', game.code);
    socket.emit('host:next-round', { gameCode: game.code });
  }, [socket, game?.code, isGameComplete]);

  // Auto-advance countdown (host only)
  useEffect(() => {
    // Only host can trigger auto-advance
    if (!isHost) return;

    if (autoAdvanceIn <= 0) {
      handleNextRound();
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceIn(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAdvanceIn, isHost, handleNextRound]);

  const winningTeam = round.winningTeam; // May be null
  const hasWinner = !!winningTeam;
  const goodSubmission = round.submissions?.find((s: any) => s.team === 'GOOD');
  const evilSubmission = round.submissions?.find((s: any) => s.team === 'EVIL');

  // Find the actual players who participated
  console.log('🔍 [RoundResults] Looking up players:');
  console.log('   game.players:', game.players?.length || 0);
  console.log('   round.goodPlayerId:', round.goodPlayerId);
  console.log('   round.evilPlayerId:', round.evilPlayerId);
  console.log('   round.game?.players:', round.game?.players?.length || 0);
  console.log('   winningTeam:', winningTeam || 'NO WINNER');

  // Try to find players from round.game first (freshest data), then fall back to game
  const playersArray = round.game?.players || game.players || [];
  console.log('   Using players array with length:', playersArray.length);

  const goodPlayer = playersArray.find((p: any) => p.id === round.goodPlayerId);
  const evilPlayer = playersArray.find((p: any) => p.id === round.evilPlayerId);
  const winningPlayer = hasWinner ? (winningTeam === 'GOOD' ? goodPlayer : evilPlayer) : null;

  console.log('   Found goodPlayer:', goodPlayer?.name || 'NOT FOUND');
  console.log('   Found evilPlayer:', evilPlayer?.name || 'NOT FOUND');

  // Count votes
  const goodVotes = round.votes?.filter((v: any) => v.votedTeam === 'GOOD').length || 0;
  const evilVotes = round.votes?.filter((v: any) => v.votedTeam === 'EVIL').length || 0;

  // Get team scores (use fresh playersArray that includes round.game.players)
  const goodPlayers = playersArray.filter((p: any) => p.team === 'GOOD');
  const evilPlayers = playersArray.filter((p: any) => p.team === 'EVIL');
  const goodScore = goodPlayers.reduce((sum: number, p: any) => sum + p.score, 0);
  const evilScore = evilPlayers.reduce((sum: number, p: any) => sum + p.score, 0);

  console.log('📊 [RoundResults] Team scores:');
  console.log('   Good team players:', goodPlayers.length, 'Score:', goodScore);
  console.log('   Evil team players:', evilPlayers.length, 'Score:', evilScore);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Confetti effect - only show if there's a winner */}
      {showConfetti && hasWinner && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {winningTeam === 'GOOD' ? '⭐' : '⭐'}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Winner Announcement or No Winner */}
          <div className="text-center mb-8">
            {hasWinner ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h1 className="text-5xl font-bold text-white mb-4">
                  Round {round.roundNumber} Complete!
                </h1>
                <div className="inline-block">
                  <TeamBadge team={winningTeam} size="lg" />
                  <p className="text-3xl font-bold text-white mt-4">
                    {winningPlayer?.name || 'Unknown Player'}
                  </p>
                  <p className="text-xl text-white/80 mt-1">
                    wins for {winningTeam === 'GOOD' ? 'Team 1' : 'Team 2'}!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🤷</div>
                <h1 className="text-5xl font-bold text-white mb-4">
                  Round {round.roundNumber} Complete!
                </h1>
                <div className="bg-yellow-500/20 border-2 border-yellow-500/50 rounded-xl p-6 max-w-lg mx-auto">
                  <p className="text-2xl font-bold text-yellow-200 mb-2">
                    {goodVotes === 0 && evilVotes === 0 ? '⚠️ No Votes Received' : '⚖️ Tie Vote!'}
                  </p>
                  <p className="text-lg text-yellow-100">
                    {goodVotes === 0 && evilVotes === 0
                      ? 'No one voted this round - no points awarded to either team'
                      : `Both teams tied with ${goodVotes} votes - no points awarded`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Players Revealed */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`rounded-xl p-4 text-center ${
              winningTeam === 'GOOD' ? 'bg-team1/30 border-2 border-team1' : 'bg-team1/10 border border-team1/30'
            }`}>
              <TeamBadge team="GOOD" size="md" />
              <p className="text-white font-bold text-lg mt-2">
                {goodPlayer?.name || 'Unknown'}
              </p>
              <p className="text-blue-200 text-sm mt-1">Team 1 Player</p>
              {winningTeam === 'GOOD' && <div className="text-3xl mt-2">👑</div>}
            </div>
            <div className={`rounded-xl p-4 text-center ${
              winningTeam === 'EVIL' ? 'bg-team2/30 border-2 border-team2' : 'bg-team2/10 border border-team2/30'
            }`}>
              <TeamBadge team="EVIL" size="md" />
              <p className="text-white font-bold text-lg mt-2">
                {evilPlayer?.name || 'Unknown'}
              </p>
              <p className="text-purple-200 text-sm mt-1">Team 2 Player</p>
              {winningTeam === 'EVIL' && <div className="text-3xl mt-2">👑</div>}
            </div>
          </div>

          {/* Vote Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`rounded-xl p-6 text-center border-4 ${
              winningTeam === 'GOOD' ? 'bg-team1/30 border-team1' : 'bg-team1/10 border-team1/30'
            }`}>
              <TeamBadge team="GOOD" size="lg" />
              <p className="text-4xl font-bold text-white mt-4">{goodVotes}</p>
              <p className="text-blue-200">votes</p>
              {winningTeam === 'GOOD' && <div className="text-4xl mt-2">👑</div>}
            </div>

            <div className={`rounded-xl p-6 text-center border-4 ${
              winningTeam === 'EVIL' ? 'bg-team2/30 border-team2' : 'bg-team2/10 border-team2/30'
            }`}>
              <TeamBadge team="EVIL" size="lg" />
              <p className="text-4xl font-bold text-white mt-4">{evilVotes}</p>
              <p className="text-purple-200">votes</p>
              {winningTeam === 'EVIL' && <div className="text-4xl mt-2">👑</div>}
            </div>
          </div>

          {/* All Images - Reference + Both Teams */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-center mb-4 text-2xl">
              Submitted Images
            </h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {/* Reference */}
              <div className="text-center">
                <p className="text-purple-200 mb-2 font-bold">📸 Reference</p>
                <img
                  src={round.referenceImageUrl}
                  alt="Reference"
                  className="rounded-xl shadow-2xl w-56 border-4 border-yellow-400/50"
                />
              </div>

              {/* Team 1 */}
              <div className="text-center">
                <p className="text-white mb-2 font-bold flex items-center justify-center gap-2">
                  <TeamBadge team="GOOD" size="md" />
                  {winningTeam === 'GOOD' && <span className="text-2xl">👑</span>}
                </p>
                <img
                  src={goodSubmission?.imageUrl}
                  alt="Team 1"
                  className={`rounded-xl shadow-2xl w-56 border-4 ${
                    winningTeam === 'GOOD' ? 'border-team1' : 'border-team1/30'
                  }`}
                  onError={(e) => {
                    console.error('❌ Good team image failed to load:', goodSubmission?.imageUrl);
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://picsum.photos/1024/1024?random=good-error';
                  }}
                />
                <div className="mt-3 bg-white/10 rounded-lg p-2 max-w-xs mx-auto">
                  <p className="text-xs text-gray-300 italic">
                    "{goodSubmission?.prompt}"
                  </p>
                </div>
                {winningTeam === 'GOOD' && (
                  <p className="text-sm text-blue-300 font-bold mt-2">✨ Winner!</p>
                )}
              </div>

              {/* Team 2 */}
              <div className="text-center">
                <p className="text-white mb-2 font-bold flex items-center justify-center gap-2">
                  <TeamBadge team="EVIL" size="md" />
                  {winningTeam === 'EVIL' && <span className="text-2xl">👑</span>}
                </p>
                <img
                  src={evilSubmission?.imageUrl}
                  alt="Team 2"
                  className={`rounded-xl shadow-2xl w-56 border-4 ${
                    winningTeam === 'EVIL' ? 'border-team2' : 'border-team2/30'
                  }`}
                  onError={(e) => {
                    console.error('❌ Evil team image failed to load:', evilSubmission?.imageUrl);
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://picsum.photos/1024/1024?random=evil-error';
                  }}
                />
                <div className="mt-3 bg-white/10 rounded-lg p-2 max-w-xs mx-auto">
                  <p className="text-xs text-gray-300 italic">
                    "{evilSubmission?.prompt}"
                  </p>
                </div>
                {winningTeam === 'EVIL' && (
                  <p className="text-sm text-purple-300 font-bold mt-2">✨ Winner!</p>
                )}
              </div>
            </div>
          </div>

          {/* Overall Scores */}
          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="text-white font-bold text-center mb-4 text-xl">
              Overall Score
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <TeamBadge team="GOOD" size="md" />
                <p className="text-3xl font-bold text-white mt-2">{goodScore}</p>
                <p className="text-blue-200 text-sm">points</p>
              </div>
              <div className="text-center">
                <TeamBadge team="EVIL" size="md" />
                <p className="text-3xl font-bold text-white mt-2">{evilScore}</p>
                <p className="text-purple-200 text-sm">points</p>
              </div>
            </div>
          </div>

          {/* Next Round Message */}
          <div className="mt-8 text-center">
            <div className="text-4xl mb-2 animate-pulse">{isGameComplete ? '🏁' : '⏭️'}</div>
            {isHost ? (
              <>
                <p className="text-white text-lg mb-4">
                  {isGameComplete
                    ? `Game complete! Final results in ${autoAdvanceIn} seconds...`
                    : `Next round in ${autoAdvanceIn} seconds...`}
                </p>
                <button
                  onClick={handleNextRound}
                  disabled={isGameComplete && autoAdvanceIn > 0}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isGameComplete ? '🏁 View Final Results' : '⏭️ Skip to Next Round'}
                </button>
              </>
            ) : (
              <p className="text-white text-lg">
                {isGameComplete
                  ? `Waiting for final results...`
                  : `Waiting for host to start next round...`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
