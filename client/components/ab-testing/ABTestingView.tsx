'use client';

import { useEffect, useState } from 'react';
import {
  FlaskConical, Plus, Trophy, X, Info, Trash2, Play, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useBrandStore } from '@/store/brand';
import { useToast } from '@/components/ui/toast';

// ─── Types ────────────────────────────────────────────────────────────────────
// UI preview only — variants and results are simulated client-side, not backed
// by a real publishing/split-testing engine yet.

interface Variant {
  caption: string;
  time: string; // e.g. "9:00 AM"
}

interface ABTest {
  id: string;
  brandId: string;
  title: string;
  status: 'running' | 'completed';
  variantA: Variant;
  variantB: Variant;
  results: null | {
    aReach: number; bReach: number;
    aEngRate: number; bEngRate: number;
    winner: 'A' | 'B';
  };
  createdAt: string;
}

function storageKey(userId: string) {
  return `relay_ab_tests_${userId}`;
}

function loadTests(userId: string): ABTest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTests(userId: string, tests: ABTest[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify(tests));
}

function simulateResults(): ABTest['results'] {
  const aReach = 800 + Math.floor(Math.random() * 4000);
  const bReach = 800 + Math.floor(Math.random() * 4000);
  const aEngRate = +(1 + Math.random() * 7).toFixed(1);
  const bEngRate = +(1 + Math.random() * 7).toFixed(1);
  return { aReach, bReach, aEngRate, bEngRate, winner: aEngRate >= bEngRate ? 'A' : 'B' };
}

// ─── Create test modal ─────────────────────────────────────────────────────────

function CreateTestModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Omit<ABTest, 'id' | 'brandId' | 'status' | 'results' | 'createdAt'>) => void }) {
  const [title, setTitle] = useState('');
  const [captionA, setCaptionA] = useState('');
  const [timeA, setTimeA] = useState('9:00 AM');
  const [captionB, setCaptionB] = useState('');
  const [timeB, setTimeB] = useState('6:00 PM');

  const canCreate = title.trim() && captionA.trim() && captionB.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <FlaskConical size={16} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-gray-900">New A/B test</h2>
            <p className="text-xs text-gray-500 mt-0.5">Compare two captions or send times and see which performs better.</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1"><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Test name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch post — CTA test"
              className="input-clay h-10 text-xs md:text-sm px-3.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Variant A</p>
              <textarea
                value={captionA}
                onChange={(e) => setCaptionA(e.target.value.slice(0, 280))}
                placeholder="Caption for variant A…"
                rows={3}
                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 outline-none focus:border-orange-500 resize-none"
              />
              <select
                value={timeA}
                onChange={(e) => setTimeA(e.target.value)}
                className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              >
                {['7:00 AM', '9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Variant B</p>
              <textarea
                value={captionB}
                onChange={(e) => setCaptionB(e.target.value.slice(0, 280))}
                placeholder="Caption for variant B…"
                rows={3}
                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 outline-none focus:border-orange-500 resize-none"
              />
              <select
                value={timeB}
                onChange={(e) => setTimeB(e.target.value)}
                className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              >
                {['7:00 AM', '9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-lg">
            <Info size={13} className="text-orange-500 mt-0.5 shrink-0" />
            <p className="text-[11.5px] text-orange-700 leading-relaxed">
              This is a preview — results are simulated. When live, Relay will split your audience automatically and post the real winner.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <button onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
          <button
            onClick={() => canCreate && onCreate({ title: title.trim(), variantA: { caption: captionA.trim(), time: timeA }, variantB: { caption: captionB.trim(), time: timeB } })}
            disabled={!canCreate}
            className="btn-clay-primary h-9 px-4 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start test
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Variant column ─────────────────────────────────────────────────────────

function VariantCard({ label, variant, isWinner, metrics }: {
  label: 'A' | 'B';
  variant: Variant;
  isWinner: boolean;
  metrics: { reach: number; engRate: number } | null;
}) {
  return (
    <div className={cn(
      'flex-1 min-w-0 p-3 rounded-lg border flex flex-col gap-2',
      isWinner ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-200 bg-gray-50'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Variant {label}</span>
        {isWinner && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            <Trophy size={10} /> Winner
          </span>
        )}
      </div>
      <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{variant.caption}</p>
      <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {variant.time}</p>
      {metrics && (
        <div className="flex items-center gap-3 pt-1.5 border-t border-gray-200/70">
          <div>
            <p className="text-xs font-bold text-gray-900 leading-none">{metrics.reach.toLocaleString()}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">reach</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 leading-none">{metrics.engRate}%</p>
            <p className="text-[9px] text-gray-400 mt-0.5">eng. rate</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ABTestingView() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setTests(loadTests(user.id));
    setLoaded(true);
  }, [user?.id]);

  const persist = (next: ABTest[]) => {
    setTests(next);
    if (user?.id) saveTests(user.id, next);
  };

  const handleCreate = (t: Omit<ABTest, 'id' | 'brandId' | 'status' | 'results' | 'createdAt'>) => {
    const newTest: ABTest = {
      id: `test-${Date.now()}`,
      brandId: activeBrand?.id ?? 'none',
      status: 'running',
      results: null,
      createdAt: new Date().toISOString(),
      ...t,
    };
    persist([newTest, ...tests]);
    setShowCreate(false);
    toast('Test started — simulate results once you have data', 'success');
  };

  const handleSimulate = (id: string) => {
    persist(tests.map(t => t.id === id ? { ...t, status: 'completed', results: simulateResults() } : t));
    toast('Results simulated', 'info');
  };

  const handleDelete = (id: string) => {
    persist(tests.filter(t => t.id !== id));
  };

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Preview notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl">
        <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
        <p className="text-[12.5px] text-orange-700 leading-relaxed">
          <span className="font-semibold">Preview:</span> tests are saved locally on this device and results are simulated, not from real posts yet.
          This shows how caption/time A/B testing will work once it's wired to live publishing and analytics.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {activeBrand ? <>Tests for <span className="font-semibold text-gray-700">{activeBrand.name}</span></> : 'Select a brand to organize your tests'}
        </p>
        <button onClick={() => setShowCreate(true)} className="btn-clay-primary h-8 px-3 text-xs inline-flex items-center gap-1.5">
          <Plus size={12} /> Create test
        </button>
      </div>

      {/* List */}
      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <FlaskConical size={32} className="text-gray-200" />
          <div>
            <p className="text-sm font-semibold text-gray-500">No tests yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Create your first A/B test to compare captions or send times.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tests.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{t.title}</p>
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                    t.status === 'running' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-100 text-gray-500'
                  )}>
                    {t.status === 'running' ? 'Running' : 'Completed'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {t.status === 'running' && (
                    <button
                      onClick={() => handleSimulate(t.id)}
                      className="btn-clay-secondary h-7 px-2.5 text-[11px] inline-flex items-center gap-1"
                    >
                      <Play size={10} /> Simulate results
                    </button>
                  )}
                  <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <VariantCard
                  label="A"
                  variant={t.variantA}
                  isWinner={t.results?.winner === 'A'}
                  metrics={t.results ? { reach: t.results.aReach, engRate: t.results.aEngRate } : null}
                />
                <VariantCard
                  label="B"
                  variant={t.variantB}
                  isWinner={t.results?.winner === 'B'}
                  metrics={t.results ? { reach: t.results.bReach, engRate: t.results.bEngRate } : null}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateTestModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
