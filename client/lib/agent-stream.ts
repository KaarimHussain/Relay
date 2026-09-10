import type { Attachment } from './agent-storage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export type AgentEvent =
  | { type: 'content_delta'; text: string }
  | { type: 'reasoning_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: string }
  | { type: 'tool_result'; id: string; name: string; result: unknown; error?: string }
  | {
      type: 'approval_required';
      approvalId: string;
      toolCallId: string;
      name: string;
      args: string;
      summary: string;
    }
  | { type: 'done'; finishReason?: string }
  | { type: 'error'; message: string };

export type AgentToolCallPayload = {
  id: string;
  name: string;
  args: string;
  result?: unknown;
  error?: string;
};

export type AgentMessagePayload = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  toolCalls?: AgentToolCallPayload[];
};

export async function* streamAgentChat(
  messages: AgentMessagePayload[],
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('relay_token') : null;

  const res = await fetch(`${BASE_URL}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Agent request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err?.message ?? message;
    } catch {}
    yield { type: 'error', message };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIdx: number;
    while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        yield JSON.parse(payload) as AgentEvent;
      } catch {
        // ignore bad chunk
      }
    }
  }
}

export async function* streamAgentApproval(
  approvalId: string,
  decision: 'approve' | 'reject',
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('relay_token') : null;
  const res = await fetch(`${BASE_URL}/agent/approvals/${approvalId}/${decision}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', message: `Approval request failed (${res.status})` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx: number;
    while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const payload = raw.trim().replace(/^data:\s*/, '');
      if (!payload) continue;
      try {
        yield JSON.parse(payload) as AgentEvent;
      } catch {
        // Ignore malformed SSE events.
      }
    }
  }
}
