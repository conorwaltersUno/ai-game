# Twin up! 🎨🎮

An AI-powered multiplayer image generation game for your Christmas party! Two teams (Good vs Evil) compete to create AI-generated images that best match reference images using creative prompts.

## Project Structure

```
AI-game/
├── .claude/                     # Claude AI instructions & specialized agents
│   ├── agents/
│   │   ├── backend-agent.md     # Backend development guidelines
│   │   ├── frontend-agent.md    # Frontend development guidelines
│   │   ├── database-agent.md    # Database & Prisma guidelines
│   │   └── ai-integration-agent.md # AI/LangChain guidelines
│   └── instructions.md          # Main project instructions
├── server/                      # Backend API server (Node.js + Express)
│   ├── src/
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   ├── websocket/           # Socket.io handlers
│   │   ├── middleware/          # Express middleware
│   │   └── index.ts             # Server entry point
│   ├── prisma/                  # Prisma ORM
│   │   └── schema.prisma        # Database schema
│   └── package.json
├── client/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   ├── contexts/            # React contexts
│   │   ├── hooks/               # Custom hooks
│   │   └── main.tsx             # App entry point
│   └── package.json
├── shared/                      # Shared TypeScript types
│   └── types.ts
├── database/                    # Database management
│   └── instructions.md
├── ULTRAPLAN.md                 # 8-day development plan
├── package.json                 # Root workspace config
└── README.md                    # This file
```

## Tech Stack

- **Backend:** Node.js + TypeScript + Express + Socket.io
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Database:** PostgreSQL + Prisma ORM
- **AI:** OpenAI DALL-E + LangChain orchestration
- **Real-time:** Socket.io WebSockets

## Quick Start

### Prerequisites

- Node.js 20+ & npm 10+
- PostgreSQL 15+
- OpenAI API key (for production)

### Installation

```bash
# Install all dependencies (both client and server)
npm install

# Generate Prisma client
npm run db:generate
```

### Environment Setup

1. **Server:** Copy `server/.env.example` to `server/.env.local` and configure:
   ```bash
   DATABASE_URL="postgresql://localhost:5432/twinup"
   PORT=3001
   CORS_ORIGIN="http://localhost:5173"
   USE_MOCK_AI=true  # Set to false when you have OpenAI API key
   ```

2. **Client:** Copy `client/.env.example` to `client/.env.local`:
   ```bash
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=ws://localhost:3001
   ```

### Database Setup

```bash
# Create PostgreSQL database
createdb twinup

# Run migrations (when available)
npm run db:migrate

# (Optional) Seed with test data
npm run db:seed
```

### Development

```bash
# Run both client and server concurrently
npm run dev

# Or run individually:
npm run dev:server  # http://localhost:3001
npm run dev:client  # http://localhost:5173
```

### Testing

Open your browser to `http://localhost:5173` to see the app!

## Development Workflow

Follow the **ULTRAPLAN.md** for a complete 8-day development roadmap.

### Phase 0: ✅ COMPLETED
- [x] Project structure initialized
- [x] Git repository set up
- [x] Backend server with Express + Socket.io
- [x] Frontend with React + Vite + Tailwind
- [x] Prisma schema defined
- [x] Development environment ready

### Phase 1: Core Game Flow (Next Steps)
- [ ] Implement game creation endpoints
- [ ] Implement player join flow
- [ ] Set up WebSocket real-time updates
- [ ] Database migrations and seed data

## Available Scripts

```bash
# Development
npm run dev              # Run both client and server
npm run dev:server       # Run server only
npm run dev:client       # Run client only

# Building
npm run build            # Build both client and server
npm run build:server     # Build server only
npm run build:client     # Build client only

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:studio        # Open Prisma Studio

# Type Checking
npm run typecheck        # Check types for both projects
```

## Using Specialized Agents

This project has specialized Claude Code agents for different components:

- **backend-agent:** Use for API endpoints, WebSocket events, game logic
- **frontend-agent:** Use for React components, UI/UX, animations
- **database-agent:** Use for Prisma schema, migrations, queries
- **ai-integration-agent:** Use for AI image generation, LangChain setup

See `.claude/instructions.md` for detailed agent guidelines.

## Game Features (Planned)

### MVP
- 🎮 Host creates game with QR code
- 👥 Players join via QR/URL
- ⚖️  Auto-balanced teams (Good vs Evil)
- 🎨 AI-generated reference images
- ⏱️  30-second prompt rounds
- 🤖 LangChain multi-agent image generation
- 🗳️  Crowd voting
- 🏆 Score tracking

### Future Enhancements
- Game history and replays
- Player statistics
- Custom reference images
- Multiple game modes
- Tournament brackets

## Architecture

```
Client Browsers
      ↓
Frontend (React + Vite)
      ↓
WebSocket + REST API
      ↓
Backend (Node.js + Express + Socket.io)
      ↓
├→ PostgreSQL (via Prisma)
├→ OpenAI API (DALL-E + GPT-4)
└→ LangChain (prompt enhancement + evaluation)
```

## Production Deployment

See `ULTRAPLAN.md` for AWS deployment architecture:
- EC2 c6i.xlarge (compute-optimized)
- RDS PostgreSQL / Aurora Serverless
- ElastiCache Redis
- S3 + CloudFront CDN
- Application Load Balancer

Estimated cost: **$12-15** for 8-hour party event (spot instances)

## Contributing

1. Read `.claude/instructions.md` for project guidelines
2. Follow the agent-specific instructions in `.claude/agents/`
3. Use the ULTRAPLAN for development phases
4. Test locally before committing

## License

MIT

---

**Ready to build?** Start with Phase 1 in the ULTRAPLAN! 🚀
