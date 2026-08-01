import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/app/lib/actions';
import { GuideEditLoader } from '@/components/resources/guide-edit-loader';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = { title: 'Edit Guide — The Brandy Hall Archives' };

export default async function EditGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  const roles = session.roles ?? [];
  const mayAuthor = roles.includes('guide_author') || roles.includes('admin') || roles.includes('moderator');

  if (!session.isLoggedIn || !mayAuthor) {
    redirect('/');
  }

  const { slug } = await params;

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/my/guides"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Guides
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900">Edit Guide</h1>
        </div>

        <Card className="border-amber-300 bg-white/80">
          <CardContent className="pt-6">
            <GuideEditLoader slug={slug} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
