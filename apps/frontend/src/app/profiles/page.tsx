'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileCard } from '@/components/profiles/profile-card';
import { Card } from '@/components/ui/card';

interface Profile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  created_at: string;
  username: string;
}

interface ProfilesResponse {
  profiles: Profile[];
  total: number;
  hasMore: boolean;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch('/api/profiles/public?limit=20&offset=0');

        if (!response.ok) {
          setError('Failed to load profiles');
          return;
        }

        const data: ProfilesResponse = await response.json();
        setProfiles(data.profiles);
        setTotal(data.total);
      } catch (err) {
        setError('An error occurred while loading profiles');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-amber-900 mb-8">Profile Catalog</h1>

          {/* Loading Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 bg-white border-amber-300 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-100" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-20 bg-amber-100 rounded" />
                    <div className="h-6 w-3/4 bg-amber-100 rounded" />
                    <div className="space-y-2">
                      <div className="h-3 w-1/2 bg-amber-100 rounded" />
                      <div className="h-3 w-1/3 bg-amber-100 rounded" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error}</h1>
            <p className="text-amber-700">Please try again later.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="flex items-baseline justify-between">
            <h1 className="text-4xl font-bold text-amber-900">Profile Catalog</h1>
            <p className="text-sm text-amber-700">
              {total} {total === 1 ? 'profile' : 'profiles'} total
            </p>
          </div>
        </div>

        {/* Empty State */}
        {profiles.length === 0 && (
          <Card className="p-12 bg-white border-amber-300 text-center">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">No profiles yet</h2>
            <p className="text-amber-700 mb-6">Be the first to create a profile!</p>
            <Link
              href="/profiles/create"
              className="inline-block px-6 py-3 bg-amber-800 text-amber-50 rounded-md hover:bg-amber-700 transition-colors font-semibold"
            >
              Create Profile
            </Link>
          </Card>
        )}

        {/* Profile Grid */}
        {profiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.profile_id}
                profile_id={profile.profile_id}
                name={profile.name}
                profile_type_id={profile.profile_type_id}
                type_name={profile.type_name}
                created_at={profile.created_at}
                username={profile.username}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
