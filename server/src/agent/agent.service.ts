import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { McpService } from '../mcp/mcp.service';
import { AgentTool } from '../mcp/tool.types';

export type AgentEvent =
  | { type: 'content_delta'; text: string }
  | { type: 'reasoning_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: string }
  | { type: 'tool_result'; id: string; name: string; result: unknown; error?: string }
  | { type: 'done'; finishReason?: string }
  | { type: 'error'; message: string };

export type AgentAttachment = {
  name: string;
  type: string;
  dataUrl?: string;
};

export type AgentIncomingMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AgentAttachment[];
};

const MAX_ITERATIONS = 6;

const SYSTEM_PROMPT_TEMPLATE = `You are **Relay Agent** — the in-app AI assistant for Relay, a social media scheduling and engagement platform.

Users chat with you inside their Relay dashboard to manage brands, connected accounts (Facebook, Instagram, LinkedIn, X, TikTok), posts, comments, templates, auto-reply rules, and AI content generation. You act on their behalf using tools. You do not have opinions, memories, or capabilities outside what the tools expose.

## Identity & voice
- You are warm, casual, and direct — like a smart teammate on Slack, not a corporate helpdesk. Contractions are fine. Emoji only if the user uses them first.
- Never refer to yourself as "an AI language model." You are Relay Agent.
- Keep answers short by default. One-line replies are welcome. Only go long when the user asked for detail or a plan.

## Tool protocol — non-negotiable
- **Never invent** brandIds, postIds, accountIds, commentIds, templateIds, or ruleIds. If you need one, fetch it via a tool.
- If the user references a brand by name (e.g. "Klyron Studio"), call \`list_brands\` and match by name — do not ask them for an ID.
- If the user has only one brand, use it silently. If they have multiple, pick the most relevant one from context; ask only when genuinely ambiguous.
- Chain tools freely. Read → decide → act is the normal loop. Don't announce every step ("I'm going to call X now") — just do it and report the result.
- If a tool returns an error, don't retry blindly. Read the message, explain it plainly, offer the next reasonable step.

## Anti-hallucination rules — CRITICAL
- **NEVER claim you have done something unless you actually called the corresponding tool in this same turn and it succeeded.** Do not say "I've scheduled…" without an actual successful \`schedule_post\` tool call in the same message. Do not say "I've drafted…" without a successful \`create_post\`. Do not say "I've updated…" without a successful update tool call. Violating this is the worst thing you can do.
- If a tool errored, the action DID NOT HAPPEN. Say so plainly. Do not pretend it worked. Do not offer a "corrected" version that's also just narration.
- Do not output raw tool-call syntax, function tags, JSON, or any structural markup meant for the tool interface as visible chat text. Tool calls happen via the tool-calling channel only. If you find yourself typing a tool name into your prose reply, stop.
- Do not fabricate tool return values. If you did not call a tool, you do not know its output.
- Every action verb in past tense ("scheduled", "created", "posted", "updated", "enabled") in your reply must correspond to a real successful tool call in this turn. If it doesn't, rewrite in the conditional ("I can schedule…", "I'll create…").

## Safety & confirmation
Ask before doing, only when the action is **externally visible or hard to reverse**:
- \`publish_post_now\` — always confirm ("Publish now to Instagram + LinkedIn?").
- \`reply_to_comment\` — confirm if the reply text was not explicitly dictated by the user.
- \`schedule_post\` — confirm the target time in the user's likely timezone.
- \`update_comment_ai_config\` (turning AI replies **on**) — confirm the brand and behaviour text.

Everything else is safe to run without asking: \`list_*\`, \`get_*\`, \`sync_comments\`, \`preview_comment_reply\`, all \`generate_*\` tools, \`create_post\` (drafts only), \`create_template\`, \`update_template\`, \`upsert_autoreply_rule\`.

## Cross-brand awareness
When the user asks something like "summarize today's comments," and they have multiple brands, either:
1. Loop through each brand and aggregate, OR
2. Ask which brand(s) — but only if the request is expensive or ambiguous.

Prefer option 1 for small brand counts (≤ 3).

## Response formatting (markdown supported)
The chat renders GitHub-flavored markdown. Use it to make output scannable, but don't over-format short answers:
- **Bold** for names, key numbers, and brand references.
- Bulleted or numbered lists for multiple items.
- Tables for comparisons or side-by-side data.
- \`inline code\` for IDs, technical values, or exact strings.
- Code blocks for JSON payloads, drafted captions users may want to copy.
- Do **not** use markdown headings (\`##\`) in one-line replies. Reserve them for multi-section answers.
- Never wrap your entire response in a code block.

## Boundaries
- You cannot delete data, disconnect accounts, or revoke OAuth. Those aren't exposed as tools. If asked, explain and point the user to the Manual UI.
- You cannot access the internet, other users' data, or anything outside the tool list.
- If the user asks about Relay itself (pricing, features, how something works), answer factually based on what tools exist — don't invent product features.

## Attachments
- Images sent by the user go into your visual context. Reference them naturally ("in the screenshot, I see…").
- Non-image files (PDF, DOCX, etc.) are listed by filename only — you cannot read their contents. Say so plainly if the user expected you to parse them.

## When in doubt
Prefer to act (using safe tools) over asking. But ask before anything that would post publicly or change enabled/disabled state on live systems. That's the whole trust contract.

## Your available tools (loaded fresh every turn)
These are the **only** tools you can call. Do not invent tool names, arguments, or return values. Every tool below is real, has a strict JSON schema enforced at the API layer, and must be invoked through the tool-calling channel — not by writing its name into your reply.

{TOOLS_LIST}

If the user asks you to do something not covered by the tools above, tell them plainly it's not supported and (when useful) point them to the Manual UI.`;

@Injectable()
export class AgentService {
  private logger = new Logger(AgentService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private config: ConfigService,
    private mcp: McpService,
  ) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.get('OPENROUTER_API_KEY', ''),
      defaultHeaders: {
        'HTTP-Referer': config.get('APP_URL', 'http://localhost:3000'),
        'X-Title': 'Relay Agent',
      },
    });
    this.model = config.get(
      'AI_AGENT_MODEL',
      config.get('AI_TEXT_MODEL', 'deepseek/deepseek-chat'),
    );
    this.maxTokens = Number(config.get('AI_AGENT_MAX_TOKENS', '512'));
  }

  private maxTokens: number;

  async *chatStream(
    userId: string,
    messages: AgentIncomingMessage[],
  ): AsyncGenerator<AgentEvent> {
    const tools = this.mcp.buildToolsForUser(userId);

    const openaiTools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: toStrictJsonSchema(t.inputShape),
        strict: true,
      },
    }));

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
      '{TOOLS_LIST}',
      buildToolsListText(tools),
    );

    const conversation: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => this.toOpenAiMessage(m)),
    ];

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      let content = '';
      let reasoning = '';
      const toolCalls: any[] = [];
      let finishReason: string | undefined;

      try {
        const stream = await this.openai.chat.completions.create({
          model: this.model,
          messages: conversation,
          tools: openaiTools.length ? openaiTools : undefined,
          stream: true,
          max_tokens: this.maxTokens,
        });

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          const delta: any = choice.delta ?? {};
          if (choice.finish_reason) finishReason = choice.finish_reason;

          // OpenRouter exposes reasoning tokens on delta.reasoning for supported models
          const reasoningDelta =
            delta.reasoning ?? delta.reasoning_content ?? undefined;
          if (typeof reasoningDelta === 'string' && reasoningDelta.length > 0) {
            reasoning += reasoningDelta;
            yield { type: 'reasoning_delta', text: reasoningDelta };
          }

          if (typeof delta.content === 'string' && delta.content.length > 0) {
            content += delta.content;
            yield { type: 'content_delta', text: delta.content };
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) {
                toolCalls[idx] = {
                  id: '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              const existing = toolCalls[idx];
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name)
                existing.function.name += tc.function.name;
              if (tc.function?.arguments)
                existing.function.arguments += tc.function.arguments;
            }
          }
        }
      } catch (err: any) {
        this.logger.error('LLM stream failed', err?.stack ?? String(err));
        yield {
          type: 'error',
          message: err?.message ?? 'Model request failed',
        };
        return;
      }

      const filledToolCalls = toolCalls.filter(
        (t) => t && t.function?.name,
      );

      conversation.push({
        role: 'assistant',
        content: content || null,
        tool_calls: filledToolCalls.length ? filledToolCalls : undefined,
      });

      if (filledToolCalls.length === 0) {
        yield { type: 'done', finishReason };
        return;
      }

      for (const tc of filledToolCalls) {
        const tool = tools.find((t) => t.name === tc.function.name);
        yield {
          type: 'tool_call',
          id: tc.id,
          name: tc.function.name,
          args: tc.function.arguments,
        };
        let result: unknown;
        let error: string | undefined;
        try {
          const args = tc.function.arguments
            ? JSON.parse(tc.function.arguments)
            : {};
          if (!tool) throw new Error(`Unknown tool: ${tc.function.name}`);
          result = await tool.handler(args);
        } catch (e: any) {
          error = e?.message ?? String(e);
          result = { error };
        }
        yield {
          type: 'tool_result',
          id: tc.id,
          name: tc.function.name,
          result,
          error,
        };
        conversation.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    yield {
      type: 'done',
      finishReason: 'iteration_limit',
    };
  }

  private toOpenAiMessage(m: AgentIncomingMessage): any {
    const imageAttachments = (m.attachments ?? []).filter(
      (a) => a.type.startsWith('image/') && a.dataUrl,
    );
    const nonImageNames = (m.attachments ?? [])
      .filter((a) => !(a.type.startsWith('image/') && a.dataUrl))
      .map((a) => a.name);

    const textParts: string[] = [];
    if (m.content) textParts.push(m.content);
    if (nonImageNames.length) {
      textParts.push(
        `\n\n[Attached files (contents not extracted): ${nonImageNames.join(', ')}]`,
      );
    }
    const text = textParts.join('');

    if (m.role === 'assistant') {
      return { role: 'assistant', content: text };
    }

    if (imageAttachments.length === 0) {
      return { role: 'user', content: text };
    }

    return {
      role: 'user',
      content: [
        { type: 'text', text: text || '(see attached image)' },
        ...imageAttachments.map((a) => ({
          type: 'image_url',
          image_url: { url: a.dataUrl },
        })),
      ],
    };
  }
}

/**
 * Convert a Zod raw shape → an OpenAI strict-mode-compatible JSON schema.
 *
 * Strict mode requirements:
 *  - additionalProperties: false
 *  - every property listed in `required`
 *  - optional zod fields become nullable ({ type: [T, "null"] } or anyOf with null)
 */
function toStrictJsonSchema(shape: z.ZodRawShape): Record<string, unknown> {
  const raw = z.toJSONSchema(z.object(shape)) as {
    properties?: Record<string, any>;
    required?: string[];
  };
  const properties = { ...(raw.properties ?? {}) };
  const originalRequired = new Set(raw.required ?? []);
  const allKeys = Object.keys(properties);

  for (const key of allKeys) {
    if (originalRequired.has(key)) continue;
    const prop = properties[key];
    properties[key] = makeNullable(prop);
  }

  return {
    type: 'object',
    properties,
    required: allKeys,
    additionalProperties: false,
  };
}

function makeNullable(prop: any): any {
  if (prop == null || typeof prop !== 'object') return prop;
  // { type: "string" } → { type: ["string", "null"] }
  if (typeof prop.type === 'string' && prop.type !== 'null') {
    return { ...prop, type: [prop.type, 'null'] };
  }
  // { type: [...] } → include "null"
  if (Array.isArray(prop.type)) {
    if (!prop.type.includes('null')) {
      return { ...prop, type: [...prop.type, 'null'] };
    }
    return prop;
  }
  // { anyOf: [...] } / { oneOf: [...] } → append null branch
  if (Array.isArray(prop.anyOf)) {
    if (!prop.anyOf.some((s: any) => s.type === 'null')) {
      return { ...prop, anyOf: [...prop.anyOf, { type: 'null' }] };
    }
    return prop;
  }
  if (Array.isArray(prop.oneOf)) {
    if (!prop.oneOf.some((s: any) => s.type === 'null')) {
      return { ...prop, oneOf: [...prop.oneOf, { type: 'null' }] };
    }
    return prop;
  }
  // enum-only or anything else → wrap in anyOf with null
  return { anyOf: [prop, { type: 'null' }] };
}

/**
 * Build a compact, human-readable tools list to inject into the system prompt.
 * The model sees this as reinforcement of what's callable via the tools channel.
 */
function buildToolsListText(tools: AgentTool[]): string {
  // Group by prefix (list_, get_, create_, update_, schedule_, publish_, sync_, generate_, etc.)
  const byGroup = new Map<string, AgentTool[]>();
  for (const t of tools) {
    const group = groupOf(t.name);
    const arr = byGroup.get(group) ?? [];
    arr.push(t);
    byGroup.set(group, arr);
  }

  const order = [
    'Brands',
    'Accounts',
    'Posts',
    'Comments',
    'Auto-replies',
    'Templates',
    'AI generation',
    'Competitors',
    'Trends',
    'Analytics',
    'Other',
  ];
  const sections: string[] = [];
  for (const g of order) {
    const items = byGroup.get(g);
    if (!items?.length) continue;
    sections.push(`**${g}:**`);
    for (const t of items) {
      const one = t.description.split(/(?<=\.)\s/)[0];
      sections.push(`- \`${t.name}\` — ${one}`);
    }
    sections.push('');
  }
  return sections.join('\n').trim();
}

function groupOf(name: string): string {
  if (name.includes('brand') && !name.includes('analytics')) return 'Brands';
  if (name.includes('account')) return 'Accounts';
  if (name.includes('autoreply')) return 'Auto-replies';
  if (name.includes('comment') && !name.includes('ai_config')) return 'Comments';
  if (name.includes('comment_ai_config')) return 'AI generation';
  if (name.includes('template')) return 'Templates';
  if (name.startsWith('generate_') || name.startsWith('preview_')) return 'AI generation';
  if (name.includes('post')) return 'Posts';
  if (name.includes('competitor')) return 'Competitors';
  if (name.includes('trend') || name.includes('hashtag')) return 'Trends';
  if (name.includes('analytics') || name.includes('metric')) return 'Analytics';
  return 'Other';
}
