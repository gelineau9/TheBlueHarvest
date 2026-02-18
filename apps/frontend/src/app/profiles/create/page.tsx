'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { ProfileTypeSelector } from '@/components/profiles/profile-type-selector';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateProfilePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<number | null>(null);

  // Authentication guard
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading...</div>
      </div>
    );
  }

  // Don't render content if not logged in (will redirect)
  if (!isLoggedIn) {
    return null;
  }

  const handleContinue = () => {
    if (selectedType) {
      // Map profile type ID to route name
      const typeRoutes: { [key: number]: string } = {
        1: 'character',
        2: 'item',
        3: 'kinship',
        4: 'organization',
        5: 'location',
      };

      const typeName = typeRoutes[selectedType];
      router.push(`/profiles/create/${typeName}`);
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
