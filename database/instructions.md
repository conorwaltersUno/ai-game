# Database Management Instructions

## Overview

This directory manages the PostgreSQL database schema using Prisma ORM. The schema is the source of truth for all database models.

## Directory Structure

```
database/
├── migrations/              # Auto-generated Prisma migrations (DO NOT EDIT)
├── seed/                    # Seed data scripts for development
│   └── dev-seed.ts         # Development test data
└── instructions.md         # This file
```

## Important: Schema Management

### Source of Truth

The database schema is defined using Prisma. The workflow is:

1. **Define schema** in `server/prisma/schema.prisma`
2. **Generate Prisma client** with `npm run db:generate`
3. **Create migration** with `npm run db:migrate`
4. **Apply migration** (happens automatically during migrate)

### NEVER Manually Edit

- ❌ Do NOT manually edit the `migrations/` directory
- ❌ Do NOT manually alter the database with SQL
- ✅ Always modify `server/prisma/schema.prisma` and create migrations

## Database Schema

### Models

See `.claude/agents/database-agent.md` for detailed schema documentation.

**Core Models:**
- `Game` - Game sessions
- `Player` - Players in games
- `Round` - Individual rounds within games
- `Submission` - Player prompt submissions
- `Vote` - Votes on round images

**Enums:**
- `GameStatus`: WAITING, IN_PROGRESS, COMPLETED, EXPIRED
- `TeamType`: GOOD, EVIL
- `RoundStatus`: SETUP, PROMPTING, GENERATING, VOTING, COMPLETE

### Relationships

```
Game (1) ─── (N) Player
Game (1) ─── (N) Round

Round (1) ─── (2) Submission (one per team)
Round (1) ─── (N) Vote

Player (1) ─── (N) Submission
Player (1) ─── (N) Vote
```

## Common Tasks

### 1. Create Migration

After modifying `server/prisma/schema.prisma`:

```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate -- --name add_new_field
```

### 2. Reset Database (Development)

⚠️ **WARNING**: This deletes ALL data!

```bash
npx prisma migrate reset --schema=./server/prisma/schema.prisma
```

### 3. Seed Database

Populate with test data:

```bash
npm run db:seed
```

### 4. Open Prisma Studio

Visual database browser:

```bash
npm run db:studio
```

### 5. View Current Schema

```bash
npx prisma format --schema=./server/prisma/schema.prisma
```

## Development Workflow

### Initial Setup

1. Ensure PostgreSQL is running
2. Create database: `createdb twinup`
3. Set DATABASE_URL in `server/.env.local`
4. Run migrations: `npm run db:migrate`
5. Seed data: `npm run db:seed`

### Making Schema Changes

1. Edit `server/prisma/schema.prisma`
2. Generate client: `npm run db:generate`
3. Create migration: `npm run db:migrate -- --name <description>`
4. Test changes: `npm run db:studio`
5. Update seed script if needed

### Example: Adding a New Field

```prisma
// server/prisma/schema.prisma

model Player {
  id          String    @id @default(uuid())
  gameId      String
  name        String
  team        TeamType
  score       Int       @default(0)
  isHost      Boolean   @default(false)
  avatarUrl   String?   // <- New field
  joinedAt    DateTime  @default(now())

  // ... rest of model
}
```

Then:
```bash
npm run db:generate
npm run db:migrate -- --name add_player_avatar
```

## Seed Data

### Development Seed Script

Location: `database/seed/dev-seed.ts`

Creates:
- 2 test games
- 8 players (4 per game)
- Sample rounds with submissions
- Test votes

Run with: `npm run db:seed`

### Customizing Seed Data

Edit `database/seed/dev-seed.ts` to add more test scenarios:

```typescript
// Create a game in progress
const activeGame = await prisma.game.create({
  data: {
    code: 'ACTIVE',
    hostName: 'Test Host',
    status: 'IN_PROGRESS',
    currentRound: 2,
    totalRounds: 5,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  },
});
```

## Database Maintenance

### Clean Up Expired Games

Run periodically (e.g., hourly cron job):

```typescript
// server/src/jobs/cleanupGames.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredGames() {
  const result = await prisma.game.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`Deleted ${result.count} expired games`);
}
```

### Backup Database

```bash
# Development
pg_dump twinup > backup.sql

# Production
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql twinup < backup.sql
```

## Troubleshooting

### Migration Conflicts

If migrations are out of sync:

```bash
# Option 1: Reset (development only)
npx prisma migrate reset --schema=./server/prisma/schema.prisma

# Option 2: Resolve manually
npx prisma migrate resolve --applied <migration_name> --schema=./server/prisma/schema.prisma
```

### Connection Issues

Check:
1. PostgreSQL is running: `pg_isready`
2. Database exists: `psql -l | grep twinup`
3. DATABASE_URL is correct in `.env.local`
4. Network connectivity

### Schema Drift

If database schema doesn't match Prisma schema:

```bash
# See differences
npx prisma migrate diff --schema=./server/prisma/schema.prisma

# Deploy pending migrations
npx prisma migrate deploy --schema=./server/prisma/schema.prisma
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All migrations tested locally
- [ ] Seed scripts are development-only
- [ ] Backup production database
- [ ] Plan for zero-downtime migration if needed
- [ ] Set up automated backups

### Deploy Migrations

```bash
# Production
npx prisma migrate deploy --schema=./server/prisma/schema.prisma
```

### Environment Variables

```bash
# Production
DATABASE_URL="postgresql://user:password@host:5432/twinup?schema=public"

# Development
DATABASE_URL="postgresql://localhost:5432/twinup"
```

## Performance Tips

1. **Use indexes** on frequently queried fields
2. **Use `select` or `include`** to fetch only needed data
3. **Batch operations** with `createMany`, `updateMany`
4. **Use transactions** for atomic operations
5. **Connection pooling** is handled by Prisma automatically

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Database Agent: `.claude/agents/database-agent.md`
