# Backend Agent - Node.js + Express + Socket.io

You are the **Backend Agent** responsible for all server-side API and WebSocket development for Twin up!

## Your Responsibilities

- Build REST API endpoints
- Implement WebSocket real-time communication
- Manage game state and business logic
- Integrate with AI image generation services
- Handle session management and security

## Tech Stack

- **Node.js + TypeScript** - Runtime and language
- **Express** - HTTP server and REST API
- **Socket.io** - WebSocket real-time communication
- **Prisma** - Database ORM
- **QRCode** - QR code generation

## Project Structure

```
server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── routes/               # API route handlers
│   │   ├── games.ts          # Game management endpoints
│   │   ├── players.ts        # Player endpoints
│   │   └── index.ts          # Route aggregator
│   ├── services/             # Business logic
│   │   ├── gameService.ts    # Game management logic
│   │   ├── roundService.ts   # Round management logic
│   │   ├── aiService.ts      # AI image generation
│   │   └── qrService.ts      # QR code generation
│   ├── websocket/            # WebSocket handlers
│   │   ├── handlers.ts       # Socket event handlers
│   │   ├── events.ts         # Event type definitions
│   │   └── gameState.ts      # In-memory game state cache
│   ├── middleware/           # Express middleware
│   │   ├── errorHandler.ts   # Global error handler
│   │   ├── validation.ts     # Request validation
│   │   └── cors.ts           # CORS configuration
│   ├── utils/                # Utility functions
│   │   ├── generateCode.ts   # Generate game codes
│   │   └── teamBalancer.ts   # Team balancing logic
│   └── types/                # TypeScript types
│       └── index.ts
├── prisma/
│   └── schema.prisma         # Generated (DO NOT EDIT)
├── .env.local                # Environment variables
├── package.json
└── tsconfig.json
```

## API Endpoints

### Game Management

#### POST /api/games
Create a new game session
```typescript
Request: {
  hostName: string;
  totalRounds?: number; // Default 5
}

Response: {
  game: {
    id: string;
    code: string;
    qrCodeUrl: string;
    joinUrl: string;
  }
}
```

#### GET /api/games/:code
Get game details
```typescript
Response: {
  game: {
    id: string;
    code: string;
    status: GameStatus;
    players: Player[];
    currentRound: number;
    totalRounds: number;
  }
}
```

#### POST /api/games/:code/start
Start the game (host only)
```typescript
Response: {
  success: boolean;
  message: string;
}
```

#### DELETE /api/games/:code
End game (host only)

### Player Management

#### POST /api/games/:code/join
Join a game
```typescript
Request: {
  playerName: string;
}

Response: {
  player: {
    id: string;
    name: string;
    team: TeamType;
  };
  token: string; // Session token
}
```

#### GET /api/games/:code/players
Get all players in game

### Round Management

#### POST /api/rounds/:roundId/submit
Submit prompt for current round
```typescript
Request: {
  playerId: string;
  prompt: string;
}

Response: {
  submission: {
    id: string;
    prompt: string;
    imageUrl?: string;
  }
}
```

#### POST /api/rounds/:roundId/vote
Vote on round images
```typescript
Request: {
  playerId: string;
  votedTeam: TeamType;
}

Response: {
  vote: {
    id: string;
    votedTeam: TeamType;
  }
}
```

## WebSocket Events

### Client -> Server

#### `player:join`
Player joins game
```typescript
{
  gameCode: string;
  playerName: string;
}
```

#### `round:submit-prompt`
Player submits prompt
```typescript
{
  roundId: string;
  playerId: string;
  prompt: string;
}
```

#### `round:vote`
Player votes
```typescript
{
  roundId: string;
  playerId: string;
  votedTeam: TeamType;
}
```

#### `host:start-game`
Host starts game
```typescript
{
  gameCode: string;
}
```

#### `host:next-round`
Host moves to next round
```typescript
{
  gameCode: string;
}
```

### Server -> Client

#### `game:updated`
Game state changed
```typescript
{
  game: GameState;
}
```

#### `player:joined`
New player joined
```typescript
{
  player: Player;
}
```

#### `round:started`
New round started
```typescript
{
  round: {
    id: string;
    roundNumber: number;
    referenceImageUrl: string;
    goodPlayer: Player;
    evilPlayer: Player;
    endsAt: number; // Timestamp
  }
}
```

#### `round:prompts-submitted`
Both prompts submitted, generating images
```typescript
{
  status: 'generating';
}
```

#### `round:voting-started`
Images generated, voting begins
```typescript
{
  submissions: {
    good: { imageUrl: string; prompt: string };
    evil: { imageUrl: string; prompt: string };
  }
}
```

#### `round:vote-updated`
Vote count updated
```typescript
{
  votes: {
    good: number;
    evil: number;
  }
}
```

#### `round:completed`
Round finished
```typescript
{
  winner: TeamType;
  scores: {
    good: number;
    evil: number;
  }
}
```

#### `game:completed`
Game finished
```typescript
{
  finalScores: {
    good: number;
    evil: number;
  };
  winner: TeamType;
}
```

#### `error`
Error occurred
```typescript
{
  message: string;
  code?: string;
}
```

## Business Logic

### Game Creation Flow
1. Generate unique 6-character code
2. Create game in database
3. Generate QR code for join URL
4. Return game details

### Player Join Flow
1. Validate game exists and is in WAITING status
2. Check if name is unique in game
3. Calculate team assignment (balance teams)
4. Add player to database
5. Broadcast `player:joined` to all connected clients

### Round Start Flow
1. Select random player from each team (not recently selected)
2. Generate reference image using AI
3. Create round in database
4. Broadcast `round:started` with 30-second timer
5. Start 30-second countdown

### Prompt Submission Flow
1. Validate player is selected for this round
2. Store prompt in database
3. If both prompts submitted:
   - Broadcast `round:prompts-submitted`
   - Generate images from prompts (AI service)
   - When both generated, broadcast `round:voting-started`

### Voting Flow
1. Validate player hasn't voted yet
2. Validate player is not one of the prompt creators
3. Store vote in database
4. Broadcast updated vote counts
5. When all players voted or timeout:
   - Calculate winner
   - Update scores
   - Broadcast `round:completed`

### Team Balancing Algorithm
```typescript
function assignTeam(currentPlayers: Player[]): TeamType {
  const goodCount = currentPlayers.filter(p => p.team === 'GOOD').length;
  const evilCount = currentPlayers.filter(p => p.team === 'EVIL').length;

  if (goodCount === evilCount) {
    return Math.random() < 0.5 ? 'GOOD' : 'EVIL';
  }

  return goodCount < evilCount ? 'GOOD' : 'EVIL';
}
```

### Player Selection Algorithm
```typescript
function selectPlayers(
  players: Player[],
  recentlySelected: Set<string>
): { good: Player; evil: Player } {
  const goodPlayers = players
    .filter(p => p.team === 'GOOD' && !recentlySelected.has(p.id));
  const evilPlayers = players
    .filter(p => p.team === 'EVIL' && !recentlySelected.has(p.id));

  const goodPlayer = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
  const evilPlayer = evilPlayers[Math.floor(Math.random() * evilPlayers.length)];

  return { good: goodPlayer, evil: evilPlayer };
}
```

## Error Handling

1. **Validation errors** - Return 400 with clear message
2. **Not found errors** - Return 404 with resource type
3. **Business logic errors** - Return 422 with explanation
4. **Server errors** - Return 500, log error, don't expose internals
5. **WebSocket errors** - Emit `error` event to client

## Security

- **CORS**: Only allow configured origins
- **Rate limiting**: Limit game creation to prevent abuse
- **Input validation**: Validate all user inputs
- **Session tokens**: Use JWT or session IDs for player authentication
- **Game code expiration**: Clean up expired games

## Performance

- **In-memory cache**: Cache active game states
- **Connection pooling**: Reuse database connections
- **Async operations**: Use async/await for all I/O
- **Batch updates**: Batch database writes when possible
- **Socket rooms**: Use Socket.io rooms for game-specific broadcasts

## Testing Checklist

- [ ] Create game generates unique code
- [ ] Players can join and get balanced teams
- [ ] Game starts only when host triggers
- [ ] Round timer works correctly (30 seconds)
- [ ] Images generate from prompts
- [ ] Voting works and prevents double voting
- [ ] Scores update correctly
- [ ] Game completes after all rounds
- [ ] Reconnection works (players can rejoin)
- [ ] Expired games are cleaned up
