'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { POST_TYPE_ROUTES } from '@/hooks/usePostEdit';

/**
 * Router page for post editing.
 * Fetches the post type and redirects to the appropriate type-specific edit page.
 */
export default function EditPostRouterPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostType = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }

        const data = await response.json();

        // Check if user can edit this post
        if (!data.can_edit) {
          setError('You do not have permission to edit this post');
          return;
        }

        // Redirect to the correct type-specific edit page
        const typeRoute = POST_TYPE_ROUTES[data.post_type_id];
        if (typeRoute) {
          router.replace(`/posts/${id}/edit/${typeRoute}`);
        } else {
          setError('Unknown post type');
        }
      } catch {
        setError('An error occurred while loading the post');
      }
    };

    fetchPostType();
  }, [id, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error}</h1>
            <p className="text-amber-700 mb-6">
              {error === 'You do not have permission to edit this post'
                ? 'You can only edit posts that you authored.'
                : "The post you're looking for could not be found."}
            </p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state while fetching post type
  return (
    <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
      <div className="text-amber-900">Loading...</div>
    </div>
  );
}
