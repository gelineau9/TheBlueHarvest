'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Users, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
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

// ─── Mini post card ───────────────────────────────────────────────────────────

function FeedCard({ post }: { post: FeedPost }) {
  const body = typeof post.content?.body === 'string' ? post.content.body : '';
  const preview = body.replace(/<[^>]*>/g, '').slice(0, 180);

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/posts/${post.post_id}`} className="block h-full">
      <Card className="flex h-full flex-col gap-3 border-amber-800/20 bg-amber-50/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <span className="inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {post.type_name}
        </span>
        <h3 className="line-clamp-2 font-fantasy text-base font-semibold text-amber-900 leading-snug">
          {post.title}
        </h3>
        {preview && (
          <p className="line-clamp-3 flex-1 text-sm text-amber-800/80 leading-relaxed">{preview}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-600">
          {post.primary_author_name && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              <span className="max-w-[90px] truncate">{post.primary_author_name}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" aria-hidden="true" />
            <span className="max-w-[80px] truncate">{post.username}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {date}
          </span>
        </div>
      </Card>
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
        // Probe total first
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

  // Not logged in — render nothing
  if (!isLoggedIn) return null;

  // Still probing
  if (loading) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-fantasy text-2xl font-semibold text-amber-900">Your Feed</h2>

      {total === 0 ? (
        <div className="rounded-lg border border-amber-800/20 bg-amber-50/80 px-5 py-6 text-sm text-amber-700">
          Follow characters, kinships, or users to see their content here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <FeedCard key={post.post_id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
