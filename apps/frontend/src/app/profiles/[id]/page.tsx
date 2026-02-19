'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Profile {
  profile_id: number;
  account_id: number;
  profile_type_id: number;
  type_name: string;
  name: string;
  details: { description?: string } | null;
  created_at: string;
  updated_at: string;
  username: string;
  parent_profile_id?: number | null;
  parent_name?: string | null;
  parent_id?: number | null;
  can_edit?: boolean; // 2.3.1 - true if current user can edit this profile
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { id } = use(params);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Profile not found');
          } else {
            setError('Failed to load profile');
          }
          return;
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError('An error occurred while loading the profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // Handle profile deletion (2.4.1/2.4.2)
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete profile');
      }

      // Redirect to profiles catalog after successful deletion
      router.push('/profiles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error || 'Profile not found'}</h1>
            <p className="text-amber-700 mb-6">The profile you're looking for could not be found.</p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Profile Header */}
        <Card className="p-8 bg-white border-amber-300 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
                {profile.type_name.charAt(0).toUpperCase() + profile.type_name.slice(1)}
              </div>
              <h1 className="text-4xl font-bold text-amber-900 mb-2">{profile.name}</h1>
            </div>
            {/* Edit Button - only visible to profile owner (2.3.1) */}
            {profile.can_edit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/profiles/${profile.profile_id}/edit`)}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {/* Delete Button - only visible to profile owner (2.4.1) */}
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm text-amber-700">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Created by {profile.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Show parent ownership for character-level profiles */}
          {profile.parent_name && profile.parent_id && (
            <div className="mt-4 pt-4 border-t border-amber-200">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <User className="w-4 h-4" />
                <span>
                  Owned by{' '}
                  <Link
                    href={`/profiles/${profile.parent_id}`}
                    className="text-amber-900 hover:underline font-semibold"
                  >
                    {profile.parent_name}
                  </Link>
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Profile Details */}
        {profile.details && (
          <Card className="p-8 bg-white border-amber-300">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">Details</h2>
            <div className="prose prose-amber max-w-none">
              <p className="text-amber-800 whitespace-pre-wrap">{profile.details.description || ''}</p>
            </div>
          </Card>
        )}

        {!profile.details && (
          <Card className="p-8 bg-white border-amber-300">
            <p className="text-amber-700 italic">No details have been added to this profile yet.</p>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog (2.4.1) */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Delete Profile</DialogTitle>
            <DialogDescription className="text-amber-700">
              Are you sure you want to delete this profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="border-amber-600 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
