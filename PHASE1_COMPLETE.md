# 🎉 Phase 1 Complete! Core Game Flow Working

## What's Working

### ✅ Backend (Server)
- **Game Creation** - Unique 6-character codes (e.g., "ABC123")
- **Player Management** - Join game with name validation
- **Team Balancing** - Auto-assigns to Good/Evil teams to keep balanced
- **WebSocket Events** - Real-time updates when players join
- **Game State** - Tracks players, teams, status (WAITING, IN_PROGRESS, etc.)

### ✅ Frontend (Client)
- **Host Dashboard**
  - Create game form (enter name, select rounds)
  - Waiting room with live player list
  - Team indicators (green for Good, red for Evil)
  - Game code display
  - Start game button (enabled at 4+ players)

- **Join Game**
  - Enter game code and player name
  - Auto-assigned to team
  - Waiting room showing all players
  - Real-time updates when others join

### ✅ Real-Time Features
- WebSocket connection on page load
- Live player join notifications
- Instant team assignment display
- Game state synchronization across all clients

---

## How to Test

### Prerequisites
```bash
# Install PostgreSQL (if not already installed)
# macOS:
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb twinup
```

### 1. Start the Servers

```bash
# Terminal 1: Start both client and server
npm run dev

# Or separately:
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

You should see:
```
🚀 Server running on http://localhost:3001
🎮 WebSocket server ready
🔧 Environment: development
```

And:
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 2. Test Game Creation

1. **Open Host Dashboard**: http://localhost:5173/host
2. **Create a Game**:
   - Enter your name (e.g., "Alice")
   - Select number of rounds (default 5)
   - Click "🚀 Create Game"
3. **You should see**:
   - A unique 6-character game code (e.g., "H3K9PQ")
   - Waiting room with your name
   - You're assigned to either Good or Evil team
   - Join URL displayed

### 3. Test Player Joining

1. **Open Join Page** in a new browser window/tab:
   - Go to http://localhost:5173/join
   - OR use the direct code: http://localhost:5173/join/H3K9PQ (your code)

2. **Join as a player**:
   - Enter your name (e.g., "Bob")
   - Enter the game code
   - Click "👥 Join Game"

3. **You should see**:
   - Success! You're assigned to a team
   - Waiting room showing all players
   - Your team badge (Good or Evil)
   - Other players' names

### 4. Test Real-Time Updates

1. **Open multiple tabs** (4+ for best test):
   - Tab 1: Host (Alice) - http://localhost:5173/host
   - Tab 2-4: Players - http://localhost:5173/join

2. **Join players one by one**:
   - Bob joins → Everyone sees Bob appear!
   - Charlie joins → Everyone sees Charlie!
   - Diana joins → Everyone sees Diana!

3. **Check team balance**:
   - Players should be distributed evenly
   - Example: Good: Alice, Charlie | Evil: Bob, Diana

4. **Start the game** (as host):
   - Click "🚀 Start Game!" button
   - All players should see game status change

---

## Architecture Flow

```
User Opens /host
     ↓
CreateGame Component
     ↓
POST /api/games {hostName, totalRounds}
     ↓
Server: gameService.createGame()
     ↓
- Generate unique 6-char code
- Create game in PostgreSQL
- Generate QR code (data URL)
     ↓
Return {game, joinUrl, qrCodeUrl}
     ↓
Client: setGame(game)
Client: WebSocket.emit('join-game', {gameCode})
     ↓
Server: WebSocket receives join-game
Server: socket.join(`game:${gameCode}`)
Server: Broadcast game state to room
     ↓
WaitingRoom Component shows:
- Game code
- Players list (real-time)
- Team balance
- Start button
```

---

## Database Tables (Prisma)

Currently using these models:

1. **Game**
   - id, code (unique 6-char)
   - hostName, status (WAITING, IN_PROGRESS, etc.)
   - currentRound, totalRounds
   - expiresAt (2 hours from creation)

2. **Player**
   - id, gameId, name
   - team (GOOD or EVIL)
   - score, isHost
   - joinedAt

3. **Round, Submission, Vote** - Created but not used yet (Phase 2)

---

## WebSocket Events

### Client → Server
- `join-game` - Join a game room
- `request:game-state` - Request current game state

### Server → Client
- `joined-game` - Acknowledgment of joining
- `game:state` - Full game state
- `game:updated` - Game state changed
- `player:joined` - New player joined
- `player:disconnected` - Player left
- `error` - Error message

---

## Next: Phase 2 - Round Management

What we'll build next:

1. **AI Reference Image Generation**
   - Generate reference images for each round
   - Display to all players

2. **Player Prompt Submission**
   - 30-second timer
   - Text input for selected players
   - Spectator view for non-selected players

3. **LangChain Image Generation**
   - Enhance prompts with GPT-4
   - Generate multiple images in parallel
   - Select best image automatically

4. **Round States**
   - SETUP → PROMPTING → GENERATING → VOTING → COMPLETE

5. **Player Selection**
   - Random selection from each team per round
   - Exclude recently selected players

---

## Troubleshooting

### Database Connection Error
```bash
# Make sure PostgreSQL is running
brew services list | grep postgres

# Check if database exists
psql -l | grep twinup

# If not, create it
createdb twinup
```

### WebSocket Not Connecting
- Check server is running on port 3001
- Check `.env.local` files have correct URLs
- Check browser console for errors

### Players Not Showing Up
- Open browser DevTools → Network tab
- Check for WebSocket connection (ws://localhost:3001)
- Check Console for connection logs
- Verify no firewall blocking WebSocket

### Team Not Balancing
- Check server logs for team assignment
- Verify multiple players joining
- First 2 players will be on different teams
- 3rd player joins smaller team

---

## Files Changed (16 files)

### Backend (8 files)
- `server/src/index.ts` - Added game routes
- `server/src/routes/games.ts` - NEW - Game API endpoints
- `server/src/services/gameService.ts` - NEW - Game business logic
- `server/src/services/qrService.ts` - NEW - QR code generation
- `server/src/utils/generateCode.ts` - NEW - Game code generator
- `server/src/utils/teamBalancer.ts` - NEW - Team balancing logic
- `server/src/websocket/handlers.ts` - Enhanced with game events

### Frontend (8 files)
- `client/src/App.tsx` - Added providers and routes
- `client/src/contexts/WebSocketContext.tsx` - NEW - WebSocket provider
- `client/src/contexts/GameContext.tsx` - NEW - Game state provider
- `client/src/services/api.ts` - NEW - API client
- `client/src/services/websocket.ts` - NEW - WebSocket client
- `client/src/pages/HostDashboard/index.tsx` - NEW
- `client/src/pages/HostDashboard/CreateGame.tsx` - NEW
- `client/src/pages/HostDashboard/WaitingRoom.tsx` - NEW
- `client/src/pages/JoinGame/index.tsx` - NEW

**Total: 1,239 lines of code added!**

---

## Screenshots (What You'll See)

### Host Dashboard - Create Game
```
┌────────────────────────────────┐
│      Create Game               │
│                                │
│  Your Name: [Alice_____]       │
│  Rounds:    [5 ▼]              │
│                                │
│  [ 🚀 Create Game ]            │
└────────────────────────────────┘
```

### Waiting Room
```
┌────────────────────────────────────────┐
│  Game Code: H3K9PQ                     │
│  Players can join at: localhost/.../   │
│                                        │
│  📱 [QR Code Placeholder]              │
│                                        │
│  Good Team (2) │ Evil Team (2)         │
│  👑 Alice      │ Bob                   │
│  Charlie       │ Diana                 │
│                                        │
│  [ 🚀 Start Game! ]                    │
└────────────────────────────────────────┘
```

### Join Game
```
┌────────────────────────────────┐
│      Join Game                 │
│                                │
│  Game Code: [H3K9PQ]           │
│  Your Name: [Bob_____]         │
│                                │
│  [ 👥 Join Game ]              │
└────────────────────────────────┘
```

### Player Waiting Room
```
┌────────────────────────────────┐
│  Welcome, Bob! 👋              │
│  😈 Evil Team                  │
│                                │
│  Game Code: H3K9PQ             │
│                                │
│  🦸 Good (2) │ 😈 Evil (2)     │
│  Alice      │ Bob ✓            │
│  Charlie    │ Diana            │
│                                │
│  ⏳ Waiting for host...        │
└────────────────────────────────┘
```

---

Ready to test! 🎮🚀
