'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import type { Resource } from '@/types/resources';

export default function MyGuidesPage() {
  const router = useRouter();
  const { isLoading, isGuideAuthor, isAdmin, isModerator, accountId } = useAuth();
  const [guides, setGuides] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mayAuthor = isGuideAuthor || isAdmin || isModerator;

  const fetchGuides = useCallback(async () => {
    try {
      const response = await fetch('/api/resources/manage?type=guide');
      if (!response.ok) {
        setError('Could not load guides.');
        return;
      }
      const data = await response.json();
      setGuides(data.resources ?? []);
    } catch {
      setError('Could not load guides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!mayAuthor) {
      router.replace('/');
      return;
    }
    fetchGuides();
  }, [isLoading, mayAuthor, router, fetchGuides]);

  async function handleDelete(resourceId: number, title: string) {
    if (!window.confirm(`Delete “${title}”? This cannot be undone from here.`)) return;

    const response = await fetch(`/api/resources/${resourceId}`, { method: 'DELETE' });
    if (response.ok) {
      fetchGuides();
    } else {
      setError('Could not delete that guide.');
    }
  }

  if (isLoading || loading) {
    return <p className="p-8 text-sm text-amber-700">Loading…</p>;
  }

  if (!mayAuthor) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-fantasy text-3xl font-bold text-amber-900">My Guides</h1>
          <p className="text-amber-700">Guides you have written for the Resources section</p>
        </div>
        <Link href="/resources/create">
          <Button className="bg-amber-900 text-amber-50">
            <Plus className="mr-1 h-4 w-4" />
            New Guide
          </Button>
        </Link>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {guides.length === 0 ? (
        <div className="rounded-lg border border-amber-800/20 bg-amber-50/50 px-4 py-8 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-700 italic">You haven’t written any guides yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {guides.map((guide) => {
            const isOwn = guide.created_by === accountId;
            return (
              <li
                key={guide.resource_id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-800/20 bg-amber-50/90 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-fantasy text-lg font-semibold text-amber-900">{guide.title}</h2>
                    {guide.is_published ? (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900">Published</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Draft</span>
                    )}
                    {!isOwn && guide.author_username && (
                      <span className="text-xs text-amber-600">by {guide.author_username}</span>
                    )}
                  </div>
                  {guide.summary && <p className="mt-1 line-clamp-1 text-sm text-amber-800/80">{guide.summary}</p>}
                </div>

                <div className="flex gap-2">
                  {guide.is_published && (
                    <Link href={`/resources/${guide.slug}`}>
                      <Button variant="outline" className="border-amber-300 text-amber-700">
                        View
                      </Button>
                    </Link>
                  )}
                  <Link href={`/resources/${guide.slug}/edit`}>
                    <Button variant="outline" className="border-amber-900 text-amber-900">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(guide.resource_id, guide.title)}
                    className="border-red-300 text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
