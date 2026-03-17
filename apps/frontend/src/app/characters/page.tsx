'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileCard } from '@/components/profiles/profile-card';
import { Loader2 } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LIMIT = 48;

interface Profile {
  profile_id: number;
  profile_type_id: number;
  name: string;
  details: { avatar?: { url?: string } } | null;
  created_at: string;
  type_name: string;
  username: string;
}

interface ProfilesResponse {
  profiles: Profile[];
  total: number;
  hasMore: boolean;
}

export default function CharactersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const letter = (searchParams.get('letter') || 'A').toUpperCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const offset = (page - 1) * LIMIT;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => params.set(k, v));
      router.push(`/characters?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          profile_type_id: '1',
          startsWith: letter,
          sortBy: 'name',
          order: 'asc',
          limit: String(LIMIT),
          offset: String(offset),
        });
        const res = await fetch(`/api/profiles/public?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch characters');
        const data: ProfilesResponse = await res.json();
        setProfiles(data.profiles);
        setTotal(data.total);
      } catch {
        setError('Failed to load characters. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [letter, offset]);

  const handleLetterClick = (l: string) => {
    router.push(`/characters?letter=${l}&page=1`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-fantasy text-3xl font-bold text-amber-900">Characters</h1>
        <p className="mt-1 text-sm text-amber-700">Browse all characters in the archives</p>
      </div>

      {/* Alphabet bar */}
      <div className="mb-6 flex flex-wrap gap-1">
        {ALPHABET.map((l) => (
          <button
            key={l}
            onClick={() => handleLetterClick(l)}
            className={`min-w-[2rem] rounded px-2 py-1 text-sm font-semibold transition-colors ${
              letter === l
                ? 'bg-amber-800 text-amber-50'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Results header */}
      <div className="mb-4 flex items-center justify-between text-sm text-amber-700">
        <span>
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              {total === 0
                ? `No characters found starting with "${letter}"`
                : `${total} character${total === 1 ? '' : 's'} starting with "${letter}"`}
            </>
          )}
        </span>
        {totalPages > 1 && !isLoading && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && profiles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.profile_id}
              profile_id={profile.profile_id}
              name={profile.name}
              profile_type_id={profile.profile_type_id}
              type_name={profile.type_name}
              created_at={profile.created_at}
              username={profile.username}
              avatar_url={profile.details?.avatar?.url}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && profiles.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-amber-800">No characters found</p>
          <p className="mt-1 text-sm text-amber-600">
            There are no published characters starting with &ldquo;{letter}&rdquo; yet.
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => updateParams({ page: String(page - 1) })}
            disabled={page <= 1}
            className="rounded px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-amber-600">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => updateParams({ page: String(p) })}
                  className={`min-w-[2rem] rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                    page === p ? 'bg-amber-800 text-amber-50' : 'text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          <button
            onClick={() => updateParams({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="rounded px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
