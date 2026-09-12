'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCheck, Filter, Inbox, MessageCircle, MoreHorizontal, Search, Send, Sparkles } from 'lucide-react';
import { useBrandStore } from '@/store/brand';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Channel = 'FacebookMessenger' | 'InstagramDirect' | 'LinkedInMessaging';
type Conversation = { id: string; channel: Channel; participantName?: string | null; lastMessagePreview?: string | null; lastMessageAt: string; unreadCount: number; status: string; messages?: Message[] };
type Message = { id: string; direction: 'Inbound' | 'Outbound'; text: string; createdAt: string; sentByAutomation?: boolean };

const channelMeta: Record<Channel, { label: string; dot: string }> = {
  FacebookMessenger: { label: 'Messenger', dot: 'bg-blue-500' },
  InstagramDirect: { label: 'Instagram', dot: 'bg-pink-500' },
  LinkedInMessaging: { label: 'LinkedIn', dot: 'bg-blue-700' },
};

export function InboxView() {
  const brand = useBrandStore((s) => s.activeBrand());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | Channel>('all');
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!brand) return;
    api.get<Conversation[]>(`/brands/${brand.id}/inbox/conversations`).then((items) => {
      setConversations(items);
      setActiveId(items[0]?.id ?? null);
    }).catch(() => setConversations([]));
  }, [brand?.id]);

  const visible = useMemo(() => conversations.filter((item) => {
    const matchesFilter = filter === 'all' || (filter === 'unread' ? item.unreadCount > 0 : item.channel === filter);
    const text = `${item.participantName ?? ''} ${item.lastMessagePreview ?? ''}`.toLowerCase();
    return matchesFilter && text.includes(query.toLowerCase());
  }), [conversations, filter, query]);
  const active = conversations.find((item) => item.id === activeId) ?? null;
  const unread = conversations.reduce((total, item) => total + item.unreadCount, 0);

  if (!brand) return <div className="py-24 text-center text-sm text-gray-400">Select a brand to open its inbox.</div>;

  return <div className="flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
    <header className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 via-white to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">Unified inbox</p><h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">Messages</h1><p className="mt-0.5 text-xs text-gray-500">Human conversations stay in control; automations remain visible.</p></div>
      <div className="flex items-center gap-2"><span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-500">{unread} unread</span><Link href="/accounts" className="btn-clay-secondary h-8 px-3 text-xs">Connect channel</Link></div>
    </header>
    <div className="grid min-h-[620px] flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_220px]">
      <aside className="border-b border-gray-100 bg-gray-50/70 lg:border-b-0 lg:border-r">
        <div className="p-3"><div className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3"><Search size={14} className="text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages…" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" /></div></div>
        <div className="flex gap-1 overflow-x-auto border-y border-gray-100 px-3 py-2 lg:flex-wrap">{([{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'FacebookMessenger', label: 'Messenger' }, { key: 'InstagramDirect', label: 'Instagram' }] as const).map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={cn('rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors', filter === item.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-white')}>{item.label}</button>)}</div>
        <div className="divide-y divide-gray-100">{visible.length ? visible.map((item) => <button key={item.id} onClick={() => setActiveId(item.id)} className={cn('flex w-full gap-2.5 px-3 py-3 text-left transition-colors', active?.id === item.id ? 'bg-orange-50/70' : 'hover:bg-white')}><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{item.participantName?.[0]?.toUpperCase() ?? '?'}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-gray-800">{item.participantName ?? 'Customer'}</p>{item.unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-orange-500" />}</div><p className="mt-0.5 truncate text-[11px] text-gray-500">{item.lastMessagePreview ?? 'No messages yet'}</p><span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-400"><span className={cn('h-1.5 w-1.5 rounded-full', channelMeta[item.channel].dot)} />{channelMeta[item.channel].label}</span></div></button>) : <div className="px-6 py-14 text-center"><Inbox size={23} className="mx-auto text-gray-200" /><p className="mt-3 text-xs font-semibold text-gray-600">No conversations yet</p><p className="mt-1 text-[11px] leading-relaxed text-gray-400">Connect Facebook Messenger, then incoming customer messages will appear here.</p></div>}</div>
      </aside>
      <main className="flex min-h-[480px] flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">{active ? <><div className="flex items-center justify-between border-b border-gray-100 px-4 py-3"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{active.participantName?.[0]?.toUpperCase() ?? '?'}</div><div><p className="text-xs font-bold text-gray-900">{active.participantName ?? 'Customer'}</p><p className="text-[10px] text-gray-400">{channelMeta[active.channel].label} · {active.status}</p></div></div><button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><MoreHorizontal size={16} /></button></div><div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/40 p-4">{active.messages?.map((message) => <div key={message.id} className={cn('flex', message.direction === 'Outbound' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed', message.direction === 'Outbound' ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700')}><p>{message.text}</p>{message.sentByAutomation && <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-gray-300"><Bot size={9} /> Automated</span>}</div></div>)}</div><div className="border-t border-gray-100 p-3"><div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white p-1.5 focus-within:border-orange-400"><textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={1} placeholder="Reply to customer…" className="min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-xs outline-none" /><button disabled={!reply.trim()} className="btn-clay-primary flex h-8 w-8 items-center justify-center disabled:opacity-40"><Send size={13} /></button></div><p className="mt-1.5 text-[10px] text-gray-400">Replies are sent through the connected channel and stay within its messaging policy.</p></div></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageCircle size={26} className="text-gray-200" /><p className="mt-3 text-sm font-bold text-gray-700">Choose a conversation</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-400">Customer messages and replies will appear here with their full channel context.</p></div>}</main>
      <aside className="hidden bg-gray-50/50 p-3 lg:block"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reply controls</p><div className="mt-3 rounded-xl border border-gray-200 bg-white p-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Sparkles size={13} /></span><div><p className="text-xs font-bold text-gray-800">Automation</p><p className="text-[10px] text-gray-400">Human review first</p></div></div><p className="mt-2 text-[11px] leading-relaxed text-gray-500">Rules can draft or send a reply only when you explicitly enable them.</p><button className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100">Manage rules</button></div><div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><div className="flex items-center gap-1.5 text-emerald-700"><CheckCheck size={13} /><p className="text-[11px] font-bold">Reply safely</p></div><p className="mt-1 text-[10px] leading-relaxed text-emerald-700">Relay keeps a visible record of every automated and human reply.</p></div></aside>
    </div>
  </div>;
}
