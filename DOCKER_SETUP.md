# 🐳 Docker Setup Guide

This guide covers running the AI Game with Docker, using local AI models via ComfyUI for cost-effective image generation.

## 📋 Prerequisites

- **Docker Desktop** (latest version)
  - Mac: [Download Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
  - Windows: [Download Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
  - Linux: Install via package manager

- **System Requirements**:
  - RAM: 16GB recommended (8GB minimum)
  - Disk: 15GB free space (for models and images)
  - CPU: 4+ cores recommended

## 🚀 Quick Start

### 1. Configure Environment

The repository includes a `.env.docker` template. This will be automatically copied to `.env` when you run the startup script.

Review `.env.docker` and customize if needed:

```bash
# AI Provider (use 'local' for ComfyUI)
AI_PROVIDER=local

# ComfyUI host (internal Docker network)
COMFYUI_HOST=http://comfyui:8188

# Image URL base (for frontend to access images)
IMAGE_URL_BASE=http://localhost:3001/images
```

### 2. Start All Services

#### Development Mode (Local)

```bash
./start.sh
```

This will:
- Create `.env` from `.env.docker` if needed
- Start all Docker services
- Show service status and URLs

#### Production Mode (with Cloudflare Tunnel)

```bash
./start.sh --production
```

This starts the Cloudflare Tunnel for public access.

### 3. Access the Application

After startup, access the services at:

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **ComfyUI**: http://localhost:8188
- **Database**: postgresql://localhost:5432/ai_game

## 🎨 ComfyUI Setup

ComfyUI is automatically configured with:

- **Stable Diffusion 1.5** (~4GB model)
- **LCM LoRA** (~200MB) for 4-step fast inference
- **Expected generation time**: ~6 seconds per 1024x1024 image on M1 Mac

### Model Downloads

Models are automatically downloaded when building the ComfyUI container:

```bash
# Rebuild ComfyUI to download models
./start.sh --build
```

### Performance Tuning

For systems with limited RAM, adjust memory settings in `docker-compose.yml`:

```yaml
comfyui:
  environment:
    - MAX_VRAM_CACHE_SIZE=0  # Disable VRAM caching
```

## 📦 Docker Services

The application runs 5 Docker containers:

| Service | Description | Port |
|---------|-------------|------|
| **postgres** | PostgreSQL 15 database | 5432 |
| **comfyui** | Local AI image generation | 8188 |
| **backend** | Node.js API server | 3001 |
| **frontend** | React app (Nginx) | 80 |
| **cloudflared** | Cloudflare Tunnel (prod) | - |

### Service Dependencies

Services start in order with health checks:

1. **postgres** (starts first)
2. **comfyui** (starts after postgres)
3. **backend** (waits for postgres + comfyui)
4. **frontend** (starts after backend)
5. **cloudflared** (production only)

## 🛠️ Common Commands

### Start Services

```bash
./start.sh                  # Start in development mode
./start.sh --build          # Rebuild images and start
./start.sh --production     # Start with Cloudflare Tunnel
./start.sh --logs           # Follow logs after starting
```

### Stop Services

```bash
./start.sh --down           # Stop all containers
docker-compose down -v      # Stop and remove volumes
```

### View Logs

```bash
docker-compose logs -f              # All logs
docker-compose logs -f backend      # Backend only
docker-compose logs -f comfyui      # ComfyUI only
docker-compose logs -f frontend     # Frontend only
```

### Check Service Status

```bash
docker-compose ps           # List all services
docker stats                # Resource usage
```

### Restart a Service

```bash
docker-compose restart backend      # Restart backend
docker-compose restart comfyui      # Restart ComfyUI
```

### Access Container Shell

```bash
docker-compose exec backend sh      # Backend shell
docker-compose exec comfyui bash    # ComfyUI shell
docker-compose exec postgres psql -U postgres ai_game  # Database
```

## 🏗️ Building from Scratch

### Build All Services

```bash
docker-compose build
```

### Build Individual Services

```bash
docker-compose build backend
docker-compose build frontend
docker-compose build comfyui
```

### Clean Build (No Cache)

```bash
docker-compose build --no-cache
```

## 🔧 Troubleshooting

### ComfyUI Not Starting

**Problem**: ComfyUI container exits or shows errors

**Solutions**:
1. Check logs: `docker-compose logs comfyui`
2. Increase Docker Desktop memory (Settings > Resources > Memory > 8GB+)
3. Rebuild container: `docker-compose build --no-cache comfyui`
4. Manually download models (see `ai-services/README.md`)

### Out of Memory Errors

**Problem**: Docker containers crashing due to memory

**Solutions**:
1. Increase Docker Desktop memory allocation
2. Reduce image resolution in LocalAIProvider (1024x1024 → 512x512)
3. Set `MAX_VRAM_CACHE_SIZE=0` in ComfyUI environment

### Backend Can't Connect to ComfyUI

**Problem**: Backend shows "ComfyUI not available"

**Solutions**:
1. Check ComfyUI health: `curl http://localhost:8188/system_stats`
2. Wait for ComfyUI to fully start (can take 2-3 minutes first time)
3. Check ComfyUI logs: `docker-compose logs comfyui`
4. Restart ComfyUI: `docker-compose restart comfyui`

### Database Connection Errors

**Problem**: Backend can't connect to postgres

**Solutions**:
1. Wait for postgres to be healthy: `docker-compose ps`
2. Check DATABASE_URL in `.env`
3. Restart postgres: `docker-compose restart postgres`
4. Reset database: `docker-compose down -v && docker-compose up`

### Image Generation Fails

**Problem**: Images not generating or showing 404

**Solutions**:
1. Check AI_PROVIDER is set to "local" in `.env`
2. Verify ComfyUI is running: `docker-compose ps comfyui`
3. Check backend logs: `docker-compose logs -f backend`
4. Verify models downloaded: `docker-compose exec comfyui ls -lh /app/models/checkpoints`

### Ports Already in Use

**Problem**: Cannot start services due to port conflicts

**Solutions**:
1. Stop other services using those ports
2. Change ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "3002:3001"  # Use 3002 instead of 3001
   ```

## 📊 Monitoring

### Check Container Health

```bash
docker-compose ps
```

Look for `(healthy)` status for each service.

### View Resource Usage

```bash
docker stats
```

Shows CPU, memory, and network usage for each container.

### Check ComfyUI Stats

```bash
curl http://localhost:8188/system_stats | jq
```

Returns system information and GPU stats.

## 🔐 Production Deployment

### Using Cloudflare Tunnel

1. Get Cloudflare Tunnel token from [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)

2. Update `.env`:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
   ```

3. Start with production profile:
   ```bash
   ./start.sh --production
   ```

4. Access your app via Cloudflare URL (e.g., `https://your-app.your-domain.com`)

### Security Considerations

- Change default host credentials in `.env`:
  ```bash
  VITE_HOST_USERNAME=your_username
  VITE_HOST_PASSWORD=your_secure_password
  ```

- Use strong database password:
  ```bash
  POSTGRES_PASSWORD=your_secure_db_password
  ```

- Enable HTTPS (handled automatically by Cloudflare Tunnel)

## 📁 Volume Management

Docker volumes persist data across container restarts:

- **postgres_data**: Database data
- **comfyui_models**: AI models (4GB+)
- **comfyui_output**: Generated images from ComfyUI
- **shared_images**: Images shared between backend and frontend

### Backup Volumes

```bash
docker run --rm -v ai-game_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

### Clear All Data

```bash
docker-compose down -v  # Removes ALL volumes and data
```

## 🚦 Performance Benchmarks

### Image Generation Speed (1024x1024)

| Hardware | Generation Time |
|----------|----------------|
| M1 Mac 16GB | ~6 seconds |
| M2 Mac 16GB | ~5 seconds |
| M3 Mac 16GB | ~4-5 seconds |
| CPU Only (8 cores) | ~60-120 seconds |

### Resource Usage

| Service | CPU | RAM |
|---------|-----|-----|
| postgres | 5-10% | 100-200MB |
| comfyui | 50-100% (during gen) | 2-4GB |
| backend | 5-15% | 200-400MB |
| frontend | 1-5% | 50-100MB |

## 💰 Cost Comparison

### Local AI (ComfyUI) - This Setup

- **Infrastructure**: Free (local machine)
- **Bandwidth**: ~$2.40/month (Cloudflare Tunnel)
- **Total**: **~$2.40/month**

### Cloud AI (DALL-E 3)

- **API Costs**: $0.040 per image
- **10 games/day (40 images)**: $48/month
- **Total**: **~$50-80/month**

**Savings**: 95% cost reduction! 💸

## 🔄 Updates and Maintenance

### Update Images

```bash
git pull                    # Get latest code
./start.sh --build          # Rebuild and restart
```

### Update ComfyUI Models

1. Stop ComfyUI: `docker-compose stop comfyui`
2. Download models to `comfyui_models` volume
3. Start ComfyUI: `docker-compose start comfyui`

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI)
- [Stable Diffusion Models](https://huggingface.co/runwayml/stable-diffusion-v1-5)
- [Cloudflare Tunnel Guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Check service status: `docker-compose ps`
3. Review this troubleshooting guide
4. Check `ai-services/README.md` for ComfyUI-specific help
5. Open an issue on GitHub with logs and error messages

## 🎉 Success!

You should now have:
- ✅ All services running in Docker
- ✅ ComfyUI generating images locally
- ✅ Real-time progress tracking
- ✅ Cost-effective AI image generation
- ✅ Optional public access via Cloudflare Tunnel

Enjoy your AI-powered game! 🎮🎨
