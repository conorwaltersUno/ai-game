import { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import PromptInput from './PromptInput';
import Spectator from './Spectator';
import VotingView from './VotingView';
import RoundResults from './RoundResults';
import FinalResults from './FinalResults';

export default function GamePlay() {
  const { game, player, setGame } = useGame();
  const { socket } = useWebSocket();
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [showFinalResults, setShowFinalResults] = useState(false);

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
      setCurrentRound(round);
    });

    socket.on('round:updated', ({ round }: any) => {
      console.log('🔄 Round updated:', round);
      setCurrentRound(round);
    });

    socket.on('round:generating', ({ message }: any) => {
      console.log('🎨 Generating images:', message);
    });

    socket.on('round:voting-started', ({ round }: any) => {
      console.log('🗳️ Voting started:', round);
      setCurrentRound(round);
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

    socket.on('game:completed', ({ game: completedGame, finalScores }: any) => {
      console.log('🏁 Game completed:', { game: completedGame, finalScores });
      setGame(completedGame);
      // Wait 5 seconds then show final results
      setTimeout(() => {
        setShowFinalResults(true);
      }, 5000);
    });

    return () => {
      socket.off('round:started');
      socket.off('round:updated');
      socket.off('round:generating');
      socket.off('round:voting-started');
      socket.off('round:vote-updated');
      socket.off('round:completed');
      socket.off('game:completed');
    };
  }, [socket, game, setGame]);

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
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20">
                <div className="text-8xl mb-6 animate-bounce">🎨</div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  Generating Images...
                </h2>
                <p className="text-purple-200 text-xl">
                  Our AI is creating masterpieces from the prompts!
                </p>
                <div className="mt-8 flex justify-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'VOTING':
        return <VotingView round={currentRound} player={player} />;

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

  return renderRoundView();
}
