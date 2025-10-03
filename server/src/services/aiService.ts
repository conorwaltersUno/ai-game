import OpenAI from 'openai';

const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
let openai: OpenAI | null = null;

if (!USE_MOCK_AI && OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
  console.log('🤖 OpenAI client initialized - DALL-E 3 enabled');
} else if (!USE_MOCK_AI && !OPENAI_API_KEY) {
  console.warn('⚠️ USE_MOCK_AI=false but OPENAI_API_KEY not set. Using mock images.');
} else {
  console.log('🎨 Using mock AI images (USE_MOCK_AI=true)');
}

/**
 * Generate an image using DALL-E 3
 *
 * @param prompt - The text prompt for image generation
 * @param quality - Image quality: "standard" or "hd"
 * @param size - Image size: "1024x1024", "1024x1792", or "1792x1024"
 * @returns URL of the generated image
 */
export async function generateImage(
  prompt: string,
  options: {
    quality?: 'standard' | 'hd';
    size?: '1024x1024' | '1024x1792' | '1792x1024';
  } = {}
): Promise<string> {
  const { quality = 'standard', size = '1024x1024' } = options;

  // Use mock images if configured
  if (USE_MOCK_AI || !openai) {
    console.log(`🎨 [MOCK] Generating image for prompt: "${prompt.substring(0, 50)}..."`);
    // Return a deterministic mock image based on prompt hash
    const hash = simpleHash(prompt);
    return `https://picsum.photos/512/512?random=${hash}`;
  }

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

    // Fallback to mock image on error
    console.warn('⚠️ Falling back to mock image');
    const hash = simpleHash(prompt);
    return `https://picsum.photos/512/512?random=${hash}`;
  }
}

/**
 * Generate a reference image for a new round
 * This is a neutral image that both teams will try to recreate
 */
export async function generateReferenceImage(): Promise<{
  imageUrl: string;
  prompt: string;
}> {
  // Reference image prompts - neutral, creative concepts
  const referencePrompts = [
    'A serene mountain landscape at sunset with vibrant colors',
    'A futuristic cityscape with flying vehicles and neon lights',
    'An underwater coral reef teeming with colorful fish',
    'A mystical forest with glowing mushrooms and fairy lights',
    'A cozy coffee shop on a rainy evening with warm lighting',
    'A space station orbiting a distant colorful planet',
    'A medieval castle on a cliff overlooking the ocean',
    'A vibrant street market with exotic fruits and spices',
    'A peaceful Japanese garden with koi pond and cherry blossoms',
    'A steampunk workshop filled with gears and inventions',
  ];

  // Pick a random prompt
  const prompt = referencePrompts[Math.floor(Math.random() * referencePrompts.length)];

  console.log(`🎨 Generating reference image: "${prompt}"`);

  const imageUrl = await generateImage(prompt, {
    quality: 'standard',
    size: '1024x1024',
  });

  return { imageUrl, prompt };
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
