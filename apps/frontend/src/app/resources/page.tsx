import Link from 'next/link';
import NextImage from 'next/image';
import { BookOpen } from 'lucide-react';
import { API_CONFIG } from '@/config/api';
import type { Resource } from '@/types/resources';

export const metadata = {
  title: 'Resources — The Brandy Hall Archives',
  description: 'Guides and reference material for roleplay on LOTRO’s Meriadoc server.',
};

// Official content changes rarely; revalidate rather than hitting the API per view.
export const revalidate = 300;

async function getGuides(): Promise<Resource[]> {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/resources?type=guide`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.resources ?? [];
  } catch {
    return [];
  }
}

export default async function ResourcesPage() {
  const guides = await getGuides();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-amber-900 mb-2 font-fantasy">Resources</h1>
        <p className="text-amber-700">
          Guides and reference material for roleplay on <em>The Lord of the Rings Online</em>’s Meriadoc server.
        </p>
      </header>

      {guides.length === 0 ? (
        <div className="rounded-lg border border-amber-800/20 bg-amber-50/50 px-4 py-8 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-700 italic">No guides have been published yet. Check back soon.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => (
            <li key={guide.resource_id}>
              <Link
                href={`/resources/${guide.slug}`}
                className="flex gap-4 rounded-lg border border-amber-800/20 bg-amber-50/90 p-4 transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md"
              >
                {guide.content?.headerImage?.url ? (
                  <div className="relative hidden h-20 w-32 shrink-0 overflow-hidden rounded sm:block">
                    <NextImage src={guide.content.headerImage.url} alt="" fill sizes="128px" className="object-cover" />
                  </div>
                ) : (
                  <div className="hidden h-20 w-32 shrink-0 items-center justify-center rounded bg-amber-100 sm:flex">
                    <BookOpen className="h-6 w-6 text-amber-600" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="font-fantasy text-lg font-semibold text-amber-900">{guide.title}</h2>
                  {guide.summary && <p className="mt-1 line-clamp-2 text-sm text-amber-800/80">{guide.summary}</p>}
                  {guide.author_username && <p className="mt-2 text-xs text-amber-600">by {guide.author_username}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
