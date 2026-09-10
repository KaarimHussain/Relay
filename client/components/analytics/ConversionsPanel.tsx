'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Trash2, Loader2, AlertCircle, Copy, Check,
  ExternalLink, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api, ApiError } from '@/lib/api';

interface ConversionRule {
  id: string;
  name: string;
  conversionType: string;
  liAdAccountUrn: string;
  liConversionUrn: string | null;
  isEnabled: boolean;
  createdAt: string;
  _count: { events: number };
  events: { occurredAt: string; valueAmount: number | null; valueCurrency: string | null }[];
}

interface Stats {
  rules: ConversionRule[];
  totalEvents: number;
  totalValue: number;
}

const CONVERSION_TYPES = [
  { value: 'LEAD',           label: 'Lead / Form fill' },
  { value: 'PURCHASE',       label: 'Purchase / Sale' },
  { value: 'SIGN_UP',        label: 'Sign-up / Registration' },
  { value: 'ADD_TO_CART',    label: 'Add to cart' },
  { value: 'DOWNLOAD',       label: 'Download' },
  { value: 'JOB_APPLY',      label: 'Job application' },
  { value: 'BOOK_APPOINTMENT', label: 'Appointment booking' },
  { value: 'REQUEST_QUOTE',  label: 'Quote request' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function WebhookUrl({ ruleId }: { ruleId: string }) {
  const [copied, setCopied] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  const url = `${apiBase}/conversions/webhook/${ruleId}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg">
      <code className="flex-1 text-[10px] text-gray-600 font-mono truncate">{url}</code>
      <button onClick={copy} className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-700 transition-colors">
        {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

function RuleRow({ rule, onDelete }: { rule: ConversionRule; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const typeLabel = CONVERSION_TYPES.find((t) => t.value === rule.conversionType)?.label ?? rule.conversionType;
  const totalValue = rule.events.reduce((s, e) => s + (e.valueAmount ?? 0), 0);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(rule.id); } finally { setDeleting(false); }
  };

  return (
    <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <Zap size={14} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{rule.name}</p>
          <p className="text-[11px] text-gray-400">{typeLabel}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-bold text-gray-900 tabular-nums">{rule._count.events.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">conversions</p>
          </div>
          {totalValue > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-bold text-gray-900 tabular-nums">
                {rule.events[0]?.valueCurrency ?? '$'}{totalValue.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400">total value</p>
            </div>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-3 bg-gray-50/40">
          {/* Webhook URL */}
          <div>
            <p className="text-[11px] font-semibold text-gray-600 mb-0.5">Webhook endpoint</p>
            <p className="text-[10px] text-gray-400 mb-1">
              Send a POST request to this URL from your site when a conversion happens. Include{' '}
              <code className="bg-gray-100 px-1 rounded">email</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">valueAmount</code>, and{' '}
              <code className="bg-gray-100 px-1 rounded">pageUrl</code> in the JSON body.
            </p>
            <WebhookUrl ruleId={rule.id} />
          </div>

          {/* LinkedIn URN */}
          {rule.liConversionUrn && (
            <p className="text-[10px] text-gray-400 font-mono">
              LinkedIn conversion URN: {rule.liConversionUrn}
            </p>
          )}

          {/* Recent events */}
          {rule.events.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-600 mb-1.5">Recent conversions</p>
              <div className="flex flex-col divide-y divide-gray-100">
                {rule.events.slice(0, 8).map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-gray-600">{fmtDate(e.occurredAt)}</span>
                    {e.valueAmount != null && (
                      <span className="text-[11px] font-semibold text-gray-800 tabular-nums">
                        {e.valueCurrency ?? '$'}{e.valueAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-clay-danger-outline h-7 px-3 text-[11px] gap-1.5"
            >
              {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Delete rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateRuleForm({ brandId, onCreated, onCancel }: {
  brandId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { toast } = { toast: (msg: string) => console.log(msg) }; // minimal
  const [name, setName]               = useState('');
  const [type, setType]               = useState('LEAD');
  const [adAccountUrn, setAdAccountUrn] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const submit = async () => {
    if (!name.trim() || !adAccountUrn.trim()) {
      setError('Name and Ad Account URN are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/brands/${brandId}/conversions/rules`, {
        name: name.trim(),
        conversionType: type,
        liAdAccountUrn: adAccountUrn.trim(),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create conversion rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-blue-50/40 border border-blue-100 rounded-xl">
      <p className="text-[12px] font-bold text-gray-900">New conversion rule</p>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-gray-600">Rule name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Website sign-up"
          className="input-clay h-8 px-2.5 text-[12px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-gray-600">Conversion type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="input-clay h-8 px-2.5 text-[12px]"
        >
          {CONVERSION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-gray-600">LinkedIn Ad Account URN</label>
        <input
          value={adAccountUrn}
          onChange={(e) => setAdAccountUrn(e.target.value)}
          placeholder="urn:li:sponsoredAccount:123456789"
          className="input-clay h-8 px-2.5 text-[12px] font-mono"
        />
        <p className="text-[10px] text-gray-400 flex items-center gap-1">
          <Info size={10} className="shrink-0" />
          Find this in Campaign Manager → Account Assets → Account URN.
          <a
            href="https://www.linkedin.com/campaignmanager"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 inline-flex items-center gap-0.5 hover:underline"
          >
            Open <ExternalLink size={9} />
          </a>
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="btn-clay-secondary h-8 px-3 text-[11px]">Cancel</button>
        <button
          onClick={submit}
          disabled={saving || !name.trim() || !adAccountUrn.trim()}
          className="btn-clay-primary h-8 px-3 text-[11px] gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          {saving ? 'Creating…' : 'Create rule'}
        </button>
      </div>
    </div>
  );
}

export function ConversionsPanel() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!activeBrand) return;
    setLoading(true);
    setError(null);
    try {
      const s = await api.get<Stats>(`/brands/${activeBrand.id}/conversions/stats`);
      setStats(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load conversion data.');
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (ruleId: string) => {
    if (!activeBrand) return;
    await api.delete(`/brands/${activeBrand.id}/conversions/rules/${ruleId}`);
    await load();
  };

  const isOwnerOrAdmin = activeBrand?.role === 'Owner' || activeBrand?.role === 'Admin';

  return (
    <div className="bg-gray-50/40 border border-gray-200 rounded-xl p-4 flex flex-col gap-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-150 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <Zap size={15} className="text-blue-600" /> LinkedIn Conversions
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Track LinkedIn-attributed conversions from your campaigns alongside organic post metrics.
          </p>
        </div>
        {isOwnerOrAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-clay-primary h-7 px-3 text-[11px] gap-1 shrink-0"
          >
            <Plus size={12} /> Add Rule
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && !stats && (
        <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-[12px]">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3.5 py-3 bg-red-50 border border-red-100 rounded-xl text-[11.5px] text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Summary KPIs */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-white border border-gray-150 rounded-xl shadow-2xs">
            <p className="text-lg font-bold text-gray-900 tabular-nums">{stats.totalEvents.toLocaleString()}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Total conversions</p>
          </div>
          <div className="p-3 bg-white border border-gray-150 rounded-xl shadow-2xs">
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {stats.totalValue > 0 ? `$${stats.totalValue.toLocaleString()}` : '—'}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Total value</p>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && activeBrand && (
        <CreateRuleForm
          brandId={activeBrand.id}
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Rules list */}
      {stats && stats.rules.length > 0 && (
        <div className="flex flex-col gap-2">
          {stats.rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {stats && stats.rules.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Zap size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-gray-700">No conversion rules yet</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
              Create a rule to start tracking LinkedIn-attributed conversions. You'll get a webhook URL
              to drop into your site or CRM.
            </p>
          </div>
          {isOwnerOrAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-clay-primary h-8 px-4 text-[12px] gap-1.5">
              <Plus size={12} /> Create your first rule
            </button>
          )}
        </div>
      )}

      {/* Scope notice */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-[10.5px] text-blue-700">
        <Info size={11} className="shrink-0 mt-0.5" />
        <span>
          Conversions requires a LinkedIn Ads account and the <strong>rw_conversions</strong> scope.
          If you connected LinkedIn before today, <strong>disconnect and reconnect</strong> to grant the new scope.
        </span>
      </div>
    </div>
  );
}
