import { useState } from 'react';
import { submitPrompt as apiSubmitPrompt } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useGame } from '../../contexts/GameContext';
import Timer from '../../components/Timer';
import TeamBadge from '../../components/TeamBadge';

interface PromptInputProps {
  round: any;
  player: any;
}

export default function PromptInput({ round, player }: PromptInputProps) {
  // CRITICAL DEBUG
  console.log('🔍 [PromptInput] Rendering with round:', {
    roundId: round?.id,
    roundNumber: round?.roundNumber,
    referenceImageUrl: round?.referenceImageUrl || '❌ MISSING!!!',
    status: round?.status,
    hasRound: !!round,
  });

  const { socket } = useWebSocket();
  const { game } = useGame();
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Check if already submitted
  const hasSubmitted = round.submissions?.some((s: any) => s.playerId === player.id) || submitted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || hasSubmitted) return;

    setError('');
    setSubmitting(true);

    try {
      await apiSubmitPrompt(round.id, player.id, prompt);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit prompt:', err);
      setError(err.response?.data?.error?.message || 'Failed to submit prompt');
      setSubmitting(false);
    }
  };

  const handleTimeout = () => {
    console.log('⏰ Timer expired - handling timeout');

    // Emit timeout event to server for auto-complete logic
    if (socket && game) {
      console.log('📡 Emitting round:prompt-timeout event');
      socket.emit('round:prompt-timeout', {
        roundId: round.id,
        gameCode: game.code,
      });
    }

    // If player has typed something but hasn't submitted, auto-submit
    if (!hasSubmitted && prompt.trim()) {
      console.log('📤 Auto-submitting prompt on timeout');
      handleSubmit(new Event('submit') as any);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h1 className="text-4xl font-bold text-white">
                Round {round.roundNumber}
              </h1>
              <TeamBadge team={player.team} size="lg" />
            </div>
            <p className="text-purple-200 text-lg">
              You've been selected! Create a prompt to match the reference image
            </p>
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

          {/* Timer - Server-synced */}
          {!hasSubmitted && <Timer deadline={round.promptingDeadline} onComplete={handleTimeout} className="mb-8" />}

          {/* Prompt Input Form */}
          {!hasSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-white font-semibold mb-2">
                  Your Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image in detail... be creative!"
                  maxLength={500}
                  rows={4}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
                <div className="text-right text-sm text-purple-200 mt-1">
                  {prompt.length}/500 characters
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !prompt.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-6 rounded-lg text-xl hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {submitting ? '📤 Submitting...' : '🚀 Submit Prompt'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="bg-green-500/20 border-2 border-green-500 text-green-200 px-6 py-8 rounded-xl">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-2">Prompt Submitted!</h3>
                <p className="text-lg">
                  Waiting for your opponent to submit their prompt...
                </p>
                <div className="mt-4 animate-pulse">⏳</div>
              </div>
            </div>
          )}

          {/* Tips */}
          {!hasSubmitted && (
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-200 font-bold mb-2">💡 Tips:</h4>
              <ul className="text-blue-100 text-sm space-y-1">
                <li>• Be specific: mention colors, style, mood, composition</li>
                <li>• Match the reference as closely as possible</li>
                <li>• Use descriptive adjectives for better results</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
