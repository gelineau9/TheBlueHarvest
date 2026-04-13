'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { User, Users, Calendar } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { LikeButton } from '@/components/likes/LikeButton';

interface PostContent {
  body?: string;
  images?: Array<{ filename: string; url: string; originalName: string }>;
  headerImage?: { filename: string; url: string; originalName: string };
  description?: string;
  eventDateTime?: string;
  location?: string;
  [key: string]: unknown;
}

interface SpotlightItem {
  post_id: number;
  post_type_id: number;
  title: string;
  content: PostContent | null;
  type_name: string;
  username: string;
  primary_author_id: number | null;
  primary_author_name: string | null;
  like_count: number;
  source: 'featured' | 'today' | 'trending';
  display_order: number | null;
  created_at: string;
}

interface SpotlightResponse {
  items: SpotlightItem[];
  total: number;
}

// ── Source badge ─────────────────────────────────────────────────────────────

const SOURCE_STYLES: Record<SpotlightItem['source'], string> = {
  featured: 'bg-amber-100/90 text-amber-700 border border-amber-300',
  today: 'bg-green-100/90 text-green-700 border border-green-300',
  trending: 'bg-rose-100/90 text-rose-700 border border-rose-300',
};

const SOURCE_LABELS: Record<SpotlightItem['source'], string> = {
  featured: 'Featured',
  today: 'Today',
  trending: 'Trending',
};

function SourceBadge({ source }: { source: SpotlightItem['source'] }) {
  return (
    <span className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${SOURCE_STYLES[source]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

// ── Thumbnail resolution ──────────────────────────────────────────────────────

function getThumbnailUrl(item: SpotlightItem): string | null {
  if (item.post_type_id === 2 || item.post_type_id === 3) {
    return item.content?.images?.[0]?.url ?? null;
  }
  if (item.post_type_id === 4) {
    return item.content?.headerImage?.url ?? null;
  }
  return null;
}

// ── Slide card ────────────────────────────────────────────────────────────────

function SpotlightSlide({ item }: { item: SpotlightItem }) {
  const thumbnailUrl = getThumbnailUrl(item);

  const date = new Date(item.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const preview =
    item.post_type_id === 1 && typeof item.content?.body === 'string'
      ? item.content.body.replace(/<[^>]*>/g, '').slice(0, 280)
      : item.content?.description
        ? item.content.description.slice(0, 280)
        : null;

  // ── Image variant — full-bleed hero with text overlay ──────────────────────
  if (thumbnailUrl) {
    return (
      <Link href={`/posts/${item.post_id}`} className="block w-full">
        <div className="relative w-full aspect-[16/7] overflow-hidden bg-amber-900">
          <NextImage
            fill
            src={thumbnailUrl}
            alt={item.title}
            sizes="100vw"
            className="object-cover transition-transform duration-500 hover:scale-[1.02]"
            priority
          />
          {/* Dark gradient overlay — heavier at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-950/85 via-amber-950/30 to-transparent" />

          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-2">
            <SourceBadge source={item.source} />
            <h2 className="font-fantasy text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-50 drop-shadow leading-tight line-clamp-2">
              {item.title}
            </h2>
            {preview && (
              <p className="hidden sm:block text-sm text-amber-200/90 leading-relaxed line-clamp-2 max-w-2xl">
                {preview}
              </p>
            )}
            <MetaRow item={item} date={date} light />
          </div>
        </div>
      </Link>
    );
  }

  // ── Text variant — parchment background with large type ───────────────────
  return (
    <Link href={`/posts/${item.post_id}`} className="block w-full">
      <div className="relative w-full aspect-[16/7] overflow-hidden bg-[#f0ddb0] flex flex-col justify-end p-6 sm:p-8 space-y-2 border-b border-amber-800/20">
        {/* Subtle parchment texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-amber-300/20 pointer-events-none" />
        <div className="relative space-y-2">
          <SourceBadge source={item.source} />
          <h2 className="font-fantasy text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900 leading-tight line-clamp-2">
            {item.title}
          </h2>
          {preview && (
            <p className="hidden sm:block text-sm text-amber-800/80 leading-relaxed line-clamp-3 max-w-2xl">
              {preview}
            </p>
          )}
          <MetaRow item={item} date={date} light={false} />
        </div>
      </div>
    </Link>
  );
}

// ── Shared meta row ───────────────────────────────────────────────────────────

function MetaRow({ item, date, light }: { item: SpotlightItem; date: string; light: boolean }) {
  const text = light ? 'text-amber-200' : 'text-amber-700';
  const linkHover = light ? 'hover:text-amber-50' : 'hover:text-amber-900';

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${text}`}>
      {item.primary_author_name && (
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden="true" />
          <span className="max-w-[120px] truncate">{item.primary_author_name}</span>
        </span>
      )}
      <span className="flex items-center gap-1">
        <User className="h-3 w-3" aria-hidden="true" />
        <Link
          href={`/users/${item.username}`}
          onClick={(e) => e.stopPropagation()}
          className={`max-w-[100px] truncate ${linkHover} hover:underline`}
        >
          {item.username}
        </Link>
      </span>
      <span className="flex items-center gap-1">
        <Calendar className="h-3 w-3" aria-hidden="true" />
        {date}
      </span>
      <LikeButton type="post" id={item.post_id} initialLikeCount={item.like_count} initialLikedByMe={null} passive />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SpotlightSkeleton() {
  return <div className="w-full aspect-[16/7] animate-pulse bg-amber-100/80" aria-hidden="true" />;
}

// ── Carousel ─────────────────────────────────────────────────────────────────

export function SpotlightCarousel() {
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const pausedRef = useRef(false);

  // Fetch spotlight items
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/spotlight', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: SpotlightResponse) => setItems(data.items))
      .catch((err) => {
        if (err !== 'AbortError') setFetchError(true);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  // Autoscroll: 8 s interval, pauses on hover, never stops on arrow click
  useEffect(() => {
    if (!api || items.length <= 1) return;

    const timer = setInterval(() => {
      if (!pausedRef.current) {
        api.scrollNext();
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [api, items.length]);

  if (isLoading) {
    return <SpotlightSkeleton />;
  }

  if (fetchError || items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Spotlight"
      className="relative w-full mb-10"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <Carousel opts={{ align: 'start', loop: true }} setApi={setApi} className="w-full">
        <CarouselContent className="ml-0">
          {items.map((item) => (
            <CarouselItem key={item.post_id} className="pl-0 basis-full">
              <SpotlightSlide item={item} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Prev / Next — positioned absolutely over the image */}
        <CarouselPrevious
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 border-amber-50/40 bg-amber-950/40 text-amber-50 hover:bg-amber-950/70 hover:text-amber-50 backdrop-blur-sm"
          aria-label="Previous spotlight slide"
        />
        <CarouselNext
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 border-amber-50/40 bg-amber-950/40 text-amber-50 hover:bg-amber-950/70 hover:text-amber-50 backdrop-blur-sm"
          aria-label="Next spotlight slide"
        />
      </Carousel>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" aria-hidden="true">
          {items.map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-amber-50/60" />
          ))}
        </div>
      )}
    </section>
  );
}
