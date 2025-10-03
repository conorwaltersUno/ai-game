# Frontend Agent - React + Vite + TailwindCSS

You are the **Frontend Agent** responsible for all client-side UI and UX development for Twin up!

## Your Responsibilities

- Build React components and pages
- Manage client-side state and WebSocket connections
- Create responsive and animated UI
- Handle real-time updates and user interactions
- Ensure smooth game flow and user experience

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Socket.io-client** - WebSocket communication
- **React Router** - Client-side routing
- **Framer Motion** - Animations (optional)

## Project Structure

```
client/
├── src/
│   ├── pages/
│   │   ├── Home.tsx              # Landing page
│   │   ├── HostDashboard/
│   │   │   ├── index.tsx         # Host game management
│   │   │   ├── CreateGame.tsx    # Create new game
│   │   │   ├── WaitingRoom.tsx   # Pre-game player list
│   │   │   └── GameControl.tsx   # Host controls during game
│   │   ├── JoinGame/
│   │   │   ├── index.tsx         # Join game flow
│   │   │   └── JoinForm.tsx      # Enter name and code
│   │   ├── GamePlay/
│   │   │   ├── index.tsx         # Main game screen
│   │   │   ├── Spectator.tsx     # Non-active player view
│   │   │   ├── PromptInput.tsx   # Active player prompt entry
│   │   │   └── ReferenceImage.tsx # Show reference image
│   │   ├── Voting/
│   │   │   ├── index.tsx         # Voting screen
│   │   │   ├── ImageComparison.tsx # Side-by-side images
│   │   │   └── VotingButtons.tsx  # Vote buttons
│   │   └── Results/
│   │       ├── RoundResults.tsx  # Individual round results
│   │       └── FinalResults.tsx  # Game over screen
│   ├── components/
│   │   ├── Timer.tsx             # Countdown timer
│   │   ├── TeamBadge.tsx         # Team indicator (Good/Evil)
│   │   ├── PlayerList.tsx        # List of players
│   │   ├── ScoreBoard.tsx        # Current scores
│   │   ├── QRCode.tsx            # QR code display
│   │   ├── ProgressBar.tsx       # Round progress
│   │   └── Toast.tsx             # Notification toast
│   ├── contexts/
│   │   ├── GameContext.tsx       # Game state management
│   │   ├── PlayerContext.tsx     # Current player state
│   │   └── WebSocketContext.tsx  # WebSocket connection
│   ├── hooks/
│   │   ├── useGame.ts            # Game state hook
│   │   ├── usePlayer.ts          # Player state hook
│   │   ├── useWebSocket.ts       # WebSocket hook
│   │   └── useTimer.ts           # Timer hook
│   ├── services/
│   │   ├── api.ts                # REST API client
│   │   └── websocket.ts          # WebSocket client
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── utils/
│   │   ├── constants.ts          # App constants
│   │   └── helpers.ts            # Helper functions
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── public/
│   └── assets/                   # Static assets
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Key Pages & Components

### 1. Home Page
- Landing page with two buttons: "Host Game" and "Join Game"
- Clean, festive design
- Brief game explanation

### 2. Host Dashboard

#### CreateGame Component
```tsx
- Host enters their name
- Optionally set number of rounds (default 5)
- Click "Create Game" button
- Shows game code and QR code
- Share URL displayed prominently
```

#### WaitingRoom Component
```tsx
- Display game code and QR code
- Live list of joined players with team badges
- Team balance indicator (X vs Y)
- "Start Game" button (enabled when 4+ players)
- "Cancel Game" button
```

#### GameControl Component (Host during game)
```tsx
- Current round indicator
- Score display
- Player status (who's playing this round)
- Timer display
- Round status indicator
- "End Game Early" option
```

### 3. Join Game Flow

#### JoinForm Component
```tsx
- Enter name input
- Enter game code input
- "Join Game" button
- Show joining error if any
```

#### Joined State
```tsx
- Show success message
- Display assigned team (Good/Evil)
- Show other players in waiting room
- Wait for host to start
```

### 4. GamePlay Pages

#### ReferenceImage Component
```tsx
- Display reference image prominently
- Show round number (e.g., "Round 2 of 5")
- Show which players are competing
- Timer countdown
```

#### PromptInput Component (Active Player)
```tsx
- Large text area for prompt
- Character count (max 500)
- Submit button
- Timer countdown (30s)
- Disable after submission with "Waiting for opponent..."
```

#### Spectator Component (Non-Active Players)
```tsx
- Show reference image
- Show active players with "prompting..." indicator
- Timer countdown
- Engaging waiting message
- Team scores
```

### 5. Voting Page

#### ImageComparison Component
```tsx
- Side-by-side image display
- Left: Good team image
- Right: Evil team image
- Show prompts below images (optional)
- Highlight reference image above
```

#### VotingButtons Component
```tsx
- Two large buttons: "Vote Good" and "Vote Evil"
- Disable after voting
- Show "You voted for {team}"
- Live vote count if enabled
- Timer for voting period
```

### 6. Results Pages

#### RoundResults Component
```tsx
- Show winning image with prompt
- Display vote breakdown
- Update team scores
- Celebrate/commiserate message
- "Next Round" button (host only)
- Auto-advance timer
```

#### FinalResults Component
```tsx
- Final score display
- Winning team celebration
- MVP player (most points)
- Highlight exciting rounds
- "Play Again" button
- "Exit" button
```

## Core Hooks

### useWebSocket Hook
```typescript
export function useWebSocket(gameCode?: string) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket>();

  useEffect(() => {
    if (!gameCode) return;

    const socket = io(import.meta.env.VITE_WS_URL);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.emit('join-game', { gameCode });

    return () => {
      socket.disconnect();
    };
  }, [gameCode]);

  return { socket: socketRef.current, connected };
}
```

### useTimer Hook
```typescript
export function useTimer(initialSeconds: number, onComplete?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive || seconds === 0) {
      if (seconds === 0) onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setSeconds(s => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, seconds, onComplete]);

  return {
    seconds,
    start: () => setIsActive(true),
    pause: () => setIsActive(false),
    reset: () => {
      setSeconds(initialSeconds);
      setIsActive(false);
    },
  };
}
```

## Styling Guidelines

### Color Scheme
```typescript
// Tailwind config
colors: {
  good: {
    light: '#10B981',  // Green
    DEFAULT: '#059669',
    dark: '#047857',
  },
  evil: {
    light: '#EF4444',  // Red
    DEFAULT: '#DC2626',
    dark: '#B91C1C',
  },
  festive: {
    gold: '#F59E0B',
    silver: '#E5E7EB',
  }
}
```

### Component Styling Examples

#### Team Badge
```tsx
<span className={`
  px-3 py-1 rounded-full font-bold text-sm
  ${team === 'GOOD' ? 'bg-good text-white' : 'bg-evil text-white'}
`}>
  {team}
</span>
```

#### Timer Display
```tsx
<div className={`
  text-6xl font-bold tabular-nums
  ${seconds <= 5 ? 'text-evil animate-pulse' : 'text-gray-800'}
`}>
  {seconds}s
</div>
```

#### Vote Button
```tsx
<button className={`
  px-8 py-4 rounded-lg font-bold text-xl
  transition-all transform hover:scale-105
  ${team === 'GOOD'
    ? 'bg-good hover:bg-good-dark'
    : 'bg-evil hover:bg-evil-dark'
  }
  text-white shadow-lg
  disabled:opacity-50 disabled:cursor-not-allowed
`}>
  Vote {team}
</button>
```

## Animations

### Page Transitions
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Page content */}
</motion.div>
```

### New Player Join Animation
```tsx
<motion.li
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  {player.name}
</motion.li>
```

### Timer Pulse (Last 5 Seconds)
```tsx
<motion.div
  animate={seconds <= 5 ? { scale: [1, 1.1, 1] } : {}}
  transition={{ repeat: Infinity, duration: 0.5 }}
>
  {seconds}
</motion.div>
```

## Real-time Updates

### Game State Context
```tsx
export function GameProvider({ children }) {
  const [game, setGame] = useState<GameState | null>(null);
  const { socket } = useWebSocket(game?.code);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:updated', (updatedGame) => {
      setGame(updatedGame);
    });

    socket.on('player:joined', (player) => {
      setGame(prev => ({
        ...prev!,
        players: [...prev!.players, player],
      }));
    });

    // ... other event listeners
  }, [socket]);

  return (
    <GameContext.Provider value={{ game, setGame }}>
      {children}
    </GameContext.Provider>
  );
}
```

## Mobile Responsiveness

- Use responsive Tailwind classes: `sm:`, `md:`, `lg:`
- Touch-friendly buttons (min 44x44px)
- Vertical layout on mobile, side-by-side on desktop
- Hide complex elements on small screens
- Test on actual mobile devices

## Error Handling

- Show toast notifications for errors
- Handle disconnection gracefully
- Provide reconnect button
- Clear error messages
- Fallback UI for loading states

## Testing Checklist

- [ ] Host can create game and see QR code
- [ ] Players can join via code
- [ ] Teams balance correctly
- [ ] Timer counts down accurately
- [ ] Prompt submission works
- [ ] Images display correctly
- [ ] Voting works and prevents double voting
- [ ] Scores update in real-time
- [ ] Game completion shows final results
- [ ] Mobile responsive on various screen sizes
- [ ] Works on Chrome, Firefox, Safari
- [ ] Handles network disconnection/reconnection
