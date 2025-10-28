.PHONY: help start stop restart build logs clean dev prod tunnel status health test db-reset start-local start-tunnel show-url

# Default target - show help
help:
	@echo ""
	@echo "🎮 AI Game - Available Commands"
	@echo "════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "  🚀 QUICK START:"
	@echo "  make start-local        - Start game on local network only"
	@echo "  make start-tunnel       - Start game with PUBLIC URL (share with anyone!)"
	@echo "  make show-url           - Display the current public tunnel URL"
	@echo ""
	@echo "  📦 SERVICE MANAGEMENT:"
	@echo "  make start              - Start services in local mode"
	@echo "  make dev                - Start services in development mode (alias for start)"
	@echo "  make tunnel             - Start with free public URL (recommended for game night)"
	@echo "  make prod               - Start with configured Cloudflare tunnel"
	@echo "  make build              - Build Docker images"
	@echo "  make rebuild            - Rebuild and start services"
	@echo "  make rebuild-tunnel     - Rebuild and start with public URL"
	@echo ""
	@echo "  🛑 CONTROL:"
	@echo "  make stop               - Stop all services"
	@echo "  make restart            - Restart all services"
	@echo "  make clean              - Stop and remove all containers, volumes, and networks"
	@echo ""
	@echo "  📜 MONITORING:"
	@echo "  make logs               - View all service logs"
	@echo "  make logs-backend       - View backend logs only"
	@echo "  make logs-frontend      - View frontend logs only"
	@echo "  make logs-db            - View database logs only"
	@echo ""
	@echo "  🔍 INFO:"
	@echo "  make status             - Show status of all services"
	@echo "  make health             - Check health of all services"
	@echo "  make db-reset           - Reset database (caution: deletes all data)"
	@echo ""
	@echo "════════════════════════════════════════════════════════════════"
	@echo ""

# ═══════════════════════════════════════════════════════════════
# 🚀 MAIN COMMANDS (Recommended)
# ═══════════════════════════════════════════════════════════════

# Start locally (localhost only - no public URL)
start-local:
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "🏠 Starting game in LOCAL MODE"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@./start.sh
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✅ Game running locally!"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "📍 Access the game at:"
	@echo "   🌐 http://localhost"
	@echo ""
	@echo "💡 Only devices on your local network can access this."
	@echo "💡 To share with external players, use: make start-tunnel"
	@echo ""

# Start with public URL (accessible from anywhere!)
start-tunnel:
	@./quick-start-tunnel.sh

# Show the public tunnel URL (if running)
show-url:
	@echo ""
	@if docker ps | grep -q ai-game-quick-tunnel; then \
		TUNNEL_URL=$$(docker logs ai-game-quick-tunnel 2>&1 | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | head -n 1); \
		if [ -n "$$TUNNEL_URL" ]; then \
			echo "═══════════════════════════════════════════════════════════════"; \
			echo "🌐 Your Public Game URL:"; \
			echo "═══════════════════════════════════════════════════════════════"; \
			echo ""; \
			echo "   $$TUNNEL_URL"; \
			echo ""; \
			echo "═══════════════════════════════════════════════════════════════"; \
			echo ""; \
			echo "🎮 Host dashboard:  $$TUNNEL_URL/host"; \
			echo "👥 Join game:       $$TUNNEL_URL/join/GAMECODE"; \
			echo ""; \
		else \
			echo "⏳ Tunnel is starting... please wait a few seconds and try again."; \
			echo ""; \
		fi; \
	else \
		echo "❌ Tunnel is not running. Start it with:"; \
		echo "   make start-tunnel"; \
		echo ""; \
	fi

# ═══════════════════════════════════════════════════════════════
# 📦 SERVICE MANAGEMENT (Legacy commands)
# ═══════════════════════════════════════════════════════════════

# Start services in local mode (default)
start:
	@echo "🚀 Starting services in local mode..."
	./start.sh

# Development mode (alias for start)
dev: start

# Start with free public URL (quick tunnel)
tunnel:
	@echo "🌐 Starting with free public URL..."
	./start.sh --quick-tunnel

# Start with configured Cloudflare tunnel
prod:
	@echo "🌐 Starting in production mode..."
	./start.sh --production

# Build Docker images
build:
	@echo "🔨 Building Docker images..."
	docker compose build

# Rebuild and start
rebuild:
	@echo "🔨 Rebuilding and starting services..."
	./start.sh --build

# Rebuild and start with tunnel
rebuild-tunnel:
	@echo "🔨 Rebuilding and starting with public URL..."
	./start.sh --build --quick-tunnel

# Stop all services
stop:
	@echo "🛑 Stopping all services..."
	./start.sh --down
	@docker stop ai-game-quick-tunnel 2>/dev/null || true
	@docker rm ai-game-quick-tunnel 2>/dev/null || true

# Restart services
restart: stop start

# Clean everything (containers, volumes, networks, images)
clean:
	@echo "🧹 Cleaning up all Docker resources..."
	@docker compose down -v
	@docker stop ai-game-quick-tunnel 2>/dev/null || true
	@docker rm ai-game-quick-tunnel 2>/dev/null || true
	@echo "🗑️  Removing Docker images..."
	@docker rmi ai-game-backend ai-game-frontend ai-game-comfyui 2>/dev/null || true
	@docker images | grep ai-game | awk '{print $$3}' | xargs docker rmi -f 2>/dev/null || true
	@docker system prune -f
	@echo "✅ Cleanup complete! All images, containers, and volumes removed."

# View all logs
logs:
	@echo "📜 Viewing all service logs (Ctrl+C to exit)..."
	docker compose logs -f

# View backend logs only
logs-backend:
	@echo "📜 Viewing backend logs (Ctrl+C to exit)..."
	docker compose logs -f backend

# View frontend logs only
logs-frontend:
	@echo "📜 Viewing frontend logs (Ctrl+C to exit)..."
	docker compose logs -f frontend

# View database logs only
logs-db:
	@echo "📜 Viewing database logs (Ctrl+C to exit)..."
	docker compose logs -f postgres

# Show service status
status:
	@echo "📊 Service Status:"
	@echo ""
	@docker compose ps
	@echo ""
	@if docker ps | grep -q ai-game-quick-tunnel; then \
		echo "🌐 Quick Tunnel Status:"; \
		TUNNEL_URL=$$(docker logs ai-game-quick-tunnel 2>&1 | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | head -n 1); \
		if [ -n "$$TUNNEL_URL" ]; then \
			echo "   ✅ Active: $$TUNNEL_URL"; \
		else \
			echo "   ⏳ Starting..."; \
		fi; \
	fi

# Check health of services
health:
	@echo "🏥 Checking service health..."
	@echo ""
	@echo "Backend Health:"
	@curl -f http://localhost:3001/api/health 2>/dev/null && echo "   ✅ Backend is healthy" || echo "   ❌ Backend is down"
	@echo ""
	@echo "Frontend Health:"
	@curl -f http://localhost/health 2>/dev/null && echo "   ✅ Frontend is healthy" || echo "   ❌ Frontend is down"
	@echo ""
	@echo "Database Health:"
	@docker compose ps postgres | grep -q "healthy" && echo "   ✅ Database is healthy" || echo "   ❌ Database is down"

# Reset database (caution!)
db-reset:
	@echo "⚠️  WARNING: This will delete all game data!"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		echo "🗑️  Resetting database..."; \
		docker compose down postgres; \
		docker volume rm ai-game_postgres_data 2>/dev/null || true; \
		docker compose up -d postgres; \
		echo "✅ Database reset complete!"; \
	else \
		echo "❌ Cancelled"; \
	fi

# Quick reference for common workflows
.PHONY: first-time game-night

# First time setup
first-time:
	@echo "🎮 First Time Setup"
	@echo "════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Building images and starting services..."
	@./start.sh --build --quick-tunnel
	@echo ""
	@echo "✅ Setup complete! Your game is ready to play."

# Game night setup
game-night:
	@echo "🎉 Game Night Setup"
	@echo "════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Starting services with public URL..."
	@./start.sh --quick-tunnel
	@echo ""
	@echo "✅ Share the URL above with your players!"
