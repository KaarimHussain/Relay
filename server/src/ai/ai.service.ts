import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateHashtagsDto } from './dto/generate-hashtags.dto';
import { ImproveCaptionDto } from './dto/improve-caption.dto';
import { CaptionFromImageDto } from './dto/caption-from-image.dto';
import OpenAI from 'openai';

const PLATFORM_HINTS: Record<string, string> = {
  Instagram: 'conversational, emoji-friendly, 1-3 short paragraphs, up to 30 hashtags',
  LinkedIn:  'professional, insightful, no more than 5 hashtags, longer form OK',
  X:         'punchy, concise, max 280 chars, 1-3 hashtags',
  Facebook:  'friendly, community-focused, moderate length',
  TikTok:    'energetic, trend-aware, hooks in first sentence',
};

// Tasteful hashtag budget per platform for image captions — deliberately small to avoid spam.
const HASHTAG_COUNTS: Record<string, number> = {
  Instagram: 5,
  LinkedIn:  3,
  X:         2,
  Facebook:  2,
  TikTok:    4,
};

@Injectable()
export class AiService {
  private openai: OpenAI;
  private textModel: string;
  private visionModel: string;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.get('OPENROUTER_API_KEY', ''),
      defaultHeaders: {
        'HTTP-Referer': config.get('APP_URL', 'http://localhost:3000'),
        'X-Title': 'Relay SMM',
      },
    });
    // Text generation → DeepSeek (cost-efficient). Vision → gpt-4o-mini (reads images).
    // AI_DEFAULT_MODEL kept as a fallback for backward compatibility with existing env files.
    this.textModel   = config.get('AI_TEXT_MODEL', config.get('AI_DEFAULT_MODEL', 'deepseek/deepseek-chat'));
    this.visionModel = config.get('AI_VISION_MODEL', 'openai/gpt-4o-mini');
  }

  async generateCaption(brandId: string, dto: GenerateCaptionDto) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
    const count = dto.variations ?? 1;
    const model = dto.model ?? this.textModel;

    const systemPrompt = [
      `You are a social media copywriter for the brand "${brand.name}".`,
      brand.voiceTone ? `Brand voice/tone: ${brand.voiceTone}.` : '',
      brand.pillars ? `Content pillars: ${brand.pillars}.` : '',
      `You are writing for ${dto.platform}. Platform style: ${PLATFORM_HINTS[dto.platform] ?? 'general social media'}.`,
      'Return ONLY valid JSON matching the schema. No markdown, no explanations.',
    ].filter(Boolean).join(' ');

    const userPrompt = [
      `Topic: ${dto.topic}`,
      dto.mediaContext ? `Media context: ${dto.mediaContext}` : '',
      `Generate ${count} variation(s).`,
      `Respond with JSON of the exact shape: {"variations":[{"caption":string,"hashtags":string[]}]} with ${count} item(s). Each hashtag must start with #.`,
    ].filter(Boolean).join('\n');

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalServerErrorException('Empty AI response');

    try {
      return JSON.parse(content) as { variations: { caption: string; hashtags: string[] }[] };
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response');
    }
  }

  async captionFromImage(brandId: string, dto: CaptionFromImageDto) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
    const model = dto.model ?? this.visionModel;
    const platform = dto.platform ?? 'Instagram';
    const hashtagCount = HASHTAG_COUNTS[platform] ?? 4;

    const systemPrompt = [
      `You are an expert social media copywriter for the brand "${brand.name}".`,
      brand.voiceTone ? `Brand voice/tone: ${brand.voiceTone}.` : '',
      brand.pillars ? `Content pillars: ${brand.pillars}.` : '',
      `You are writing for ${platform}. Platform style: ${PLATFORM_HINTS[platform] ?? 'general social media'}.`,
      '',
      'Study the image closely and write a caption that could ONLY have been written about THIS specific image.',
      'Ground it in concrete visual details you actually see — the subject, setting, colors, action, mood, and any visible text, logos, or products.',
      'Rules:',
      '- Open with a specific, scroll-stopping hook tied to the image — not a generic greeting.',
      '- Be concrete and original. Ban vague, cliché filler like "celebrating the spirit of", "let\'s come together", "join us as we".',
      '- Keep it tight: 1-2 short sentences for X; 2-4 for Instagram/Facebook/LinkedIn. No padding.',
      '- Use at most 1-2 emojis, and only if they fit the brand. Do not spam emojis.',
      `- Do NOT put any hashtags inside the "caption" field.`,
      `- Return exactly ${hashtagCount} hashtags in the "hashtags" array: specific and relevant to the image and brand, a mix of broad and niche. No generic filler tags like #love #instagood #photooftheday. Each must start with #.`,
      'Return ONLY valid JSON matching the schema. No markdown, no explanations.',
    ].filter(Boolean).join('\n');

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                `Write one ${platform} caption for this image, following all the rules.`,
                dto.extraContext ? `Extra context from the user (weave in only if relevant): ${dto.extraContext}` : '',
              ].filter(Boolean).join('\n'),
            },
            { type: 'image_url', image_url: { url: dto.imageUrl } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'caption_from_image_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              caption: { type: 'string' },
              hashtags: { type: 'array', items: { type: 'string' } },
            },
            required: ['caption', 'hashtags'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalServerErrorException('Empty AI response');

    try {
      return JSON.parse(content) as { caption: string; hashtags: string[] };
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response');
    }
  }

  async generateIdeas(brandId: string, dto: GenerateIdeasDto) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
    const model = dto.model ?? this.textModel;
    const pillarsText = dto.pillars?.length ? dto.pillars.join(', ') : (brand.pillars ?? 'general content');

    const systemPrompt = [
      `You are a social media strategist for the brand "${brand.name}".`,
      brand.voiceTone ? `Brand voice/tone: ${brand.voiceTone}.` : '',
      `Generate content ideas for the following niche: ${dto.niche}.`,
      `Content pillars to focus on: ${pillarsText}.`,
      'Return ONLY valid JSON matching the schema. No markdown, no explanations.',
    ].filter(Boolean).join(' ');

    const userPrompt = `Generate 4 diverse content ideas that cover different themes and platforms. Each idea should have a strong hook that stops the scroll. Respond with JSON of the exact shape: {"ideas":[{"theme":string,"platform":string,"hook":string,"title":string,"cta":string}]} containing exactly 4 items.`;

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalServerErrorException('Empty AI response');

    try {
      return JSON.parse(content) as { ideas: { theme: string; platform: string; hook: string; title: string; cta: string }[] };
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response');
    }
  }

  async improveCaption(brandId: string, dto: ImproveCaptionDto) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
    const model = dto.model ?? this.textModel;

    const actionInstruction = dto.action === 'add-hook'
      ? 'Rewrite this caption by adding a compelling viral hook at the very start that stops the scroll. Keep the rest of the message intact.'
      : 'Rewrite this caption to improve its tone — make it more engaging, clear, and on-brand. Preserve the core message.';

    const systemPrompt = [
      `You are a social media copywriter for the brand "${brand.name}".`,
      brand.voiceTone ? `Brand voice/tone: ${brand.voiceTone}.` : '',
      actionInstruction,
      'Return ONLY valid JSON matching the schema. No markdown, no explanations.',
    ].filter(Boolean).join(' ');

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Original caption:\n${dto.caption}\n\nRespond with JSON of the exact shape: {"improved": string}.` },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalServerErrorException('Empty AI response');

    try {
      return JSON.parse(content) as { improved: string };
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response');
    }
  }

  async generateHashtags(brandId: string, dto: GenerateHashtagsDto) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
    const model = dto.model ?? this.textModel;

    const systemPrompt = [
      `You are a social media hashtag strategist for the brand "${brand.name}".`,
      brand.pillars ? `Content pillars: ${brand.pillars}.` : '',
      'Return ONLY valid JSON matching the schema. No markdown, no explanations.',
    ].filter(Boolean).join(' ');

    const userPrompt = `Generate hashtags for the topic: "${dto.topic}". Provide two groups: 5 popular broad-reach hashtags and 5 niche targeted hashtags. Each hashtag must start with #. Respond with JSON of the exact shape: {"popular":string[],"niche":string[]}.`;

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalServerErrorException('Empty AI response');

    try {
      return JSON.parse(content) as { popular: string[]; niche: string[] };
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response');
    }
  }
}
