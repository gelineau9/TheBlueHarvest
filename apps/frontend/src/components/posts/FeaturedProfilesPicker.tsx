'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';

export interface FeaturedProfile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
}

interface SearchResult {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  username: string;
}

interface FeaturedProfilesPickerProps {
  value: FeaturedProfile[];
  onChange: (profiles: FeaturedProfile[]) => void;
  disabled?: boolean;
}

const TYPE_FILTERS = [
  { label: 'All', value: null },
  { label: 'Character', value: 1 },
  { label: 'Item', value: 2 },
  { label: 'Kinship', value: 3 },
  { label: 'Organization', value: 4 },
  { label: 'Location', value: 5 },
] as const;

export function FeaturedProfilesPicker({ value, onChange, disabled = false }: FeaturedProfilesPickerProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (term: string, type: number | null) => {
      if (term.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams({ search: term.trim(), limit: '10' });
        if (type !== null) params.set('profile_type_id', String(type));

        const res = await fetch(`/api/profiles/public?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const profiles: SearchResult[] = data.profiles ?? [];

        // Filter out already-selected profiles
        const selectedIds = new Set(value.map((p) => p.profile_id));
        setResults(profiles.filter((p) => !selectedIds.has(p.profile_id)));
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [value],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query, typeFilter);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, typeFilter, search]);

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
    onChange([
      ...value,
      {
        profile_id: profile.profile_id,
        name: profile.name,
        profile_type_id: profile.profile_type_id,
        type_name: profile.type_name,
      },
    ]);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleRemove(profileId: number) {
    onChange(value.filter((p) => p.profile_id !== profileId));
  }

  return (
    <div className="space-y-3">
      <Label className="text-amber-900 font-semibold">Featured Profiles (Optional)</Label>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map(({ label, value: filterValue }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => setTypeFilter(filterValue)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === filterValue
                ? 'bg-amber-800 text-amber-50 border-amber-800'
                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
            } disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Selected profiles chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((profile) => (
            <span
              key={profile.profile_id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-sm"
            >
              <span className="font-medium">{profile.name}</span>
              <span className="text-amber-600 text-xs">· {profile.type_name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(profile.profile_id)}
                  className="ml-0.5 text-amber-700 hover:text-amber-900 leading-none"
                  aria-label={`Remove ${profile.name}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search profiles by name..."
          disabled={disabled}
          className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-50"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">Searching...</span>
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
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-amber-50 text-left"
              >
                <span className="font-medium text-amber-900">{profile.name}</span>
                <span className="text-xs text-amber-600 ml-2 shrink-0">
                  {profile.type_name} · @{profile.username}
                </span>
              </button>
            ))}
          </div>
        )}

        {isOpen && !isSearching && query.trim().length >= 2 && results.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg px-3 py-2 text-sm text-amber-700"
          >
            No profiles found
          </div>
        )}
      </div>

      <p className="text-xs text-amber-700">Tag profiles that appear in this post. Type at least 2 characters to search.</p>
    </div>
  );
}
