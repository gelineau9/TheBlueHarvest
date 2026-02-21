'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { ProfileForm } from '@/components/profiles/profile-form';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';

export default function CreateKinshipPage() {
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

  const handleSuccess = (profileId: number) => {
    router.push(`/profiles/${profileId}`);
  };

  const handleCancel = () => {
    router.push('/profiles/create');
  };

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/profiles/create"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile Types
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-amber-600 text-white">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold text-amber-900">Create Kinship Profile</h1>
          </div>
          <p className="text-lg text-amber-700">Establish a kinship, guild, or fellowship</p>
        </div>

        <div className="bg-white rounded-lg border border-amber-300 p-8 shadow-sm">
          <ProfileForm profileTypeId={3} onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
