#!/bin/bash

# AI Game Docker Startup Script
# This script starts all services using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🎮 Twin up! AI Game - Docker Startup${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Check if .env exists, if not copy from .env.docker
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.docker...${NC}"
    cp .env.docker .env
    echo -e "${GREEN}✅ Created .env file. Please review and update if needed.${NC}"
fi

# Detect platform
PLATFORM=$(uname -m)
if [[ "$PLATFORM" == "arm64" ]]; then
    echo -e "${BLUE}📱 Detected Apple Silicon (arm64)${NC}"
    export DOCKER_DEFAULT_PLATFORM=linux/arm64
else
    echo -e "${BLUE}💻 Detected x86_64 platform${NC}"
fi

# Parse command line arguments
PROFILE=""
BUILD=false
DOWN=false
LOGS=false
QUICK_TUNNEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --production|-p)
            PROFILE="--profile production"
            echo -e "${BLUE}🌐 Starting in production mode (with Cloudflare Tunnel)${NC}"
            shift
            ;;
        --quick-tunnel|-q)
            QUICK_TUNNEL=true
            echo -e "${BLUE}🌐 Will create free public URL (trycloudflare.com)${NC}"
            shift
            ;;
        --build|-b)
            BUILD=true
            echo -e "${BLUE}🔨 Will rebuild Docker images${NC}"
            shift
            ;;
        --down|-d)
            DOWN=true
            shift
            ;;
        --logs|-l)
            LOGS=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -q, --quick-tunnel  Create free public URL (no account needed)"
            echo "  -p, --production    Start with Cloudflare Tunnel (requires token)"
            echo "  -b, --build         Rebuild Docker images before starting"
            echo "  -d, --down          Stop and remove all containers"
            echo "  -l, --logs          Follow logs after starting"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                    # Start in development mode"
            echo "  ./start.sh --build            # Rebuild and start"
            echo "  ./start.sh --quick-tunnel     # Start with free public URL"
            echo "  ./start.sh --production       # Start with configured tunnel"
            echo "  ./start.sh --down             # Stop all services"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Handle --down flag
if [ "$DOWN" = true ]; then
    echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
    docker compose down
    echo -e "${GREEN}✅ All containers stopped${NC}"
    exit 0
fi

# Build images if requested
if [ "$BUILD" = true ]; then
    echo -e "${BLUE}🔨 Building Docker images...${NC}"
    docker compose $PROFILE build backend frontend
fi

# Start services (excluding comfyui - use Replicate instead)
echo -e "${GREEN}🚀 Starting services...${NC}"
docker compose $PROFILE up -d backend frontend postgres

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Check service health
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose ps

# Setup quick tunnel if requested
if [ "$QUICK_TUNNEL" = true ]; then
    echo ""
    echo -e "${YELLOW}🌐 Setting up free public URL...${NC}"

    # Stop any existing quick tunnel
    docker stop ai-game-quick-tunnel 2>/dev/null || true
    docker rm ai-game-quick-tunnel 2>/dev/null || true

    # Start quick tunnel
    docker run -d --name ai-game-quick-tunnel --network ai-game_ai-game-network --restart unless-stopped cloudflare/cloudflared:latest tunnel --url http://frontend:80 > /dev/null 2>&1

    # Wait for tunnel to start
    sleep 5

    # Get the public URL
    PUBLIC_URL=$(docker logs ai-game-quick-tunnel 2>&1 | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | head -n 1)

    if [ ! -z "$PUBLIC_URL" ]; then
        echo -e "${GREEN}✅ Public URL created!${NC}"
        echo ""
        echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}🌍 Your game is live at:${NC}"
        echo -e "${CYAN}   $PUBLIC_URL${NC}"
        echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        echo -e "${RED}❌ Failed to get public URL. Check tunnel logs:${NC}"
        echo -e "${CYAN}   docker logs ai-game-quick-tunnel${NC}"
    fi
fi

# Display access URLs
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}🎮 Frontend:${NC}  http://localhost"
echo -e "${CYAN}🔌 Backend:${NC}   http://localhost:3001"
echo -e "${CYAN}📊 Database:${NC}  postgresql://localhost:5432/ai_game"
echo -e "${CYAN}🎨 AI Provider:${NC} Replicate (SeedDream-4)"
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  ${CYAN}docker compose logs -f${NC}              # View all logs"
echo -e "  ${CYAN}docker compose logs -f backend${NC}      # View backend logs"
echo -e "  ${CYAN}docker compose ps${NC}                   # Check service status"
echo -e "  ${CYAN}docker compose down${NC}                 # Stop all services"
echo -e "  ${CYAN}docker compose restart backend${NC}      # Restart a service"
echo ""

# Follow logs if requested
if [ "$LOGS" = true ]; then
    echo -e "${BLUE}📜 Following logs (Ctrl+C to exit)...${NC}"
    echo ""
    docker compose logs -f
fi
