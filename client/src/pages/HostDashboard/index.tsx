import { useState } from 'react';
import CreateGame from './CreateGame';
import WaitingRoom from './WaitingRoom';
import { useGame } from '../../contexts/GameContext';

export default function HostDashboard() {
  const { game } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {!game ? <CreateGame /> : <WaitingRoom />}
    </div>
  );
}
