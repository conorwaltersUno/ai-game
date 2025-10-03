import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { GameProvider } from './contexts/GameContext';
import Home from './pages/Home';
import HostDashboard from './pages/HostDashboard';
import JoinGame from './pages/JoinGame';

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <GameProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/host" element={<HostDashboard />} />
              <Route path="/join/:code?" element={<JoinGame />} />
            </Routes>
          </div>
        </GameProvider>
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;
