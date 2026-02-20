'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  Users,
  Sword,
  Package,
  Building2,
  MapPin,
  Search,
  X,
  Loader2,
  FileText,
  Image,
  Film,
  CalendarDays,
} from 'lucide-react';
import { ContentCard } from '@/components/catalog/content-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CatalogItem {
  id: number;
  contentCategory: 'profile' | 'post';
  typeId: number;
  typeName: string;
  name: string;
  thumbnail: string | null;
  preview: string;
  authorName: string | null;
  username: string;
  createdAt: string;
  updatedAt: string;
}

interface CatalogResponse {
  items: CatalogItem[];
  total: number;
  hasMore: boolean;
}

// Sort options configuration
const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'name:desc', label: 'Name (Z-A)' },
  { value: 'updated_at:desc', label: 'Recently Updated' },
] as const;

// Content type toggle options
const CONTENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'profiles', label: 'Profiles' },
  { value: 'posts', label: 'Posts' },
] as const;

// Profile type filter configuration
const PROFILE_TYPES = [
  { id: 1, name: 'Character', icon: Users },
  { id: 2, name: 'Item', icon: Sword },
  { id: 3, name: 'Kinship', icon: Package },
  { id: 4, name: 'Organization', icon: Building2 },
  { id: 5, name: 'Location', icon: MapPin },
] as const;

// Post type filter configuration
const POST_TYPES = [
  { id: 1, name: 'Writing', icon: FileText },
  { id: 2, name: 'Art', icon: Image },
  { id: 3, name: 'Media', icon: Film },
  { id: 4, name: 'Event', icon: CalendarDays },
] as const;

export default function CatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Infinite scroll state
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const LIMIT = 20;

  // Search state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [isSearching, setIsSearching] = useState(false);

  // Get current filters from URL params
  const contentType = (searchParams.get('contentType') as 'all' | 'profiles' | 'posts') || 'all';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const currentSort = `${sortBy}:${order}`;
  const searchQuery = searchParams.get('search') || '';

  // Profile type filters
  const profileTypesParam = searchParams.get('profileTypes') || '';
  const selectedProfileTypes = profileTypesParam
    ? profileTypesParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
    : [];

  // Post type filters
  const postTypesParam = searchParams.get('postTypes') || '';
  const selectedPostTypes = postTypesParam
    ? postTypesParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
    : [];

  // Get the label for the current sort option
  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === currentSort)?.label || 'Newest First';

  // Update URL params helper
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`/catalog?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Debounced search update
  useEffect(() => {
    const trimmedInput = searchInput.trim();
    const trimmedQuery = searchQuery.trim();

    if (trimmedInput === trimmedQuery) return;

    setIsSearching(true);
    const debounceTimer = setTimeout(() => {
      updateParams({ search: trimmedInput || null });
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, searchQuery, updateParams]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    updateParams({ search: null });
  }, [updateParams]);

  // Content type change
  const handleContentTypeChange = (value: string) => {
    // Clear subtype filters when changing content type
    const updates: Record<string, string | null> = { contentType: value === 'all' ? null : value };
    if (value === 'profiles') {
      updates.postTypes = null;
    } else if (value === 'posts') {
      updates.profileTypes = null;
    }
    updateParams(updates);
  };

  // Sort change
  const handleSortChange = (value: string) => {
    const [newSortBy, newOrder] = value.split(':');
    updateParams({ sortBy: newSortBy, order: newOrder });
  };

  // Toggle profile type filter
  const handleProfileTypeToggle = (typeId: number) => {
    let newSelected: number[];
    if (selectedProfileTypes.includes(typeId)) {
      newSelected = selectedProfileTypes.filter((id) => id !== typeId);
    } else {
      newSelected = [...selectedProfileTypes, typeId];
    }
    updateParams({ profileTypes: newSelected.length > 0 ? newSelected.join(',') : null });
  };

  // Toggle post type filter
  const handlePostTypeToggle = (typeId: number) => {
    let newSelected: number[];
    if (selectedPostTypes.includes(typeId)) {
      newSelected = selectedPostTypes.filter((id) => id !== typeId);
    } else {
      newSelected = [...selectedPostTypes, typeId];
    }
    updateParams({ postTypes: newSelected.length > 0 ? newSelected.join(',') : null });
  };

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setSearchInput('');
    router.push('/catalog');
  }, [router]);

  // Check if any filters are active
  const hasActiveFilters = selectedProfileTypes.length > 0 || selectedPostTypes.length > 0 || searchQuery || contentType !== 'all';

  // Load more items
  const loadMoreItems = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(LIMIT));
      params.set('offset', String(offset + LIMIT));
      params.set('sortBy', sortBy);
      params.set('order', order);
      if (contentType !== 'all') params.set('contentType', contentType);
      if (selectedProfileTypes.length > 0) params.set('profileTypes', selectedProfileTypes.join(','));
      if (selectedPostTypes.length > 0) params.set('postTypes', selectedPostTypes.join(','));
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/catalog/public?${params.toString()}`);
      if (!response.ok) return;

      const data: CatalogResponse = await response.json();
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setOffset((prev) => prev + LIMIT);
    } catch (err) {
      // Silently fail on load more errors
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, offset, sortBy, order, contentType, selectedProfileTypes, selectedPostTypes, searchQuery]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreItems();
        }
      },
      { rootMargin: '100px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMoreItems]);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setIsSearching(false);
      setOffset(0);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(LIMIT));
        params.set('offset', '0');
        params.set('sortBy', sortBy);
        params.set('order', order);
        if (contentType !== 'all') params.set('contentType', contentType);
        if (selectedProfileTypes.length > 0) params.set('profileTypes', selectedProfileTypes.join(','));
        if (selectedPostTypes.length > 0) params.set('postTypes', selectedPostTypes.join(','));
        if (searchQuery) params.set('search', searchQuery);

        const response = await fetch(`/api/catalog/public?${params.toString()}`);

        if (!response.ok) {
          setError('Failed to load catalog');
          return;
        }

        const data: CatalogResponse = await response.json();
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err) {
        setError('An error occurred while loading catalog');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [sortBy, order, contentType, selectedProfileTypes.join(','), selectedPostTypes.join(','), searchQuery]);

  // Show profile type filters?
  const showProfileFilters = contentType === 'all' || contentType === 'profiles';
  // Show post type filters?
  const showPostFilters = contentType === 'all' || contentType === 'posts';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-amber-900 mb-8">Catalog</h1>

          {/* Loading Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 bg-white border-amber-300 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-100" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-20 bg-amber-100 rounded" />
                    <div className="h-6 w-3/4 bg-amber-100 rounded" />
                    <div className="space-y-2">
                      <div className="h-3 w-1/2 bg-amber-100 rounded" />
                      <div className="h-3 w-1/3 bg-amber-100 rounded" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error}</h1>
            <p className="text-amber-700">Please try again later.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="flex items-baseline justify-between">
            <h1 className="text-4xl font-bold text-amber-900">Catalog</h1>
            <p className="text-sm text-amber-700">
              {total} {total === 1 ? 'item' : 'items'}
              {hasActiveFilters ? ' (filtered)' : ' total'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
          <Input
            type="text"
            placeholder="Search by name or title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 pr-10 bg-white border-amber-300 text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:ring-amber-500"
          />
          {(searchInput || isSearching) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              ) : (
                <button onClick={handleClearSearch} className="text-amber-500 hover:text-amber-700 transition-colors" aria-label="Clear search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Type Toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-medium text-amber-800 mr-2">Show:</span>
          {CONTENT_TYPES.map((type) => (
            <Button
              key={type.value}
              variant="outline"
              size="sm"
              onClick={() => handleContentTypeChange(type.value)}
              className={`
                border-amber-300 transition-all
                ${
                  contentType === type.value
                    ? 'bg-amber-800 text-amber-50 border-amber-800 hover:bg-amber-700 hover:border-amber-700'
                    : 'bg-white text-amber-900 hover:bg-amber-50'
                }
              `}
            >
              {type.label}
            </Button>
          ))}
        </div>

        {/* Subtype Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Profile Type Filters */}
            {showProfileFilters && (
              <>
                {PROFILE_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedProfileTypes.includes(type.id);
                  return (
                    <Button
                      key={`profile-${type.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleProfileTypeToggle(type.id)}
                      className={`
                        border-amber-300 transition-all
                        ${
                          isSelected
                            ? 'bg-amber-600 text-amber-50 border-amber-600 hover:bg-amber-500 hover:border-amber-500'
                            : 'bg-white text-amber-900 hover:bg-amber-50'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {type.name}
                    </Button>
                  );
                })}
              </>
            )}

            {/* Separator if showing both */}
            {showProfileFilters && showPostFilters && (
              <div className="w-px h-6 bg-amber-300 mx-1" />
            )}

            {/* Post Type Filters */}
            {showPostFilters && (
              <>
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedPostTypes.includes(type.id);
                  return (
                    <Button
                      key={`post-${type.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePostTypeToggle(type.id)}
                      className={`
                        border-emerald-300 transition-all
                        ${
                          isSelected
                            ? 'bg-emerald-600 text-emerald-50 border-emerald-600 hover:bg-emerald-500 hover:border-emerald-500'
                            : 'bg-white text-emerald-800 hover:bg-emerald-50'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {type.name}
                    </Button>
                  );
                })}
              </>
            )}

            {/* Clear filters button */}
            {(selectedProfileTypes.length > 0 || selectedPostTypes.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateParams({ profileTypes: null, postTypes: null })}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-50">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {currentSortLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-amber-300">
              <DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="text-amber-900 focus:bg-amber-50 focus:text-amber-900">
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <Card className="p-12 bg-white border-amber-300 text-center">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">
              {hasActiveFilters ? 'No matching content' : 'No content yet'}
            </h2>
            <p className="text-amber-700 mb-6">
              {searchQuery
                ? `No results found for "${searchQuery}".`
                : hasActiveFilters
                  ? 'Try adjusting your filters to see more results.'
                  : 'Be the first to create content!'}
            </p>
            {hasActiveFilters ? (
              <Button onClick={handleClearAll} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
                Clear all filters
              </Button>
            ) : (
              <div className="flex gap-4 justify-center">
                <Link
                  href="/catalog/create"
                  className="inline-block px-6 py-3 bg-amber-800 text-amber-50 rounded-md hover:bg-amber-700 transition-colors font-semibold"
                >
                  Create Profile
                </Link>
                <Link
                  href="/posts/create"
                  className="inline-block px-6 py-3 bg-emerald-700 text-emerald-50 rounded-md hover:bg-emerald-600 transition-colors font-semibold"
                >
                  Create Post
                </Link>
              </div>
            )}
          </Card>
        )}

        {/* Content Grid */}
        {items.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <ContentCard
                  key={`${item.contentCategory}-${item.id}`}
                  id={item.id}
                  contentCategory={item.contentCategory}
                  typeId={item.typeId}
                  typeName={item.typeName}
                  name={item.name}
                  thumbnail={item.thumbnail}
                  preview={item.preview}
                  authorName={item.authorName}
                  username={item.username}
                  createdAt={item.createdAt}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel & Status */}
            <div ref={sentinelRef} className="mt-8 flex justify-center">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-amber-700">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
              {!hasMore && items.length > 0 && !isLoadingMore && (
                <p className="text-amber-600 text-sm">
                  {items.length === total ? `Showing all ${total} ${total === 1 ? 'item' : 'items'}` : 'End of results'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
