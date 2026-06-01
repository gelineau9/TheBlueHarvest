'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Image as ImageIcon, User, Users, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ContentCarousel } from '@/components/content-carousel';
import { LikeButton } from '@/components/likes/LikeButton';
import type { PublicPost, PublicPostsResponse } from '@/types/posts';

const STORAGE_KEY = 'art-view-mode';

function ArtCard({ post }: { post: PublicPost }) {
  // Art posts store images as content.images[0].url (absolute URL from backend)
  const thumbnailUrl = post.content?.images?.[0]?.url ?? null;

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/posts/${post.post_id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden border-amber-800/20 bg-amber-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        {/* Image or placeholder */}
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-amber-100">
          {thumbnailUrl ? (
            <NextImage
              fill
              src={thumbnailUrl}
              alt={post.title}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-amber-300" aria-hidden="true" />
            </div>
          )}
          {/* Gradient overlay on image */}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 to-transparent" />
          {/* Title overlaid on image */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="line-clamp-1 font-fantasy text-sm font-semibold text-amber-50 drop-shadow-sm">
              {post.title}
            </h3>
          </div>
        </div>

        {/* Meta below image */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs text-amber-600">
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

function ArtListItem({ post }: { post: PublicPost }) {
  const thumbnailUrl = post.content?.images?.[0]?.url ?? null;

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/posts/${post.post_id}`}
      className="flex items-center gap-4 py-3 hover:bg-amber-50/60 transition-colors px-1 rounded"
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-amber-100">
        {thumbnailUrl ? (
          <NextImage fill src={thumbnailUrl} alt={post.title} sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-amber-300" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800 mb-0.5">Artwork</p>
        <h3 className="font-fantasy text-sm font-semibold text-amber-900 leading-snug line-clamp-1">{post.title}</h3>
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

export function ArtCarousel() {
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

    fetch('/api/posts/public?post_type_id=2&limit=12&sortBy=created_at&order=desc', {
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
      title="Recent Artwork"
      viewAllHref="/archive?postTypes=2"
      items={posts}
      isLoading={isLoading}
      emptyMessage="No artwork posted yet — be the first to share something."
      renderItem={(post) => <ArtCard post={post} />}
      listView={listView}
      onToggleView={handleToggleView}
      renderListItem={(post) => <ArtListItem key={post.post_id} post={post} />}
    />
  );
}
