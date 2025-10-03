import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<div className="text-white p-8">Host Dashboard (Coming Soon)</div>} />
          <Route path="/join/:code?" element={<div className="text-white p-8">Join Game (Coming Soon)</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
