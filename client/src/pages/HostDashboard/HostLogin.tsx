import { useState } from 'react';

interface HostLoginProps {
  onAuthenticated: () => void;
}

export default function HostLogin({ onAuthenticated }: HostLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check credentials against environment variables
    const validUsername = import.meta.env.VITE_HOST_USERNAME;
    const validPassword = import.meta.env.VITE_HOST_PASSWORD;

    // Simulate a small delay for UX (prevents timing attacks)
    await new Promise(resolve => setTimeout(resolve, 500));

    if (username === validUsername && password === validPassword) {
      // Store authentication in sessionStorage (lost on tab close)
      sessionStorage.setItem('host_authenticated', 'true');
      onAuthenticated();
    } else {
      setError('Invalid username or password');
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md w-full">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Host Authentication
          </h1>
          <p className="text-purple-200">
            Enter your credentials to host a game
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-white font-semibold mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white font-semibold mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              🚫 {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-6 rounded-lg text-lg hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {loading ? '🔓 Authenticating...' : '🚀 Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-purple-200 hover:text-white transition-colors underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
