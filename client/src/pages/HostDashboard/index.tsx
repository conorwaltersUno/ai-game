import { useState } from 'react';
import HostLogin from './HostLogin';
import CreateGame from './CreateGame';
import WaitingRoom from './WaitingRoom';
import GamePlay from '../GamePlay';
import { useGame } from '../../contexts/GameContext';

export default function HostDashboard() {
  const { game } = useGame();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if already authenticated in this session
    return sessionStorage.getItem('host_authenticated') === 'true';
  });

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <HostLogin onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  // Show create screen if no game
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <CreateGame />
      </div>
    );
  }

  // Show gameplay screen if game is in progress
  if (game.status === 'IN_PROGRESS' || game.status === 'COMPLETE') {
    return <GamePlay />;
  }

  // Show waiting room for WAITING status
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <WaitingRoom />
    </div>
  );
}
