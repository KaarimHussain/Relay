'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Building2, Bell, CreditCard,
  Camera, Check, AlertTriangle, ChevronRight,
  Zap, Shield, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useBrandStore } from '@/store/brand';
import { useAccountStore } from '@/store/account';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_NOTIFICATION_PREFS, loadNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from '@/lib/notificationPrefs';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'brand' | 'notifications' | 'billing';

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
  const { toast } = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savedName, setSavedName] = useState(user?.name ?? '');
  const [savedEmail, setSavedEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const dirty = name !== savedName || email !== savedEmail;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() || undefined, email: email.trim() || undefined });
      setSavedName(name);
      setSavedEmail(email);
      toast('Profile updated', 'success');
    } catch (err: any) {
      toast(err?.message ?? 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => { setName(savedName); setEmail(savedEmail); };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      setAvatarPreview(useAuthStore.getState().user?.avatarUrl ?? null);
      toast('Avatar updated', 'success');
    } catch (err: any) {
      setAvatarPreview(user?.avatarUrl ?? null);
      toast(err?.message ?? 'Failed to upload avatar', 'error');
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handlePasswordChange = async () => {
    if (!curPw || !newPw) return;
    if (newPw !== confirmPw) { toast('Passwords do not match', 'error'); return; }
    if (newPw.length < 8) { toast('New password must be at least 8 characters', 'error'); return; }
    setPwSaving(true);
    try {
      await changePassword(curPw, newPw);
      setCurPw(''); setNewPw(''); setConfirmPw('');
      toast('Password updated', 'success');
    } catch (err: any) {
      toast(err?.message ?? 'Failed to update password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  const initials = (name || user?.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar */}
      <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-[22px] font-bold overflow-hidden">
            {avatarPreview
              ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              : initials
            }
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                <Loader2 size={18} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Camera size={11} className="text-gray-500" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{savedName}</p>
          <p className="text-[13px] text-gray-400">{savedEmail}</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="text-[12px] text-orange-500 hover:text-orange-600 mt-1 transition-colors disabled:opacity-50"
          >
            {avatarUploading ? 'Uploading…' : 'Change photo'}
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

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />

      {saving && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 size={13} className="animate-spin" /> Saving…
        </div>
      )}

      {/* Password section */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-[15px] font-semibold text-gray-900 mb-4">Change password</p>
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Current password">
            <TextInput type="password" value={curPw} onChange={setCurPw} placeholder="••••••••" />
          </Field>
          <Field label="New password" hint="Must be at least 8 characters.">
            <TextInput type="password" value={newPw} onChange={setNewPw} placeholder="••••••••" />
          </Field>
          <Field label="Confirm new password">
            <TextInput type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
          </Field>
          <button
            onClick={handlePasswordChange}
            disabled={pwSaving || !curPw || !newPw || !confirmPw}
            className="self-start h-9 px-4 text-[13px] font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {pwSaving && <Loader2 size={13} className="animate-spin" />}
            Update password
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="pt-4 border-t border-red-100">
        <p className="text-[15px] font-semibold text-gray-900 mb-1">Danger zone</p>
        <p className="text-[13px] text-gray-400 mb-4">Permanently delete your account and all associated data.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="h-9 px-4 text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
        >
          <AlertTriangle size={14} /> Delete account
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async (password) => {
            await deleteAccount(password);
            toast('Account deleted', 'info');
            router.replace('/login');
          }}
        />
      )}
    </div>
  );
}

// ─── Delete account confirmation ──────────────────────────────────────────────

function DeleteAccountModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const canDelete = password.length > 0 && confirmText.trim().toUpperCase() === 'DELETE' && !loading;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      await onConfirm(password);
    } catch (err: any) {
      toast(err?.message ?? 'Failed to delete account', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-[420px] bg-white rounded-xl border border-gray-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-gray-900">Delete your account</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              This permanently deletes your account, brands you solely own, and all their posts, media, and connected accounts. This cannot be undone.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <Field label="Confirm your password">
            <TextInput type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          </Field>
          <Field label='Type "DELETE" to confirm'>
            <TextInput value={confirmText} onChange={setConfirmText} placeholder="DELETE" />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <button onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete}
            className="h-9 px-4 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Delete my account
          </button>
        </div>
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
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const updateBrand = useBrandStore((s) => s.updateBrand);
  const allAccounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const accountStatus = useAccountStore((s) => s.status);
  const activeAccounts = allAccounts.filter((a) => a.status === 'Active');

  useEffect(() => {
    if (activeBrand && accountStatus === 'idle') {
      fetchAccounts(activeBrand.id);
    }
  }, [activeBrand?.id]);

  const defaultColor = BRAND_COLORS.find((c) => c.hex.toLowerCase() === activeBrand?.colorHex?.toLowerCase()) ?? BRAND_COLORS[0];

  const [name, setName] = useState(activeBrand?.name ?? '');
  const [color, setColor] = useState(defaultColor);
  const [voiceTone, setVoiceTone] = useState(activeBrand?.voiceTone ?? '');
  const [pillars, setPillars] = useState(activeBrand?.pillars ?? '');
  const [savedName, setSavedName] = useState(activeBrand?.name ?? '');
  const [savedColor, setSavedColor] = useState(defaultColor);
  const [savedVoiceTone, setSavedVoiceTone] = useState(activeBrand?.voiceTone ?? '');
  const [savedPillars, setSavedPillars] = useState(activeBrand?.pillars ?? '');
  const [saving, setSaving] = useState(false);

  if (!activeBrand) {
    return (
      <div className="py-16 text-center text-gray-400 text-[13px]">
        No brand selected. Create a brand first.
      </div>
    );
  }

  const dirty =
    name !== savedName ||
    color.hex !== savedColor.hex ||
    voiceTone !== savedVoiceTone ||
    pillars !== savedPillars;

  const save = async () => {
    if (!dirty || !activeBrand) return;
    setSaving(true);
    try {
      await updateBrand(activeBrand.id, {
        name: name.trim() || undefined,
        colorHex: color.hex,
        voiceTone: voiceTone || undefined,
        pillars: pillars || undefined,
      });
      setSavedName(name);
      setSavedColor(color);
      setSavedVoiceTone(voiceTone);
      setSavedPillars(pillars);
      toast('Brand updated', 'success');
    } catch (err: any) {
      toast(err?.message ?? 'Failed to update brand', 'error');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setName(savedName);
    setColor(savedColor);
    setVoiceTone(savedVoiceTone);
    setPillars(savedPillars);
  };

  const initials = (name.trim() || '?').slice(0, 2).toUpperCase();

  const PLATFORM_COLORS: Record<string, string> = {
    Instagram: 'bg-pink-500',
    Facebook: 'bg-blue-600',
    X: 'bg-gray-900',
    LinkedIn: 'bg-blue-700',
    TikTok: 'bg-gray-800',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Brand preview */}
      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-[18px] font-bold"
          style={{ backgroundColor: color.hex }}
        >
          {initials}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900">{savedName}</p>
          <p className="text-[13px] text-gray-400">
            Active brand · {activeAccounts.length} connected account{activeAccounts.length !== 1 ? 's' : ''}
          </p>
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

      <Field label="Voice & tone" hint="Describe your brand's communication style. Used by AI to generate captions.">
        <textarea
          value={voiceTone}
          onChange={e => setVoiceTone(e.target.value.slice(0, 500))}
          placeholder="e.g. Friendly, professional, with a touch of humor…"
          rows={3}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors resize-none"
        />
        <p className="text-[11px] text-gray-400 text-right -mt-1">{voiceTone.length}/500</p>
      </Field>

      <Field label="Content pillars" hint="Core topics your brand posts about. Separate with commas.">
        <textarea
          value={pillars}
          onChange={e => setPillars(e.target.value.slice(0, 500))}
          placeholder="e.g. Product updates, Industry tips, Behind the scenes…"
          rows={2}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors resize-none"
        />
      </Field>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />

      {saving && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 size={13} className="animate-spin" /> Saving…
        </div>
      )}

      {/* Connected accounts summary */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-semibold text-gray-900">Connected accounts</p>
          <a href="/accounts" className="text-[13px] text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
            Manage <ChevronRight size={13} />
          </a>
        </div>
        {activeAccounts.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-2">No connected accounts yet.</p>
        ) : (
          activeAccounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold', PLATFORM_COLORS[acc.platform] ?? 'bg-gray-400')}>
                {acc.platform[0]}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-gray-800">{acc.platform}</p>
                <p className="text-[12px] text-gray-400">{acc.platformHandle}</p>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check size={10} strokeWidth={2.5} /> Connected
              </span>
            </div>
          ))
        )}
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
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    // Seed from local cache immediately so there's no flash of defaults,
    // then overwrite with the server value (cross-device source of truth).
    setPrefs(loadNotificationPrefs(user.id));
    setLoaded(true);
    api.get<NotificationPrefs>('/auth/me/notification-prefs').then((serverPrefs) => {
      setPrefs(serverPrefs);
      saveNotificationPrefs(user.id, serverPrefs);
    }).catch(() => { /* network error — local cache is fine */ });
  }, [user?.id]);

  const set = (key: keyof NotificationPrefs) => (v: boolean) => {
    if (!user?.id) return;
    setPrefs(p => {
      const next = { ...p, [key]: v };
      saveNotificationPrefs(user.id, next);
      api.patch('/auth/me/notification-prefs', { [key]: v }).catch(() => {});
      return next;
    });
  };

  if (!loaded) return null;

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

// ─── Settings view ────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'profile',       label: 'Profile',       icon: User        },
  { key: 'brand',         label: 'Brand',         icon: Building2   },
  { key: 'notifications', label: 'Notifications', icon: Bell        },
  { key: 'billing',       label: 'Billing',       icon: CreditCard  },
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
      </div>
    </div>
  );
}
