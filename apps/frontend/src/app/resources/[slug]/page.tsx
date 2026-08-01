import Link from 'next/link';
import NextImage from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { API_CONFIG } from '@/config/api';
import { GuideSections } from '@/components/resources/guide-sections';
import type { Resource } from '@/types/resources';

export const revalidate = 300;

async function getResource(slug: string): Promise<Resource | null> {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/resources/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = await getResource(slug);
  if (!resource) return { title: 'Not found — The Brandy Hall Archives' };

  return {
    title: `${resource.title} — The Brandy Hall Archives`,
    description: resource.summary ?? undefined,
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = await getResource(slug);

  if (!resource) notFound();

  const sections = resource.content?.sections ?? [];
  const headerImage = resource.content?.headerImage;
  const updated = new Date(resource.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/resources" className="mb-4 inline-flex items-center gap-1 text-sm text-amber-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All resources
      </Link>

      {headerImage?.url && (
        <div className="relative mb-6 aspect-[16/6] w-full overflow-hidden rounded-lg border border-amber-800/20">
          <NextImage
            src={headerImage.url}
            alt=""
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
            priority
          />
        </div>
      )}

      <header className="mb-6">
        <h1 className="font-fantasy text-4xl font-bold text-amber-900">{resource.title}</h1>
        {resource.summary && <p className="mt-2 text-amber-800">{resource.summary}</p>}
        <p className="mt-3 text-xs text-amber-600">
          {resource.author_username ? `Written by ${resource.author_username}` : 'The Brandy Hall Archives'} · Updated{' '}
          {updated}
        </p>
      </header>

      <GuideSections sections={sections} />
    </article>
  );
}
