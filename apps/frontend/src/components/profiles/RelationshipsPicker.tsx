'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import NextImage from 'next/image';

// ── Types ────────────────────────────────────────────────────────────────────

export type RelationshipType = 'friend' | 'relative' | 'rival' | 'ally' | 'enemy';

export interface PendingRelationship {
  /** Unique key for list rendering (temp ID) */
  key: string;
  profile_id_2: number;
  other_profile_name: string;
  other_profile_avatar_url: string | null;
  type: RelationshipType;
  /** Only used for 'relative' type — e.g. "mother", "cousin" */
  label: string | null;
}

interface SearchResult {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  username: string;
  details?: { avatar?: { url: string } } | null;
}

interface RelationshipsPickerProps {
  value: PendingRelationship[];
  onChange: (relationships: PendingRelationship[]) => void;
  disabled?: boolean;
  /** Profile IDs already in a live relationship (to exclude from search) */
  excludeProfileIds?: number[];
  /**
   * Which profile_type_ids to include in search results.
   * Defaults to [1] (characters only). Pass [1, 3] for characters + kinships.
   */
  allowedProfileTypes?: number[];
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: { type: RelationshipType; label: string }[] = [
  { type: 'friend', label: 'Friend' },
  { type: 'relative', label: 'Relative' },
  { type: 'ally', label: 'Ally' },
  { type: 'rival', label: 'Rival' },
  { type: 'enemy', label: 'Enemy' },
];

const CATEGORY_COLORS: Record<RelationshipType, string> = {
  friend: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  relative: 'bg-blue-100 border-blue-300 text-blue-900',
  ally: 'bg-teal-100 border-teal-300 text-teal-900',
  rival: 'bg-orange-100 border-orange-300 text-orange-900',
  enemy: 'bg-red-100 border-red-300 text-red-900',
};

const CATEGORY_BADGE: Record<RelationshipType, string> = {
  friend: 'bg-emerald-100 text-emerald-800',
  relative: 'bg-blue-100 text-blue-800',
  ally: 'bg-teal-100 text-teal-800',
  rival: 'bg-orange-100 text-orange-800',
  enemy: 'bg-red-100 text-red-800',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function RelationshipsPicker({
  value,
  onChange,
  disabled = false,
  excludeProfileIds = [],
  allowedProfileTypes = [1],
}: RelationshipsPickerProps) {
  const [selectedType, setSelectedType] = useState<RelationshipType>('friend');
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // IDs already selected
  const selectedIds = new Set([...value.map((r) => r.profile_id_2), ...excludeProfileIds]);

  const search = useCallback(
    async (term: string) => {
      if (term.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          search: term.trim(),
          limit: '10',
          profile_type_id: allowedProfileTypes.join(','),
        });

        const res = await fetch(`/api/profiles/public?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const profiles: SearchResult[] = data.profiles ?? [];

        setResults(profiles.filter((p) => !selectedIds.has(p.profile_id)));
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, excludeProfileIds, allowedProfileTypes],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(profile: SearchResult) {
    const newRel: PendingRelationship = {
      key: `${profile.profile_id}-${selectedType}-${Date.now()}`,
      profile_id_2: profile.profile_id,
      other_profile_name: profile.name,
      other_profile_avatar_url: profile.details?.avatar?.url ?? null,
      type: selectedType,
      label: selectedType === 'relative' ? label.trim() || null : null,
    };
    onChange([...value, newRel]);
    setQuery('');
    setLabel('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleRemove(key: string) {
    onChange(value.filter((r) => r.key !== key));
  }

  return (
    <div className="space-y-3">
      <Label className="text-amber-900 font-semibold">Relationships</Label>

      {/* Category selector pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(({ type, label: catLabel }) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => setSelectedType(type)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
              selectedType === type
                ? 'bg-amber-800 text-amber-50 border-amber-800'
                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
            }`}
          >
            {catLabel}
          </button>
        ))}
      </div>

      {/* Label input — only for Relatives */}
      {selectedType === 'relative' && (
        <Input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Relationship label, e.g. mother, cousin… (optional)"
          maxLength={100}
          disabled={disabled}
          className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
        />
      )}

      {/* Search input + dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search characters by name…"
          disabled={disabled}
          className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-50"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">Searching…</span>
        )}

        {isOpen && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg max-h-52 overflow-y-auto"
          >
            {results.map((profile) => (
              <button
                key={profile.profile_id}
                type="button"
                onClick={() => handleSelect(profile)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-amber-50 text-left"
              >
                {/* Mini avatar */}
                <div className="relative w-6 h-6 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 border border-amber-200">
                  {profile.details?.avatar?.url ? (
                    <NextImage
                      fill
                      src={profile.details.avatar.url}
                      alt={profile.name}
                      sizes="24px"
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3 text-amber-400 m-auto mt-1.5" />
                  )}
                </div>
                <span className="font-medium text-amber-900 flex-1">{profile.name}</span>
                <span className="text-xs text-amber-600 shrink-0">@{profile.username}</span>
              </button>
            ))}
          </div>
        )}

        {isOpen && !isSearching && query.trim().length >= 2 && results.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg px-3 py-2 text-sm text-amber-700"
          >
            No characters found
          </div>
        )}
      </div>

      <p className="text-xs text-amber-700">
        Type at least 2 characters to search.{' '}
        {allowedProfileTypes.includes(3)
          ? 'Characters and kinships can be linked.'
          : 'Only character profiles can be linked.'}
      </p>

      {/* Selected relationships chips */}
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((rel) => (
            <div
              key={rel.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${CATEGORY_COLORS[rel.type]}`}
            >
              {/* Mini avatar */}
              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-white/60 flex-shrink-0 border border-current/20">
                {rel.other_profile_avatar_url ? (
                  <NextImage
                    fill
                    src={rel.other_profile_avatar_url}
                    alt={rel.other_profile_name}
                    sizes="28px"
                    className="object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-current m-auto mt-1.5 opacity-50" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-medium truncate">{rel.other_profile_name}</span>
                {rel.label && <span className="ml-1 text-xs opacity-75">· {rel.label}</span>}
              </div>

              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_BADGE[rel.type]}`}>
                {CATEGORIES.find((c) => c.type === rel.type)?.label}
              </span>

              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(rel.key)}
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${rel.other_profile_name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
