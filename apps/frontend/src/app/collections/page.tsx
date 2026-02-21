'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, FolderOpen, BookOpen, Images, Palette, CalendarRange, Loader2, ChevronDown } from 'lucide-react';
import { CollectionCard } from '@/components/collections/collection-card';

interface Collection {
  collection_id: number;
  collection_type_id: number;
  title: string;
  description: string | null;
  created_at: string;
  type_name: string;
  username: string;
  primary_author_id: number | null;
  primary_author_name: string | null;
  post_count: number;
}

interface CollectionsResponse {
  collections: Collection[];
  total: number;
  hasMore: boolean;
}

// Collection type definitions
const collectionTypes = [
  { id: 1, name: 'Collection', icon: FolderOpen },
  { id: 2, name: 'Chronicle', icon: BookOpen },
  { id: 3, name: 'Album', icon: Images },
  { id: 4, name: 'Gallery', icon: Palette },
  { id: 5, name: 'Event Series', icon: CalendarRange },
];

// Sort options
const sortOptions = [
  { value: 'created_at-desc', label: 'Newest' },
  { value: 'created_at-asc', label: 'Oldest' },
  { value: 'title-asc', label: 'Name A-Z' },
  { value: 'title-desc', label: 'Name Z-A' },
  { value: 'updated_at-desc', label: 'Recently Updated' },
];

const ITEMS_PER_PAGE = 12;

export default function CollectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [selectedTypes, setSelectedTypes] = useState<number[]>(() => {
    const types = searchParams.get('types');
    return types ? types.split(',').map(Number).filter(Boolean) : [];
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'created_at-desc');

  // Data state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedTypes.length > 0) params.set('types', selectedTypes.join(','));
    if (sortBy !== 'created_at-desc') params.set('sort', sortBy);

    const newUrl = params.toString() ? `?${params.toString()}` : '/collections';
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, selectedTypes, sortBy, router]);

  // Fetch collections
  const fetchCollections = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('limit', String(ITEMS_PER_PAGE));
        params.set('offset', String(offset));

        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedTypes.length > 0) params.set('collection_type_id', selectedTypes.join(','));

        const [sortField, sortOrder] = sortBy.split('-');
        params.set('sort_by', sortField);
        params.set('sort_order', sortOrder);

        const response = await fetch(`/api/collections/public?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch collections');
        }

        const data: CollectionsResponse = await response.json();

        if (append) {
          setCollections((prev) => [...prev, ...data.collections]);
        } else {
          setCollections(data.collections);
        }

        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError('Failed to load collections. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [debouncedSearch, selectedTypes, sortBy],
  );

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchCollections(0, false);
  }, [fetchCollections]);

  // Infinite scroll setup
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchCollections(collections.length, true);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingMore, collections.length, fetchCollections]);

  // Toggle type filter
  const toggleType = (typeId: number) => {
    setSelectedTypes((prev) => (prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedTypes([]);
    setSortBy('created_at-desc');
  };

  const hasActiveFilters = debouncedSearch || selectedTypes.length > 0 || sortBy !== 'created_at-desc';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Collections</h1>
          <p className="text-amber-700">Browse curated collections of stories, art, media, and events</p>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-amber-300 focus:border-amber-500"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-48 bg-white border-amber-300 justify-between">
                {sortOptions.find((o) => o.value === sortBy)?.label || 'Sort by'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={sortBy === option.value ? 'bg-amber-100' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {collectionTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <Button
                key={type.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleType(type.id)}
                className={
                  isSelected
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
                }
              >
                <Icon className="w-4 h-4 mr-1" />
                {type.name}
              </Button>
            );
          })}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-amber-600 mb-4">
            {total === 0 ? 'No collections found' : `Showing ${collections.length} of ${total} collections`}
          </p>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchCollections(0, false)} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-amber-200 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-amber-100 rounded w-20 mb-2" />
                    <div className="h-5 bg-amber-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-amber-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Collections Grid */}
        {!isLoading && !error && (
          <>
            {collections.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-amber-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-amber-800 mb-2">No collections found</h2>
                <p className="text-amber-600">
                  {hasActiveFilters
                    ? 'Try adjusting your filters or search terms.'
                    : 'No collections have been created yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.collection_id}
                    collectionId={collection.collection_id}
                    collectionTypeId={collection.collection_type_id}
                    typeName={collection.type_name}
                    title={collection.title}
                    description={collection.description}
                    primaryAuthorName={collection.primary_author_name}
                    username={collection.username}
                    createdAt={collection.created_at}
                    postCount={collection.post_count}
                  />
                ))}
              </div>
            )}

            {/* Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
