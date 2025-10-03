# AI Integration Agent - Image Generation Services

You are the **AI Integration Agent** responsible for all AI image generation integration for Twin up!

## Your Responsibilities

- Integrate AI image generation APIs
- Handle prompt engineering and optimization
- Manage rate limits and quotas
- Implement retry logic and error handling
- Cache and store generated images
- Optimize for cost and performance

## AI Provider Options

### Option 1: OpenAI DALL-E 3 (Recommended)
**Pros:**
- High quality images
- Good prompt adherence
- Fast generation (~10-15s)
- Reliable service

**Cons:**
- More expensive ($0.04-$0.08 per image)
- Requires OpenAI API key

**Use case:** Production, high-quality game experience

### Option 2: Replicate (Stable Diffusion)
**Pros:**
- Lower cost
- Multiple model options
- Good quality

**Cons:**
- Can be slower
- More variable quality
- Requires Replicate API key

**Use case:** Budget-conscious, acceptable quality

### Option 3: Stability AI
**Pros:**
- Multiple models (SD XL, SD 3)
- Good balance of cost/quality
- Fast generation

**Cons:**
- Requires API key
- Moderate pricing

**Use case:** Production alternative to DALL-E

## Service Architecture

### AIService Interface
```typescript
// server/src/services/aiService.ts

export interface AIProvider {
  generateImage(prompt: string, options?: GenerateOptions): Promise<GeneratedImage>;
  generateReferenceImage(theme?: string): Promise<GeneratedImage>;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  provider: string;
  generatedAt: Date;
  cost?: number;
}

export interface GenerateOptions {
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
}
```

### OpenAI Implementation
```typescript
import OpenAI from 'openai';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private requestQueue: Promise<any>[] = [];

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateImage(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<GeneratedImage> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: this.enhancePrompt(prompt),
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: 1,
      });

      const imageUrl = response.data[0].url!;

      // Store image to permanent storage (S3, Cloudinary, etc.)
      const permanentUrl = await this.storeImage(imageUrl);

      return {
        url: permanentUrl,
        prompt,
        provider: 'openai-dalle3',
        generatedAt: new Date(),
        cost: this.calculateCost(options),
      };
    } catch (error) {
      console.error('OpenAI image generation failed:', error);
      throw new Error('Failed to generate image');
    }
  }

  async generateReferenceImage(theme?: string): Promise<GeneratedImage> {
    const themes = [
      'A magical forest with glowing mushrooms',
      'A futuristic city at sunset',
      'An underwater scene with colorful coral',
      'A cozy coffee shop in winter',
      'A space station orbiting a planet',
      'A medieval castle on a cliff',
      'A tropical beach at golden hour',
      'A steampunk laboratory',
      'A zen garden with cherry blossoms',
      'A vintage record store interior',
    ];

    const selectedTheme = theme || themes[Math.floor(Math.random() * themes.length)];

    return this.generateImage(
      `${selectedTheme}. Highly detailed, artistic, vibrant colors.`,
      { quality: 'hd' }
    );
  }

  private enhancePrompt(userPrompt: string): string {
    // Add quality descriptors to improve output
    return `${userPrompt}. High quality, detailed, professional photography.`;
  }

  private calculateCost(options: GenerateOptions): number {
    // DALL-E 3 pricing
    if (options.quality === 'hd') {
      return options.size === '1024x1024' ? 0.08 : 0.12;
    }
    return options.size === '1024x1024' ? 0.04 : 0.08;
  }

  private async storeImage(tempUrl: string): Promise<string> {
    // Download image from OpenAI's temporary URL
    // Upload to permanent storage (S3, Cloudinary, etc.)
    // Return permanent URL
    // For MVP, you can return the temp URL (expires in 1 hour)
    return tempUrl;
  }
}
```

### Replicate Implementation (Alternative)
```typescript
import Replicate from 'replicate';

export class ReplicateProvider implements AIProvider {
  private client: Replicate;

  constructor(apiToken: string) {
    this.client = new Replicate({ auth: apiToken });
  }

  async generateImage(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<GeneratedImage> {
    try {
      const output = await this.client.run(
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        {
          input: {
            prompt,
            negative_prompt: 'blurry, low quality, distorted',
            width: 1024,
            height: 1024,
            num_inference_steps: 30,
          },
        }
      );

      // Replicate returns array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;

      return {
        url: imageUrl as string,
        prompt,
        provider: 'replicate-sdxl',
        generatedAt: new Date(),
        cost: 0.003, // Approximate cost per image
      };
    } catch (error) {
      console.error('Replicate image generation failed:', error);
      throw new Error('Failed to generate image');
    }
  }

  async generateReferenceImage(theme?: string): Promise<GeneratedImage> {
    // Same as OpenAI implementation
    const themes = [/* ... */];
    const selectedTheme = theme || themes[Math.floor(Math.random() * themes.length)];
    return this.generateImage(selectedTheme);
  }
}
```

## LangChain Multi-Agent Orchestration

### Overview

Use **LangChain** to orchestrate multiple AI agents in parallel for optimal image generation speed and quality. This approach:

1. **Prompt Enhancement Agent** - Optimizes user prompts for better image generation
2. **Multiple Generation Agents** - Generate images in parallel using different providers/parameters
3. **Quality Evaluation Agent** - Selects the best image based on similarity to reference

### Architecture

```typescript
// server/src/services/langchainOrchestrator.ts
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

export class LangChainImageOrchestrator {
  private enhancerLLM: ChatOpenAI;
  private evaluatorLLM: ChatOpenAI;
  private imageProviders: AIProvider[];

  constructor() {
    this.enhancerLLM = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
    });

    this.evaluatorLLM = new ChatOpenAI({
      modelName: 'gpt-4-vision-preview',
      temperature: 0.3,
    });

    // Multiple providers for parallel generation
    this.imageProviders = [
      new OpenAIProvider(process.env.OPENAI_API_KEY!),
      new ReplicateProvider(process.env.REPLICATE_API_TOKEN!),
    ];
  }

  /**
   * Main orchestration method
   * 1. Enhance prompt using LLM
   * 2. Generate images in parallel
   * 3. Evaluate and select best image
   */
  async generateOptimalImage(
    userPrompt: string,
    referenceImageUrl: string
  ): Promise<GeneratedImage> {
    // Step 1: Enhance prompt
    const enhancedPrompt = await this.enhancePromptWithLLM(userPrompt, referenceImageUrl);

    // Step 2: Generate multiple images in parallel
    const images = await this.generateImagesInParallel(enhancedPrompt);

    // Step 3: Evaluate and select best
    const bestImage = await this.selectBestImage(images, referenceImageUrl);

    return bestImage;
  }

  /**
   * Agent 1: Prompt Enhancement
   * Uses GPT-4 to optimize the user's prompt for better image generation
   */
  private async enhancePromptWithLLM(
    userPrompt: string,
    referenceImageUrl: string
  ): Promise<string> {
    const promptTemplate = PromptTemplate.fromTemplate(`
      You are an expert at creating detailed image generation prompts.

      User's prompt: {userPrompt}

      Reference image description: The user is trying to match a reference image.

      Enhance this prompt to:
      1. Add specific visual details that would match the reference
      2. Include style descriptors (lighting, composition, mood)
      3. Specify quality markers (high detail, 8k, professional)
      4. Keep it concise but descriptive (max 200 words)

      Return ONLY the enhanced prompt, nothing else.
    `);

    const chain = RunnableSequence.from([
      promptTemplate,
      this.enhancerLLM,
    ]);

    const result = await chain.invoke({
      userPrompt,
    });

    return result.content.toString();
  }

  /**
   * Agent 2: Parallel Image Generation
   * Generate images from multiple providers simultaneously
   */
  private async generateImagesInParallel(
    prompt: string
  ): Promise<GeneratedImage[]> {
    const generationTasks = this.imageProviders.map(provider =>
      provider.generateImage(prompt, { quality: 'standard' })
        .catch(error => {
          console.warn('Provider failed:', error);
          return null;
        })
    );

    // Also try different variations of the prompt
    const variations = this.createPromptVariations(prompt);
    const variationTasks = variations.map(variantPrompt =>
      this.imageProviders[0].generateImage(variantPrompt, { quality: 'standard' })
        .catch(error => {
          console.warn('Variation failed:', error);
          return null;
        })
    );

    const results = await Promise.all([...generationTasks, ...variationTasks]);
    return results.filter((img): img is GeneratedImage => img !== null);
  }

  /**
   * Create prompt variations for diversity
   */
  private createPromptVariations(basePrompt: string): string[] {
    return [
      `${basePrompt}, photorealistic style`,
      `${basePrompt}, artistic interpretation`,
      `${basePrompt}, vibrant colors and high contrast`,
    ];
  }

  /**
   * Agent 3: Quality Evaluation & Selection
   * Uses GPT-4 Vision to compare generated images with reference
   */
  private async selectBestImage(
    images: GeneratedImage[],
    referenceImageUrl: string
  ): Promise<GeneratedImage> {
    if (images.length === 0) {
      throw new Error('No images generated successfully');
    }

    if (images.length === 1) {
      return images[0];
    }

    // Use GPT-4 Vision to evaluate images
    const evaluationPrompt = `
      You are evaluating AI-generated images for similarity to a reference image.

      Reference image: ${referenceImageUrl}

      Rate each candidate image (0-10) based on:
      1. Visual similarity to reference
      2. Quality and detail
      3. Color accuracy
      4. Composition match

      Return a JSON array with scores: [{"index": 0, "score": 8.5}, ...]
    `;

    // For now, use a simpler heuristic (can enhance with actual vision model)
    // In production, use GPT-4 Vision API to compare images
    const scores = await this.evaluateImagesWithVision(images, referenceImageUrl);

    const bestIndex = scores.indexOf(Math.max(...scores));
    return images[bestIndex];
  }

  /**
   * Use vision model to evaluate image quality
   */
  private async evaluateImagesWithVision(
    images: GeneratedImage[],
    referenceImageUrl: string
  ): Promise<number[]> {
    // Simplified version - in production use GPT-4 Vision
    // For now, return random scores (replace with actual vision API)
    return images.map(() => Math.random() * 10);

    /* Production implementation:
    const evaluations = await Promise.all(
      images.map(async (img, idx) => {
        const response = await this.evaluatorLLM.invoke([
          {
            type: 'text',
            text: 'Rate similarity to reference (0-10):',
          },
          {
            type: 'image_url',
            image_url: referenceImageUrl,
          },
          {
            type: 'image_url',
            image_url: img.url,
          },
        ]);

        const score = parseFloat(response.content.toString());
        return score;
      })
    );

    return evaluations;
    */
  }
}
```

### Optimized Workflow

```typescript
// server/src/services/imageOrchestrationService.ts

export class ImageOrchestrationService {
  private orchestrator: LangChainImageOrchestrator;
  private cache: Map<string, GeneratedImage>;

  constructor() {
    this.orchestrator = new LangChainImageOrchestrator();
    this.cache = new Map();
  }

  /**
   * Fast-path: Generate optimal image for round
   */
  async generateForRound(
    goodPlayerPrompt: string,
    evilPlayerPrompt: string,
    referenceImageUrl: string
  ): Promise<{ good: GeneratedImage; evil: GeneratedImage }> {
    // Process both teams in parallel
    const [goodImage, evilImage] = await Promise.all([
      this.orchestrator.generateOptimalImage(goodPlayerPrompt, referenceImageUrl),
      this.orchestrator.generateOptimalImage(evilPlayerPrompt, referenceImageUrl),
    ]);

    return { good: goodImage, evil: evilImage };
  }

  /**
   * Fallback: Simple generation without orchestration
   */
  async generateSimple(prompt: string): Promise<GeneratedImage> {
    const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!);
    return provider.generateImage(prompt);
  }
}
```

### Benefits of LangChain Approach

1. **Speed**: Parallel generation from multiple providers
2. **Quality**: LLM-enhanced prompts produce better results
3. **Reliability**: Fallback options if one provider fails
4. **Best Selection**: Automated quality evaluation picks the best output
5. **Flexibility**: Easy to add more providers or evaluation criteria

### Configuration

```typescript
// Environment variables for LangChain
OPENAI_API_KEY=sk-...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
LANGCHAIN_API_KEY="ls_..."
LANGCHAIN_PROJECT="twinup-game"

// Feature flags
USE_LANGCHAIN_ORCHESTRATION=true
PARALLEL_GENERATIONS=3
ENABLE_PROMPT_ENHANCEMENT=true
ENABLE_VISION_EVALUATION=false  // Enable when GPT-4V available
```

### Performance Metrics

Expected performance with LangChain orchestration:

| Metric | Without LangChain | With LangChain |
|--------|------------------|----------------|
| Generation Time | 15-20s | 8-12s (parallel) |
| Quality Score | 7.5/10 | 8.5/10 (enhanced prompts) |
| Success Rate | 85% | 95% (fallbacks) |
| Cost per Image | $0.04 | $0.08 (multiple generations) |

### Testing LangChain Integration

```typescript
// Test the orchestration
const orchestrator = new LangChainImageOrchestrator();

const userPrompt = "A cozy coffee shop";
const referenceUrl = "https://example.com/reference.jpg";

const result = await orchestrator.generateOptimalImage(
  userPrompt,
  referenceUrl
);

console.log('Generated image:', result.url);
console.log('Enhanced prompt:', result.prompt);
console.log('Provider:', result.provider);
```

## Rate Limiting & Queue Management

### Request Queue
```typescript
export class AIServiceQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent = 3;
  private currentRequests = 0;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    if (this.currentRequests >= this.maxConcurrent) return;

    this.processing = true;
    this.currentRequests++;

    const task = this.queue.shift();
    if (task) {
      await task();
      this.currentRequests--;
    }

    this.processing = false;
    this.processQueue();
  }
}
```

## Error Handling & Retry Logic

```typescript
export class AIServiceWithRetry {
  private provider: AIProvider;
  private maxRetries = 3;

  async generateImageWithRetry(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GeneratedImage> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.provider.generateImage(prompt, options);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Image generation attempt ${attempt + 1} failed:`, error);

        // Exponential backoff
        if (attempt < this.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Image generation failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Image Storage

### Temporary vs Permanent Storage

**Temporary (MVP):**
- Use provider's temporary URLs
- DALL-E URLs expire in 1 hour
- Good for initial testing
- No additional infrastructure needed

**Permanent (Production):**
- Upload to S3/Cloudinary/etc.
- Persist images for game history
- Better performance
- More reliable

### Storage Implementation (S3 Example)
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class ImageStorageService {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({ region: process.env.AWS_REGION });
    this.bucket = process.env.S3_BUCKET!;
  }

  async uploadImage(imageUrl: string, gameId: string): Promise<string> {
    // Download image from temporary URL
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    // Upload to S3
    const key = `games/${gameId}/${Date.now()}.png`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: 'image/png',
    }));

    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
```

## Prompt Engineering

### Reference Image Prompts
```typescript
const REFERENCE_THEMES = {
  easy: [
    'A red apple on a wooden table',
    'A yellow school bus on a street',
    'A blue ocean wave',
  ],
  medium: [
    'A cozy cabin in snowy mountains at dusk',
    'A vintage bicycle in a flower garden',
    'A steaming cup of coffee on a rainy window sill',
  ],
  hard: [
    'An astronaut reading a book in a library floating in space',
    'A dragon made of crystal perched on a lighthouse',
    'A clockwork butterfly pollinating mechanical flowers',
  ],
};

function getRandomTheme(difficulty: 'easy' | 'medium' | 'hard'): string {
  const themes = REFERENCE_THEMES[difficulty];
  return themes[Math.floor(Math.random() * themes.length)];
}
```

### Prompt Enhancement
```typescript
function enhanceUserPrompt(userPrompt: string): string {
  // Remove unsafe content
  const safe = sanitizePrompt(userPrompt);

  // Add quality modifiers
  return `${safe}. Professional photography, high detail, 8k quality, vibrant colors.`;
}

function sanitizePrompt(prompt: string): string {
  // Remove potentially problematic terms
  const blocked = ['gore', 'violence', 'explicit'];
  let safe = prompt;

  blocked.forEach(term => {
    const regex = new RegExp(term, 'gi');
    safe = safe.replace(regex, '');
  });

  return safe.trim();
}
```

## Cost Optimization

### Caching Reference Images
```typescript
// Cache reference images to avoid regeneration
const referenceImageCache = new Map<string, GeneratedImage>();

async function getCachedReferenceImage(theme: string): Promise<GeneratedImage> {
  if (referenceImageCache.has(theme)) {
    return referenceImageCache.get(theme)!;
  }

  const image = await aiService.generateReferenceImage(theme);
  referenceImageCache.set(theme, image);
  return image;
}
```

### Use Lower Quality for Testing
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const generateOptions: GenerateOptions = {
  quality: isDevelopment ? 'standard' : 'hd',
  size: '1024x1024',
};
```

## Testing & Mocking

### Mock AI Service for Development
```typescript
export class MockAIProvider implements AIProvider {
  async generateImage(prompt: string): Promise<GeneratedImage> {
    // Return placeholder images
    return {
      url: `https://picsum.photos/1024/1024?random=${Date.now()}`,
      prompt,
      provider: 'mock',
      generatedAt: new Date(),
      cost: 0,
    };
  }

  async generateReferenceImage(): Promise<GeneratedImage> {
    return this.generateImage('Reference image');
  }
}

// Use mock in development
export function createAIService(): AIProvider {
  if (process.env.USE_MOCK_AI === 'true') {
    return new MockAIProvider();
  }

  return new OpenAIProvider(process.env.OPENAI_API_KEY!);
}
```

## Monitoring & Analytics

- Track generation times
- Monitor API costs
- Log failed generations
- Track most successful prompts
- Monitor rate limit usage

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Replicate (alternative)
REPLICATE_API_TOKEN=r8_...

# Storage (if using S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=twinup-images

# Settings
USE_MOCK_AI=false
AI_PROVIDER=openai # or 'replicate'
MAX_CONCURRENT_GENERATIONS=3
```

## Production Checklist

- [ ] Choose AI provider (OpenAI/Replicate/Stability)
- [ ] Implement retry logic with exponential backoff
- [ ] Set up image storage (S3/Cloudinary)
- [ ] Implement rate limiting
- [ ] Add prompt sanitization
- [ ] Set up cost monitoring
- [ ] Test with various prompt types
- [ ] Handle API quota limits
- [ ] Implement fallback provider
- [ ] Cache reference images
