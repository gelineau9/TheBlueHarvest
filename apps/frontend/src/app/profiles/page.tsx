'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUpDown } from 'lucide-react';
import { ProfileCard } from '@/components/profiles/profile-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

// Sort options configuration
const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'name:desc', label: 'Name (Z-A)' },
  { value: 'updated_at:desc', label: 'Recently Updated' },
] as const;

export default function ProfilesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Get current sort from URL params or use default
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const currentSort = `${sortBy}:${order}`;

  // Get the label for the current sort option
  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === currentSort)?.label || 'Newest First';

  // Update URL params when sort changes
  const handleSortChange = (value: string) => {
    const [newSortBy, newOrder] = value.split(':');
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', newSortBy);
    params.set('order', newOrder);
    router.push(`/profiles?${params.toString()}`);
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '20');
        params.set('offset', '0');
        params.set('sortBy', sortBy);
        params.set('order', order);

        const response = await fetch(`/api/profiles/public?${params.toString()}`);

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
  }, [sortBy, order]);

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

        {/* Controls Bar */}
        <div className="flex items-center justify-end mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-50">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {currentSortLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-amber-300">
              <DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="text-amber-900 focus:bg-amber-50 focus:text-amber-900"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
