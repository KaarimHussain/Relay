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
import {
  streamAgentApproval,
  streamAgentChat,
  type AgentMessagePayload,
} from '@/lib/agent-stream';
import { Markdown } from '@/components/agent/Markdown';
import { api } from '@/lib/api';
import { AgentSwitch } from '@/components/agent/AgentSwitch';

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
  const [approvalPending, setApprovalPending] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConversationRef = useRef<Conversation | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const localConversations = conversationsStore.load();
      try {
        let loaded = await api.get<Conversation[]>('/agent/conversations');
        if (loaded.length === 0 && localConversations.length > 0) {
          await Promise.all(
            localConversations.map((conversation) =>
              api.put(`/agent/conversations/${conversation.id}`, conversation),
            ),
          );
          conversationsStore.clear();
          loaded = localConversations;
        }
        if (!active) return;
        setConversations(loaded);
        if (loaded.length > 0) setActiveId(loaded[0].id);
      } catch {
        // Keep legacy browser history as an offline fallback only.
        if (!active) return;
        setConversations(localConversations);
        if (localConversations.length > 0) setActiveId(localConversations[0].id);
      }
    };
    void load();
    return () => {
      active = false;
    };
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
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== next.id);
      return [next, ...filtered];
    });
    latestConversationRef.current = next;
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      const snapshot = latestConversationRef.current;
      if (!snapshot) return;
      try {
        await api.put(`/agent/conversations/${snapshot.id}`, snapshot);
      } catch {
        conversationsStore.upsert(snapshot);
      }
      if (latestConversationRef.current !== snapshot) {
        const latest = latestConversationRef.current;
        if (latest) {
          try {
            await api.put(`/agent/conversations/${latest.id}`, latest);
          } catch {
            conversationsStore.upsert(latest);
          }
        }
      }
    }, 400);
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
      void api.delete(`/agent/conversations/${id}`).catch(() => undefined);
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
        toolCalls: m.toolCalls
          ?.filter((tc) => tc.status !== 'running')
          .map((tc) => ({
            id: tc.id,
            name: tc.name,
            args: tc.args,
            result: tc.result,
            error: tc.error,
          })),
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
        } else if (ev.type === 'approval_required') {
          updateAssistant((m) => ({
            ...m,
            toolCalls: (m.toolCalls ?? []).map((tc) =>
              tc.id === ev.toolCallId
                ? {
                    ...tc,
                    status: 'awaiting_approval',
                    approval: { id: ev.approvalId, summary: ev.summary },
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

  const resolveApproval = async (
    sourceMessageId: string,
    sourceToolCall: ToolCall,
    decision: 'approve' | 'reject',
  ) => {
    const approval = sourceToolCall.approval;
    if (!approval || !active || approvalPending) return;

    const now = Date.now();
    const resumedToolCall: ToolCall = {
      ...sourceToolCall,
      status: 'running',
      approval: undefined,
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      reasoning: '',
      toolCalls: [resumedToolCall],
      createdAt: now,
    };
    let conv: Conversation = {
      ...active,
      updatedAt: now,
      messages: [
        ...active.messages.map<Message>((message) =>
          message.id === sourceMessageId
            ? {
                ...message,
                toolCalls: (message.toolCalls ?? []).map<ToolCall>((toolCall) =>
                  toolCall.id === sourceToolCall.id
                    ? {
                        ...toolCall,
                        status: decision === 'approve' ? 'approved' : 'rejected',
                      }
                    : toolCall,
                ),
              }
            : message,
        ),
        assistantMsg,
      ],
    };
    persist(conv);
    setApprovalPending(approval.id);

    const updateAssistant = (updater: (message: Message) => Message) => {
      conv = {
        ...conv,
        updatedAt: Date.now(),
        messages: conv.messages.map((message) =>
          message.id === assistantMsg.id ? updater(message) : message,
        ),
      };
      persist(conv);
    };

    try {
      for await (const ev of streamAgentApproval(approval.id, decision)) {
        if (ev.type === 'content_delta') {
          updateAssistant((message) => ({
            ...message,
            content: message.content + ev.text,
          }));
        } else if (ev.type === 'reasoning_delta') {
          updateAssistant((message) => ({
            ...message,
            reasoning: (message.reasoning ?? '') + ev.text,
          }));
        } else if (ev.type === 'tool_call') {
          updateAssistant((message) => ({
            ...message,
            toolCalls: [
              ...(message.toolCalls ?? []),
              { id: ev.id, name: ev.name, args: ev.args, status: 'running' },
            ],
          }));
        } else if (ev.type === 'tool_result') {
          updateAssistant((message) => ({
            ...message,
            toolCalls: (message.toolCalls ?? []).map((toolCall) =>
              toolCall.id === ev.id
                ? {
                    ...toolCall,
                    result: ev.result,
                    error: ev.error,
                    status: ev.error ? 'error' : 'done',
                  }
                : toolCall,
            ),
          }));
        } else if (ev.type === 'approval_required') {
          updateAssistant((message) => ({
            ...message,
            toolCalls: (message.toolCalls ?? []).map((toolCall) =>
              toolCall.id === ev.toolCallId
                ? {
                    ...toolCall,
                    status: 'awaiting_approval',
                    approval: { id: ev.approvalId, summary: ev.summary },
                  }
                : toolCall,
            ),
          }));
        } else if (ev.type === 'error') {
          updateAssistant((message) => ({
            ...message,
            content: message.content || `Something went wrong: ${ev.message}`,
          }));
        }
      }
    } finally {
      setApprovalPending(null);
    }
  };

  const stop = () => abortRef.current?.abort();

  const copyAll = async () => {
    if (messages.length === 0) return;
    const text = messages
      .filter((m) => m.content)
      .map((m) => `${m.role === 'user' ? 'You' : 'Relay Agent'}: ${m.content}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
  };

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
    <div className="flex h-full w-full">
      <AgentConversationSidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onNew={newChat}
        onSelect={setActiveId}
        onDelete={deleteChat}
      />
    <div
      className="flex flex-1 min-w-0 flex-col h-full relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <div className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2 max-w-[55%]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div className="text-xs font-medium text-gray-500 truncate">
            {active?.title ?? 'New chat'}
          </div>
          <span className="hidden sm:inline shrink-0 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
            Approval-safe
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AgentSwitch />
          {!isEmpty && (
            <CopyIconButton onCopy={copyAll} label="Copy conversation" />
          )}
        </div>
      </div>

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
                <MessageView
                  key={m.id}
                  message={m}
                  approvalPending={approvalPending}
                  onResolveApproval={(toolCall, decision) =>
                    void resolveApproval(m.id, toolCall, decision)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full">
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto w-full px-5 pt-2 pb-6">
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
    </div>
  );
}

/* ─────────── subcomponents ─────────── */

function CopyIconButton({
  onCopy,
  label,
  className,
}: {
  onCopy: () => Promise<void>;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handle}
      aria-label={copied ? 'Copied!' : label}
      title={copied ? 'Copied!' : label}
      className={`h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all ${className ?? ''}`}
    >
      {copied ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

function AgentConversationSidebar({
  conversations,
  activeId,
  collapsed,
  onToggle,
  onNew,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className={`hidden md:flex shrink-0 flex-col border-r border-gray-200 bg-gray-50/70 transition-[width,padding] duration-200 ${collapsed ? 'w-12 p-2' : 'w-64 p-3'}`}>
      <div className={`flex items-center gap-2 px-1 ${collapsed ? 'mb-2 justify-center' : 'mb-4'}`}>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <RelayGlyph size={13} />
        </div>
        {!collapsed && <span className="flex-1 text-sm font-semibold text-gray-900">Relay Agent</span>}
        {!collapsed && <SidebarToggle collapsed={false} onToggle={onToggle} />}
      </div>
      {!collapsed && <button
        type="button"
        onClick={onNew}
        className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-primary/40 hover:bg-primary/5"
      >
        <span className="text-base leading-none">+</span> New chat
      </button>}
      {!collapsed && <>
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Chats</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-1 py-4 text-xs text-gray-400">Your saved chats will appear here.</p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group mb-0.5 flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors ${
                conversation.id === activeId
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="min-w-0 flex-1 truncate text-left"
                title={conversation.title}
              >
                {conversation.title}
              </button>
              <button
                type="button"
                onClick={() => onDelete(conversation.id)}
                className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                aria-label={`Delete ${conversation.title}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      </>}
      {collapsed && <div className="flex-1" />}
      {collapsed && <div className="flex justify-center pt-2"><SidebarToggle collapsed onToggle={onToggle} /></div>}
    </aside>
  );
}

function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white hover:text-gray-700"
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
      </svg>
    </button>
  );
}

function MessageView({
  message,
  approvalPending,
  onResolveApproval,
}: {
  message: Message;
  approvalPending: string | null;
  onResolveApproval: (toolCall: ToolCall, decision: 'approve' | 'reject') => void;
}) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <div className="group flex justify-end items-end gap-2">
        {message.content && (
          <CopyIconButton
            onCopy={async () => navigator.clipboard.writeText(message.content)}
            label="Copy message"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-0.5"
          />
        )}
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

  const hasReasoning = Boolean(message.reasoning && message.reasoning.length > 0);
  const hasActions = Boolean(message.toolCalls && message.toolCalls.length > 0);
  const isStreaming = !message.content && !hasReasoning && !hasActions;

  return (
    <div className="group flex flex-col gap-2">
      {hasReasoning && <ReasoningBlock reasoning={message.reasoning!} />}
      {hasActions && (
        <ActionsBlock
          toolCalls={message.toolCalls!}
          approvalPending={approvalPending}
          onResolveApproval={onResolveApproval}
        />
      )}
      {isStreaming ? (
        <ThinkingIndicator />
      ) : (
        <>
          <Markdown text={message.content} />
          {message.content && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyIconButton
                onCopy={async () => navigator.clipboard.writeText(message.content)}
                label="Copy response"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium">Reasoning</span>
      </button>
      {open && (
        <div className="mt-1.5 pl-3 border-l-2 border-gray-200 text-gray-500 whitespace-pre-wrap leading-relaxed">
          {reasoning}
        </div>
      )}
    </div>
  );
}

function ActionsBlock({
  toolCalls,
  approvalPending,
  onResolveApproval,
}: {
  toolCalls: ToolCall[];
  approvalPending: string | null;
  onResolveApproval: (toolCall: ToolCall, decision: 'approve' | 'reject') => void;
}) {
  const [open, setOpen] = useState(false);
  const running = toolCalls.some((toolCall) => toolCall.status === 'running');
  const receipts = toolCalls.filter(
    (toolCall) =>
      toolCall.status === 'running' ||
      toolCall.status === 'done' ||
      toolCall.status === 'error',
  );
  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium">{running ? 'Working…' : 'Actions'}</span>
      </button>
      {(open || receipts.length > 0 || toolCalls.some((toolCall) => toolCall.status === 'awaiting_approval')) && (
        <div className="mt-1.5 pl-3 border-l-2 border-gray-200 flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            {receipts.map((toolCall) => (
              <ActionResultCard key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
          {open && (
            <div className="flex flex-wrap gap-1">
              {toolCalls.map((toolCall) => <ToolChip key={toolCall.id} tc={toolCall} />)}
            </div>
          )}
          {toolCalls
            .filter((toolCall) => toolCall.status === 'awaiting_approval' && toolCall.approval)
            .map((toolCall) => (
              <ApprovalCard
                key={toolCall.id}
                toolCall={toolCall}
                busy={approvalPending === toolCall.approval!.id}
                onResolve={onResolveApproval}
              />
            ))}
        </div>
      )}
    </div>
  );
}

type ActionReceipt = {
  title: string;
  detail: string;
  href?: string;
  linkLabel?: string;
};

function ActionResultCard({ toolCall }: { toolCall: ToolCall }) {
  const campaignPlan = toolCall.name === 'create_campaign_plan' && toolCall.status === 'done'
    ? readRecord(toolCall.result)
    : undefined;
  if (campaignPlan?.id) return <CampaignPlanCard initialPlan={campaignPlan} />;

  const receipt = describeAction(toolCall);
  const isError = toolCall.status === 'error';
  const isRunning = toolCall.status === 'running';
  return (
    <div
      className={`max-w-md rounded-lg border px-3 py-2 text-xs ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : isRunning
            ? 'border-primary/20 bg-primary/5 text-gray-700'
            : 'border-gray-200 bg-white text-gray-700'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            isError ? 'bg-red-100 text-red-600' : isRunning ? 'bg-primary/15 text-primary' : 'bg-green-100 text-green-600'
          }`}
        >
          {isError ? '!' : isRunning ? '…' : '✓'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{receipt.title}</p>
          <p className="mt-0.5 leading-relaxed text-gray-500">{receipt.detail}</p>
          {receipt.href && (
            <a href={receipt.href} className="mt-1.5 inline-block text-[11px] font-semibold text-primary hover:underline">
              {receipt.linkLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignPlanCard({ initialPlan }: { initialPlan: Record<string, unknown> }) {
  const planId = readString(initialPlan.id);
  const [plan, setPlan] = useState(initialPlan);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!planId) return;
    void api.get<Record<string, unknown>>(`/campaign-plans/${planId}`)
      .then((latest) => setPlan(latest))
      .catch(() => undefined);
  }, [planId]);

  const posts = Array.isArray(plan.posts)
    ? plan.posts.map(readRecord).filter((post): post is Record<string, unknown> => Boolean(post))
    : [];
  const status = readString(plan.status) ?? 'Pending';
  const scheduledCount = posts.filter((post) => Boolean(readString(post.scheduledAt))).length;
  const isPending = status === 'Pending';
  const isCompleted = status === 'Completed';

  const approve = async () => {
    if (!planId || !isPending || approving) return;
    setApproving(true);
    try {
      const executed = await api.post<Record<string, unknown>>(`/campaign-plans/${planId}/approve`);
      setPlan(executed);
    } catch (error: any) {
      setPlan((current) => ({ ...current, status: 'Failed', error: error?.message ?? 'Campaign execution failed' }));
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="max-w-md rounded-xl border border-primary/20 bg-white p-3 text-xs shadow-sm">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold ${isCompleted ? 'bg-green-100 text-green-600' : status === 'Failed' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
          {isCompleted ? '✓' : status === 'Failed' ? '!' : '✦'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{isCompleted ? 'Campaign created' : status === 'Failed' ? 'Campaign needs attention' : 'Campaign plan ready'}</p>
          <p className="mt-0.5 text-gray-500">{readString(plan.name) ?? 'Untitled campaign'} · {posts.length} post{posts.length === 1 ? '' : 's'}{scheduledCount ? ` · ${scheduledCount} scheduled` : ''}</p>
          {readString(plan.objective) && <p className="mt-1.5 leading-relaxed text-gray-600">{readString(plan.objective)}</p>}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5">
        {posts.map((post, index) => {
          const scheduledAt = readString(post.scheduledAt);
          return (
            <div key={`${readString(post.title) ?? 'post'}-${index}`} className="rounded-md bg-gray-50 px-2 py-1.5">
              <p className="truncate font-medium text-gray-700">{index + 1}. {readString(post.title) ?? 'Untitled post'}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{scheduledAt ? `Schedule: ${formatTimestamp(scheduledAt)}` : 'Create as draft'}</p>
            </div>
          );
        })}
      </div>

      {isPending && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">Nothing will be created until you approve.</p>
          <button type="button" onClick={() => void approve()} disabled={approving} className="btn-clay-primary h-7 shrink-0 px-2.5 text-[11px] disabled:opacity-50">
            {approving ? 'Creating…' : 'Approve & create'}
          </button>
        </div>
      )}
      {isCompleted && <a href="/queue" className="mt-3 inline-block text-[11px] font-semibold text-primary hover:underline">View post queue</a>}
      {status === 'Failed' && <p className="mt-3 text-[11px] text-red-600">{readString(plan.error) ?? 'Relay could not create this campaign.'}</p>}
    </div>
  );
}

function describeAction(toolCall: ToolCall): ActionReceipt {
  const args = readJsonObject(toolCall.args);
  const result = readRecord(toolCall.result);
  const failed = toolCall.status === 'error';
  if (failed) {
    return {
      title: `Couldn’t ${humanizeToolName(toolCall.name)}`,
      detail: toolCall.error ?? 'Relay could not complete this action.',
    };
  }
  if (toolCall.status === 'running') {
    return {
      title: `${capitalize(humanizeToolName(toolCall.name))}…`,
      detail: 'Relay is working on this now.',
    };
  }

  const postTitle = readString(result?.title) ?? readString(args.title);
  const postId = readString(result?.id) ?? readString(args.postId);
  const platforms = platformsFromResult(result);
  if (toolCall.name === 'create_post') {
    return {
      title: 'Draft created',
      detail: postTitle ? `“${postTitle}” is ready to review.` : 'Your post draft is ready to review.',
      href: postId ? `/posts/${postId}/edit` : undefined,
      linkLabel: postId ? 'Open draft' : undefined,
    };
  }
  if (toolCall.name === 'schedule_post') {
    const scheduledAt = readString(args.scheduledAt) ?? readString(result?.scheduledAt);
    return {
      title: 'Post scheduled',
      detail: scheduledAt
        ? `${postTitle ? `“${postTitle}” is ` : ''}scheduled for ${formatTimestamp(scheduledAt)}${platforms ? ` on ${platforms}` : ''}.`
        : 'The post is scheduled.',
      href: '/queue',
      linkLabel: 'View queue',
    };
  }
  if (toolCall.name === 'publish_post_now') {
    return {
      title: result?.status === 'Published' ? 'Post published' : 'Publishing completed',
      detail: `${postTitle ? `“${postTitle}” ` : 'Your post '}${platforms ? `was sent to ${platforms}.` : 'was sent to its selected accounts.'}`,
      href: '/queue',
      linkLabel: 'View post status',
    };
  }
  if (toolCall.name === 'retry_failed_post') {
    return {
      title: result?.status === 'Published' ? 'Failed destinations recovered' : 'Retry completed',
      detail: 'Relay retried only the destinations that failed. Anything already published was left untouched.',
      href: '/queue',
      linkLabel: 'View post status',
    };
  }
  if (toolCall.name === 'list_connected_accounts' || toolCall.name === 'list_brands') {
    const items = Array.isArray(toolCall.result) ? toolCall.result : [];
    const noun = toolCall.name === 'list_brands' ? 'brand' : 'connected account';
    return {
      title: `${items.length} ${noun}${items.length === 1 ? '' : 's'} found`,
      detail: items.length ? 'Relay can use these details for the next step.' : `No ${noun}s are available yet.`,
    };
  }
  if (toolCall.name === 'reply_to_comment') {
    return { title: 'Reply sent', detail: 'Your reply was posted to the conversation.' };
  }
  return {
    title: `${capitalize(humanizeToolName(toolCall.name))} completed`,
    detail: 'Relay completed this action successfully.',
  };
}

function readJsonObject(value: string): Record<string, unknown> {
  try {
    return readRecord(JSON.parse(value)) ?? {};
  } catch {
    return {};
  }
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function platformsFromResult(result?: Record<string, unknown>): string | undefined {
  const targets = result?.targets;
  if (!Array.isArray(targets)) return undefined;
  const platforms = targets
    .map((target) => readRecord(target))
    .map((target) => readRecord(target?.account)?.platform)
    .filter((platform): platform is string => typeof platform === 'string');
  return [...new Set(platforms)].join(', ') || undefined;
}

function humanizeToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/^(list|get|create|update|publish|schedule|sync) /, '$1 ');
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function ToolChip({ tc }: { tc: ToolCall }) {
  const color =
    tc.status === 'error'
      ? 'text-red-600 border-red-200'
      : tc.status === 'awaiting_approval'
        ? 'text-amber-700 border-amber-200'
      : tc.status === 'running'
        ? 'text-primary border-primary/30'
        : 'text-gray-600 border-gray-200';
  const title = tc.error
    ? `${tc.name} failed: ${tc.error}\n\nArguments: ${tc.args}`
    : tc.args;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border bg-white ${color}`}
      title={title}
    >
      {tc.status === 'running' && (
        <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
      )}
      {tc.name}
    </span>
  );
}

function ApprovalCard({
  toolCall,
  busy,
  onResolve,
}: {
  toolCall: ToolCall;
  busy: boolean;
  onResolve: (toolCall: ToolCall, decision: 'approve' | 'reject') => void;
}) {
  const approval = toolCall.approval!;
  return (
    <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-gray-700">
      <div className="font-semibold text-gray-900">Approval required</div>
      <p className="mt-1 leading-relaxed">{approval.summary}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onResolve(toolCall, 'approve')}
          className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onResolve(toolCall, 'reject')}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
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
