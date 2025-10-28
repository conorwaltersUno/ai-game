import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_ENHANCEMENT = process.env.ENABLE_PROMPT_ENHANCEMENT !== 'false'; // Enabled by default

let openai: OpenAI | null = null;

if (ENABLE_ENHANCEMENT && OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('✨ Prompt Enhancement enabled - GPT-4o-mini ready');
} else {
  console.log('ℹ️ Prompt Enhancement disabled (set ENABLE_PROMPT_ENHANCEMENT=true)');
}

/**
 * Enhance a user's simple prompt with artistic details and subtle developer themes
 *
 * @param userPrompt - The user's original prompt
 * @returns Enhanced prompt optimized for Stable Diffusion
 */
export async function enhancePrompt(userPrompt: string): Promise<{
  enhanced: string;
  original: string;
}> {
  // If enhancement is disabled or no API key, return original
  if (!openai || !ENABLE_ENHANCEMENT) {
    return {
      enhanced: userPrompt,
      original: userPrompt
    };
  }

  try {
    const startTime = Date.now();
    console.log(`🎨 Enhancing prompt: "${userPrompt}"`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a world-class prompt engineer specializing in Stable Diffusion and DALL-E image generation.

Your mission: Transform simple prompts into production-quality directives that generate stunning, photorealistic images with subtle developer/tech aesthetic.

ENHANCEMENT FRAMEWORK:
1. PRESERVE the user's core concept (never change the main subject)
2. ADD QUALITY BOOSTERS:
   - Lighting: (golden hour, soft ambient, dramatic rim light, volumetric rays)
   - Composition: (rule of thirds, depth of field, foreground/midground/background)
   - Style: (photorealistic, hyperdetailed, 8K, professional photography)
   - Atmosphere: (cinematic, moody, atmospheric perspective)
3. WEAVE IN TECH AESTHETIC (subtle, natural integration):
   - Environment: mechanical keyboards, dual monitors, minimalist desks
   - Characters: hoodies, headphones, casual developer attire
   - Lighting: monitor glow, RGB accents, desk lamps
   - Colors: blues, purples, teals, neon highlights
4. OPTIMIZE FOR AI:
   - Use comma-separated descriptors
   - Place important elements first
   - Include negative space mentions if needed
5. Keep under 85 words
6. Only force tech elements if they feel organic to the scene

EXAMPLES:
Input: "sunset beach"
Output: "Serene beach at golden hour sunset, warm orange and pink sky reflecting on glassy calm waters, lone developer in black hoodie sitting cross-legged on sand with laptop, soft screen glow on face, gentle waves, atmospheric perspective, photorealistic, ultra detailed, cinematic composition, professional photography, 8K"

Input: "mountain landscape"
Output: "Epic mountain landscape with snow-capped peaks piercing clouds, foreground features cozy cabin workspace with floor-to-ceiling windows, mechanical keyboard and steaming coffee mug on wooden desk, warm RGB desk lamp mixing with natural light, depth of field, volumetric god rays, hyperdetailed, professional nature photography, 8K resolution"

Input: "city at night"
Output: "Cyberpunk metropolis at night, towering neon-lit skyscrapers, rain-slicked streets with reflections, foreground shows developer at modern balcony workspace, dual ultrawide monitors displaying code, purple and blue ambient lighting, bokeh city lights in background, atmospheric fog, cinematic composition, hyperdetailed, 8K"

CRITICAL: Output ONLY the enhanced prompt. No explanations, no preamble, just the prompt.`
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.8, // Creative but consistent
      max_tokens: 150
    });

    const enhanced = response.choices[0].message.content?.trim() || userPrompt;
    const duration = Date.now() - startTime;

    console.log(`✅ Enhanced in ${duration}ms: "${enhanced}"`);

    return {
      enhanced,
      original: userPrompt
    };
  } catch (error: any) {
    console.error('❌ Prompt enhancement failed:', error.message);
    // Fallback to original on error
    return {
      enhanced: userPrompt,
      original: userPrompt
    };
  }
}

/**
 * Generate a creative reference prompt using AI
 * This replaces the hard-coded reference prompt list with dynamic AI generation
 *
 * @returns AI-generated reference prompt optimized for image generation
 */
export async function generateReferencePrompt(): Promise<string> {
  // If enhancement is disabled or no API key, use fallback
  if (!openai || !ENABLE_ENHANCEMENT) {
    const fallbackPrompts = [
      'A serene mountain landscape at sunset with vibrant colors',
      'A futuristic cityscape with flying vehicles and neon lights',
      'An underwater coral reef teeming with colorful fish',
      'A mystical forest with glowing mushrooms and fairy lights',
      'A cozy coffee shop on a rainy evening with warm lighting',
    ];
    return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
  }

  try {
    const startTime = Date.now();
    console.log(`🎨 Generating AI-powered reference prompt...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a creative director generating reference images for a competitive image generation game.

Your job: Create a single, vivid, detailed prompt for an image that players will try to recreate using text prompts.

REQUIREMENTS:
1. The prompt should be creative and visually interesting
2. Include specific details about:
   - Main subject (landscape, scene, object, character)
   - Lighting and atmosphere
   - Color palette
   - Composition elements
3. Should be challenging but not impossible to recreate
4. Avoid abstract concepts - focus on concrete, visual elements
5. Include developer/tech aesthetic elements naturally
6. Make it distinctive and memorable
7. Keep it between 15-25 words

THEMES TO EXPLORE (pick one or combine):
- Natural landscapes (mountains, beaches, forests, deserts)
- Urban scenes (cities, streets, buildings, interiors)
- Tech environments (workspaces, labs, futuristic settings)
- Fantasy/Sci-fi (space, alien worlds, magical settings)
- Atmospheric moments (weather, time of day, seasons)

EXAMPLES:
"A minimalist developer workspace overlooking a neon-lit Tokyo skyline at night, rain droplets on the window, warm desk lamp glow"
"Ancient library filled with holographic books and floating screens, purple ambient lighting, marble columns, futuristic meets classical"
"Mountain summit at sunrise with a lone developer in a hoodie, laptop open, coding while overlooking misty valley below"
"Cozy underground bunker workspace, multiple monitors showing code, cables everywhere, blue LED strips, cyberpunk aesthetic"

OUTPUT: Only the prompt, nothing else.`
        },
        {
          role: 'user',
          content: 'Generate a unique, visually striking reference image prompt.'
        }
      ],
      temperature: 1.0, // High creativity for variety
      max_tokens: 100
    });

    const prompt = response.choices[0].message.content?.trim() ||
      'A serene mountain landscape at sunset with vibrant colors';

    const duration = Date.now() - startTime;
    console.log(`✅ Generated reference prompt in ${duration}ms: "${prompt}"`);

    return prompt;
  } catch (error: any) {
    console.error('❌ Reference prompt generation failed:', error.message);
    // Fallback to a default
    return 'A serene mountain landscape at sunset with vibrant colors';
  }
}

/**
 * Check if prompt enhancement is enabled
 */
export function isEnhancementEnabled(): boolean {
  return ENABLE_ENHANCEMENT && openai !== null;
}
