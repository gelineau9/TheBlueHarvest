'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface Profile {
  profile_id: number;
  account_id: number;
  profile_type_id: number;
  type_name: string;
  name: string;
  details: { description?: string } | null;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  can_edit?: boolean;
}

export default function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Original values for dirty checking (2.3.3)
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalIsPublished, setOriginalIsPublished] = useState(true);

  // Check if form has unsaved changes (2.3.3)
  const isDirty = name !== originalName || description !== originalDescription || isPublished !== originalIsPublished;

  // Use the unsaved changes hook for navigation warnings (2.3.3)
  const { navigateWithWarning } = useUnsavedChanges(isDirty);

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

        const data: Profile = await response.json();

        // Check if user can edit this profile
        if (!data.can_edit) {
          setError('You do not have permission to edit this profile');
          return;
        }

        setProfile(data);
        // Set both current and original values
        const initialName = data.name;
        const initialDescription = data.details?.description || '';
        const initialIsPublished = data.is_published !== false;
        setName(initialName);
        setDescription(initialDescription);
        setIsPublished(initialIsPublished);
        setOriginalName(initialName);
        setOriginalDescription(initialDescription);
        setOriginalIsPublished(initialIsPublished);
      } catch {
        setError('An error occurred while loading the profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          details: { description: description.trim() || undefined },
          is_published: isPublished,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message || 'Failed to save changes');
        return;
      }

      // Update original values to match saved state (prevents warning on redirect)
      setOriginalName(name.trim());
      setOriginalDescription(description.trim());
      setOriginalIsPublished(isPublished);

      // Redirect back to profile page on success
      router.push(`/profiles/${id}`);
    } catch {
      setSaveError('An error occurred while saving changes');
    } finally {
      setIsSaving(false);
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
            <p className="text-amber-700 mb-6">
              {error === 'You do not have permission to edit this profile'
                ? 'You can only edit profiles that you own.'
                : "The profile you're looking for could not be found."}
            </p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button - with unsaved changes warning (2.3.3) */}
        <button
          onClick={() => navigateWithWarning(`/profiles/${id}`)}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </button>

        {/* Edit Form */}
        <Card className="p-8 bg-white border-amber-300">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
              {profile.type_name.charAt(0).toUpperCase() + profile.type_name.slice(1)}
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit Profile</h1>
            {/* Unsaved changes indicator (2.3.3) */}
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-amber-900 font-semibold">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter profile name"
                maxLength={100}
                required
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              />
              <p className="text-sm text-amber-600">{name.length}/100 characters</p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-amber-900 font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this profile..."
                rows={6}
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Publish Status */}
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <Label htmlFor="isPublished" className="text-amber-900 font-semibold">
                  {isPublished ? 'Published' : 'Draft'}
                </Label>
                <p className="text-sm text-amber-600">
                  {isPublished ? 'This profile is visible to everyone.' : 'Only you can see this draft.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublished}
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublished ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublished ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{saveError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              {/* Cancel button - with unsaved changes warning (2.3.3) */}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigateWithWarning(`/profiles/${id}`)}
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
