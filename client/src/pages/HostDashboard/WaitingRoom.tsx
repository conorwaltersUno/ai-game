import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { startGame as apiStartGame } from '../../services/api';

export default function WaitingRoom() {
  const { game } = useGame();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  if (!game) return null;

  const goodPlayers = game.players?.filter((p) => p.team === 'GOOD') || [];
  const evilPlayers = game.players?.filter((p) => p.team === 'EVIL') || [];
  const totalPlayers = (game.players?.length || 0);
  const canStart = totalPlayers >= 4 && goodPlayers.length > 0 && evilPlayers.length > 0;

  const handleStartGame = async () => {
    if (!canStart) return;

    setError('');
    setStarting(true);

    try {
      await apiStartGame(game.code);
      // Game state will update via WebSocket
    } catch (err: any) {
      console.error('Failed to start game:', err);
      setError(err.response?.data?.error?.message || 'Failed to start game');
      setStarting(false);
    }
  };

  // Generate join URL
  const joinUrl = `${window.location.origin}/join/${game.code}`;

  return (
    <div className="max-w-4xl w-full">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            Game Code: <span className="text-yellow-300">{game.code}</span>
          </h1>
          <p className="text-purple-200 text-lg">
            Players can join at: <span className="font-mono bg-white/20 px-3 py-1 rounded">{joinUrl}</span>
          </p>
        </div>

        {/* QR Code Placeholder - Will add QR generation later */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/20 backdrop-blur p-6 rounded-xl border border-white/30">
            <div className="text-center text-white">
              <div className="text-6xl mb-2">📱</div>
              <p className="text-sm">Scan QR code to join</p>
              <p className="text-xs text-purple-200 mt-1">(QR generation coming soon)</p>
            </div>
          </div>
        </div>

        {/* Player Count */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-good/20 border-2 border-good rounded-xl p-6 text-center">
            <h3 className="text-2xl font-bold text-good-light mb-2">Good Team</h3>
            <p className="text-4xl font-bold text-white">{goodPlayers.length}</p>
            <p className="text-sm text-green-200 mt-2">players</p>
          </div>
          <div className="bg-evil/20 border-2 border-evil rounded-xl p-6 text-center">
            <h3 className="text-2xl font-bold text-evil-light mb-2">Evil Team</h3>
            <p className="text-4xl font-bold text-white">{evilPlayers.length}</p>
            <p className="text-sm text-red-200 mt-2">players</p>
          </div>
        </div>

        {/* Players List */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Good Team */}
          <div>
            <h4 className="text-good-light font-bold mb-3 text-lg">🦸 Good Team</h4>
            <div className="space-y-2">
              {goodPlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-good/30 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {player.isHost && <span>👑</span>}
                  <span>{player.name}</span>
                </div>
              ))}
              {goodPlayers.length === 0 && (
                <p className="text-gray-400 italic">No players yet...</p>
              )}
            </div>
          </div>

          {/* Evil Team */}
          <div>
            <h4 className="text-evil-light font-bold mb-3 text-lg">😈 Evil Team</h4>
            <div className="space-y-2">
              {evilPlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-evil/30 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {player.isHost && <span>👑</span>}
                  <span>{player.name}</span>
                </div>
              ))}
              {evilPlayers.length === 0 && (
                <p className="text-gray-400 italic">No players yet...</p>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {totalPlayers < 4 && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg mb-4 text-center">
            ⏳ Waiting for at least 4 players to join... ({totalPlayers}/4)
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          disabled={!canStart || starting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-lg text-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
        >
          {starting ? '🎮 Starting Game...' : canStart ? '🚀 Start Game!' : '⏳ Waiting for Players...'}
        </button>

        {/* Footer Info */}
        <div className="mt-6 text-center text-purple-200 text-sm">
          <p>Total Rounds: {game.totalRounds}</p>
          <p className="mt-2">Share the game code or QR code with your friends!</p>
        </div>
      </div>
    </div>
  );
}
