'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { WritingForm } from '@/components/posts/writing-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateWritingPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  // Redirect to home if not logged in
  if (!isLoading && !isLoggedIn) {
    router.push('/');
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-amber-700">Loading...</div>
      </div>
    );
  }

  const handleSuccess = (postId: number) => {
    router.push(`/posts/${postId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card className="border-amber-300 bg-white/80">
        <CardHeader>
          <CardTitle className="text-2xl text-amber-900">Create Writing</CardTitle>
          <CardDescription className="text-amber-700">
            Share a story, poem, journal entry, or any other written work with the community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WritingForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}
