'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { CollectionForm } from '@/components/collections/collection-form';
import { getCollectionTypeBySlug } from '@/config/collection-types';

interface CreateCollectionTypePageProps {
  params: Promise<{ type: string }>;
}

export default function CreateCollectionTypePage({ params }: CreateCollectionTypePageProps) {
  const { isAuthorized, isLoading } = useRequireAuth();

  // Unwrap params (Next.js 15 async params)
  const resolvedParams = use(params);
  const typeConfig = getCollectionTypeBySlug(resolvedParams.type);

  if (!typeConfig) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <CollectionForm
      collectionTypeId={typeConfig.id}
      collectionTypeName={typeConfig.name}
      collectionTypeLabel={typeConfig.label}
    />
  );
}
