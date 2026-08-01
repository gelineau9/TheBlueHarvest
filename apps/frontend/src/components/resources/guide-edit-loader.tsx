'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GuideForm } from '@/components/resources/guide-form';
import type { Resource } from '@/types/resources';

/**
 * Loads a guide for editing via the authenticated manage list rather than the
 * public slug endpoint, because unpublished drafts are deliberately invisible
 * to the public route.
 */
export function GuideEditLoader({ slug }: { slug: string }) {
  const [guide, setGuide] = useState<Resource | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/resources/manage?type=guide');
        if (!response.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data = await response.json();
        const match = (data.resources ?? []).find((r: Resource) => r.slug === slug);
        if (cancelled) return;

        if (!match) {
          setStatus('notfound');
          return;
        }
        setGuide(match);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === 'loading') {
    return <p className="text-sm text-amber-700">Loading guide…</p>;
  }

  if (status === 'notfound') {
    return (
      <div className="rounded-lg border border-amber-800/20 bg-amber-50/70 px-4 py-6">
        <p className="text-sm text-amber-800">
          That guide could not be found, or you do not have permission to edit it.
        </p>
        <Link href="/my/guides" className="mt-2 inline-block text-sm text-amber-900 underline">
          Back to My Guides
        </Link>
      </div>
    );
  }

  if (status === 'error' || !guide) {
    return <p className="text-sm text-red-500">Something went wrong loading this guide.</p>;
  }

  return <GuideForm guide={guide} />;
}
