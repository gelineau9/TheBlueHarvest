'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { CollectionTypeSelector } from '@/components/collections/collection-type-selector';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getCollectionTypeById } from '@/config/collection-types';

export default function CreateCollectionPage() {
  const router = useRouter();
  const { isAuthorized, isLoading } = useRequireAuth();
  const [selectedType, setSelectedType] = useState<number | null>(null);

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

  const handleContinue = () => {
    if (selectedType) {
      const typeConfig = getCollectionTypeById(selectedType);
      if (typeConfig) {
        router.push(`/collections/create/${typeConfig.slug}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create New Collection</h1>
          <p className="text-lg text-amber-700">Choose the type of collection you'd like to create</p>
        </div>

        {/* Collection Type Selector */}
        <div className="mb-8">
          <CollectionTypeSelector selectedType={selectedType} onSelectType={setSelectedType} />
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
