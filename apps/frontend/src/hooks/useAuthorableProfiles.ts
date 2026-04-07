'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AuthorableProfile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  /** Human-readable label: "Character" or "Kinship" */
  type_label: string;
}

interface UseAuthorableProfilesOptions {
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
  /** Only fetch if this condition is true */
  enabled?: boolean;
}

interface UseAuthorableProfilesReturn {
  /** Characters (type 1) and kinships (type 3) owned by the current user */
  profiles: AuthorableProfile[];
  /** True while fetching */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
}

const TYPE_LABELS: Record<number, string> = {
  1: 'Character',
  3: 'Kinship',
};

/**
 * Fetches all profiles the current user can use as a post author:
 * characters (type 1) and kinships (type 3).
 */
export function useAuthorableProfiles(options: UseAuthorableProfilesOptions = {}): UseAuthorableProfilesReturn {
  const { fetchOnMount = true, enabled = true } = options;

  const [profiles, setProfiles] = useState<AuthorableProfile[]>([]);
  const [isLoading, setIsLoading] = useState(fetchOnMount && enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [charRes, kinRes] = await Promise.all([
        fetch('/api/profiles?type=1'),
        fetch('/api/profiles?type=3'),
      ]);

      if (!charRes.ok || !kinRes.ok) {
        throw new Error('Failed to load profiles');
      }

      const charData = await charRes.json();
      const kinData = await kinRes.json();

      const chars: AuthorableProfile[] = (Array.isArray(charData) ? charData : charData.profiles || []).map(
        (p: { profile_id: number; name: string }) => ({
          profile_id: p.profile_id,
          name: p.name,
          profile_type_id: 1,
          type_label: TYPE_LABELS[1],
        }),
      );

      const kins: AuthorableProfile[] = (Array.isArray(kinData) ? kinData : kinData.profiles || []).map(
        (p: { profile_id: number; name: string }) => ({
          profile_id: p.profile_id,
          name: p.name,
          profile_type_id: 3,
          type_label: TYPE_LABELS[3],
        }),
      );

      // Characters first, then kinships
      setProfiles([...chars, ...kins]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profiles';
      setError(message);
      console.error('Failed to fetch authorable profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount && enabled) {
      fetchProfiles();
    }
  }, [fetchOnMount, enabled, fetchProfiles]);

  return {
    profiles,
    isLoading,
    error,
    refetch: fetchProfiles,
  };
}
