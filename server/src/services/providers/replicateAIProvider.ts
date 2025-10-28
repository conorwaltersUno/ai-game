import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TeamType } from '@prisma/client';

interface ImageGenerationOptions {
  quality?: 'standard' | 'hd';
  size?: '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
}

/**
 * Replicate AI Provider using SeedDream-4 for image generation
 *
 * SeedDream-4 specs:
 * - Quality: High-quality, fast generation
 * - Speed: 3-5 seconds per image
 * - Cost: $0.0025 per image (10x cheaper than FLUX)
 * - Resolution: Up to 1024x1024
 */
export class ReplicateAIProvider {
  private replicate: Replicate;
  private outputDir: string;
  private imageBaseUrl: string;
  private io: any; // Socket.io instance
  private model: string;
  private sessionCost: number = 0;

  constructor(io?: any) {
    const apiToken = process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN not set');
    }

    this.replicate = new Replicate({
      auth: apiToken,
    });

    this.model = process.env.REPLICATE_MODEL || 'bytedance/seedream-4';
    this.outputDir = path.join(__dirname, '../../../public/generated-images');
    // Use relative path for mobile compatibility - works with tunnels, local network, etc.
    this.imageBaseUrl = process.env.IMAGE_URL_BASE || '/images';
    this.io = io || (global as any).io;

    console.log(`🌐 Image URL Base: ${this.imageBaseUrl} ${this.imageBaseUrl.startsWith('/') ? '(relative - mobile compatible ✅)' : '(absolute)'}`);

    console.log(`🎨 Replicate AI Provider initialized`);
    console.log(`   Model: ${this.model}`);
    console.log(`   Cost per image: ~$0.0025`);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * Check if Replicate API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test API connectivity by checking account
      await this.replicate.models.get(this.model.split('/')[0], this.model.split('/')[1]);
      return true;
    } catch (error) {
      console.error('❌ Replicate API not available:', error);
      return false;
    }
  }

  /**
   * Generate image using SeedDream-4 via Replicate
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {},
    team?: TeamType,
    gameCode?: string
  ): Promise<string> {
    const startTime = Date.now();
    console.log(`🎨 [Replicate/SeedDream-4] Starting generation for ${team || 'unknown'} team`);
    console.log(`   Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

    try {
      // Step 1: Queue prediction
      this.emitProgress(gameCode, team, 1, 4, `Queuing SeedDream-4 prediction for ${team} team...`);

      const { width, height } = this.parseSize(options.size || '1024x1024');

      console.log(`📐 Resolution: ${width}x${height}`);

      // Create prediction with SeedDream-4
      const prediction = await this.replicate.predictions.create({
        model: this.model,
        input: {
          prompt: prompt,
          width: width,
          height: height,
          guidance_scale: parseFloat(process.env.SEEDREAM_GUIDANCE || '7.5'),
          num_inference_steps: parseInt(process.env.SEEDREAM_NUM_STEPS || '50', 10),
        },
      });

      console.log(`📤 Prediction queued: ${prediction.id}`);

      // Step 2: Wait for completion
      this.emitProgress(gameCode, team, 2, 4, `Generating ${team} team image with SeedDream-4...`);

      const result = await this.waitForPrediction(prediction.id, gameCode, team);

      if (!result || !result.output || result.output.length === 0) {
        throw new Error('No output from SeedDream-4');
      }

      // Step 3: Download image
      this.emitProgress(gameCode, team, 3, 4, `Downloading ${team} team image...`);

      const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const localImageUrl = await this.downloadImage(imageUrl);

      // Step 4: Complete
      this.emitProgress(gameCode, team, 4, 4, `${team} team image complete!`);

      // Track costs (~$0.0025 per image for SeedDream-4)
      const cost = 0.0025;
      this.sessionCost += cost;

      const duration = Date.now() - startTime;
      console.log(`✅ [Replicate/SeedDream-4] ${team} team image generated in ${duration}ms`);
      console.log(`   💰 Cost: $${cost.toFixed(4)} | Session total: $${this.sessionCost.toFixed(4)}`);
      console.log(`   📍 Saved to: ${localImageUrl}`);

      // Emit completion event
      if (this.io && gameCode && team) {
        this.io.to(`game:${gameCode}`).emit('image:complete', { team });
      }

      return localImageUrl;

    } catch (error: any) {
      console.error(`❌ [Replicate/SeedDream-4] ${team} team generation failed:`, error.message);

      // Emit error
      if (this.io && gameCode && team) {
        this.io.to(`game:${gameCode}`).emit('image:progress', {
          team,
          step: 0,
          totalSteps: 4,
          message: `${team} team image generation failed`
        });
      }

      throw new Error(`Replicate SeedDream-4 generation failed: ${error.message}`);
    }
  }

  /**
   * Wait for prediction to complete
   */
  private async waitForPrediction(
    predictionId: string,
    gameCode?: string,
    team?: TeamType,
    maxWaitTime = 60000
  ): Promise<any> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.replicate.predictions.get(predictionId);

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(`Prediction ${prediction.status}: ${prediction.error || 'Unknown error'}`);
      }

      // Still processing
      if (prediction.status === 'processing') {
        // Optionally emit progress update
        const elapsed = Date.now() - startTime;
        if (elapsed % 2000 < checkInterval) { // Every 2 seconds
          this.emitProgress(gameCode, team, 2, 4, `Generating ${team} team image... (${Math.floor(elapsed / 1000)}s)`);
        }
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Prediction timeout - SeedDream-4 took too long to generate');
  }

  /**
   * Download image from URL and save locally
   */
  private async downloadImage(imageUrl: string): Promise<string> {
    console.log(`📥 Downloading image from Replicate: ${imageUrl}`);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename
    const filename = `${crypto.randomBytes(16).toString('hex')}.png`;
    const filepath = path.join(this.outputDir, filename);

    // Save to disk
    fs.writeFileSync(filepath, buffer);

    const localUrl = `${this.imageBaseUrl}/${filename}`;
    console.log(`💾 Saved image: ${filename} (${Math.round(buffer.length / 1024)}KB)`);
    console.log(`🌐 Image accessible at: ${localUrl}`);
    console.log(`   ✅ Relative URL will work on mobile, desktop, and through tunnels`);

    return localUrl;
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
  private parseSize(size: string): { width: number; height: number } {
    const [w, h] = size.split('x').map(Number);
    return { width: w, height: h };
  }

  /**
   * Get current session cost
   */
  getSessionCost(): number {
    return this.sessionCost;
  }

  /**
   * Reset session cost counter
   */
  resetSessionCost(): void {
    console.log(`💰 [Replicate] Session cost reset (was $${this.sessionCost.toFixed(3)})`);
    this.sessionCost = 0;
  }
}
