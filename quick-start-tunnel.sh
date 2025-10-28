#!/bin/bash

# Quick Start Script for Tunnel Mode
# This starts the game with a public Cloudflare tunnel URL

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🌍 Starting Game with PUBLIC URL${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${BLUE}⚙️  Starting essential services (Postgres, Backend, Frontend)...${NC}"
echo ""

# Start services
docker compose up -d postgres backend frontend

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy (20 seconds)...${NC}"
sleep 20

echo ""
echo -e "${BLUE}🌐 Setting up free Cloudflare tunnel...${NC}"

# Stop any existing tunnel
docker stop ai-game-quick-tunnel 2>/dev/null || true
docker rm ai-game-quick-tunnel 2>/dev/null || true

# Start new tunnel
docker run -d \
  --name ai-game-quick-tunnel \
  --network ai-game_ai-game-network \
  --restart unless-stopped \
  cloudflare/cloudflared:latest \
  tunnel --url http://frontend:80 > /dev/null 2>&1

echo ""
echo -e "${YELLOW}⏳ Waiting for tunnel to initialize (10 seconds)...${NC}"
sleep 10

# Get tunnel URL
TUNNEL_URL=$(docker logs ai-game-quick-tunnel 2>&1 | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | head -n 1)

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 YOUR GAME IS NOW PUBLIC!${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -n "$TUNNEL_URL" ]; then
    echo -e "${GREEN}🌐 Public URL:${NC}"
    echo ""
    echo -e "   ${CYAN}$TUNNEL_URL${NC}"
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}📱 Share this URL with players to join the game!${NC}"
    echo -e "💡 This URL works from anywhere in the world."
    echo -e "💡 The URL will change each time you restart."
    echo ""
    echo -e "${YELLOW}🎮 To create a game, visit:${NC}"
    echo -e "   ${CYAN}$TUNNEL_URL/host${NC}"
    echo ""
    echo -e "${YELLOW}👥 Players can join at:${NC}"
    echo -e "   ${CYAN}$TUNNEL_URL/join/GAMECODE${NC}"
    echo ""
else
    echo -e "${YELLOW}⏳ Tunnel is still starting...${NC}"
    echo ""
    echo -e "Please wait 10 more seconds and run:"
    echo -e "   ${CYAN}docker logs ai-game-quick-tunnel 2>&1 | grep https${NC}"
    echo ""
fi

echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo -e "  ${CYAN}make show-url${NC}              # Display the current public URL"
echo -e "  ${CYAN}make logs${NC}                  # View all service logs"
echo -e "  ${CYAN}make stop${NC}                  # Stop all services"
echo ""
