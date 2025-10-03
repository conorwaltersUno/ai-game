interface TeamBadgeProps {
  team: 'GOOD' | 'EVIL';
  size?: 'sm' | 'md' | 'lg';
}

export default function TeamBadge({ team, size = 'md' }: TeamBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2',
  };

  return (
    <span
      className={`inline-block rounded-full font-bold ${sizeClasses[size]} ${
        team === 'GOOD'
          ? 'bg-good text-white'
          : 'bg-evil text-white'
      }`}
    >
      {team === 'GOOD' ? '🦸 Good' : '😈 Evil'}
    </span>
  );
}
