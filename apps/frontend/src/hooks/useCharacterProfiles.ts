'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CharacterProfile {
  profile_id: number;
  name: string;
}

interface UseCharacterProfilesOptions {
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
  /** Only fetch if this condition is true (useful for auth-gated fetching) */
  enabled?: boolean;
}

interface UseCharacterProfilesReturn {
  /** List of character profiles owned by the current user */
  characters: CharacterProfile[];
  /** True while fetching characters */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's character profiles.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { characters, isLoading } = useCharacterProfiles();
 *
 * // Only fetch when logged in
 * const { characters, isLoading } = useCharacterProfiles({ enabled: isLoggedIn });
 *
 * // Manual fetch control
 * const { characters, refetch } = useCharacterProfiles({ fetchOnMount: false });
 * ```
 */
export function useCharacterProfiles(options: UseCharacterProfilesOptions = {}): UseCharacterProfilesReturn {
  const { fetchOnMount = true, enabled = true } = options;

  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [isLoading, setIsLoading] = useState(fetchOnMount && enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profiles?type=1');

      if (!response.ok) {
        throw new Error('Failed to load characters');
      }

      const data = await response.json();

      // Handle both response formats: array or { profiles: [...] }
      const profileList = Array.isArray(data) ? data : data.profiles || [];
      setCharacters(profileList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load characters';
      setError(message);
      console.error('Failed to fetch characters:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount && enabled) {
      fetchCharacters();
    }
  }, [fetchOnMount, enabled, fetchCharacters]);

  return {
    characters,
    isLoading,
    error,
    refetch: fetchCharacters,
  };
}
