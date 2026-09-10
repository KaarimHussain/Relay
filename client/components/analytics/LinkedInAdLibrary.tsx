'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, ExternalLink, AlertCircle, ChevronRight, ChevronLeft, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api, ApiError } from '@/lib/api';

interface AdCreative {
  id: string;
  status: string;
  format: string;
  headline: string | null;
  introText: string | null;
  callToAction: string | null;
  sponsoredBy: string | null;
  startDate: string | null;
  endDate: string | null;
  previewUrl: string | null;
}

interface AdLibraryResponse {
  elements: AdCreative[];
  total: number;
  hasMore: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_IMAGE:    'Image',
  VIDEO:           'Video',
  CAROUSEL:        'Carousel',
  TEXT_AD:         'Text Ad',
  SPOTLIGHT:       'Spotlight',
  DOCUMENT:        'Document',
  UNKNOWN:         'Ad',
};

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE:      'Learn More',
  SIGN_UP:         'Sign Up',
  APPLY:           'Apply',
  DOWNLOAD:        'Download',
  GET_QUOTE:       'Get Quote',
  REGISTER:        'Register',
  SUBSCRIBE:       'Subscribe',
  VISIT_WEBSITE:   'Visit Website',
  CONTACT_US:      'Contact Us',
  REQUEST_DEMO:    'Request Demo',
};

function AdCard({ ad }: { ad: AdCreative }) {
  const formatLabel = FORMAT_LABELS[ad.format] ?? ad.format;
  const ctaLabel    = ad.callToAction ? (CTA_LABELS[ad.callToAction] ?? ad.callToAction) : null;

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-white border border-gray-150 rounded-xl shadow-2xs hover:border-blue-200 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {ad.sponsoredBy && (
            <span className="text-[11px] font-semibold text-gray-800 truncate">{ad.sponsoredBy}</span>
          )}
          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
            {formatLabel}
          </span>
        </div>
        <span className={cn(
          'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0',
          ad.status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-400 bg-gray-100'
        )}>
          {ad.status === 'ACTIVE' ? 'Active' : ad.status}
        </span>
      </div>

      {/* Creative text */}
      {ad.headline && (
        <p className="text-[12px] font-bold text-gray-900 leading-snug line-clamp-2">{ad.headline}</p>
      )}
      {ad.introText && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">{ad.introText}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 mt-auto">
        <div className="flex flex-col gap-0.5">
          {ad.startDate && (
            <span className="text-[10px] text-gray-400">
              {ad.startDate}{ad.endDate ? ` → ${ad.endDate}` : ' → now'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {ctaLabel && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
              {ctaLabel}
            </span>
          )}
          {ad.previewUrl && (
            <a
              href={ad.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Open ad preview"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function LinkedInAdLibrary() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const [query, setQuery]         = useState('');
  const [start, setStart]         = useState(0);
  const [data,  setData]          = useState<AdLibraryResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error,   setError]       = useState<string | null>(null);
  const [searched, setSearched]   = useState(false);

  const COUNT = 12;

  const search = useCallback(async (newStart = 0) => {
    if (!activeBrand || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AdLibraryResponse>(
        `/brands/${activeBrand.id}/linkedin/ad-library?query=${encodeURIComponent(query.trim())}&start=${newStart}&count=${COUNT}`
      );
      setData(res);
      setStart(newStart);
      setSearched(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to search LinkedIn Ad Library.');
    } finally {
      setLoading(false);
    }
  }, [activeBrand, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search(0);
  };

  const hasLinkedIn = activeBrand?.role !== undefined; // brand exists

  return (
    <div className="bg-gray-50/40 border border-gray-200 rounded-xl p-4 flex flex-col gap-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-gray-150 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <Megaphone size={15} className="text-blue-600" /> LinkedIn Ad Library
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Search any company's active LinkedIn ads — creative copy, format, and flight dates.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by company name or keyword (e.g. Salesforce, AI marketing)"
            className="input-clay h-9 pl-8 pr-3 text-[12px] w-full"
          />
        </div>
        <button
          onClick={() => search(0)}
          disabled={loading || !query.trim()}
          className="btn-clay-primary h-9 px-4 text-[12px] gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* No LinkedIn account warning */}
      {!activeBrand && (
        <p className="text-[12px] text-gray-400 text-center py-4">Select a brand to search the Ad Library.</p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3.5 py-3 bg-red-50 border border-red-100 rounded-xl text-[11.5px] text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty search state */}
      {!loading && !error && !searched && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Megaphone size={28} className="text-gray-200" />
          <p className="text-[12px] font-semibold text-gray-400">Search any company to see their LinkedIn ads</p>
          <p className="text-[11px] text-gray-300 max-w-xs">
            Try your competitors' brand names to see what ad copy and formats they're running.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && data && searched && (
        <>
          {data.elements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <p className="text-[12px] font-semibold text-gray-500">No active ads found for "{query}"</p>
              <p className="text-[11px] text-gray-400">
                The company may not be running LinkedIn ads, or the name may not match exactly.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-400 font-medium">
                  Showing {start + 1}–{Math.min(start + COUNT, data.total)} of {data.total.toLocaleString()} ads
                </p>
                {/* Pagination */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => search(Math.max(0, start - COUNT))}
                    disabled={start === 0 || loading}
                    className="btn-clay-secondary h-7 w-7 p-0 disabled:opacity-40"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    onClick={() => search(start + COUNT)}
                    disabled={!data.hasMore || loading}
                    className="btn-clay-secondary h-7 w-7 p-0 disabled:opacity-40"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.elements.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
