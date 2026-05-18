'use client';

import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { WritingForm } from '@/components/posts/writing-form';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSidebarRefresh } from '@/contexts/SidebarRefreshContext';

export default function CreateWritingPage() {
  const router = useRouter();
  const { isAuthorized, isLoading } = useRequireAuth();
  const { triggerSidebarRefresh } = useSidebarRefresh();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-amber-700">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const handleSuccess = (postId: number) => {
    triggerSidebarRefresh();
    router.push(`/posts/${postId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/posts/create"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post Types
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create Writing</h1>
          <p className="text-lg text-amber-700">
            Share a story, poem, journal entry, or any other written work with the community.
          </p>
        </div>

        <Card className="border-amber-300 bg-white/80">
          <CardContent className="pt-6">
            <WritingForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
