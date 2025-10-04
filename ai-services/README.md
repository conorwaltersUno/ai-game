# AI Services - ComfyUI Container

This directory contains the Docker configuration for running ComfyUI with Stable Diffusion models for local AI image generation.

## What's Included

- **ComfyUI**: Node-based UI for Stable Diffusion
- **Stable Diffusion 1.5**: Base model for image generation
- **LCM LoRA**: Latent Consistency Model for fast inference (4 steps)

## Models Downloaded

The Docker image automatically downloads:

1. **v1-5-pruned.safetensors** (~4GB)
   - Stable Diffusion 1.5 base model
   - Resolution: 512x512 native (can upscale to 1024x1024)

2. **lcm-lora-sdv1-5.safetensors** (~200MB)
   - LCM LoRA adapter for fast generation
   - Enables 4-step generation (~6 seconds on M1 Mac)

## Performance

### Expected Generation Times

| Hardware | Generation Time (1024x1024) |
|----------|----------------------------|
| M1 Mac 16GB | 6 seconds |
| M2 Mac 16GB | 5 seconds |
| M3 Mac 16GB | 4-5 seconds |
| CPU Only | 60-120 seconds |

### Resource Requirements

- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB for models and cache
- **CPU**: 2-4 cores recommended

## Build the Container

```bash
# From project root
docker-compose build comfyui
```

## Run Standalone

```bash
# Run just ComfyUI
docker-compose up comfyui

# Access at:
# http://localhost:8188
```

## API Endpoints

ComfyUI provides several API endpoints:

- `GET /system_stats` - System information
- `POST /prompt` - Generate image from prompt
- `GET /history` - View generation history
- `WS /ws` - WebSocket for real-time updates

## Customization

### Add More Models

To add additional models, modify `Dockerfile.comfyui`:

```dockerfile
# Add SDXL Lightning for better quality
RUN wget -O models/checkpoints/sdxl_lightning_4step.safetensors \
    https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step.safetensors
```

### Adjust Memory Settings

For systems with limited RAM, modify environment variables in `docker-compose.yml`:

```yaml
environment:
  - PYTORCH_ENABLE_MPS_FALLBACK=1
  - PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
  - MAX_VRAM_CACHE_SIZE=0  # Disable VRAM caching
```

## Troubleshooting

### Out of Memory

- Reduce image resolution in your API calls
- Reduce batch size to 1
- Increase Docker Desktop memory allocation

### Slow Performance

- Ensure Docker Desktop has adequate CPU/RAM allocated
- Check if models are downloaded correctly
- Monitor resource usage with `docker stats`

### Model Download Failed

- Check internet connection
- Manually download models and place in `models/checkpoints/` or `models/loras/`
- Rebuild container: `docker-compose build --no-cache comfyui`

## Health Check

The container includes a health check that runs every 30 seconds:

```bash
# Check container health
docker-compose ps

# Should show "(healthy)" in STATUS column
```

## Logs

View ComfyUI logs:

```bash
docker-compose logs -f comfyui
```

## Volumes

The container uses Docker volumes for persistence:

- `comfyui_models`: Model files (persists across restarts)
- `comfyui_output`: Generated images
- `shared_images`: Shared with backend for serving to frontend
