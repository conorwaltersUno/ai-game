# 🎮 Quick Start Guide

Get your AI game running in under 2 minutes!

## Prerequisites

- Docker Desktop installed and running
- Git (to clone the repository)
- Make (optional, but recommended)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd AI-game
```

### 2. Start the Game

**Using Make (Recommended):**
```bash
# First time setup
make first-time

# Or for game night with public URL
make game-night
```

**Using Shell Script:**
```bash
# Local access only
./start.sh --build

# Public URL (Recommended for Game Night!)
./start.sh --build --quick-tunnel
```

You'll get a free public URL like: `https://random-words.trycloudflare.com`

## Usage

### First Time Setup
```bash
# Build and start with public access
./start.sh --build --quick-tunnel
```

### Subsequent Starts
```bash
# Just start (no rebuild needed)
./start.sh --quick-tunnel
```

### Stop Services
```bash
./start.sh --down
```

## Access URLs

### Local Development
- 🎮 **Game**: http://localhost
- 🔌 **Backend API**: http://localhost:3001
- 📊 **Database**: postgresql://localhost:5432/ai_game

### Public Access (with --quick-tunnel)
- 🌍 **Game**: Your unique `trycloudflare.com` URL

## Available Commands

### Using Make (Recommended)

```bash
make help                # Show all available commands
make start               # Start in local mode
make tunnel              # Start with free public URL
make rebuild-tunnel      # Rebuild and start with public URL
make stop                # Stop all services
make logs                # View all logs
make status              # Check service status
make health              # Check service health
```

### Using Shell Script

```bash
./start.sh                    # Start in local mode
./start.sh --quick-tunnel     # Start with free public URL
./start.sh --build            # Rebuild Docker images
./start.sh --down             # Stop all services
./start.sh --logs             # View logs
./start.sh --help             # Show all options
```

### Quick Reference

| Command | Make | Shell Script |
|---------|------|--------------|
| First time setup | `make first-time` | `./start.sh --build --quick-tunnel` |
| Start locally | `make start` | `./start.sh` |
| Start with public URL | `make tunnel` | `./start.sh --quick-tunnel` |
| Stop services | `make stop` | `./start.sh --down` |
| View logs | `make logs` | `docker compose logs -f` |
| Check status | `make status` | `docker compose ps` |

## Troubleshooting

### Docker Not Running
```
❌ Docker is not running. Please start Docker Desktop.
```
**Solution**: Open Docker Desktop and wait for it to start

### Services Unhealthy
If backend shows as "unhealthy", wait 30-60 seconds for initialization

### Port Conflicts
If port 80 or 3001 is in use:
```bash
# Stop services using those ports, then restart
./start.sh --down
./start.sh --build
```

## Game Night Setup

1. Start with public URL:
   ```bash
   ./start.sh --build --quick-tunnel
   ```

2. Share the `trycloudflare.com` URL with players

3. Players can join from any device/network!

4. When done:
   ```bash
   ./start.sh --down
   ```

## What's Running?

- **Frontend**: React app (Nginx)
- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL
- **Tunnel**: Cloudflare (optional, for public access)

---

**Need help?** Check the logs:
```bash
docker compose logs -f
```
