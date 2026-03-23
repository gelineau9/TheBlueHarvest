'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { ArrowLeft, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemProfile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  details: { description?: string; avatar?: { url: string } } | null;
}

interface ItemsResponse {
  profiles: ItemProfile[];
  total: number;
  hasMore?: boolean;
}

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: ItemProfile }) {
  return (
    <Link href={`/profiles/${item.profile_id}`} className="block">
      <Card className="flex flex-col items-center gap-3 border-amber-800/20 bg-amber-50/90 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-amber-200 bg-amber-100 flex-shrink-0">
          {item.details?.avatar?.url ? (
            <NextImage fill src={item.details.avatar.url} alt={item.name} sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-10 w-10 text-amber-300" />
            </div>
          )}
        </div>
        <div>
          <p className="line-clamp-2 text-sm font-semibold text-amber-900 leading-snug">{item.name}</p>
          {item.details?.description && (
            <p className="mt-1 line-clamp-2 text-xs text-amber-600">{item.details.description}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 18;

export default function ProfileItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [items, setItems] = useState<ItemProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const buildUrl = (currentOffset: number) =>
    `/api/profiles/public?parent_profile_id=${id}&limit=${PAGE_SIZE}&offset=${currentOffset}`;

  useEffect(() => {
    setIsLoading(true);
    setOffset(0);
    setItems([]);

    fetch(buildUrl(0))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ItemsResponse) => {
        setItems(data.profiles || []);
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
      })
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setIsLoadingMore(true);

    fetch(buildUrl(newOffset))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ItemsResponse) => {
        setItems((prev) => [...prev, ...(data.profiles || [])]);
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
          <Package className="w-6 h-6 text-amber-800" />
          <h1 className="text-3xl font-bold text-amber-900">Items</h1>
          {!isLoading && <span className="text-sm text-amber-600">({total})</span>}
        </div>

        {/* Grid */}
        {isLoading ? (
          <p className="text-amber-700 text-center py-12">Loading items…</p>
        ) : items.length === 0 ? (
          <Card className="p-8 bg-white border-amber-300 text-center">
            <Package className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-amber-700 italic">No items owned by this character yet.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((item) => (
                <ItemCard key={item.profile_id} item={item} />
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
