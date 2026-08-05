'use client';

import { useState, useRef } from 'react';
import {
  User, Building2, Bell, CreditCard, Users,
  Camera, Check, AlertTriangle, ChevronRight,
  Zap, Shield, Mail, Crown, Pencil, Eye, Trash2,
  UserPlus, Clock, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'brand' | 'notifications' | 'billing' | 'team';

// ─── Shared form primitives ───────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-gray-400">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="input-clay h-10 text-xs md:text-sm px-3.5"
    />
  );
}

function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-orange-50/90 border border-orange-200/80 rounded-2xl shadow-xs">
      <p className="text-xs font-bold text-orange-700">You have unsaved changes</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          className="btn-clay-secondary h-8 px-3.5 text-xs"
        >
          Discard
        </button>
        <button
          onClick={onSave}
          className="btn-clay-primary h-8 px-3.5 text-xs gap-1.5"
        >
          <Check size={14} /> Save changes
        </button>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors shrink-0',
        checked ? 'bg-orange-500' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  );
}

function NotifRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="text-[14px] font-medium text-gray-800">{label}</p>
        <p className="text-[13px] text-gray-400 mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const [name, setName] = useState('Alex Johnson');
  const [email, setEmail] = useState('alex@relay.app');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState({ name, email, bio });
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const dirty = name !== saved.name || email !== saved.email || bio !== saved.bio;

  const save = () => { setSaved({ name, email, bio }); };
  const discard = () => { setName(saved.name); setEmail(saved.email); setBio(saved.bio); };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatar(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar */}
      <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-[22px] font-bold overflow-hidden">
            {avatar
              ? <img src={avatar} alt="" className="w-full h-full object-cover" />
              : name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Camera size={11} className="text-gray-500" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{saved.name}</p>
          <p className="text-[13px] text-gray-400">{saved.email}</p>
          <button onClick={() => fileRef.current?.click()} className="text-[12px] text-orange-500 hover:text-orange-600 mt-1 transition-colors">
            Change photo
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name">
          <TextInput value={name} onChange={setName} placeholder="Your name" />
        </Field>
        <Field label="Email address">
          <TextInput value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
        </Field>
      </div>

      <Field label="Bio" hint="Shown on your public profile. Max 160 characters.">
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, 160))}
          placeholder="Tell us a bit about yourself…"
          rows={3}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors resize-none"
        />
        <p className="text-[11px] text-gray-400 text-right -mt-1">{bio.length}/160</p>
      </Field>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />

      {/* Password section */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-[15px] font-semibold text-gray-900 mb-4">Change password</p>
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Current password">
            <TextInput type="password" placeholder="••••••••" />
          </Field>
          <Field label="New password" hint="Must be at least 8 characters.">
            <TextInput type="password" placeholder="••••••••" />
          </Field>
          <Field label="Confirm new password">
            <TextInput type="password" placeholder="••••••••" />
          </Field>
          <button className="self-start h-9 px-4 text-[13px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">
            Update password
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="pt-4 border-t border-red-100">
        <p className="text-[15px] font-semibold text-gray-900 mb-1">Danger zone</p>
        <p className="text-[13px] text-gray-400 mb-4">Permanently delete your account and all associated data.</p>
        <button className="h-9 px-4 text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2">
          <AlertTriangle size={14} /> Delete account
        </button>
      </div>
    </div>
  );
}

// ─── Brand tab ────────────────────────────────────────────────────────────────

const BRAND_COLORS = [
  { bg: 'bg-indigo-500', hex: '#6366F1' },
  { bg: 'bg-violet-500', hex: '#8B5CF6' },
  { bg: 'bg-sky-500',    hex: '#0EA5E9' },
  { bg: 'bg-emerald-500',hex: '#10B981' },
  { bg: 'bg-amber-500',  hex: '#F59E0B' },
  { bg: 'bg-rose-500',   hex: '#F43F5E' },
  { bg: 'bg-pink-500',   hex: '#EC4899' },
  { bg: 'bg-slate-500',  hex: '#64748B' },
];

function BrandTab() {
  const [name, setName] = useState('Acme Co.');
  const [color, setColor] = useState(BRAND_COLORS[0]);
  const [saved, setSaved] = useState({ name, color });

  const dirty = name !== saved.name || color.hex !== saved.color.hex;
  const save = () => setSaved({ name, color });
  const discard = () => { setName(saved.name); setColor(saved.color); };

  const initials = name.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <div className="flex flex-col gap-6">
      {/* Brand preview */}
      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-white text-[18px] font-bold', color.bg)}>
          {initials}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900">{saved.name}</p>
          <p className="text-[13px] text-gray-400">Active brand · 2 connected accounts</p>
        </div>
      </div>

      {/* Fields */}
      <Field label="Brand name" hint="Used throughout the app and in your team's workspace.">
        <TextInput value={name} onChange={setName} placeholder="e.g. Acme Co." />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-gray-700">Brand color</label>
        <div className="flex items-center gap-2.5">
          {BRAND_COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setColor(c)}
              className={cn('w-8 h-8 rounded-lg transition-all', c.bg,
                color.hex === c.hex ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
              )}
            />
          ))}
        </div>
      </div>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />

      {/* Connected accounts summary */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-semibold text-gray-900">Connected accounts</p>
          <a href="/accounts" className="text-[13px] text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
            Manage <ChevronRight size={13} />
          </a>
        </div>
        {[
          { name: 'Instagram', handle: '@relay', color: 'bg-pink-500' },
          { name: 'LinkedIn',  handle: 'Relay Page', color: 'bg-blue-700' },
        ].map(acc => (
          <div key={acc.name} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold', acc.color)}>
              {acc.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-800">{acc.name}</p>
              <p className="text-[12px] text-gray-400">{acc.handle}</p>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} strokeWidth={2.5} /> Connected
            </span>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="pt-4 border-t border-red-100">
        <p className="text-[15px] font-semibold text-gray-900 mb-1">Danger zone</p>
        <p className="text-[13px] text-gray-400 mb-4">
          Deleting this brand removes all its posts, schedules, and connected accounts. This cannot be undone.
        </p>
        <button className="h-9 px-4 text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2">
          <AlertTriangle size={14} /> Delete brand
        </button>
      </div>
    </div>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    postPublished:   true,
    postFailed:      true,
    weeklyDigest:    true,
    newFollowers:    false,
    aiSuggestions:   true,
    teamActivity:    false,
    billingAlerts:   true,
    productUpdates:  false,
  });

  const set = (key: keyof typeof prefs) => (v: boolean) =>
    setPrefs(p => ({ ...p, [key]: v }));

  return (
    <div className="flex flex-col">
      <div className="pb-4 mb-2 border-b border-gray-100">
        <p className="text-[15px] font-semibold text-gray-900">Email notifications</p>
        <p className="text-[13px] text-gray-400 mt-0.5">Choose which emails you receive from Relay.</p>
      </div>
      <div className="divide-y divide-gray-100">
        <NotifRow label="Post published" description="When a scheduled post goes live successfully." checked={prefs.postPublished} onChange={set('postPublished')} />
        <NotifRow label="Post failed" description="When a post fails to publish — includes retry instructions." checked={prefs.postFailed} onChange={set('postFailed')} />
        <NotifRow label="Weekly digest" description="A summary of your top posts and analytics every Monday." checked={prefs.weeklyDigest} onChange={set('weeklyDigest')} />
        <NotifRow label="New followers milestone" description="When your follower count hits a new milestone." checked={prefs.newFollowers} onChange={set('newFollowers')} />
        <NotifRow label="AI content suggestions" description="Personalized content ideas based on your posting history." checked={prefs.aiSuggestions} onChange={set('aiSuggestions')} />
        <NotifRow label="Team activity" description="When teammates create, edit, or delete posts." checked={prefs.teamActivity} onChange={set('teamActivity')} />
      </div>

      <div className="pt-6 mt-2 border-t border-gray-100">
        <p className="text-[15px] font-semibold text-gray-900 mb-1">System notifications</p>
        <p className="text-[13px] text-gray-400 mb-2">These are always sent and cannot be disabled.</p>
        <div className="divide-y divide-gray-100">
          <NotifRow label="Billing & payment alerts" description="Invoices, payment failures, and subscription changes." checked={prefs.billingAlerts} onChange={set('billingAlerts')} />
          <NotifRow label="Product updates" description="Major new features and important announcements." checked={prefs.productUpdates} onChange={set('productUpdates')} />
        </div>
      </div>
    </div>
  );
}

// ─── Billing tab ──────────────────────────────────────────────────────────────

function BillingTab() {
  const usage = { posts: 38, postsMax: 100, accounts: 2, accountsMax: 5, brands: 1, brandsMax: 1 };

  function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
    const pct = Math.min((used / max) * 100, 100);
    const warn = pct > 80;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-600">{label}</span>
          <span className={cn('text-[12px] font-medium tabular-nums', warn ? 'text-amber-600' : 'text-gray-500')}>
            {used} / {max}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', warn ? 'bg-amber-400' : 'bg-orange-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan card */}
      <div className="flex items-start justify-between p-5 bg-gradient-to-br from-orange-50 to-orange-50 border border-orange-100 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Free plan
            </span>
          </div>
          <p className="text-[22px] font-bold text-gray-900">$0 <span className="text-[14px] font-normal text-gray-400">/ month</span></p>
          <p className="text-[13px] text-gray-500 mt-1">1 brand · 5 accounts · 100 posts/mo</p>
        </div>
        <button className="h-9 px-4 text-[13px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5">
          <Zap size={14} /> Upgrade to Pro
        </button>
      </div>

      {/* Usage */}
      <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-xl">
        <p className="text-[15px] font-semibold text-gray-900">Usage this month</p>
        <UsageBar label="Scheduled posts" used={usage.posts} max={usage.postsMax} />
        <UsageBar label="Connected accounts" used={usage.accounts} max={usage.accountsMax} />
        <UsageBar label="Brands" used={usage.brands} max={usage.brandsMax} />
      </div>

      {/* Pro plan card */}
      <div className="flex items-start justify-between p-5 bg-white border border-gray-200 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} className="text-orange-500" />
            <span className="text-[15px] font-semibold text-gray-900">Pro plan</span>
          </div>
          <p className="text-[22px] font-bold text-gray-900">$29 <span className="text-[14px] font-normal text-gray-400">/ month</span></p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {[
              'Unlimited brands & accounts',
              'Unlimited scheduled posts',
              'Advanced analytics & exports',
              'AI caption generation (500/mo)',
              'Team collaboration (up to 5 seats)',
              'Priority support',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-gray-600">
                <Check size={13} className="text-orange-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <button className="shrink-0 h-9 px-4 text-[13px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">
          Upgrade now
        </button>
      </div>

      {/* Billing info */}
      <div className="p-5 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-semibold text-gray-900">Billing information</p>
          <button className="text-[13px] text-orange-500 hover:text-orange-600 transition-colors">Edit</button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-9 h-6 bg-gray-200 rounded flex items-center justify-center">
            <CreditCard size={14} className="text-gray-400" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-700">No payment method added</p>
            <p className="text-[12px] text-gray-400">Add a card to upgrade your plan</p>
          </div>
          <button className="ml-auto text-[12px] font-medium text-orange-600 hover:text-orange-700 transition-colors">
            Add card
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 text-[12px] text-gray-400">
        <Shield size={13} />
        Payments are processed securely via Stripe. Relay never stores your card details.
      </div>
    </div>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string; // initials
  color: string;
  joinedAt: string;
  status: 'active' | 'pending';
}

const ROLE_CONFIG: Record<Role, { label: string; desc: string; icon: typeof Crown; color: string }> = {
  owner:  { label: 'Owner',  desc: 'Full access including billing and brand deletion', icon: Crown,  color: 'text-amber-600 bg-amber-50 border-amber-200'   },
  admin:  { label: 'Admin',  desc: 'All content access plus team management',          icon: Shield, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  editor: { label: 'Editor', desc: 'Create, edit, and schedule posts',                 icon: Pencil, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  viewer: { label: 'Viewer', desc: 'Read-only access to posts and analytics',          icon: Eye,    color: 'text-gray-600 bg-gray-100 border-gray-200'      },
};

const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Alex Johnson',  email: 'alex@relay.app',   role: 'owner',  avatar: 'AJ', color: 'bg-orange-500', joinedAt: 'Jan 12, 2025', status: 'active'  },
  { id: '2', name: 'Sara Kim',      email: 'sara@acmeco.com',    role: 'admin',  avatar: 'SK', color: 'bg-orange-500', joinedAt: 'Feb 3, 2025',  status: 'active'  },
  { id: '3', name: 'Marcus Reed',   email: 'marcus@acmeco.com',  role: 'editor', avatar: 'MR', color: 'bg-emerald-500',joinedAt: 'Mar 18, 2025', status: 'active'  },
];

const INITIAL_INVITES = [
  { id: 'i1', email: 'jordan@acmeco.com', role: 'editor' as Role, invitedAt: '2 days ago', expiresIn: '5 days' },
];

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border', cfg.color)}>
      <cfg.icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function MemberRow({
  member,
  onRoleChange,
  onRemove,
  isCurrentUser,
}: {
  member: Member;
  onRoleChange: (id: string, role: Role) => void;
  onRemove: (id: string) => void;
  isCurrentUser: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0 group">
      {/* Avatar */}
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0', member.color)}>
        {member.avatar}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-medium text-gray-900 truncate">{member.name}</p>
          {isCurrentUser && (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">You</span>
          )}
        </div>
        <p className="text-[12px] text-gray-400 truncate">{member.email}</p>
      </div>

      {/* Joined */}
      <p className="text-[12px] text-gray-400 shrink-0 hidden sm:block">{member.joinedAt}</p>

      {/* Role */}
      <div className="relative shrink-0">
        {member.role === 'owner' || isCurrentUser ? (
          <RoleBadge role={member.role} />
        ) : (
          <button
            onClick={() => setRolePickerOpen(v => !v)}
            className="flex items-center gap-1"
          >
            <RoleBadge role={member.role} />
            <ChevronDown size={11} className="text-gray-400 -ml-0.5" />
          </button>
        )}

        {rolePickerOpen && (
          <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 overflow-hidden">
            <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Change role</p>
            {(Object.keys(ROLE_CONFIG) as Role[]).filter(r => r !== 'owner').map(r => {
              const cfg = ROLE_CONFIG[r];
              return (
                <button
                  key={r}
                  onClick={() => { onRoleChange(member.id, r); setRolePickerOpen(false); }}
                  className={cn('flex items-start gap-2.5 w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left', member.role === r && 'bg-gray-50')}
                >
                  <cfg.icon size={14} className="mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{cfg.label}</p>
                    <p className="text-[11px] text-gray-400">{cfg.desc}</p>
                  </div>
                  {member.role === r && <Check size={13} className="ml-auto text-orange-500 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isCurrentUser && member.role !== 'owner' && (
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 overflow-hidden">
              <button
                onClick={() => { onRemove(member.id); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamTab() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [invites, setInvites] = useState(INITIAL_INVITES);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [inviteSent, setInviteSent] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const handleRoleChange = (id: string, role: Role) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  };

  const handleRemove = (id: string) => {
    if (removeConfirm === id) {
      setMembers(prev => prev.filter(m => m.id !== id));
      setRemoveConfirm(null);
    } else {
      setRemoveConfirm(id);
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    const newInvite = {
      id: `i${Date.now()}`,
      email: inviteEmail.trim(),
      role: inviteRole,
      invitedAt: 'just now',
      expiresIn: '7 days',
    };
    setInvites(prev => [...prev, newInvite]);
    setInviteSent(true);
    setTimeout(() => {
      setInviteEmail('');
      setInviteRole('editor');
      setInviteSent(false);
      setShowInviteForm(false);
    }, 1800);
  };

  const revokeInvite = (id: string) => setInvites(prev => prev.filter(i => i.id !== id));

  const seatsUsed = members.length + invites.length;
  const seatsMax = 5;
  const isFreePlan = true;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-gray-900">Team members</p>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {seatsUsed} of {seatsMax} seats used
            {isFreePlan && ' · Free plan'}
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(v => !v)}
          disabled={seatsUsed >= seatsMax}
          className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlus size={14} /> Invite member
        </button>
      </div>

      {/* Seats bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-400 rounded-full transition-all"
            style={{ width: `${Math.min((seatsUsed / seatsMax) * 100, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400">
          {seatsMax - seatsUsed} seat{seatsMax - seatsUsed !== 1 ? 's' : ''} remaining.{' '}
          <button className="text-orange-500 hover:text-orange-600 transition-colors">Upgrade to add more.</button>
        </p>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="flex flex-col gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
          <p className="text-[13px] font-semibold text-orange-700">Invite a teammate</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 h-[38px] px-3 bg-white border border-gray-200 rounded-lg focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition-colors">
              <Mail size={13} className="text-gray-400 shrink-0" />
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="teammate@company.com"
                className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 outline-none"
                autoFocus
              />
            </div>

            {/* Role select */}
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              className="h-[38px] pl-3 pr-8 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              {(['admin', 'editor', 'viewer'] as Role[]).map(r => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </select>

            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviteSent}
              className={cn(
                'h-[38px] px-4 text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0',
                inviteSent
                  ? 'bg-emerald-500 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40'
              )}
            >
              {inviteSent ? <><Check size={13} /> Sent!</> : 'Send invite'}
            </button>

            <button
              onClick={() => setShowInviteForm(false)}
              className="h-[38px] px-3 text-[13px] font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Role descriptions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['admin', 'editor', 'viewer'] as Role[]).map(r => {
              const cfg = ROLE_CONFIG[r];
              return (
                <div
                  key={r}
                  onClick={() => setInviteRole(r)}
                  className={cn(
                    'flex flex-col gap-1 p-2.5 rounded-lg border cursor-pointer transition-colors',
                    inviteRole === r ? 'bg-white border-orange-200' : 'bg-white/50 border-transparent hover:border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <cfg.icon size={12} className="text-gray-400" />
                    <span className="text-[12px] font-semibold text-gray-700">{cfg.label}</span>
                    {inviteRole === r && <Check size={10} className="text-orange-500 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">{cfg.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        {members.map(member => (
          <MemberRow
            key={member.id}
            member={member}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
            isCurrentUser={member.id === '1'}
          />
        ))}
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-gray-700 flex items-center gap-1.5">
            <Clock size={13} className="text-gray-400" />
            Pending invitations
          </p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                  <Mail size={13} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-700 truncate">{invite.email}</p>
                  <p className="text-[12px] text-gray-400">
                    Invited {invite.invitedAt} · expires in {invite.expiresIn}
                  </p>
                </div>
                <RoleBadge role={invite.role} />
                <div className="flex items-center gap-2 shrink-0">
                  <button className="text-[12px] font-medium text-orange-500 hover:text-orange-600 transition-colors">
                    Resend
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    className="text-[12px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Role permissions</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ROLE_CONFIG) as Role[]).map(r => {
            const cfg = ROLE_CONFIG[r];
            return (
              <div key={r} className="flex items-start gap-2">
                <cfg.icon size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-gray-700">{cfg.label}</p>
                  <p className="text-[11px] text-gray-400">{cfg.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Settings view ────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'profile',       label: 'Profile',       icon: User        },
  { key: 'brand',         label: 'Brand',         icon: Building2   },
  { key: 'notifications', label: 'Notifications', icon: Bell        },
  { key: 'billing',       label: 'Billing',       icon: CreditCard  },
  { key: 'team',          label: 'Team',          icon: Users       },
];

export function SettingsView() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="flex gap-8">
      {/* Sidebar nav */}
      <nav className="flex flex-col gap-0.5 w-48 shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-colors',
              tab === key
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            )}
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {tab === 'profile'       && <ProfileTab />}
        {tab === 'brand'         && <BrandTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'billing'       && <BillingTab />}
        {tab === 'team'          && <TeamTab />}
      </div>
    </div>
  );
}
