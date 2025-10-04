import { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamProgress {
  team: 'GOOD' | 'EVIL';
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  complete: boolean;
}

interface ImageGenerationLoaderProps {
  gameCode: string;
}

export default function ImageGenerationLoader({ gameCode }: ImageGenerationLoaderProps) {
  const { socket } = useWebSocket();
  const [goodProgress, setGoodProgress] = useState<TeamProgress>({
    team: 'GOOD',
    step: 0,
    totalSteps: 4,
    message: 'Waiting to start...',
    percentage: 0,
    complete: false,
  });
  const [evilProgress, setEvilProgress] = useState<TeamProgress>({
    team: 'EVIL',
    step: 0,
    totalSteps: 4,
    message: 'Waiting to start...',
    percentage: 0,
    complete: false,
  });

  useEffect(() => {
    if (!socket) return;

    console.log('🎨 [ImageGenerationLoader] Setting up progress listeners');

    // Listen for progress updates
    const handleProgress = (data: any) => {
      console.log('🎨 [ImageGenerationLoader] Progress update:', data);

      if (data.team === 'GOOD') {
        setGoodProgress({
          team: data.team,
          step: data.step,
          totalSteps: data.totalSteps,
          message: data.message,
          percentage: data.percentage,
          complete: false,
        });
      } else if (data.team === 'EVIL') {
        setEvilProgress({
          team: data.team,
          step: data.step,
          totalSteps: data.totalSteps,
          message: data.message,
          percentage: data.percentage,
          complete: false,
        });
      }
    };

    // Listen for completion
    const handleComplete = (data: any) => {
      console.log('✅ [ImageGenerationLoader] Image complete:', data);

      if (data.team === 'GOOD') {
        setGoodProgress((prev) => ({ ...prev, complete: true }));
      } else if (data.team === 'EVIL') {
        setEvilProgress((prev) => ({ ...prev, complete: true }));
      }
    };

    socket.on('image:progress', handleProgress);
    socket.on('image:complete', handleComplete);

    return () => {
      socket.off('image:progress', handleProgress);
      socket.off('image:complete', handleComplete);
    };
  }, [socket]);

  const renderTeamProgress = (progress: TeamProgress) => {
    const isGood = progress.team === 'GOOD';
    const bgColor = isGood ? 'bg-blue-500/20' : 'bg-red-500/20';
    const borderColor = isGood ? 'border-blue-400' : 'border-red-400';
    const progressColor = isGood ? 'bg-blue-500' : 'bg-red-500';
    const textColor = isGood ? 'text-blue-300' : 'text-red-300';
    const teamName = isGood ? 'Good Team' : 'Evil Team';
    const emoji = isGood ? '😇' : '😈';

    return (
      <div className={`${bgColor} backdrop-blur-lg rounded-2xl p-6 shadow-xl border ${borderColor}`}>
        {/* Team Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{emoji}</span>
            <h3 className={`text-2xl font-bold ${textColor}`}>{teamName}</h3>
          </div>
          {progress.complete && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-3xl"
            >
              ✅
            </motion.div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between mb-2">
            <span className="text-white text-sm">
              Step {progress.step}/{progress.totalSteps}
            </span>
            <span className="text-white text-sm font-semibold">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${progressColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Status Message */}
        <AnimatePresence mode="wait">
          <motion.p
            key={progress.message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-white/80 text-sm"
          >
            {progress.message}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-8xl mb-4 animate-pulse">🎨</div>
          <h1 className="text-5xl font-bold text-white mb-3">
            Generating Images
          </h1>
          <p className="text-purple-200 text-xl">
            Our AI is creating masterpieces from the prompts...
          </p>
        </motion.div>

        {/* Team Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderTeamProgress(goodProgress)}
          {renderTeamProgress(evilProgress)}
        </div>

        {/* Animated Dots */}
        <div className="mt-12 flex justify-center gap-2">
          <motion.div
            className="w-4 h-4 bg-purple-400 rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          />
          <motion.div
            className="w-4 h-4 bg-purple-400 rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          />
          <motion.div
            className="w-4 h-4 bg-purple-400 rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
