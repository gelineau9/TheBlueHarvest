'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, User, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PublicPost, PublicPostsResponse } from '@/types/posts';

// ─── Filter types ─────────────────────────────────────────────────────────────

type AttributionFilter = 'both' | 'author' | 'featured';
type SortOrder = 'desc' | 'asc';

const ATTRIBUTION_OPTIONS: { value: AttributionFilter; label: string }[] = [
  { value: 'both', label: 'All' },
  { value: 'author', label: 'Authored' },
  { value: 'featured', label: 'Featuring' },
];

// ─── Post card ────────────────────────────────────────────────────────────────

function WritingPostCard({ post }: { post: PublicPost }) {
  const preview =
    typeof post.content?.body === 'string' ? post.content.body.replace(/<[^>]*>/g, '').slice(0, 200) : '';

  return (
    <Link href={`/posts/${post.post_id}`} className="block">
      <Card className="flex flex-col gap-3 border-amber-800/20 bg-amber-50/90 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <span className="inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          Writing
        </span>
        <h3 className="line-clamp-2 text-base font-semibold text-amber-900 leading-snug">{post.title}</h3>
        {preview && <p className="line-clamp-3 flex-1 text-sm text-amber-700 leading-relaxed">{preview}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-500">
          {post.primary_author_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {post.primary_author_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(post.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export default function ProfileWritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [attributionFilter, setAttributionFilter] = useState<AttributionFilter>('both');
  const [sort, setSort] = useState<SortOrder>('desc');

  const buildUrl = (currentOffset: number) => {
    const params = new URLSearchParams({
      profile_id: id,
      attribution: attributionFilter,
      post_type_id: '1',
      limit: String(PAGE_SIZE),
      offset: String(currentOffset),
      sortBy: 'created_at',
      order: sort,
    });
    return `/api/posts/public?${params.toString()}`;
  };

  useEffect(() => {
    setIsLoading(true);
    setOffset(0);
    setPosts([]);

    fetch(buildUrl(0))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => {
        setPosts(data.posts || []);
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
      })
      .catch(() => setPosts([]))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attributionFilter, sort]);

  const loadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setIsLoadingMore(true);

    fetch(buildUrl(newOffset))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
        setOffset(newOffset);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMore(false));
  };

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link
          href={`/profiles/${id}`}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6 text-amber-800" />
          <h1 className="text-3xl font-bold text-amber-900">Writing</h1>
          {!isLoading && <span className="text-sm text-amber-600">({total})</span>}
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white border-amber-300 mb-6">
          <div className="flex flex-wrap gap-6">
            {/* Attribution filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Show</span>
              <div className="flex gap-1">
                {ATTRIBUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAttributionFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      attributionFilter === opt.value
                        ? 'bg-amber-800 text-amber-50'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Sort</span>
              <div className="flex gap-1">
                {[
                  { value: 'desc' as SortOrder, label: 'Newest' },
                  { value: 'asc' as SortOrder, label: 'Oldest' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      sort === opt.value
                        ? 'bg-amber-800 text-amber-50'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* List */}
        {isLoading ? (
          <p className="text-amber-700 text-center py-12">Loading writing…</p>
        ) : posts.length === 0 ? (
          <Card className="p-8 bg-white border-amber-300 text-center">
            <BookOpen className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-amber-700 italic">No writing found for this profile.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <WritingPostCard key={post.post_id} post={post} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  {isLoadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
