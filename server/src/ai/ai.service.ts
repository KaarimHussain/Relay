import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import OpenAI from 'openai';

const PLATFORM_HINTS: Record<string, string> = {
  Instagram: 'conversational, emoji-friendly, 1-3 short paragraphs, up to 30 hashtags',
  LinkedIn:  'professional, insightful, no more than 5 hashtags, longer form OK',
  X:         'punchy, concise, max 280 chars, 1-3 hashtags',
  Facebook:  'friendly, community-focused, moderate length',
  TikTok:    'energetic, trend-aware, hooks in first sentence',
};

@Injectable()
export class AiService {
  private openai: OpenAI;
  private defaultModel: string;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.get('OPENROUTER_API_KEY', ''),
      defaultHeaders: {
        'HTTP-Referer': config.get('APP_URL', 'http://localhost:3000'),
        'X-Title': 'Relay SMM',
      },
    });
    this.defaultModel = config.get('AI_DEFAULT_MODEL', 'openai/gpt-4o-mini');
  }

  async generateCaption(brandId: string, dto: GenerateCaptionDto) {
    const brand = await this.prisma.brand.findUniqueOrThrow({ where: { id: brandId } });
    const count = dto.variations ?? 1;
    const model = dto.model ?? this.defaultModel;

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
    ].filter(Boolean).join('\n');

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'caption_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              variations: {
                type: 'array',
                items: {
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
            required: ['variations'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new InternalServerErrorException('Empty AI response');

    try {
      return JSON.parse(content) as { variations: { caption: string; hashtags: string[] }[] };
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response');
    }
  }
}
