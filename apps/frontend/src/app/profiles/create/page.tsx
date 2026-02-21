'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ProfileTypeSelector } from '@/components/profiles/profile-type-selector';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getProfileTypeById } from '@/config/profile-types';

export default function CreateProfilePage() {
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
      const typeConfig = getProfileTypeById(selectedType);
      if (typeConfig) {
        router.push(`/profiles/create/${typeConfig.slug}`);
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
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create New Profile</h1>
          <p className="text-lg text-amber-700">
            Choose the type of profile you'd like to create for your roleplay community
          </p>
        </div>

        {/* Profile Type Selector */}
        <div className="mb-8">
          <ProfileTypeSelector selectedType={selectedType} onSelectType={setSelectedType} />
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
