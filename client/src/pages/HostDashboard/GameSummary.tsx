import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamBadge from '../../components/TeamBadge';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useGame } from '../../contexts/GameContext';

interface GameSummaryProps {
  game: any;
  rounds: any[];
}

export default function GameSummary({ game, rounds }: GameSummaryProps) {
  const navigate = useNavigate();
  const { socket } = useWebSocket();
  const { setGame } = useGame();
  const [isResetting, setIsResetting] = useState(false);

  // Calculate scores
  const goodPlayers = game.players?.filter((p: any) => p.team === 'GOOD') || [];
  const evilPlayers = game.players?.filter((p: any) => p.team === 'EVIL') || [];
  const goodScore = goodPlayers.reduce((sum: number, p: any) => sum + p.score, 0);
  const evilScore = evilPlayers.reduce((sum: number, p: any) => sum + p.score, 0);
  const overallWinner = goodScore > evilScore ? 'GOOD' : goodScore < evilScore ? 'EVIL' : 'TIE';

  useEffect(() => {
    if (!socket) return;

    // Listen for reset confirmation
    socket.on('game:reset-to-lobby', ({ game: resetGame }) => {
      console.log('🔄 Game reset confirmed, updating state');
      setGame(resetGame);
      setIsResetting(false);
      // Navigate back to host dashboard
      navigate('/host');
    });

    return () => {
      socket.off('game:reset-to-lobby');
    };
  }, [socket, setGame, navigate]);

  const handleExitToLobby = async () => {
    if (!socket || !game?.code) return;

    setIsResetting(true);

    try {
      // Reset game on server
      console.log('📡 Emitting host:reset-to-lobby event');
      socket.emit('host:reset-to-lobby', { gameCode: game.code });

      // Timeout fallback after 5 seconds
      setTimeout(() => {
        if (isResetting) {
          console.log('⏰ Reset timeout, navigating anyway');
          setIsResetting(false);
          navigate('/host');
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to reset game:', error);
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Host Badge */}
          <div className="bg-purple-500/20 border-2 border-purple-400 rounded-lg px-4 py-2 mb-6 text-center">
            <span className="text-purple-200 font-bold text-lg">👑 HOST VIEW - GAME SUMMARY</span>
          </div>

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
                  {overallWinner === 'GOOD' ? 'Team 1' : 'Team 2'} Wins!
                </p>
              </>
            ) : (
              <p className="text-3xl font-bold text-white">It's a Tie!</p>
            )}
          </div>

          {/* Final Scores */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className={`rounded-xl p-6 text-center border-4 ${
              overallWinner === 'GOOD' ? 'bg-team1/30 border-team1' : 'bg-team1/10 border-team1/30'
            }`}>
              <TeamBadge team="GOOD" size="lg" />
              <p className="text-5xl font-bold text-white mt-4">{goodScore}</p>
              <p className="text-blue-200 mt-2">Final Score</p>
              <div className="mt-4 text-sm text-blue-100">
                {goodPlayers.map((p: any) => (
                  <div key={p.id}>{p.name}: {p.score} pts</div>
                ))}
              </div>
              {overallWinner === 'GOOD' && <div className="text-6xl mt-4">👑</div>}
            </div>

            <div className={`rounded-xl p-6 text-center border-4 ${
              overallWinner === 'EVIL' ? 'bg-team2/30 border-team2' : 'bg-team2/10 border-team2/30'
            }`}>
              <TeamBadge team="EVIL" size="lg" />
              <p className="text-5xl font-bold text-white mt-4">{evilScore}</p>
              <p className="text-purple-200 mt-2">Final Score</p>
              <div className="mt-4 text-sm text-purple-100">
                {evilPlayers.map((p: any) => (
                  <div key={p.id}>{p.name}: {p.score} pts</div>
                ))}
              </div>
              {overallWinner === 'EVIL' && <div className="text-6xl mt-4">👑</div>}
            </div>
          </div>

          {/* Game Stats */}
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              📊 Game Statistics
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-4xl font-bold text-white">{rounds.length}</p>
                <p className="text-purple-200">Total Rounds</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">{game.players?.length || 0}</p>
                <p className="text-purple-200">Players</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">
                  {Math.max(goodScore, evilScore) - Math.min(goodScore, evilScore)}
                </p>
                <p className="text-purple-200">Point Difference</p>
              </div>
            </div>
          </div>

          {/* Round Breakdown - Condensed for host */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Round-by-Round Results
            </h2>
            <div className="space-y-2">
              {rounds.map((round) => {
                const goodVotes = round.votes?.filter((v: any) => v.votedTeam === 'GOOD').length || 0;
                const evilVotes = round.votes?.filter((v: any) => v.votedTeam === 'EVIL').length || 0;

                // Find players for this round
                const goodPlayer = game.players?.find((p: any) => p.id === round.goodPlayerId);
                const evilPlayer = game.players?.find((p: any) => p.id === round.evilPlayerId);
                const winningPlayer = round.winningTeam === 'GOOD' ? goodPlayer : evilPlayer;

                return (
                  <div
                    key={round.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between"
                  >
                    <span className="text-white font-bold">Round {round.roundNumber}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TeamBadge team="GOOD" size="sm" />
                        <span className="text-white">{goodVotes}</span>
                      </div>
                      <span className="text-white/50">vs</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{evilVotes}</span>
                        <TeamBadge team="EVIL" size="sm" />
                      </div>
                      <div className="ml-4">
                        {round.winningTeam && winningPlayer && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-blue-400">Winner:</span>
                            <span className={`text-sm font-semibold ${round.winningTeam === 'GOOD' ? 'text-blue-400' : 'text-purple-400'}`}>
                              {round.winningTeam === 'GOOD' ? 'Team 1' : 'Team 2'}
                            </span>
                            <span className="text-sm text-white font-semibold">{winningPlayer.name}</span>
                          </div>
                        )}
                        {round.winningTeam && !winningPlayer && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-400">Winner:</span>
                            <TeamBadge team={round.winningTeam} size="sm" />
                          </div>
                        )}
                        {!round.winningTeam && round.autoCompleted && (
                          <span className="text-sm text-yellow-400">Skipped</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Host Controls */}
          <div className="text-center mt-8 space-y-4">
            <p className="text-purple-200 mb-4">
              All players are still in the lobby. You can start another game or exit.
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleExitToLobby}
                disabled={isResetting}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-10 rounded-lg text-xl hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isResetting ? '🔄 Resetting...' : '🚪 Exit to Lobby'}
              </button>
            </div>

            <p className="text-sm text-white/50">
              Game Code: <span className="font-mono font-bold">{game.code}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
