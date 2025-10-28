interface ImageGenerationLoaderProps {
  imageGenerationStatus: {
    good: 'pending' | 'generating' | 'complete' | 'error';
    evil: 'pending' | 'generating' | 'complete' | 'error';
  };
  round: any;
}

export default function ImageGenerationLoader({ imageGenerationStatus, round }: ImageGenerationLoaderProps) {
  const renderTeamProgress = (team: 'good' | 'evil') => {
    const status = imageGenerationStatus[team];
    const isGood = team === 'good';
    const bgColor = isGood ? 'bg-team1/20' : 'bg-team2/20';
    const borderColor = isGood ? 'border-team1' : 'border-team2';
    const textColor = isGood ? 'text-team1-light' : 'text-team2-light';
    const teamName = isGood ? 'Team 1' : 'Team 2';
    const emoji = isGood ? '⭐' : '⭐';

    return (
      <div className={`flex items-center justify-between p-4 ${bgColor} rounded-lg border ${borderColor}`}>
        <span className={`${textColor} font-bold`}>{teamName}</span>
        <div className="flex items-center gap-2">
          {status === 'generating' && (
            <>
              <div className={`animate-spin h-5 w-5 border-2 ${borderColor} border-t-transparent rounded-full`} />
              <span className="text-green-200 text-sm">Generating...</span>
            </>
          )}
          {status === 'complete' && (
            <>
              <span className="text-2xl">✅</span>
              <span className="text-green-200 text-sm">Complete!</span>
            </>
          )}
          {status === 'error' && (
            <>
              <span className="text-2xl">❌</span>
              <span className="text-red-200 text-sm">Error (using fallback)</span>
            </>
          )}
          {status === 'pending' && (
            <>
              <span className="text-2xl">⏳</span>
              <span className="text-gray-200 text-sm">Pending...</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
        <h2 className="text-3xl font-bold text-white text-center mb-6">
          🎨 User generated images are being created...
        </h2>

        <div className="space-y-4">
          {renderTeamProgress('good')}
          {renderTeamProgress('evil')}
        </div>

        <p className="text-purple-200 text-center text-sm mt-6">
          Please wait while we generate the images...
        </p>

        <p className="text-purple-300 text-center text-xs mt-2">
          This may take up to 60 seconds
        </p>
      </div>
    </div>
  );
}
