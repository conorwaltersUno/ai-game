import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  const canStart = totalPlayers >= 2 && goodPlayers.length > 0 && evilPlayers.length > 0;

  const handleStartGame = async () => {
    if (!canStart) return;

    console.log('[WaitingRoom] Starting game:', game.code);
    setError('');
    setStarting(true);

    try {
      console.log('[WaitingRoom] Calling API startGame...');
      const result = await apiStartGame(game.code);
      console.log('[WaitingRoom] Start game response:', result);
      // Game state will update via WebSocket
    } catch (err: any) {
      console.error('[WaitingRoom] Failed to start game:', err);
      console.error('[WaitingRoom] Error details:', err.response?.data || err.message);
      setError(err.response?.data?.error?.message || err.message || 'Failed to start game');
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
            Players can join at: <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition-colors underline"
            >
              {joinUrl}
            </a>
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/20 backdrop-blur p-6 rounded-xl border border-white/30">
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block mb-3">
                <QRCodeSVG value={joinUrl} size={200} level="H" />
              </div>
              <p className="text-sm text-white">Scan QR code to join</p>
            </div>
          </div>
        </div>

        {/* Player Count */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-team1/20 border-2 border-team1 rounded-xl p-6 text-center">
            <h3 className="text-2xl font-bold text-team1-light mb-2">Team 1</h3>
            <p className="text-4xl font-bold text-white">{goodPlayers.length}</p>
            <p className="text-sm text-blue-200 mt-2">players</p>
          </div>
          <div className="bg-team2/20 border-2 border-team2 rounded-xl p-6 text-center">
            <h3 className="text-2xl font-bold text-team2-light mb-2">Team 2</h3>
            <p className="text-4xl font-bold text-white">{evilPlayers.length}</p>
            <p className="text-sm text-purple-200 mt-2">players</p>
          </div>
        </div>

        {/* Players List */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Team 1 */}
          <div>
            <h4 className="text-team1-light font-bold mb-3 text-lg">Team 1</h4>
            <div className="space-y-2">
              {goodPlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-team1/30 text-white px-4 py-2 rounded-lg flex items-center gap-2"
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

          {/* Team 2 */}
          <div>
            <h4 className="text-team2-light font-bold mb-3 text-lg">Team 2</h4>
            <div className="space-y-2">
              {evilPlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-team2/30 text-white px-4 py-2 rounded-lg flex items-center gap-2"
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
        {totalPlayers < 2 && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg mb-4 text-center">
            ⏳ Waiting for at least 2 players to join... ({totalPlayers}/2)
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
