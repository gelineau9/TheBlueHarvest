'use client';

import { use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ProfileForm } from '@/components/profiles/profile-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getProfileTypeBySlug } from '@/config/profile-types';

interface CreateProfileTypePageProps {
  params: Promise<{ type: string }>;
}

export default function CreateProfileTypePage({ params }: CreateProfileTypePageProps) {
  const router = useRouter();
  const { isAuthorized, isLoading } = useRequireAuth();

  // Unwrap params (Next.js 15 async params)
  const resolvedParams = use(params);
  const typeConfig = getProfileTypeBySlug(resolvedParams.type);

  if (!typeConfig) {
    notFound();
  }

  const Icon = typeConfig.icon;

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
              <Icon className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold text-amber-900">Create {typeConfig.label} Profile</h1>
          </div>
          <p className="text-lg text-amber-700">{typeConfig.description}</p>
        </div>

        <div className="bg-white rounded-lg border border-amber-300 p-8 shadow-sm">
          <ProfileForm profileTypeId={typeConfig.id} onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
