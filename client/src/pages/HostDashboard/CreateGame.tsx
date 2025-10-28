import { useState } from 'react';
import { createGame } from '../../services/api';
import { useGame } from '../../contexts/GameContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

export default function CreateGame() {
  const [gameMode, setGameMode] = useState<'standard' | 'everyone'>('standard');
  const [totalRounds, setTotalRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setGame } = useGame();
  const { joinGame } = useWebSocket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use default host name since host doesn't need to enter it
      const response = await createGame('Host', totalRounds, gameMode);
      console.log('Game created:', response);

      // Join the game via WebSocket as host (for viewing only, not as a player)
      joinGame(response.game.code);

      // Fetch full game state with players array
      const { getGame } = await import('../../services/api');
      const { game: fullGame } = await getGame(response.game.code);

      // Set full game state in context
      setGame(fullGame);
      console.log('Full game state loaded:', fullGame);
    } catch (err: any) {
      console.error('Failed to create game:', err);
      setError(err.response?.data?.error?.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Create Game
        </h1>
        <p className="text-purple-200 text-center mb-8">
          Start a new Twin up! game session
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="gameMode" className="block text-white font-semibold mb-2">
              Game Mode
            </label>
            <select
              id="gameMode"
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value as 'standard' | 'everyone')}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="standard" className="bg-slate-800">
                Standard - Fixed rounds
              </option>
              <option value="everyone" className="bg-slate-800">
                Everyone Plays! - All players get a turn
              </option>
            </select>
          </div>

          {gameMode === 'standard' ? (
            <div>
              <label htmlFor="totalRounds" className="block text-white font-semibold mb-2">
                Number of Rounds
              </label>
              <select
                id="totalRounds"
                value={totalRounds}
                onChange={(e) => setTotalRounds(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {[1, 3, 5, 7, 10].map((num) => (
                  <option key={num} value={num} className="bg-slate-800">
                    {num} {num === 1 ? 'round' : 'rounds'}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="text-blue-200 font-semibold mb-1">Everyone Plays Mode</p>
                  <p className="text-blue-100 text-sm">
                    Rounds will be automatically calculated once players join the lobby. Every player is guaranteed at least one turn!
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-6 rounded-lg text-lg hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {loading ? '🎮 Creating...' : '🚀 Create Game'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-purple-200 hover:text-white transition-colors underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
