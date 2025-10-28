import OpenAI from 'openai';
import { LocalAIProvider } from './providers/localAIProvider';
import { ReplicateAIProvider } from './providers/replicateAIProvider';
import { TeamType } from '@prisma/client';
import { generateReferencePrompt, enhancePrompt } from './promptEnhancerService';

const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true';
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai', 'local', 'replicate', or 'mock'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Initialize AI providers
let openai: OpenAI | null = null;
let localAI: LocalAIProvider | null = null;
let replicateAI: ReplicateAIProvider | null = null;

// Determine which provider to use
console.log('🎨 Initializing AI Provider...');
console.log(`   Selected: ${AI_PROVIDER.toUpperCase()}`);

if (AI_PROVIDER === 'replicate') {
  // Replicate AI using SeedDream-4
  if (!REPLICATE_API_TOKEN) {
    console.error('❌ AI_PROVIDER=replicate but REPLICATE_API_TOKEN not set!');
    console.warn('⚠️ Falling back to mock images');
  } else {
    try {
      const io = (global as any).io;
      replicateAI = new ReplicateAIProvider(io);
      console.log('✅ Replicate AI Provider initialized - SeedDream-4 enabled');
      console.log('   💰 Cost: ~$0.0025 per image');
      console.log('   ⚡ Speed: 3-5 seconds per image');
      console.log('   🎨 Quality: High-quality, fast generation');

      // Check if Replicate is available
      replicateAI.isAvailable().then(available => {
        if (available) {
          console.log('✅ Replicate API connection verified');
        } else {
          console.warn('⚠️ Replicate API not available - check your token');
        }
      });
    } catch (error: any) {
      console.error('❌ Failed to initialize Replicate:', error.message);
      console.warn('⚠️ Falling back to mock images');
    }
  }
} else if (AI_PROVIDER === 'local') {
  // Local AI using ComfyUI
  const io = (global as any).io;
  localAI = new LocalAIProvider(io);
  console.log('✅ Local AI Provider initialized - ComfyUI/SD 1.5 enabled');
  console.log('   💰 Cost: Free');
  console.log('   ⚡ Speed: 5-10 seconds per image');
  console.log('   🎨 Quality: Basic (SD 1.5 + LCM)');

  // Check if ComfyUI is available
  localAI.isAvailable().then(available => {
    if (available) {
      console.log('✅ ComfyUI connection verified');
    } else {
      console.warn('⚠️ ComfyUI not available - falling back to mock images');
    }
  });
} else if (AI_PROVIDER === 'openai') {
  // OpenAI DALL-E 3
  if (!OPENAI_API_KEY) {
    console.error('❌ AI_PROVIDER=openai but OPENAI_API_KEY not set!');
    console.warn('⚠️ Falling back to mock images');
  } else {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized - DALL-E 3 enabled');
    console.log('   💰 Cost: $0.04 per image');
    console.log('   ⚡ Speed: 10-30 seconds per image');
    console.log('   🎨 Quality: Photorealistic (industry standard)');
  }
} else {
  console.log('✅ Using mock AI images (AI_PROVIDER=mock or USE_MOCK_AI=true)');
  console.log('   💰 Cost: Free');
  console.log('   ⚡ Speed: Instant');
  console.log('   🎨 Quality: Placeholder images from Picsum');
}

/**
 * Generate an image using configured AI provider
 *
 * @param prompt - The text prompt for image generation
 * @param options - Generation options
 * @param team - Team generating the image (for progress tracking)
 * @param gameCode - Game code (for progress tracking)
 * @returns URL of the generated image
 */
export async function generateImage(
  prompt: string,
  options: {
    quality?: 'standard' | 'hd';
    size?: '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
    team?: TeamType;
    gameCode?: string;
  } = {}
): Promise<string> {
  const { quality = 'standard', size = '1024x1024', team, gameCode } = options;  // SeedDream-4 requires min 1024x1024

  // Route to Replicate AI Provider (FLUX.1-dev)
  if (AI_PROVIDER === 'replicate' && replicateAI) {
    try {
      const available = await replicateAI.isAvailable();
      if (available) {
        return await replicateAI.generateImage(prompt, { quality, size }, team, gameCode);
      } else {
        console.warn('⚠️ Replicate not available, falling back to mock');
      }
    } catch (error: any) {
      console.error('❌ Replicate generation failed:', error.message);
      console.warn('⚠️ Falling back to mock image');
    }
  }

  // Route to Local AI Provider (ComfyUI/SD 1.5)
  if (AI_PROVIDER === 'local' && localAI) {
    try {
      const available = await localAI.isAvailable();
      if (available) {
        return await localAI.generateImage(prompt, { quality, size }, team, gameCode);
      } else {
        console.warn('⚠️ ComfyUI not available, falling back to mock');
      }
    } catch (error: any) {
      console.error('❌ Local AI generation failed:', error.message);
      console.warn('⚠️ Falling back to mock image');
    }
  }

  // Route to OpenAI (DALL-E 3)
  if (AI_PROVIDER === 'openai' && openai) {
    try {
      console.log(`🤖 [DALL-E 3] Generating ${quality} image (${size})`);
      console.log(`   Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

      const startTime = Date.now();

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        response_format: 'url',
      });

      const duration = Date.now() - startTime;
      const imageUrl = response.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E 3');
      }

      console.log(`✅ [DALL-E 3] Generated in ${duration}ms`);
      console.log(`   URL: ${imageUrl.substring(0, 80)}...`);

      return imageUrl;
    } catch (error: any) {
      console.error('❌ [DALL-E 3] Generation failed:', error.message);
      console.warn('⚠️ Falling back to mock image');
    }
  }

  // Fallback to mock images
  console.log(`🎨 [MOCK] Generating image for prompt: "${prompt.substring(0, 50)}..."`);
  const hash = simpleHash(prompt);
  return `https://picsum.photos/1024/1024?random=${hash}`;
}

/**
 * Generate image with retry logic and error handling
 *
 * @param prompt - The text prompt for image generation
 * @param options - Generation options
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Object with imageUrl and optional error message
 */
/**
 * Helper function to create a timeout promise
 */
function createTimeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export async function generateImageWithRetry(
  prompt: string,
  options: {
    quality?: 'standard' | 'hd';
    size?: '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
    team?: TeamType;
    gameCode?: string;
  } = {},
  maxRetries: number = 3,
  timeoutMs: number = 60000 // 60 seconds total timeout
): Promise<{ imageUrl: string; error?: string }> {

  const startTime = Date.now();
  let lastError: Error | null = null;

  console.log(`🎨 [Image Generation] Starting with ${timeoutMs}ms timeout (${maxRetries} retries max)`);

  // Wrap entire retry process with timeout
  try {
    const result = await Promise.race([
      // Main retry logic
      (async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const elapsed = Date.now() - startTime;
          const remaining = timeoutMs - elapsed;

          if (remaining <= 0) {
            throw new Error('Overall timeout exceeded before attempt could start');
          }

          try {
            console.log(`🎨 [Image Generation] Attempt ${attempt}/${maxRetries} (${Math.round(remaining / 1000)}s remaining)`);

            // Race this attempt against remaining time
            const imageUrl = await Promise.race([
              generateImage(prompt, options),
              createTimeout(remaining, `Attempt ${attempt} timeout`)
            ]);

            // Validate image URL is accessible
            if (!imageUrl || imageUrl.includes('undefined')) {
              throw new Error('Invalid image URL returned');
            }

            const duration = Date.now() - startTime;
            console.log(`✅ [Image Generation] Success on attempt ${attempt} (took ${Math.round(duration / 1000)}s)`);
            return { imageUrl };

          } catch (error: any) {
            lastError = error;
            const elapsed = Date.now() - startTime;
            console.error(`❌ [Image Generation] Attempt ${attempt} failed after ${Math.round(elapsed / 1000)}s:`, error.message);

            // If it's the last attempt or we're out of time, give up
            const timeLeft = timeoutMs - elapsed;
            if (attempt === maxRetries || timeLeft <= 0) {
              console.error(`🚫 [Image Generation] Giving up after ${attempt} attempts (${Math.round(elapsed / 1000)}s elapsed)`);
              return {
                imageUrl: '',
                error: `Failed after ${attempt} attempts (${Math.round(elapsed / 1000)}s): ${error.message}`
              };
            }

            // Wait before retry (exponential backoff, but respect timeout)
            const waitTime = Math.min(
              1000 * Math.pow(2, attempt - 1),
              3000, // Cap at 3s
              timeLeft - 1000 // Leave at least 1s for next attempt
            );

            if (waitTime > 0) {
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }

        return {
          imageUrl: '',
          error: lastError?.message || 'All retries exhausted'
        };
      })(),
      // Overall timeout
      createTimeout(timeoutMs, `Image generation timeout after ${timeoutMs}ms`)
    ]);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`⏰ [Image Generation] Timeout after ${Math.round(duration / 1000)}s:`, error.message);
    return {
      imageUrl: '',
      error: `Timeout after ${Math.round(duration / 1000)}s: ${error.message}`
    };
  }
}

/**
 * Generate a reference image for a new round
 * This is a neutral image that both teams will try to recreate
 *
 * NOW POWERED BY AI: Uses GPT-4o-mini to generate unique, creative prompts
 * Then enhances them for maximum quality before image generation
 *
 * @param customPrompt - Optional custom prompt to use instead of AI generation
 */
export async function generateReferenceImage(customPrompt?: string): Promise<{
  imageUrl: string;
  prompt: string;
}> {
  // Step 1: Use custom prompt if provided, otherwise generate with AI
  let basePrompt: string;

  if (customPrompt) {
    basePrompt = customPrompt;
    console.log(`🎯 Using custom reference prompt: "${basePrompt}"`);
  } else {
    basePrompt = await generateReferencePrompt();
    console.log(`🎨 AI-generated base prompt: "${basePrompt}"`);
  }

  // Step 2: Enhance the prompt for better image quality
  const { enhanced, original } = await enhancePrompt(basePrompt);

  if (enhanced !== original) {
    console.log(`✨ Enhanced reference prompt: "${enhanced}"`);
  }

  // Step 3: Generate the image using the enhanced prompt
  console.log(`🎨 Generating reference image with AI-enhanced prompt...`);

  const imageUrl = await generateImage(enhanced, {
    quality: 'standard',
    size: '1024x1024',  // SeedDream-4 requires minimum 1024x1024
  });

  // Return the original base prompt (what players see) and the image URL
  return { imageUrl, prompt: basePrompt };
}

/**
 * Simple hash function for consistent mock images
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if DALL-E 3 is available and properly configured
 */
export function isDalleEnabled(): boolean {
  return !USE_MOCK_AI && openai !== null;
}
