'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, User, Building2, MapPin, ArrowLeft, Plus, Crown, PenLine, Loader2 } from 'lucide-react';

interface Profile {
  profile_id: number;
  profile_type_id: number;
  name: string;
  created_at: string;
  updated_at: string | null;
  type_name: string;
  is_owner: boolean;
  parent_profile_id: number | null;
  parent_profile_name: string | null;
}

type FilterType = 'all' | 'owned' | 'editor';

const PROFILE_TYPE_ICONS: Record<string, React.ElementType> = {
  character: User,
  kinship: Building2,
  location: MapPin,
  organization: Users,
};

export default function MyProfilesPage() {
  const { isAuthorized, isLoading: authLoading } = useRequireAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch profiles function
  const fetchProfiles = async (currentCursor: number | null, currentFilter: FilterType, append: boolean) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams({
        limit: '20',
        filter: currentFilter,
      });
      if (currentCursor) {
        params.set('cursor', currentCursor.toString());
      }

      const response = await fetch(`/api/users/me/profiles?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profiles');

      const data = await response.json();

      if (append) {
        setProfiles((prev) => [...prev, ...data.profiles]);
      } else {
        setProfiles(data.profiles);
      }

      setCursor(data.next_cursor);
      setHasMore(data.next_cursor !== null);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial fetch and filter change
  useEffect(() => {
    if (isAuthorized) {
      setCursor(null);
      setHasMore(true);
      fetchProfiles(null, filter, false);
    }
  }, [isAuthorized, filter]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading || isLoadingMore || !cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore && cursor) {
          fetchProfiles(cursor, filter, true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, cursor, filter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-amber-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const getProfileIcon = (typeName: string) => {
    const Icon = PROFILE_TYPE_ICONS[typeName.toLowerCase()] || User;
    return Icon;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-800 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">My Profiles</h1>
              <p className="text-amber-700">Manage profiles you own or can edit</p>
            </div>
            <Link href="/profiles/create">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={
              filter === 'all'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
            }
          >
            All
          </Button>
          <Button
            variant={filter === 'owned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('owned')}
            className={
              filter === 'owned'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
            }
          >
            <Crown className="h-3 w-3 mr-1" />
            Owned
          </Button>
          <Button
            variant={filter === 'editor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('editor')}
            className={
              filter === 'editor'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
            }
          >
            <PenLine className="h-3 w-3 mr-1" />
            Can Edit
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-amber-200 p-4 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg" />
                  <div className="w-16 h-6 bg-amber-100 rounded-full" />
                </div>
                <div className="h-5 bg-amber-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-amber-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && profiles.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 mb-2">No profiles found</h2>
            <p className="text-amber-600 mb-6">
              {filter === 'all'
                ? "You haven't created any profiles yet."
                : filter === 'owned'
                  ? "You don't own any profiles yet."
                  : "You don't have editor access to any profiles."}
            </p>
            <Link href="/profiles/create">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Profile
              </Button>
            </Link>
          </div>
        )}

        {/* Profiles Grid */}
        {!isLoading && profiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => {
              const Icon = getProfileIcon(profile.type_name);
              return (
                <Link key={profile.profile_id} href={`/profiles/${profile.profile_id}`}>
                  <Card className="bg-white border-amber-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Icon className="h-5 w-5 text-amber-600" />
                        </div>
                        {profile.is_owner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            <Crown className="h-3 w-3" />
                            Owner
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-stone-100 text-stone-600 rounded-full">
                            <PenLine className="h-3 w-3" />
                            Editor
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-amber-900 mb-2 line-clamp-2">{profile.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <span className="capitalize">{profile.type_name}</span>
                        {profile.parent_profile_name && (
                          <>
                            <span>•</span>
                            <span className="truncate">{profile.parent_profile_name}</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Load more trigger */}
        {hasMore && !isLoading && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-amber-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
