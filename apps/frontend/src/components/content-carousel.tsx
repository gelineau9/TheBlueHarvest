'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutGrid, LayoutList } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface ContentCarouselProps<T> {
  title: string;
  viewAllHref?: string;
  items: T[];
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Message shown when items array is empty and not loading */
  emptyMessage?: string;
  /** When provided, shows a card/list toggle button in the header */
  listView?: boolean;
  onToggleView?: () => void;
  /** Renders a compact row for list mode; required when listView is used */
  renderListItem?: (item: T, index: number) => React.ReactNode;
}

/**
 * Generic carousel shell.
 *
 * - Shows 1 card on mobile, 2 on sm, 3 from md upward (basis-full / 1/2 / 1/3)
 * - Renders skeleton placeholders while loading
 * - Delegates card rendering entirely to the renderItem render-prop so each
 *   domain carousel (writing, art) can provide its own card shape
 * - Supports an optional card/list view toggle via listView + onToggleView props
 */
export function ContentCarousel<T>({
  title,
  viewAllHref,
  items,
  isLoading,
  renderItem,
  emptyMessage = 'Nothing here yet — check back soon.',
  listView = false,
  onToggleView,
  renderListItem,
}: ContentCarouselProps<T>) {
  return (
    <section aria-label={title} className="mb-10 px-4">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-fantasy text-2xl font-semibold text-amber-900">{title}</h2>
        <div className="flex items-center gap-3">
          {onToggleView && (
            <button
              type="button"
              onClick={onToggleView}
              aria-label={listView ? 'Switch to card view' : 'Switch to list view'}
              className="rounded p-1 text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors"
            >
              {listView ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </button>
          )}
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline">
              View all →
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        /* Skeleton row — 3 placeholder cards matching carousel item sizing */
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="min-w-0 shrink-0 basis-full sm:basis-1/2 md:basis-1/3 pl-4" aria-hidden="true">
              <div className="h-52 animate-pulse rounded-lg border border-amber-800/20 bg-amber-100/60" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-amber-700/70">{emptyMessage}</p>
      ) : listView && renderListItem ? (
        <div className="flex flex-col divide-y divide-amber-200">
          {items.map((item, index) => renderListItem(item, index))}
        </div>
      ) : (
        <Carousel opts={{ align: 'start' }} className="w-full">
          <CarouselContent>
            {items.map((item, index) => (
              <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3">
                {renderItem(item, index)}
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Prev / Next controls */}
          <div className="mt-4 flex justify-center gap-2">
            <CarouselPrevious
              className="relative inset-0 h-8 w-8 translate-y-0 border-amber-800/30 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
              aria-label={`Previous ${title} slide`}
            />
            <CarouselNext
              className="relative inset-0 h-8 w-8 translate-y-0 border-amber-800/30 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
              aria-label={`Next ${title} slide`}
            />
          </div>
        </Carousel>
      )}
    </section>
  );
}
