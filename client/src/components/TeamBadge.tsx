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
          ? 'bg-team1 text-white'
          : 'bg-team2 text-white'
      }`}
    >
      {team === 'GOOD' ? 'Team 1' : 'Team 2'}
    </span>
  );
}
