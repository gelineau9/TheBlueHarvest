'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventForm } from '@/components/posts/event-form';

export default function CreateEventPostPage() {
  const router = useRouter();

  const handleSuccess = (postId: number) => {
    router.push(`/posts/${postId}`);
  };

  const handleCancel = () => {
    router.push('/posts/create');
  };

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/posts/create"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post Types
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create Event</h1>
          <p className="text-lg text-amber-700">Announce an upcoming event or gathering</p>
        </div>

        <div className="bg-white/80 border border-amber-300 rounded-lg p-6 md:p-8">
          <EventForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
