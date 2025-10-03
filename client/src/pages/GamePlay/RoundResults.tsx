import { useEffect, useState } from 'react';
import TeamBadge from '../../components/TeamBadge';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface RoundResultsProps {
  round: any;
  game: any;
}

export default function RoundResults({ round, game }: RoundResultsProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [autoAdvanceIn, setAutoAdvanceIn] = useState(5);
  const { socket } = useWebSocket();

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance countdown
  useEffect(() => {
    if (autoAdvanceIn <= 0) {
      handleNextRound();
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceIn(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAdvanceIn]);

  const isGameComplete = game.currentRound >= game.totalRounds;

  const handleNextRound = () => {
    if (!socket || !game?.code) return;

    // Don't emit next round if game is complete
    if (isGameComplete) {
      console.log('🏁 [RoundResults] Game complete, not requesting next round');
      return;
    }

    console.log('🎮 [RoundResults] Requesting next round');
    socket.emit('host:next-round', { gameCode: game.code });
  };

  const winningTeam = round.winningTeam;
  const goodSubmission = round.submissions?.find((s: any) => s.team === 'GOOD');
  const evilSubmission = round.submissions?.find((s: any) => s.team === 'EVIL');

  // Find the actual players who participated
  console.log('🔍 [RoundResults] Looking up players:');
  console.log('   game.players:', game.players?.length || 0);
  console.log('   round.goodPlayerId:', round.goodPlayerId);
  console.log('   round.evilPlayerId:', round.evilPlayerId);
  console.log('   round.game?.players:', round.game?.players?.length || 0);

  // Try to find players from round.game first (freshest data), then fall back to game
  const playersArray = round.game?.players || game.players || [];
  console.log('   Using players array with length:', playersArray.length);

  const goodPlayer = playersArray.find((p: any) => p.id === round.goodPlayerId);
  const evilPlayer = playersArray.find((p: any) => p.id === round.evilPlayerId);
  const winningPlayer = winningTeam === 'GOOD' ? goodPlayer : evilPlayer;

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
      {/* Confetti effect */}
      {showConfetti && (
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
              {winningTeam === 'GOOD' ? '🦸' : '😈'}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Winner Announcement */}
          <div className="text-center mb-8">
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
                wins for the {winningTeam === 'GOOD' ? 'Good' : 'Evil'} Team!
              </p>
            </div>
          </div>

          {/* Players Revealed */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`rounded-xl p-4 text-center ${
              winningTeam === 'GOOD' ? 'bg-good/30 border-2 border-good' : 'bg-good/10 border border-good/30'
            }`}>
              <TeamBadge team="GOOD" size="md" />
              <p className="text-white font-bold text-lg mt-2">
                {goodPlayer?.name || 'Unknown'}
              </p>
              <p className="text-green-200 text-sm mt-1">Good Team Player</p>
              {winningTeam === 'GOOD' && <div className="text-3xl mt-2">👑</div>}
            </div>
            <div className={`rounded-xl p-4 text-center ${
              winningTeam === 'EVIL' ? 'bg-evil/30 border-2 border-evil' : 'bg-evil/10 border border-evil/30'
            }`}>
              <TeamBadge team="EVIL" size="md" />
              <p className="text-white font-bold text-lg mt-2">
                {evilPlayer?.name || 'Unknown'}
              </p>
              <p className="text-red-200 text-sm mt-1">Evil Team Player</p>
              {winningTeam === 'EVIL' && <div className="text-3xl mt-2">👑</div>}
            </div>
          </div>

          {/* Vote Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`rounded-xl p-6 text-center border-4 ${
              winningTeam === 'GOOD' ? 'bg-good/30 border-good' : 'bg-good/10 border-good/30'
            }`}>
              <TeamBadge team="GOOD" size="lg" />
              <p className="text-4xl font-bold text-white mt-4">{goodVotes}</p>
              <p className="text-green-200">votes</p>
              {winningTeam === 'GOOD' && <div className="text-4xl mt-2">👑</div>}
            </div>

            <div className={`rounded-xl p-6 text-center border-4 ${
              winningTeam === 'EVIL' ? 'bg-evil/30 border-evil' : 'bg-evil/10 border-evil/30'
            }`}>
              <TeamBadge team="EVIL" size="lg" />
              <p className="text-4xl font-bold text-white mt-4">{evilVotes}</p>
              <p className="text-red-200">votes</p>
              {winningTeam === 'EVIL' && <div className="text-4xl mt-2">👑</div>}
            </div>
          </div>

          {/* Winning Image */}
          <div className="mb-8">
            <h3 className="text-white font-bold text-center mb-4 text-2xl">
              Winning Image
            </h3>
            <div className="flex justify-center gap-6">
              {/* Reference */}
              <div className="text-center">
                <p className="text-purple-200 mb-2 font-bold">Reference</p>
                <img
                  src={round.referenceImageUrl}
                  alt="Reference"
                  className="rounded-xl shadow-2xl w-64 border-4 border-yellow-400/50"
                />
              </div>

              {/* Winner */}
              <div className="text-center">
                <p className="text-white mb-2 font-bold">
                  <TeamBadge team={winningTeam} size="md" /> Winner
                </p>
                <img
                  src={winningTeam === 'GOOD' ? goodSubmission?.imageUrl : evilSubmission?.imageUrl}
                  alt="Winner"
                  className={`rounded-xl shadow-2xl w-64 border-4 ${
                    winningTeam === 'GOOD' ? 'border-good' : 'border-evil'
                  }`}
                />
                <div className="mt-3 bg-white/10 rounded-lg p-3 max-w-xs mx-auto">
                  <p className="text-sm text-gray-300 italic">
                    "{winningTeam === 'GOOD' ? goodSubmission?.prompt : evilSubmission?.prompt}"
                  </p>
                </div>
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
                <p className="text-green-200 text-sm">points</p>
              </div>
              <div className="text-center">
                <TeamBadge team="EVIL" size="md" />
                <p className="text-3xl font-bold text-white mt-2">{evilScore}</p>
                <p className="text-red-200 text-sm">points</p>
              </div>
            </div>
          </div>

          {/* Next Round Message */}
          <div className="mt-8 text-center">
            <div className="text-4xl mb-2 animate-pulse">{isGameComplete ? '🏁' : '⏭️'}</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
