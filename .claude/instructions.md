# Twin up! - AI Prompting Game

## Project Overview

Twin up! is a multiplayer AI-based prompting game where two teams compete to create the best AI-generated images matching reference images.

## Architecture

```
├── .claude/                     # Claude AI instructions & agents
│   ├── agents/                  # Specialized agents for different tasks
│   │   ├── backend-agent.md     # Backend API & WebSocket development
│   │   ├── frontend-agent.md    # React UI development
│   │   ├── database-agent.md    # Database schema & Prisma
│   │   └── ai-integration-agent.md # AI image generation integration
│   └── instructions.md          # This file
├── database/                    # Database management
│   ├── migrations/              # Prisma migrations
│   ├── seed/                    # Development seed data scripts
│   └── instructions.md          # Database-specific instructions
├── server/                      # Backend API server
│   ├── src/
│   │   ├── routes/              # API route handlers
│   │   ├── services/            # Business logic
│   │   ├── websocket/           # WebSocket handlers
│   │   ├── middleware/          # Express middleware
│   │   └── utils/               # Utility functions
│   ├── prisma/                  # Prisma ORM configuration
│   │   └── schema.prisma        # Database schema (generated from base)
│   ├── .env.local               # Environment variables
│   └── package.json
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React context providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page components/routes
│   │   │   ├── HostDashboard/   # Host game management
│   │   │   ├── JoinGame/        # Player join screen
│   │   │   ├── GamePlay/        # Active game screen
│   │   │   └── Voting/          # Voting screen
│   │   ├── services/            # API client & WebSocket
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx              # Main application component
│   │   └── main.tsx             # Application entry point
│   ├── package.json
│   └── vite.config.ts
├── shared/                      # Shared types between client/server
│   └── types.ts
├── package.json                 # Root workspace configuration
└── README.md                    # Project documentation
```

## Tech Stack

- **Backend**: Node.js + Express/Fastify + Socket.io
- **Frontend**: React + Vite + TailwindCSS
- **Database**: PostgreSQL + Prisma ORM
- **AI Integration**: OpenAI DALL-E API or Replicate API
- **Real-time**: Socket.io for WebSocket communication

## Development Workflow

### General Rules

1. **Always check the current state** before making changes
2. **Follow the specialized agent instructions** for domain-specific work
3. **Run type checking** after significant changes: `npm run typecheck`
4. **Test locally** before considering work complete
5. **Keep client and server types in sync** using the shared folder

### Database Changes

1. Navigate to `database/base/` directory
2. Modify schema files there (NOT in server/prisma/schema.prisma)
3. Run `npm run db:generate` to generate server/prisma/schema.prisma
4. Run `npm run db:migrate` to create and apply migrations
5. See `database/instructions.md` for detailed database workflow

### Backend Development

- Use the **backend-agent** for API and WebSocket development
- All routes should follow RESTful conventions
- WebSocket events should be documented in server/src/websocket/events.ts
- See `.claude/agents/backend-agent.md` for specific guidelines

### Frontend Development

- Use the **frontend-agent** for React component development
- Follow component structure: components/ for reusable, pages/ for routes
- Use contexts for global state (game state, player state, WebSocket)
- TailwindCSS for all styling
- See `.claude/agents/frontend-agent.md` for specific guidelines

### AI Integration

- Use the **ai-integration-agent** for AI image generation work
- Abstract AI providers behind a service interface
- Handle rate limits and errors gracefully
- See `.claude/agents/ai-integration-agent.md` for specific guidelines

## Key Features to Implement

### Phase 1: Core Game Setup
- [ ] Host can create a game session
- [ ] Generate QR code and shareable URL
- [ ] Players can join via URL/QR code
- [ ] Display waiting room with joined players
- [ ] Assign players to teams (Good/Evil) with balancing

### Phase 2: Game Flow
- [ ] Host starts the game
- [ ] Generate reference image for each round
- [ ] Select random player from each team per round
- [ ] Display prompt input with 30-second timer
- [ ] Generate images from player prompts
- [ ] Display both images side-by-side

### Phase 3: Voting & Scoring
- [ ] All players can vote on better image
- [ ] Real-time vote display
- [ ] Calculate scores per team
- [ ] Display round winner
- [ ] Track overall game score

### Phase 4: Polish
- [ ] Animations and transitions
- [ ] Sound effects
- [ ] Mobile responsive design
- [ ] Error handling and reconnection
- [ ] Game history and stats

## Environment Variables

### Server (.env.local)
```
DATABASE_URL="postgresql://user:password@localhost:5432/twinup"
PORT=3001
OPENAI_API_KEY="sk-..."
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

### Client (.env.local)
```
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
```

## Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run dev:server` - Start server only
- `npm run dev:client` - Start client only
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking
- `npm run db:generate` - Generate Prisma client from schema
- `npm run db:migrate` - Create and apply database migration
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio

## Testing the Game

1. Start the server: `npm run dev:server`
2. Start the client: `npm run dev:client`
3. Open host dashboard: `http://localhost:5173/host`
4. Create a game and get the join code
5. Open player views in incognito windows: `http://localhost:5173/join/[code]`
6. Test the full game flow

## Important Notes

- **Game State**: Maintained on server, broadcasted via WebSocket
- **Team Balance**: Auto-balances when players join (alternating assignment with randomization)
- **Round Selection**: Random selection from each team, excluding recently selected players
- **Voting**: All players vote except the two prompt creators
- **Image Generation**: Queue system to handle API rate limits
- **Session Management**: Games expire after 2 hours of inactivity
