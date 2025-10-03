# Twin up! - ULTRAPLAN 🎯

## Executive Summary

**Twin up!** is a real-time multiplayer AI image generation game for your work Christmas party. Two teams (Good vs Evil) compete to create AI-generated images that best match reference images using creative prompts.

**Tech Stack:**
- Backend: Node.js + Express + Socket.io
- Frontend: React + Vite + TailwindCSS
- Database: PostgreSQL + Prisma
- AI: OpenAI DALL-E / Replicate + LangChain orchestration
- Real-time: Socket.io WebSockets

---

## Development Phases

### Phase 0: Project Setup (Day 1)
**Goal:** Initialize project structure and development environment

#### Tasks
1. **Initialize Repository**
   - [x] Create project directory structure
   - [ ] Initialize Git repository
   - [ ] Set up monorepo with npm workspaces
   - [ ] Create .gitignore (node_modules, .env, dist)

2. **Backend Setup**
   - [ ] Initialize Node.js project in `server/`
   - [ ] Install dependencies:
     - Express, Socket.io, Prisma, TypeScript
     - OpenAI SDK, LangChain
     - QRCode, UUID, Dotenv
   - [ ] Set up TypeScript configuration
   - [ ] Create basic Express server
   - [ ] Configure CORS and middleware

3. **Frontend Setup**
   - [ ] Initialize React + Vite project in `client/`
   - [ ] Install dependencies:
     - React Router, Socket.io-client
     - TailwindCSS, Framer Motion
     - Axios for API calls
   - [ ] Configure Vite
   - [ ] Set up Tailwind with custom theme
   - [ ] Create basic routing structure

4. **Database Setup**
   - [ ] Install PostgreSQL locally
   - [ ] Create `twinup` database
   - [ ] Initialize Prisma in `server/prisma/`
   - [ ] Define initial schema (Game, Player models)
   - [ ] Run first migration
   - [ ] Test connection

5. **Development Tools**
   - [ ] Set up npm scripts (dev, build, test)
   - [ ] Configure nodemon for server hot reload
   - [ ] Set up concurrent dev script
   - [ ] Create .env.example files

**Deliverables:**
- ✅ Working dev environment
- ✅ Both client and server running
- ✅ Database connected
- ✅ Git repository initialized

**Agent Assignments:**
- Use **backend-agent** for server setup
- Use **frontend-agent** for client setup
- Use **database-agent** for Prisma configuration

---

### Phase 1: Core Game Flow (Days 2-3)
**Goal:** Implement basic game creation and player joining

#### 1.1 Database Schema
**Agent:** database-agent

- [ ] Complete all models (Game, Player, Round, Submission, Vote)
- [ ] Define relationships and indexes
- [ ] Create enums (GameStatus, TeamType, RoundStatus)
- [ ] Generate Prisma client
- [ ] Create migration
- [ ] Write seed script for test data

#### 1.2 Host Game Creation
**Agent:** backend-agent

**Backend:**
- [ ] POST `/api/games` endpoint
  - Generate 6-character game code
  - Create game in database
  - Generate QR code
  - Return game details
- [ ] GET `/api/games/:code` endpoint
  - Fetch game with players
- [ ] DELETE `/api/games/:code` endpoint
  - Allow host to cancel game

**Agent:** frontend-agent

**Frontend:**
- [ ] Host dashboard page (`/host`)
- [ ] Create game form
- [ ] Display game code prominently
- [ ] Show QR code for easy joining
- [ ] Display shareable URL
- [ ] Waiting room component

**Testing:**
- [ ] Host can create game
- [ ] Unique game codes generated
- [ ] QR code displays correctly

#### 1.3 Player Join Flow
**Agent:** backend-agent

**Backend:**
- [ ] POST `/api/games/:code/join` endpoint
  - Validate game exists and is in WAITING status
  - Check name uniqueness
  - Assign team (balance algorithm)
  - Create player in database
  - Return player details + session token
- [ ] Implement team balancing logic
  - Count players per team
  - Assign to smaller team (or random if equal)

**Agent:** frontend-agent

**Frontend:**
- [ ] Join game page (`/join/:code`)
- [ ] Player name input form
- [ ] Team assignment display
- [ ] Waiting room for players
- [ ] Show all joined players with teams
- [ ] Real-time player list updates

**Testing:**
- [ ] Players can join with code
- [ ] Teams balance automatically
- [ ] Duplicate names rejected
- [ ] Real-time player list works

#### 1.4 WebSocket Foundation
**Agent:** backend-agent

**Backend:**
- [ ] Set up Socket.io server
- [ ] Implement room-based broadcasting (per game)
- [ ] Handle `player:join` event
- [ ] Broadcast `player:joined` to room
- [ ] Handle `game:updated` events
- [ ] Connection/disconnection handling

**Agent:** frontend-agent

**Frontend:**
- [ ] WebSocket context provider
- [ ] useWebSocket hook
- [ ] Connect on page load
- [ ] Join game room
- [ ] Listen for player:joined events
- [ ] Update UI in real-time

**Testing:**
- [ ] WebSocket connects successfully
- [ ] Room joining works
- [ ] Real-time updates received
- [ ] Reconnection handling works

**Deliverables:**
- ✅ Host can create games
- ✅ Players can join via code/QR
- ✅ Teams balance automatically
- ✅ Real-time player list updates

---

### Phase 2: Round Management (Days 4-5)
**Goal:** Implement round lifecycle from setup to completion

#### 2.1 Game Start & Round Setup
**Agent:** backend-agent

**Backend:**
- [ ] POST `/api/games/:code/start` endpoint
  - Validate host permission
  - Update game status to IN_PROGRESS
  - Create first round
  - Select random players from each team
- [ ] Round player selection algorithm
  - Track recently selected players
  - Random selection excluding recent
- [ ] WebSocket: Broadcast `round:started` event

**Agent:** frontend-agent

**Frontend:**
- [ ] "Start Game" button (host only)
- [ ] Round start screen
- [ ] Display round number (e.g., "Round 1 of 5")
- [ ] Show selected players
- [ ] Display reference image
- [ ] 30-second countdown timer

**Testing:**
- [ ] Only host can start game
- [ ] First round creates correctly
- [ ] Random players selected from each team
- [ ] Timer displays correctly

#### 2.2 AI Reference Image Generation
**Agent:** ai-integration-agent

**Backend:**
- [ ] Implement OpenAI provider
- [ ] Reference image generation
  - Random theme selection
  - Generate with DALL-E
  - Store/cache image URL
- [ ] Error handling and retries
- [ ] Fallback to mock in development

**Testing:**
- [ ] Reference images generate successfully
- [ ] Images are relevant and varied
- [ ] Generation completes in <15 seconds
- [ ] Errors handled gracefully

#### 2.3 Prompt Submission
**Agent:** backend-agent

**Backend:**
- [ ] POST `/api/rounds/:roundId/submit` endpoint
  - Validate player is selected for this round
  - Store prompt in Submission table
  - Check if both teams submitted
  - If both submitted, trigger image generation
- [ ] WebSocket: Broadcast `round:prompts-submitted`

**Agent:** frontend-agent

**Frontend:**
- [ ] Prompt input screen (selected players only)
- [ ] Large text area with character limit (500)
- [ ] Submit button
- [ ] Timer countdown (30 seconds)
- [ ] Disable after submission
- [ ] "Waiting for opponent..." message
- [ ] Spectator view for non-selected players

**Testing:**
- [ ] Selected players can submit prompts
- [ ] Non-selected players see spectator view
- [ ] Timer enforces 30-second limit
- [ ] Both submissions trigger next phase

#### 2.4 LangChain Image Generation
**Agent:** ai-integration-agent

**Backend:**
- [ ] Implement LangChainImageOrchestrator
- [ ] Prompt enhancement agent (GPT-4)
- [ ] Parallel image generation
  - OpenAI DALL-E
  - Replicate SDXL (backup)
  - Multiple variations
- [ ] Quality evaluation agent
- [ ] Select best image per team
- [ ] Store images in database
- [ ] WebSocket: Broadcast `round:voting-started`

**Testing:**
- [ ] Prompts enhanced by LLM
- [ ] Multiple images generated in parallel
- [ ] Best image selected automatically
- [ ] Generation completes in <15 seconds
- [ ] Cost tracking works

**Deliverables:**
- ✅ Rounds start automatically
- ✅ Reference images generated
- ✅ Players submit prompts
- ✅ AI generates images with LangChain
- ✅ Voting phase begins

---

### Phase 3: Voting & Scoring (Day 6)
**Goal:** Implement voting system and score tracking

#### 3.1 Voting System
**Agent:** backend-agent

**Backend:**
- [ ] POST `/api/rounds/:roundId/vote` endpoint
  - Validate player hasn't voted
  - Validate player is not a prompt creator
  - Store vote in database
  - Broadcast updated vote counts
  - Check if all players voted
  - Calculate winner when voting complete
- [ ] Vote counting logic
- [ ] Round completion logic
  - Determine winning team
  - Update team scores
  - Broadcast round results

**Agent:** frontend-agent

**Frontend:**
- [ ] Voting screen
- [ ] Side-by-side image comparison
  - Good team image (left)
  - Evil team image (right)
  - Reference image (top center)
- [ ] Vote buttons (large, team-colored)
- [ ] Disable after voting
- [ ] Show "You voted for X" message
- [ ] Live vote count (optional)
- [ ] Voting timer (30 seconds)

**Testing:**
- [ ] All players can vote (except prompt creators)
- [ ] Double voting prevented
- [ ] Vote counts update in real-time
- [ ] Winner calculated correctly

#### 3.2 Round Results
**Agent:** frontend-agent

**Frontend:**
- [ ] Round results screen
- [ ] Display winning image larger
- [ ] Show vote breakdown (e.g., "Good: 5, Evil: 3")
- [ ] Update scoreboard
- [ ] Celebration animation for winners
- [ ] "Next Round" button (host only)
- [ ] Auto-advance timer (10 seconds)

**Agent:** backend-agent

**Backend:**
- [ ] POST `/api/games/:code/next-round` endpoint
  - Increment current round
  - Create next round
  - Select new players
  - Generate new reference image
- [ ] Handle game completion (all rounds done)

**Testing:**
- [ ] Results display correctly
- [ ] Scores update accurately
- [ ] Next round auto-advances
- [ ] Host can manually advance

#### 3.3 Game Completion
**Agent:** frontend-agent

**Frontend:**
- [ ] Final results screen
- [ ] Display final scores
- [ ] Winning team celebration
- [ ] Highlight MVP (most personal points)
- [ ] Show memorable rounds
- [ ] "Play Again" button
- [ ] "Exit" button

**Agent:** backend-agent

**Backend:**
- [ ] Game completion logic
- [ ] Update game status to COMPLETED
- [ ] Calculate final statistics
- [ ] Broadcast `game:completed` event

**Testing:**
- [ ] Game completes after all rounds
- [ ] Final scores correct
- [ ] Statistics accurate
- [ ] Play again creates new game

**Deliverables:**
- ✅ Voting works correctly
- ✅ Scores tracked accurately
- ✅ Round results display
- ✅ Game completion flow

---

### Phase 4: Polish & UX (Day 7)
**Goal:** Enhance user experience and add polish

#### 4.1 Animations & Transitions
**Agent:** frontend-agent

- [ ] Install Framer Motion
- [ ] Page transition animations
- [ ] New player join animation
- [ ] Timer pulse animation (last 5 seconds)
- [ ] Vote count increment animation
- [ ] Confetti on round/game win
- [ ] Image reveal animations

#### 4.2 Mobile Responsiveness
**Agent:** frontend-agent

- [ ] Test all screens on mobile
- [ ] Responsive layouts with Tailwind breakpoints
- [ ] Touch-friendly button sizes (min 44x44px)
- [ ] Optimize image sizes for mobile
- [ ] Test landscape orientation
- [ ] Fix any layout issues

#### 4.3 Error Handling & Loading States
**Agent:** frontend-agent

**Frontend:**
- [ ] Loading spinners for async operations
- [ ] Error toast notifications
- [ ] Graceful error messages
- [ ] Retry buttons where appropriate
- [ ] Skeleton screens for loading states

**Agent:** backend-agent

**Backend:**
- [ ] Comprehensive error logging
- [ ] Validation error messages
- [ ] Rate limiting on game creation
- [ ] Input sanitization
- [ ] Proper HTTP status codes

#### 4.4 Reconnection & Persistence
**Agent:** backend-agent

**Backend:**
- [ ] Session token generation
- [ ] Player re-authentication
- [ ] Resume game on reconnect

**Agent:** frontend-agent

**Frontend:**
- [ ] Store session in localStorage
- [ ] Auto-reconnect on WebSocket disconnect
- [ ] Sync state after reconnection
- [ ] Show connection status indicator

#### 4.5 Sound Effects (Optional)
**Agent:** frontend-agent

- [ ] Timer tick sound (last 5 seconds)
- [ ] Submission success sound
- [ ] Vote registered sound
- [ ] Round winner sound
- [ ] Game completion sound
- [ ] Mute toggle button

**Deliverables:**
- ✅ Smooth animations
- ✅ Mobile responsive
- ✅ Error handling complete
- ✅ Reconnection works
- ✅ Professional polish

---

### Phase 5: Testing & Deployment (Day 8)
**Goal:** Test thoroughly and deploy to production

#### 5.1 Integration Testing
**Agent:** backend-agent

- [ ] Test full game flow end-to-end
- [ ] Test with 4, 8, 12, 16 players
- [ ] Test edge cases:
  - Player disconnects mid-game
  - API failures
  - Timeout scenarios
  - Invalid inputs
- [ ] Load testing with multiple concurrent games
- [ ] Test team balancing with odd numbers

#### 5.2 Browser Testing
**Agent:** frontend-agent

- [ ] Chrome (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Firefox
- [ ] Edge
- [ ] Test on actual mobile devices
- [ ] Test with slow network (throttling)

#### 5.3 Performance Optimization
**Agent:** backend-agent

- [ ] Database query optimization
- [ ] Add indexes to frequently queried fields
- [ ] Implement Redis caching (optional)
- [ ] Optimize image storage
- [ ] Monitor API response times

**Agent:** frontend-agent

- [ ] Code splitting for faster initial load
- [ ] Image lazy loading
- [ ] Optimize bundle size
- [ ] Minimize network requests
- [ ] Lighthouse audit (aim for 90+ score)

#### 5.4 Production Deployment

**Infrastructure:**
- [ ] Set up production database (Render, Railway, or Heroku Postgres)
- [ ] Deploy backend (Render, Railway, or Fly.io)
- [ ] Deploy frontend (Vercel, Netlify, or Render)
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure CORS for production domains

**Post-Deploy:**
- [ ] Run database migrations
- [ ] Test production environment
- [ ] Monitor logs
- [ ] Set up error tracking (Sentry)
- [ ] Configure automated backups

**Deliverables:**
- ✅ All features tested
- ✅ Performance optimized
- ✅ Deployed to production
- ✅ Monitoring in place

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Host         │  │ Player       │  │ Voting       │      │
│  │ Dashboard    │  │ Join/Play    │  │ & Results    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                │                  │             │
│           └────────────────┴──────────────────┘             │
│                            │                                │
│                    WebSocket + REST API                     │
└────────────────────────────┼───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                         BACKEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Express      │  │ Socket.io    │  │ Game State   │     │
│  │ REST API     │  │ WebSocket    │  │ Manager      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                            │                                │
│                    ┌───────┴────────┐                       │
│                    │                │                       │
│          ┌─────────┴──────┐  ┌──────┴──────────┐          │
│          │ LangChain      │  │ Prisma ORM      │          │
│          │ Orchestrator   │  │                 │          │
│          └─────────┬──────┘  └──────┬──────────┘          │
│                    │                │                       │
└────────────────────┼────────────────┼───────────────────────┘
                     │                │
         ┌───────────┴──────┐        │
         │                  │        │
┌────────┴────────┐  ┌──────┴──┐   ┌┴──────────────┐
│ OpenAI DALL-E   │  │ GPT-4   │   │ PostgreSQL    │
│ Image Gen       │  │ LLM     │   │ Database      │
└─────────────────┘  └─────────┘   └───────────────┘
```

---

## Database Schema

```prisma
// Core Models

model Game {
  id           String      @id @default(uuid())
  code         String      @unique
  hostName     String
  status       GameStatus  @default(WAITING)
  currentRound Int         @default(0)
  totalRounds  Int         @default(5)
  expiresAt    DateTime
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  players      Player[]
  rounds       Round[]
}

model Player {
  id          String    @id @default(uuid())
  gameId      String
  name        String
  team        TeamType
  score       Int       @default(0)
  isHost      Boolean   @default(false)
  joinedAt    DateTime  @default(now())

  game        Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  submissions Submission[]
  votes       Vote[]
}

model Round {
  id                String       @id @default(uuid())
  gameId            String
  roundNumber       Int
  referenceImageUrl String
  referencePrompt   String
  goodPlayerId      String?
  evilPlayerId      String?
  status            RoundStatus  @default(SETUP)
  winningTeam       TeamType?
  createdAt         DateTime     @default(now())

  game              Game         @relation(fields: [gameId], references: [id], onDelete: Cascade)
  submissions       Submission[]
  votes             Vote[]
}

model Submission {
  id          String    @id @default(uuid())
  roundId     String
  playerId    String
  team        TeamType
  prompt      String
  imageUrl    String?
  createdAt   DateTime  @default(now())

  round       Round     @relation(fields: [roundId], references: [id], onDelete: Cascade)
  player      Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
}

model Vote {
  id          String    @id @default(uuid())
  roundId     String
  playerId    String
  votedTeam   TeamType
  createdAt   DateTime  @default(now())

  round       Round     @relation(fields: [roundId], references: [id], onDelete: Cascade)
  player      Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
}
```

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create new game |
| GET | `/api/games/:code` | Get game details |
| POST | `/api/games/:code/start` | Start game (host only) |
| POST | `/api/games/:code/join` | Join game as player |
| POST | `/api/games/:code/next-round` | Advance to next round |
| POST | `/api/rounds/:roundId/submit` | Submit prompt |
| POST | `/api/rounds/:roundId/vote` | Vote on images |
| DELETE | `/api/games/:code` | Cancel game |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `player:join` | Client → Server | Player joins game |
| `player:joined` | Server → Client | New player joined |
| `game:updated` | Server → Client | Game state changed |
| `round:started` | Server → Client | Round begins |
| `round:prompts-submitted` | Server → Client | Both prompts submitted |
| `round:voting-started` | Server → Client | Images ready, voting begins |
| `round:vote-updated` | Server → Client | Vote count updated |
| `round:completed` | Server → Client | Round finished |
| `game:completed` | Server → Client | Game finished |
| `error` | Server → Client | Error occurred |

---

## Agent Guidelines Summary

### backend-agent
**Responsible for:**
- Node.js/Express server
- REST API endpoints
- Socket.io WebSocket events
- Business logic & game state
- AI service integration

**Key files:**
- `server/src/routes/*.ts`
- `server/src/services/*.ts`
- `server/src/websocket/*.ts`

### frontend-agent
**Responsible for:**
- React components & pages
- UI/UX implementation
- WebSocket client integration
- Responsive design
- Animations & polish

**Key files:**
- `client/src/pages/**/*.tsx`
- `client/src/components/*.tsx`
- `client/src/contexts/*.tsx`

### database-agent
**Responsible for:**
- Prisma schema design
- Database migrations
- Seed data scripts
- Query optimization
- Data integrity

**Key files:**
- `server/prisma/schema.prisma`
- `database/seed/*.ts`

### ai-integration-agent
**Responsible for:**
- AI image generation
- LangChain orchestration
- Prompt engineering
- Provider integration
- Cost optimization

**Key files:**
- `server/src/services/aiService.ts`
- `server/src/services/langchainOrchestrator.ts`

---

## Environment Variables

### Server (.env.local)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/twinup"

# Server
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"

# AI Services
OPENAI_API_KEY="sk-..."
REPLICATE_API_TOKEN="r8_..."

# LangChain (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY="ls_..."
LANGCHAIN_PROJECT="twinup-game"

# Feature Flags
USE_LANGCHAIN_ORCHESTRATION=true
USE_MOCK_AI=false
PARALLEL_GENERATIONS=3

# Storage (optional)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET="twinup-images"
```

### Client (.env.local)
```bash
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
```

---

## NPM Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && nodemon src/index.ts",
    "dev:client": "cd client && vite",
    "build": "npm run build:server && npm run build:client",
    "build:server": "cd server && tsc",
    "build:client": "cd client && vite build",
    "db:generate": "cd server && npx prisma generate",
    "db:migrate": "cd server && npx prisma migrate dev",
    "db:seed": "cd server && ts-node ../database/seed/dev-seed.ts",
    "db:studio": "cd server && npx prisma studio",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Success Criteria

### MVP (Minimum Viable Product)
- [x] Host can create game with QR code
- [x] Players can join and teams auto-balance
- [x] Rounds progress automatically
- [x] Reference images generate
- [x] Players submit prompts (30s timer)
- [x] Images generate from prompts
- [x] Players vote on images
- [x] Scores track correctly
- [x] Game completes and shows winner

### Polish
- [ ] Smooth animations
- [ ] Mobile responsive
- [ ] Error handling
- [ ] Reconnection works
- [ ] Professional design

### Performance
- [ ] Images generate in <15s
- [ ] Game supports 16+ players
- [ ] WebSocket latency <100ms
- [ ] Frontend Lighthouse score 90+

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0: Setup | Day 1 | Dev environment ready |
| 1: Core Flow | Days 2-3 | Create & join games |
| 2: Rounds | Days 4-5 | Round lifecycle complete |
| 3: Voting | Day 6 | Full game playable |
| 4: Polish | Day 7 | Production-ready UX |
| 5: Deploy | Day 8 | Live in production |

**Total: ~8 days**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI API slow/expensive | Use mock in dev, implement caching, parallel generation |
| WebSocket disconnects | Reconnection logic, session persistence |
| Image generation fails | Retry logic, multiple providers, fallback images |
| Too many concurrent games | Rate limiting, game expiration, cleanup jobs |
| Mobile performance | Code splitting, lazy loading, optimized images |
| Database performance | Indexes, connection pooling, query optimization |

---

## Post-Launch Enhancements

### v2 Features (Future)
- [ ] Game replays and history
- [ ] Player statistics and leaderboards
- [ ] Custom reference image upload
- [ ] Difficulty levels (easy/medium/hard themes)
- [ ] Team selection (instead of random)
- [ ] Round time customization
- [ ] Multiple game modes
- [ ] Player avatars
- [ ] Chat/emoji reactions
- [ ] Tournament brackets

---

## Resources & Documentation

- Main instructions: `.claude/instructions.md`
- Backend agent: `.claude/agents/backend-agent.md`
- Frontend agent: `.claude/agents/frontend-agent.md`
- Database agent: `.claude/agents/database-agent.md`
- AI integration agent: `.claude/agents/ai-integration-agent.md`
- Database instructions: `database/instructions.md`

---

**Ready to build? Start with Phase 0!** 🚀

Use the specialized agents for each component and follow the phased approach for systematic development.
