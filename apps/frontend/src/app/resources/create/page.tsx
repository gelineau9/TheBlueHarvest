import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/app/lib/actions';
import { GuideForm } from '@/components/resources/guide-form';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = { title: 'Create a Guide — The Brandy Hall Archives' };

export default async function CreateGuidePage() {
  const session = await getSession();
  const roles = session.roles ?? [];
  const mayAuthor = roles.includes('guide_author') || roles.includes('admin') || roles.includes('moderator');

  if (!session.isLoggedIn || !mayAuthor) {
    redirect('/');
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/resources"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Resources
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900">Create A New Guide</h1>
        </div>

        <Card className="border-amber-300 bg-white/80">
          <CardContent className="pt-6">
            <GuideForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
