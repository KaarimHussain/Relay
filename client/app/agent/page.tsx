'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  conversationsStore,
  titleFromFirstMessage,
  type Attachment,
  type Conversation,
  type Message,
  type ToolCall,
} from '@/lib/agent-storage';
import { streamAgentChat, type AgentMessagePayload } from '@/lib/agent-stream';
import { Markdown } from '@/components/agent/Markdown';

const SUGGESTIONS = [
  'What brands do I have?',
  'Summarize new comments today',
  'Draft 3 caption ideas for a launch post',
  'Turn on AI replies for my main brand',
];

const ACCEPT = 'image/*,.pdf,.txt,.md,.markdown,.json,.csv,.doc,.docx';

export default function AgentPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [pending, setPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loaded = conversationsStore.load();
    setConversations(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const messages = active?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, pending]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  const persist = useCallback((next: Conversation) => {
    conversationsStore.upsert(next);
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== next.id);
      return [next, ...filtered];
    });
  }, []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setInput('');
    setPendingFiles([]);
    textareaRef.current?.focus();
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      conversationsStore.remove(id);
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
    },
    [conversations, activeId],
  );

  const filesToAttachments = async (files: File[]): Promise<Attachment[]> => {
    const out: Attachment[] = [];
    for (const f of files) {
      const isImage = f.type.startsWith('image/');
      let dataUrl: string | undefined;
      if (isImage && f.size < 4 * 1024 * 1024) {
        dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(f);
        });
      }
      out.push({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        dataUrl,
      });
    }
    return out;
  };

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const next = await filesToAttachments(files);
    setPendingFiles((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;
    const next = await filesToAttachments(files);
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && pendingFiles.length === 0) || pending) return;

    const now = Date.now();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      attachments: pendingFiles.length ? pendingFiles : undefined,
      createdAt: now,
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      reasoning: '',
      toolCalls: [],
      createdAt: now + 1,
    };

    let conv: Conversation;
    if (active) {
      conv = {
        ...active,
        messages: [...active.messages, userMsg, assistantMsg],
        updatedAt: now,
      };
    } else {
      conv = {
        id: crypto.randomUUID(),
        title: titleFromFirstMessage(
          trimmed || pendingFiles[0]?.name || 'New chat',
        ),
        messages: [userMsg, assistantMsg],
        createdAt: now,
        updatedAt: now,
      };
      setActiveId(conv.id);
    }
    persist(conv);
    setInput('');
    setPendingFiles([]);
    setPending(true);

    const priorMessages: AgentMessagePayload[] = conv.messages
      .filter((m) => m.id !== assistantMsg.id)
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

    const controller = new AbortController();
    abortRef.current = controller;

    const updateAssistant = (updater: (m: Message) => Message) => {
      conv = {
        ...conv,
        messages: conv.messages.map((m) =>
          m.id === assistantMsg.id ? updater(m) : m,
        ),
        updatedAt: Date.now(),
      };
      persist(conv);
    };

    try {
      for await (const ev of streamAgentChat(priorMessages, controller.signal)) {
        if (ev.type === 'content_delta') {
          updateAssistant((m) => ({ ...m, content: m.content + ev.text }));
        } else if (ev.type === 'reasoning_delta') {
          updateAssistant((m) => ({
            ...m,
            reasoning: (m.reasoning ?? '') + ev.text,
          }));
        } else if (ev.type === 'tool_call') {
          updateAssistant((m) => ({
            ...m,
            toolCalls: [
              ...(m.toolCalls ?? []),
              {
                id: ev.id,
                name: ev.name,
                args: ev.args,
                status: 'running',
              } as ToolCall,
            ],
          }));
        } else if (ev.type === 'tool_result') {
          updateAssistant((m) => ({
            ...m,
            toolCalls: (m.toolCalls ?? []).map((tc) =>
              tc.id === ev.id
                ? {
                    ...tc,
                    result: ev.result,
                    error: ev.error,
                    status: ev.error ? 'error' : 'done',
                  }
                : tc,
            ),
          }));
        } else if (ev.type === 'error') {
          updateAssistant((m) => ({
            ...m,
            content:
              m.content ||
              `Something went wrong: ${ev.message}. Try again in a moment.`,
          }));
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        updateAssistant((m) => ({
          ...m,
          content: m.content || `Connection error: ${e?.message ?? 'unknown'}`,
        }));
      }
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <div className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-4">
        <div className="text-xs font-medium text-gray-400 truncate max-w-[40%]">
          {active?.title ?? 'New chat'}
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton onClick={() => setHistoryOpen((v) => !v)} label="History">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </IconButton>
          <IconButton onClick={newChat} label="New chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </IconButton>
        </div>
      </div>

      {historyOpen && (
        <HistoryPanel
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setHistoryOpen(false);
          }}
          onDelete={deleteChat}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-12">
        <div className="max-w-2xl mx-auto w-full px-5">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <RelayGlyph size={18} />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">How can I help?</h1>
              <p className="text-xs text-gray-500 mt-1">
                Schedule, draft, or triage — just ask.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-6 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="text-left text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-6">
              {messages.map((m) => (
                <MessageView key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full">
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto w-full px-5 pt-2 pb-24">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingFiles.map((a) => (
                <AttachmentChip
                  key={a.id}
                  a={a}
                  onRemove={() =>
                    setPendingFiles((prev) => prev.filter((x) => x.id !== a.id))
                  }
                />
              ))}
            </div>
          )}
          <div
            className="flex items-end gap-1.5 rounded-2xl bg-white p-1.5 transition-all focus-within:border-primary/40"
            style={{
              border: '1px solid rgba(209, 213, 219, 0.9)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-clay-secondary shrink-0 h-8 w-8"
              style={{ borderRadius: '0.625rem', padding: 0 }}
              aria-label="Attach files"
              title="Attach images or files"
              disabled={pending}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={onPickFiles}
              className="hidden"
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Relay agent…"
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 outline-none px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 max-h-[180px]"
              disabled={pending}
            />
            {pending ? (
              <button
                type="button"
                onClick={stop}
                className="btn-clay-secondary shrink-0 h-8 w-8"
                style={{ borderRadius: '0.625rem', padding: 0 }}
                aria-label="Stop"
                title="Stop"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && pendingFiles.length === 0}
                className="btn-clay-primary shrink-0 h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderRadius: '0.625rem', padding: 0 }}
                aria-label="Send"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg">
          <div className="text-sm font-medium text-primary">Drop files to attach</div>
        </div>
      )}
    </div>
  );
}

/* ─────────── subcomponents ─────────── */

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="btn-clay-secondary h-7 w-7 text-gray-600"
      style={{ borderRadius: '0.5rem', padding: 0 }}
    >
      {children}
    </button>
  );
}

function HistoryPanel({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-11 right-4 z-50 w-64 rounded-xl bg-white overflow-hidden"
        style={{
          border: '1px solid rgba(209,213,219,0.9)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,1), 0 8px 24px rgba(0,0,0,0.10)',
        }}
      >
        <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
          Recent chats
        </div>
        <div className="max-h-80 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-xs text-gray-400 text-center">
              No chats yet
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 ${
                  c.id === activeId ? 'bg-primary/5' : ''
                }`}
                onClick={() => onSelect(c.id)}
              >
                <span className="flex-1 truncate text-gray-800">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  aria-label="Delete chat"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function MessageView({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] flex flex-col items-end gap-1.5">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} a={a} />
              ))}
            </div>
          )}
          {message.content && (
            <div
              className="btn-clay-primary text-sm whitespace-pre-wrap"
              style={{
                borderRadius: '1rem 1rem 0.375rem 1rem',
                padding: '0.5rem 0.85rem',
                display: 'inline-block',
                cursor: 'default',
                textAlign: 'left',
                fontWeight: 500,
              }}
            >
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasThoughts =
    (message.reasoning && message.reasoning.length > 0) ||
    (message.toolCalls && message.toolCalls.length > 0);
  const isStreaming = !message.content && !hasThoughts;

  return (
    <div className="flex flex-col gap-2">
      {hasThoughts && (
        <ThoughtsBlock
          reasoning={message.reasoning}
          toolCalls={message.toolCalls}
        />
      )}
      {isStreaming ? (
        <ThinkingIndicator />
      ) : (
        <Markdown text={message.content} />
      )}
    </div>
  );
}

function ThoughtsBlock({
  reasoning,
  toolCalls,
}: {
  reasoning?: string;
  toolCalls?: ToolCall[];
}) {
  const [open, setOpen] = useState(false);
  const running = toolCalls?.some((t) => t.status === 'running');
  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium">
          {running ? 'Thinking…' : 'Thoughts'}
        </span>
      </button>
      {open && (
        <div className="mt-1.5 pl-3 border-l-2 border-gray-200 flex flex-col gap-1.5">
          {toolCalls && toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {toolCalls.map((tc) => (
                <ToolChip key={tc.id} tc={tc} />
              ))}
            </div>
          )}
          {reasoning && (
            <div className="text-gray-500 whitespace-pre-wrap leading-relaxed">
              {reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolChip({ tc }: { tc: ToolCall }) {
  const color =
    tc.status === 'error'
      ? 'text-red-600 border-red-200'
      : tc.status === 'running'
        ? 'text-primary border-primary/30'
        : 'text-gray-600 border-gray-200';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border bg-white ${color}`}
      title={tc.args}
    >
      {tc.status === 'running' && (
        <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
      )}
      {tc.name}
    </span>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" />
      </span>
      <span className="italic">Thinking…</span>
    </div>
  );
}

function AttachmentChip({
  a,
  onRemove,
}: {
  a: Attachment;
  onRemove?: () => void;
}) {
  const isImage = a.type.startsWith('image/') && a.dataUrl;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg bg-white pl-1.5 pr-2 py-1 text-[11px] text-gray-700 max-w-[220px]"
      style={{
        border: '1px solid rgba(209,213,219,0.9)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.dataUrl} alt={a.name} className="w-5 h-5 rounded object-cover" />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      <span className="truncate">{a.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-700"
          aria-label="Remove attachment"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function RelayGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none">
      <path
        d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z"
        fill="#F97316"
      />
    </svg>
  );
}
