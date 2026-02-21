'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, BookOpen, Sparkles, Archive, ArrowLeft, Plus, Crown, PenLine, Loader2 } from 'lucide-react';

interface Collection {
  collection_id: number;
  collection_type_id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  type_name: string;
  is_owner: boolean;
  post_count: string;
}

type FilterType = 'all' | 'owned' | 'editor';

const COLLECTION_TYPE_ICONS: Record<string, React.ElementType> = {
  series: BookOpen,
  anthology: Archive,
  collection: FolderOpen,
  event: Sparkles,
};

export default function MyCollectionsPage() {
  const { isAuthorized, isLoading: authLoading } = useRequireAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch collections function
  const fetchCollections = async (currentCursor: number | null, currentFilter: FilterType, append: boolean) => {
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

      const response = await fetch(`/api/users/me/collections?${params}`);
      if (!response.ok) throw new Error('Failed to fetch collections');

      const data = await response.json();

      if (append) {
        setCollections((prev) => [...prev, ...data.collections]);
      } else {
        setCollections(data.collections);
      }

      setCursor(data.next_cursor);
      setHasMore(data.next_cursor !== null);
    } catch (error) {
      console.error('Error fetching collections:', error);
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
      fetchCollections(null, filter, false);
    }
  }, [isAuthorized, filter]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading || isLoadingMore || !cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore && cursor) {
          fetchCollections(cursor, filter, true);
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

  const getCollectionIcon = (typeName: string) => {
    const Icon = COLLECTION_TYPE_ICONS[typeName.toLowerCase()] || FolderOpen;
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
              <h1 className="text-3xl font-bold text-amber-900 mb-2">My Collections</h1>
              <p className="text-amber-700">Manage collections you own or can edit</p>
            </div>
            <Link href="/collections/create">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
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
                <div className="h-4 bg-amber-100 rounded w-full mb-2" />
                <div className="h-4 bg-amber-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && collections.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 mb-2">No collections found</h2>
            <p className="text-amber-600 mb-6">
              {filter === 'all'
                ? "You haven't created any collections yet."
                : filter === 'owned'
                  ? "You don't own any collections yet."
                  : "You don't have editor access to any collections."}
            </p>
            <Link href="/collections/create">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Collection
              </Button>
            </Link>
          </div>
        )}

        {/* Collections Grid */}
        {!isLoading && collections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => {
              const Icon = getCollectionIcon(collection.type_name);
              return (
                <Link key={collection.collection_id} href={`/collections/${collection.collection_id}`}>
                  <Card className="bg-white border-amber-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Icon className="h-5 w-5 text-amber-600" />
                        </div>
                        {collection.is_owner ? (
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
                      <h3 className="text-lg font-semibold text-amber-900 mb-2 line-clamp-2">{collection.title}</h3>
                      {collection.description && (
                        <p className="text-sm text-amber-700 mb-3 line-clamp-2">{collection.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <span className="capitalize">{collection.type_name}</span>
                        <span>•</span>
                        <span>{parseInt(collection.post_count)} posts</span>
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
