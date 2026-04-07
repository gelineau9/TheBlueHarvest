'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedPost {
  post_id: number;
  post_type_id: number;
  title: string;
  content: Record<string, unknown> | null;
  created_at: string;
  type_name: string;
  username: string;
  primary_author_id: number | null;
  primary_author_name: string | null;
}

interface FeedResponse {
  posts: FeedPost[];
  total: number;
  hasMore: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const typeBadgeColors: Record<string, string> = {
  Writing: 'bg-amber-100 text-amber-800',
  Art: 'bg-pink-100 text-pink-800',
  Media: 'bg-blue-100 text-blue-800',
  Event: 'bg-green-100 text-green-800',
};

// ─── List row ─────────────────────────────────────────────────────────────────

function FeedRow({ post }: { post: FeedPost }) {
  const badgeClass = typeBadgeColors[post.type_name] ?? 'bg-amber-100 text-amber-800';

  return (
    <Link
      href={`/posts/${post.post_id}`}
      className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-amber-100/60"
    >
      {/* Type badge */}
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
        {post.type_name}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-amber-900 group-hover:underline">
        {post.title}
      </span>

      {/* Meta: character author (if any) · username · time */}
      <span className="flex shrink-0 items-center gap-2 text-xs text-amber-600">
        {post.primary_author_name && (
          <span className="hidden truncate max-w-[80px] sm:inline">{post.primary_author_name}</span>
        )}
        <Link
          href={`/users/${post.username}`}
          onClick={(e) => e.stopPropagation()}
          className="truncate max-w-[80px] hover:text-amber-900 hover:underline"
        >
          {post.username}
        </Link>
        <span className="text-amber-400">·</span>
        <span className="whitespace-nowrap">{relativeTime(post.created_at)}</span>
      </span>
    </Link>
  );
}

// ─── FollowedFeed ─────────────────────────────────────────────────────────────

export function FollowedFeed() {
  const { isLoggedIn } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    const fetchFeed = async () => {
      try {
        const probeRes = await fetch('/api/follows/feed?limit=1');
        if (!probeRes.ok) {
          setTotal(0);
          return;
        }

        const probeData: FeedResponse = await probeRes.json();
        setTotal(probeData.total);

        if (probeData.total > 0) {
          const feedRes = await fetch('/api/follows/feed?limit=10');
          if (feedRes.ok) {
            const feedData: FeedResponse = await feedRes.json();
            setPosts(feedData.posts ?? []);
          }
        }
      } catch {
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;
  if (loading) return null;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-fantasy text-2xl font-semibold text-amber-900">Your Feed</h2>
        {total !== null && total > posts.length && (
          <span className="text-xs text-amber-600">{total} total</span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-amber-700 italic">
          Follow characters, kinships, or users to see their content here.
        </p>
      ) : (
        <div className="rounded-lg border border-amber-800/20 bg-amber-50/50 py-1">
          {posts.map((post, i) => (
            <div key={post.post_id}>
              {i > 0 && <div className="mx-3 border-t border-amber-100" />}
              <FeedRow post={post} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
