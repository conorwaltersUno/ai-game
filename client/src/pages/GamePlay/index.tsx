import { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import PromptInput from './PromptInput';
import Spectator from './Spectator';
import VotingView from './VotingView';
import RoundResults from './RoundResults';
import FinalResults from './FinalResults';
import ImageGenerationLoader from '../../components/ImageGenerationLoader';

export default function GamePlay() {
  const { game, player, setGame } = useGame();
  const { socket } = useWebSocket();
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [showFinalResults, setShowFinalResults] = useState(false);

  // Image generation tracking
  const [imageGenerationStatus, setImageGenerationStatus] = useState<{
    good: 'pending' | 'generating' | 'complete' | 'error';
    evil: 'pending' | 'generating' | 'complete' | 'error';
  }>({
    good: 'pending',
    evil: 'pending',
  });
  const [showVoting, setShowVoting] = useState(false);

  // Disconnect tracking
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<string[]>([]);

  // Debug: Log game state changes
  useEffect(() => {
    console.log('🎮 [GamePlay] Game state changed:', {
      hasGame: !!game,
      gameStatus: game?.status,
      currentRound: game?.currentRound,
      currentRoundType: typeof game?.currentRound,
    });
  }, [game]);

  // Initialize currentRound from game.currentRound if available
  useEffect(() => {
    if (game?.currentRound && typeof game.currentRound === 'object') {
      console.log('🎮 [GamePlay] Initializing round from game.currentRound:', game.currentRound);
      setCurrentRound(game.currentRound);
    } else if (game?.currentRound) {
      console.log('⚠️ [GamePlay] game.currentRound exists but is not an object:', game.currentRound, typeof game.currentRound);
    }
  }, [game?.currentRound]);

  useEffect(() => {
    if (!socket || !game) {
      console.log('🎮 [GamePlay] WebSocket effect - socket or game not ready:', { hasSocket: !!socket, hasGame: !!game });
      return;
    }

    console.log('🎮 [GamePlay] Setting up round event listeners');

    // Listen for round events
    socket.on('round:started', ({ round }: any) => {
      console.log('🎮 [GamePlay] round:started event received:', round);
      console.log('   CRITICAL: Reference Image URL:', round.referenceImageUrl || '❌ MISSING!!!');
      console.log('   Round Number:', round.roundNumber);
      console.log('   Round Status:', round.status);

      if (!round.referenceImageUrl) {
        console.error('❌ CRITICAL: Round has NO reference image URL on frontend!');
      }

      setCurrentRound(round);
      // Reset image generation status for new round
      setImageGenerationStatus({ good: 'pending', evil: 'pending' });
    });

    socket.on('round:updated', ({ round }: any) => {
      console.log('🔄 Round updated:', round);
      setCurrentRound(round);
    });

    socket.on('round:generating', ({ message }: any) => {
      console.log('🎨 Generating images:', message);
    });

    socket.on('round:voting-started', ({ round, allImagesReady }: any) => {
      console.log('🗳️ Voting started:', round, 'All images ready:', allImagesReady);
      setCurrentRound(round);
      if (allImagesReady) {
        setShowVoting(true);
        setImageGenerationStatus({ good: 'complete', evil: 'complete' });
      } else {
        console.warn('⚠️ Voting started but images not confirmed ready!');
      }
    });

    socket.on('round:vote-updated', ({ votes }: any) => {
      console.log('📊 Votes updated:', votes);
    });

    socket.on('round:completed', ({ round, winner, votes }: any) => {
      console.log('✅ Round completed:', { round, winner, votes });
      console.log('   Round game players:', round?.game?.players?.length || 0);
      setCurrentRound(round);

      // Update game context with fresh player data if available
      if (round?.game?.players) {
        console.log('🔄 Updating game context with fresh player data from round');
        setGame(prevGame => ({
          ...prevGame,
          ...(round.game || {}),
        }) as any);
      }
    });

    socket.on('round:auto-completed', ({ round, winner, message }: any) => {
      console.log('⏰ Round auto-completed:', { round, winner, message });
      console.log('   Message:', message);
      setCurrentRound(round);

      // Update game context with fresh player data if available
      if (round?.game?.players) {
        console.log('🔄 Updating game context with fresh player data from auto-complete');
        setGame(prevGame => ({
          ...prevGame,
          ...(round.game || {}),
        }) as any);
      }
    });

    socket.on('round:skipped', ({ round, message }: any) => {
      console.log('⏭️ Round skipped:', { round, message });
      console.log('   Message:', message);
      setCurrentRound(round);

      // Update game context if available
      if (round?.game?.players) {
        console.log('🔄 Updating game context from skipped round');
        setGame(prevGame => ({
          ...prevGame,
          ...(round.game || {}),
        }) as any);
      }
    });

    socket.on('game:completed', ({ game: completedGame, finalScores }: any) => {
      console.log('🏁 Game completed:', { game: completedGame, finalScores });
      setGame(completedGame);
      // Wait 5 seconds then show final results
      setTimeout(() => {
        setShowFinalResults(true);
      }, 5000);
    });

    socket.on('game:reset-to-lobby', ({ game: resetGame, message }: any) => {
      console.log('🔄 Game reset to lobby:', message);
      setGame(resetGame);
      setShowFinalResults(false);
      setCurrentRound(null);
      // Show notification if desired - for now just update state
    });

    // Image generation progress tracking
    socket.on('image:generation-progress', (data: { team: string; status: string; roundId: string }) => {
      console.log(`🎨 Image generation progress:`, data);
      setImageGenerationStatus(prev => ({
        ...prev,
        [data.team.toLowerCase()]: 'generating',
      }));
      setShowVoting(false);
    });

    socket.on('image:generation-complete', (data: { team: string; imageUrl: string; roundId: string }) => {
      console.log(`✅ Image generation complete:`, data.team);
      setImageGenerationStatus(prev => ({
        ...prev,
        [data.team.toLowerCase()]: 'complete',
      }));
    });

    socket.on('image:generation-error', (data: { team: string; error: string; roundId: string }) => {
      console.error(`❌ Image generation error:`, data.team, data.error);
      setImageGenerationStatus(prev => ({
        ...prev,
        [data.team.toLowerCase()]: 'error',
      }));
    });

    // Player removed (immediate, no grace period)
    socket.on('player:removed', (data: { playerName: string; reason: string }) => {
      console.log(`🗑️ Player removed: ${data.playerName} (${data.reason})`);

      // Show brief notification
      setDisconnectedPlayers(prev => {
        if (!prev.includes(data.playerName)) {
          return [...prev, data.playerName];
        }
        return prev;
      });

      // Remove notification after 3 seconds
      setTimeout(() => {
        setDisconnectedPlayers(prev => prev.filter(name => name !== data.playerName));
      }, 3000);
    });

    return () => {
      socket.off('round:started');
      socket.off('round:updated');
      socket.off('round:generating');
      socket.off('round:voting-started');
      socket.off('round:vote-updated');
      socket.off('round:completed');
      socket.off('round:auto-completed');
      socket.off('round:skipped');
      socket.off('game:completed');
      socket.off('game:reset-to-lobby');
      socket.off('image:generation-progress');
      socket.off('image:generation-complete');
      socket.off('image:generation-error');
      socket.off('player:disconnected');
      socket.off('player:removed');
    };
  }, [socket, game, setGame]);

  // Handle tab close/navigation - immediately notify server
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (player && socket && game) {
        console.log('👋 [BeforeUnload] Player leaving, notifying server');
        // Try to notify server of intentional disconnect
        // Note: This may not always succeed due to browser restrictions
        socket.emit('player-leaving', {
          playerId: player.id,
          gameCode: game.code
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [player, socket, game]);

  // Show final results if game is complete
  if (showFinalResults && game) {
    return <FinalResults game={game} />;
  }

  if (!game || !currentRound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">🎮</div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  // Determine if player is active in this round (only if player exists, i.e., not host)
  const isActivePlayer = player
    ? player.id === currentRound.goodPlayerId || player.id === currentRound.evilPlayerId
    : false;

  // Determine round view based on status
  const renderRoundView = () => {
    switch (currentRound.status) {
      case 'PROMPTING':
        return isActivePlayer ? (
          <PromptInput round={currentRound} player={player} />
        ) : (
          <Spectator round={currentRound} game={game} player={player} />
        );

      case 'GENERATING':
        return <ImageGenerationLoader imageGenerationStatus={imageGenerationStatus} round={currentRound} />;

      case 'VOTING':
        // Don't show voting until both images are actually ready
        const bothImagesReady =
          imageGenerationStatus.good === 'complete' &&
          imageGenerationStatus.evil === 'complete';

        if (bothImagesReady) {
          return <VotingView round={currentRound} player={player} />;
        } else {
          // Still generating images, keep showing loader
          return <ImageGenerationLoader imageGenerationStatus={imageGenerationStatus} round={currentRound} />;
        }

      case 'COMPLETE':
        return <RoundResults round={currentRound} game={game} />;

      default:
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-white text-xl">Round status: {currentRound.status}</div>
          </div>
        );
    }
  };

  return (
    <>
      {renderRoundView()}

      {/* Disconnect notifications */}
      {disconnectedPlayers.length > 0 && (
        <div className="fixed top-4 right-4 z-40 space-y-2">
          {disconnectedPlayers.map((playerName) => (
            <div
              key={playerName}
              className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg backdrop-blur-sm shadow-lg"
            >
              <p className="font-semibold">⚠️ {playerName} disconnected</p>
              <p className="text-xs mt-1">They have 2 minutes to reconnect</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
