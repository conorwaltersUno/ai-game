import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-white mb-4">
          Twin up! 🎨
        </h1>
        <p className="text-xl text-purple-200 mb-12">
          AI-Powered Image Generation Game
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/host"
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg text-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
          >
            🎮 Host Game
          </Link>

          <Link
            to="/join"
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-lg text-xl hover:from-red-600 hover:to-rose-700 transition-all transform hover:scale-105 shadow-lg"
          >
            👥 Join Game
          </Link>
        </div>

        <div className="mt-16 text-purple-300">
          <p className="text-sm">
            Two teams compete to create AI images matching reference images using creative prompts
          </p>
        </div>
      </div>
    </div>
  );
}
