export type Role = 'user' | 'assistant';

export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // for images (preview)
};

export type ToolCall = {
  id: string;
  name: string;
  args: string;
  result?: unknown;
  error?: string;
  approval?: {
    id: string;
    summary: string;
  };
  status: 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'done' | 'error';
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  reasoning?: string; // populated when the model exposes chain-of-thought
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

const KEY = 'relay_agent_conversations';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const conversationsStore = {
  load(): Conversation[] {
    if (typeof window === 'undefined') return [];
    return safeParse<Conversation[]>(localStorage.getItem(KEY), []);
  },
  save(list: Conversation[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(list));
  },
  upsert(conv: Conversation) {
    const list = this.load();
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx >= 0) list[idx] = conv;
    else list.unshift(conv);
    this.save(list);
  },
  remove(id: string) {
    this.save(this.load().filter((c) => c.id !== id));
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY);
  },
};

export function titleFromFirstMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 48 ? t.slice(0, 48) + '…' : t || 'New chat';
}
