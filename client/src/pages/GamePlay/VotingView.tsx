import { useState, useEffect, useMemo } from 'react';
import { submitVote as apiSubmitVote } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface VotingViewProps {
  round: any;
  player: any;
}

export default function VotingView({ round, player }: VotingViewProps) {
  const { socket } = useWebSocket();
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteCounts, setVoteCounts] = useState({ good: 0, evil: 0 });
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(50);

  // Check if player already voted or is a prompt creator (host has no player object)
  const isHost = !player;
  const isPromptCreator = player ? (player.id === round.goodPlayerId || player.id === round.evilPlayerId) : false;
  const hasVoted = player ? (round.votes?.some((v: any) => v.playerId === player.id) || voted) : false;

  // Debug logging
  console.log('🗳️ [VotingView] Render:', {
    hasPlayer: !!player,
    playerId: player?.id,
    isHost,
    isPromptCreator,
    hasVoted,
    canVote: !isHost && !isPromptCreator && !hasVoted,
    goodPlayerId: round.goodPlayerId,
    evilPlayerId: round.evilPlayerId,
  });

  // 50-second countdown timer - synchronized with server
  useEffect(() => {
    // Calculate time left from server's voting start time
    const votingStarted = round.imageGenerationCompletedAt || round.updatedAt || new Date();
    const votingStartTime = new Date(votingStarted).getTime();
    const timeElapsed = Date.now() - votingStartTime;
    const remaining = Math.max(0, Math.ceil((50000 - timeElapsed) / 1000));
    setTimeLeft(remaining);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [round.id]); // Reset when round changes

  // Get submissions and shuffle them to randomize order
  const goodSubmission = round.submissions?.find((s: any) => s.team === 'GOOD');
  const evilSubmission = round.submissions?.find((s: any) => s.team === 'EVIL');

  // Randomize submission order (but keep it consistent per round)
  const shuffledSubmissions = useMemo(() => {
    if (!goodSubmission || !evilSubmission) return [];

    // Use round ID to determine order (deterministic shuffle)
    const shouldSwap = parseInt(round.id.slice(0, 8), 16) % 2 === 0;

    return shouldSwap
      ? [
          { submission: evilSubmission, team: 'EVIL' as const, label: 'Image A' },
          { submission: goodSubmission, team: 'GOOD' as const, label: 'Image B' }
        ]
      : [
          { submission: goodSubmission, team: 'GOOD' as const, label: 'Image A' },
          { submission: evilSubmission, team: 'EVIL' as const, label: 'Image B' }
        ];
  }, [goodSubmission, evilSubmission, round.id]);

  // Listen for vote updates
  useEffect(() => {
    if (!socket) return;

    socket.on('round:vote-updated', ({ votes }: any) => {
      setVoteCounts(votes);
    });

    // Calculate initial vote counts
    const goodVotes = round.votes?.filter((v: any) => v.votedTeam === 'GOOD').length || 0;
    const evilVotes = round.votes?.filter((v: any) => v.votedTeam === 'EVIL').length || 0;
    setVoteCounts({ good: goodVotes, evil: evilVotes });

    return () => {
      socket.off('round:vote-updated');
    };
  }, [socket, round]);

  const handleVote = async (team: 'GOOD' | 'EVIL') => {
    if (hasVoted || isPromptCreator || voting) return;

    setError('');
    setVoting(true);

    try {
      await apiSubmitVote(round.id, player.id, team);
      setVoted(true);
    } catch (err: any) {
      console.error('Failed to submit vote:', err);
      setError(err.response?.data?.error?.message || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Round {round.roundNumber} - Voting
            </h1>
            <p className="text-purple-200 text-lg">
              Which image best matches the reference?
            </p>
            <p className="text-yellow-300 text-sm mt-2">
              🤐 Teams are anonymous - vote for the best image!
            </p>

            {/* Timer */}
            <div className={`mt-4 inline-block px-6 py-3 rounded-full font-bold text-xl ${
              timeLeft <= 10
                ? 'bg-red-500/30 border-2 border-red-400 text-red-200 animate-pulse'
                : 'bg-blue-500/30 border-2 border-blue-400 text-blue-200'
            }`}>
              ⏱️ Time Left: {timeLeft}s
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
                className="rounded-xl shadow-2xl max-w-xs border-4 border-yellow-400/50"
                onError={(e) => {
                  console.error('❌ Reference image failed to load:', round.referenceImageUrl);
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://picsum.photos/1024/1024?random=ref-fallback';
                }}
              />
            </div>
          </div>

          {/* Image Comparison - Anonymous */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {shuffledSubmissions.map((item, index) => (
              <div key={item.label} className="bg-white/5 border-2 border-purple-400/30 rounded-xl p-6">
                <div className="text-center mb-4">
                  <p className="text-white font-bold text-2xl">
                    {item.label}
                  </p>
                </div>

                {item.submission?.imageUrl ? (
                  <img
                    src={item.submission.imageUrl}
                    alt={`Submission ${item.label}`}
                    className="w-full rounded-lg shadow-xl border-4 border-white/20 mb-4"
                    onError={(e) => {
                      console.error(`❌ ${item.label} image failed to load:`, item.submission?.imageUrl);
                      console.error('   Team:', item.team);
                      console.error('   Round:', round.id);
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://picsum.photos/1024/1024?random=vote-error';
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-white/5 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white/50 animate-pulse">🎨 Loading image...</span>
                  </div>
                )}

                {/* Prompt */}
                <div className="bg-white/10 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-300 italic text-center">
                    "{item.submission?.prompt || 'No prompt'}"
                  </p>
                </div>

                {!isHost && !isPromptCreator && !hasVoted && (
                  <button
                    onClick={() => handleVote(item.team)}
                    disabled={voting}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {voting ? 'Voting...' : `🗳️ Vote for ${item.label}`}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Status Messages */}
          {isHost && (
            <div className="bg-blue-500/20 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-lg text-center">
              👀 You're observing as the host - players are voting now!
            </div>
          )}

          {isPromptCreator && !isHost && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg text-center">
              ✍️ You created a prompt for this round, so you can't vote!
            </div>
          )}

          {hasVoted && !isPromptCreator && !isHost && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-6 py-4 rounded-lg text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-lg font-bold">Vote Submitted!</p>
              <p className="text-sm mt-1">Waiting for other players...</p>
            </div>
          )}

          {!isHost && !isPromptCreator && !hasVoted && (
            <div className="bg-purple-500/20 border-2 border-purple-500/50 text-purple-200 px-6 py-4 rounded-lg text-center animate-pulse">
              <p className="text-lg font-bold">👆 Cast your vote above!</p>
              <p className="text-sm mt-1">Click a "Vote for" button to choose the best image</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
