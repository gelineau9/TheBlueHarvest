'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Users, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ContentCarousel } from '@/components/content-carousel';
import { LikeButton } from '@/components/likes/LikeButton';
import type { PublicPost, PublicPostsResponse } from '@/types/posts';

const STORAGE_KEY = 'writing-view-mode';

function WritingCard({ post }: { post: PublicPost }) {
  const preview = typeof post.content?.body === 'string' ? post.content.body.replace(/<[^>]*>/g, '').slice(0, 180) : '';

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/posts/${post.post_id}`} className="block h-full">
      <Card className="flex h-full flex-col gap-3 border-amber-800/20 bg-amber-50/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        {/* Type badge */}
        <span className="inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          Writing
        </span>

        {/* Title */}
        <h3 className="line-clamp-2 font-fantasy text-base font-semibold text-amber-900 leading-snug">{post.title}</h3>

        {/* Preview excerpt */}
        {preview && <p className="line-clamp-3 flex-1 text-sm text-amber-800/80 leading-relaxed">{preview}</p>}

        {/* Meta */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-600">
          {post.primary_author_name && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              <span className="max-w-[90px] truncate">{post.primary_author_name}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" aria-hidden="true" />
            <Link
              href={`/users/${post.username}`}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[80px] truncate hover:underline"
            >
              {post.username}
            </Link>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {date}
          </span>
          <LikeButton
            type="post"
            id={post.post_id}
            initialLikeCount={post.like_count}
            initialLikedByMe={post.liked_by_me}
            passive
          />
        </div>
      </Card>
    </Link>
  );
}

function WritingListItem({ post }: { post: PublicPost }) {
  const preview = typeof post.content?.body === 'string' ? post.content.body.replace(/<[^>]*>/g, '').slice(0, 120) : '';

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/posts/${post.post_id}`}
      className="flex items-start gap-4 py-3 hover:bg-amber-50/60 transition-colors px-1 rounded"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800 mb-0.5">Writing</p>
        <h3 className="font-fantasy text-sm font-semibold text-amber-900 leading-snug line-clamp-1">{post.title}</h3>
        {preview && <p className="text-xs text-amber-800/70 line-clamp-1 mt-0.5">{preview}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-x-3 text-xs text-amber-600 mt-0.5">
        {post.primary_author_name && (
          <span className="flex items-center gap-1 max-w-[80px] truncate">
            <Users className="h-3 w-3" aria-hidden="true" />
            {post.primary_author_name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {date}
        </span>
        <LikeButton
          type="post"
          id={post.post_id}
          initialLikeCount={post.like_count}
          initialLikedByMe={post.liked_by_me}
          passive
        />
      </div>
    </Link>
  );
}

export function WritingCarousel() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listView, setListView] = useState(false);

  // Hydrate view preference from localStorage (client-only)
  useEffect(() => {
    try {
      setListView(localStorage.getItem(STORAGE_KEY) === 'list');
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/posts/public?post_type_id=1&limit=12&sortBy=created_at&order=desc', {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: PublicPostsResponse) => setPosts(data.posts))
      .catch((err) => {
        if (err !== 'AbortError') {
          // Silently degrade — carousel shows empty state
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const handleToggleView = () => {
    const next = !listView;
    setListView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'list' : 'card');
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <ContentCarousel
      title="Recent Writing"
      viewAllHref="/archive?postTypes=1"
      items={posts}
      isLoading={isLoading}
      emptyMessage="No writing posts yet — be the first to share a story."
      renderItem={(post) => <WritingCard post={post} />}
      listView={listView}
      onToggleView={handleToggleView}
      renderListItem={(post) => <WritingListItem key={post.post_id} post={post} />}
    />
  );
}
