import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TeamType } from '@prisma/client';

interface ImageGenerationOptions {
  quality?: 'standard' | 'hd';
  size?: '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
}

// Progress event structure for WebSocket emissions
// interface ProgressEvent {
//   team: TeamType;
//   step: number;
//   totalSteps: number;
//   message: string;
// }

/**
 * Local AI Provider using ComfyUI for image generation
 * Generates images locally with real-time progress tracking
 * Includes concurrency limiting for optimal performance
 */
export class LocalAIProvider {
  private comfyuiHost: string;
  private outputDir: string;
  private imageBaseUrl: string;
  private io: any; // Socket.io instance
  private maxConcurrent: number;
  private activeGenerations: number = 0;
  private queue: Array<() => void> = [];

  constructor(io?: any) {
    this.comfyuiHost = process.env.COMFYUI_HOST || 'http://localhost:8188';
    this.outputDir = path.join(__dirname, '../../../public/generated-images');
    // Use relative path for mobile compatibility - works with tunnels, local network, etc.
    this.imageBaseUrl = process.env.IMAGE_URL_BASE || '/images';
    this.io = io || (global as any).io;
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '2', 10);

    console.log(`🎨 LocalAI initialized with max ${this.maxConcurrent} concurrent generations`);
    console.log(`🌐 Image URL Base: ${this.imageBaseUrl} ${this.imageBaseUrl.startsWith('/') ? '(relative - mobile compatible ✅)' : '(absolute)'}`);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * Check if ComfyUI is available and healthy
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.comfyuiHost}/system_stats`);
      return response.ok;
    } catch (error) {
      console.error('❌ ComfyUI not available:', error);
      return false;
    }
  }

  /**
   * Acquire a slot for image generation (semaphore pattern)
   */
  private async acquireSlot(): Promise<void> {
    if (this.activeGenerations < this.maxConcurrent) {
      this.activeGenerations++;
      console.log(`🔓 Acquired slot (${this.activeGenerations}/${this.maxConcurrent} active)`);
      return Promise.resolve();
    }

    // Queue is full, wait for a slot
    console.log(`⏳ Queued (${this.queue.length + 1} waiting, ${this.activeGenerations}/${this.maxConcurrent} active)`);
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a slot after image generation (semaphore pattern)
   */
  private releaseSlot(): void {
    this.activeGenerations--;
    console.log(`🔒 Released slot (${this.activeGenerations}/${this.maxConcurrent} active, ${this.queue.length} queued)`);

    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      if (resolve) {
        this.activeGenerations++;
        console.log(`🔓 Dequeued and acquired slot (${this.activeGenerations}/${this.maxConcurrent} active)`);
        resolve();
      }
    }
  }

  /**
   * Generate image with real-time progress tracking
   * Includes concurrency limiting via semaphore
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {},
    team?: TeamType,
    gameCode?: string
  ): Promise<string> {
    // Acquire slot for concurrent generation control
    await this.acquireSlot();

    const startTime = Date.now();
    console.log(`🎨 [LocalAI] Starting image generation for ${team || 'unknown'} team`);

    try {
      // Emit initial progress
      this.emitProgress(gameCode, team, 0, 4, `Initializing ${team} team image generation...`);

      // Parse size
      const [width, height] = this.parseSize(options.size || '1024x1024');

      // Create workflow for ComfyUI with LCM LoRA
      const workflow = this.createWorkflow(prompt, width, height);

      // Step 1: Queue prompt
      this.emitProgress(gameCode, team, 1, 4, `Queuing prompt for ${team} team...`);
      const promptId = await this.queuePrompt(workflow);

      // Step 2: Monitor generation
      this.emitProgress(gameCode, team, 2, 4, `Generating ${team} team image...`);

      // Simulate progress during generation (since ComfyUI doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        // Progress is already at step 2, just update message
        this.emitProgress(gameCode, team, 2, 4, `Processing ${team} team image...`);
      }, 2000);

      // Wait for completion and get image
      const imageData = await this.waitForImage(promptId);
      clearInterval(progressInterval);

      // Step 3: Save image
      this.emitProgress(gameCode, team, 3, 4, `Saving ${team} team image...`);
      const imageUrl = await this.saveImage(imageData);

      // Step 4: Complete
      this.emitProgress(gameCode, team, 4, 4, `${team} team image complete!`);

      // Emit completion event
      if (this.io && gameCode && team) {
        this.io.to(`game:${gameCode}`).emit('image:complete', { team });
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [LocalAI] ${team} team image generated in ${duration}ms`);

      return imageUrl;

    } catch (error) {
      console.error(`❌ [LocalAI] ${team} team image generation failed:`, error);

      // Emit error
      if (this.io && gameCode && team) {
        this.io.to(`game:${gameCode}`).emit('image:progress', {
          team,
          step: 0,
          totalSteps: 4,
          message: `${team} team image generation failed`
        });
      }

      throw new Error(`Local AI image generation failed: ${error}`);
    } finally {
      // Always release the slot, even on error
      this.releaseSlot();
    }
  }

  /**
   * Create ComfyUI workflow for image generation
   * OPTIMIZED FOR SPEED - 4-5 second generation target
   */
  private createWorkflow(prompt: string, width: number, height: number): any {
    // Use prompt as-is for speed (no enhancement)
    const seed = Math.floor(Math.random() * 1000000000);

    // ComfyUI workflow using SD 1.5 + LCM LoRA for ULTRA-FAST generation
    // Settings optimized for speed over quality
    return {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": 2,  // Reduced from 4 to 2 for speed
          "cfg": 1.0,  // Reduced from 1.5 for faster sampling
          "sampler_name": "euler",
          "scheduler": "sgm_uniform",
          "denoise": 1,
          "model": ["10", 0],  // Use model from LoRA loader
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": "v1-5-pruned.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": width,
          "height": height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": prompt,  // Use raw prompt for speed (no enhancement)
          "clip": ["10", 1]  // Use CLIP from LoRA loader
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": "blurry",  // Minimal negative prompt for speed
          "clip": ["10", 1]  // Use CLIP from LoRA loader
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      },
      "10": {
        "inputs": {
          "lora_name": "lcm-lora-sdv1-5.safetensors",
          "strength_model": 1.0,
          "strength_clip": 1.0,
          "model": ["4", 0],
          "clip": ["4", 1]
        },
        "class_type": "LoraLoader"
      }
    };
  }

  /**
   * Queue prompt on ComfyUI
   */
  private async queuePrompt(workflow: any): Promise<string> {
    const response = await fetch(`${this.comfyuiHost}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      throw new Error(`Failed to queue prompt: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.prompt_id;
  }

  /**
   * Wait for image generation to complete and retrieve image data
   * Increased timeout to prevent failures during generation
   */
  private async waitForImage(promptId: string, maxWaitTime = 120000): Promise<Buffer> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check history for this prompt
        const response = await fetch(`${this.comfyuiHost}/history/${promptId}`);

        if (response.ok) {
          const history = await response.json() as any;

          if (history[promptId] && history[promptId].outputs) {
            // Get the first output image
            const outputs = history[promptId].outputs;
            const imageNode = Object.values(outputs).find((output: any) => output.images);

            if (imageNode && (imageNode as any).images && (imageNode as any).images.length > 0) {
              const imageInfo = (imageNode as any).images[0];

              // Download image
              const imageResponse = await fetch(
                `${this.comfyuiHost}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type || 'output'}`
              );

              if (imageResponse.ok) {
                const arrayBuffer = await imageResponse.arrayBuffer();
                return Buffer.from(arrayBuffer);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error checking image status:', error);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Image generation timeout');
  }

  /**
   * Save image to disk and return URL
   */
  private async saveImage(imageData: Buffer): Promise<string> {
    const filename = `${crypto.randomBytes(16).toString('hex')}.png`;
    const filepath = path.join(this.outputDir, filename);

    fs.writeFileSync(filepath, imageData);
    console.log(`💾 Saved image: ${filename}`);

    return `${this.imageBaseUrl}/${filename}`;
  }

  /**
   * Emit progress event via Socket.io
   */
  private emitProgress(
    gameCode: string | undefined,
    team: TeamType | undefined,
    step: number,
    totalSteps: number,
    message: string
  ): void {
    if (!this.io || !gameCode || !team) return;

    this.io.to(`game:${gameCode}`).emit('image:progress', {
      team,
      step,
      totalSteps,
      message,
      percentage: Math.round((step / totalSteps) * 100)
    });
  }

  /**
   * Parse size string to width and height
   */
  private parseSize(size: string): [number, number] {
    const [w, h] = size.split('x').map(Number);
    return [w, h];
  }

  /**
   * Get ComfyUI system stats
   */
  async getSystemStats(): Promise<any> {
    try {
      const response = await fetch(`${this.comfyuiHost}/system_stats`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
