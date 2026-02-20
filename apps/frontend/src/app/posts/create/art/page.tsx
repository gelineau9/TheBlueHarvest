'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { ArtForm } from '@/components/posts/art-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateArtPostPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const handleSuccess = (postId: number) => {
    router.push(`/posts/${postId}`);
  };

  const handleCancel = () => {
    router.push('/posts/create');
  };

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/posts/create" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post Types
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create Art Post</h1>
          <p className="text-lg text-amber-700">
            Share your visual artwork and illustrations
          </p>
        </div>

        <div className="bg-white rounded-lg border border-amber-300 p-6 shadow-sm">
          <ArtForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
