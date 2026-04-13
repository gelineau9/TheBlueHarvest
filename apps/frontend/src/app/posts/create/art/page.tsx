'use client';

import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ArtForm } from '@/components/posts/art-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSidebarRefresh } from '@/contexts/SidebarRefreshContext';

export default function CreateArtPostPage() {
  const router = useRouter();
  const { isAuthorized, isLoading } = useRequireAuth();
  const { triggerSidebarRefresh } = useSidebarRefresh();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-amber-900">Loading...</div>
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
    router.push('/posts/create');
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/posts/create"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post Types
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create Art Post</h1>
          <p className="text-lg text-amber-700">Share your visual artwork and illustrations</p>
        </div>

        <div className="bg-white rounded-lg border border-amber-300 p-6 shadow-sm">
          <ArtForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
