import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { joinGame as apiJoinGame } from '../../services/api';
import { useGame } from '../../contexts/GameContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import GamePlay from '../GamePlay';

export default function JoinGame() {
  const { code: urlCode } = useParams<{ code?: string }>();
  const [gameCode, setGameCode] = useState(urlCode?.toUpperCase() || '');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { game, player, setGame, setPlayer } = useGame();
  const { joinGame: wsJoinGame } = useWebSocket();

  useEffect(() => {
    if (urlCode) {
      setGameCode(urlCode.toUpperCase());
    }
  }, [urlCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiJoinGame(gameCode, playerName);
      console.log('Joined game:', response);

      // Set player in context
      setPlayer(response.player);

      // Join via WebSocket
      wsJoinGame(gameCode, response.player.id);

      // Store in localStorage for reconnection
      localStorage.setItem(
        'gameSession',
        JSON.stringify({
          gameCode,
          playerId: response.player.id,
          playerName: response.player.name,
        })
      );

      // Fetch game state after joining
      try {
        const { getGame } = await import('../../services/api');
        const { game: gameData } = await getGame(gameCode);
        setGame(gameData);
      } catch (gameErr) {
        console.error('Failed to fetch game state:', gameErr);
      }
    } catch (err: any) {
      console.error('Failed to join game:', err);
      setError(err.response?.data?.error?.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  // If player already joined, check game status
  if (player && game) {
    // Show gameplay screen if game is in progress
    if (game.status === 'IN_PROGRESS' || game.status === 'COMPLETE') {
      return <GamePlay />;
    }

    // Show waiting room for WAITING status
    const goodPlayers = game.players?.filter((p) => p.team === 'GOOD') || [];
    const evilPlayers = game.players?.filter((p) => p.team === 'EVIL') || [];

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                Welcome, {player.name}! 👋
              </h1>
              <div className={`inline-block px-6 py-3 rounded-full text-xl font-bold ${
                player.team === 'GOOD'
                  ? 'bg-good text-white'
                  : 'bg-evil text-white'
              }`}>
                {player.team === 'GOOD' ? '🦸 Good Team' : '😈 Evil Team'}
              </div>
              <p className="text-purple-200 mt-4">
                Game Code: <span className="font-mono text-yellow-300 text-2xl">{game.code}</span>
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <h3 className="text-white font-bold text-lg mb-4 text-center">
                Waiting for game to start...
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-good-light font-bold mb-2">🦸 Good Team ({goodPlayers.length})</h4>
                  <div className="space-y-1">
                    {goodPlayers.map((p) => (
                      <div
                        key={p.id}
                        className={`text-sm px-3 py-1 rounded ${
                          p.id === player.id ? 'bg-good text-white font-bold' : 'text-green-200'
                        }`}
                      >
                        {p.name} {p.isHost && '👑'}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-evil-light font-bold mb-2">😈 Evil Team ({evilPlayers.length})</h4>
                  <div className="space-y-1">
                    {evilPlayers.map((p) => (
                      <div
                        key={p.id}
                        className={`text-sm px-3 py-1 rounded ${
                          p.id === player.id ? 'bg-evil text-white font-bold' : 'text-red-200'
                        }`}
                      >
                        {p.name} {p.isHost && '👑'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-purple-200">
              <div className="animate-pulse text-2xl mb-2">⏳</div>
              <p>Waiting for the host to start the game...</p>
              <p className="text-sm mt-2">Total Players: {game.players?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show join form
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-2 text-center">
            Join Game
          </h1>
          <p className="text-purple-200 text-center mb-8">
            Enter your details to join the fun!
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="gameCode" className="block text-white font-semibold mb-2">
                Game Code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                required
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono text-xl text-center uppercase"
              />
            </div>

            <div>
              <label htmlFor="playerName" className="block text-white font-semibold mb-2">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                required
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !gameCode.trim() || !playerName.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-6 rounded-lg text-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? '🎮 Joining...' : '👥 Join Game'}
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
    </div>
  );
}
