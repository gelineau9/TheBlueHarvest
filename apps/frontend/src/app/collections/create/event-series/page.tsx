'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { CollectionForm } from '@/components/collections/collection-form';

export default function CreateEventSeriesPage() {
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

  return <CollectionForm collectionTypeId={5} collectionTypeName="event series" collectionTypeLabel="Event Series" />;
}
