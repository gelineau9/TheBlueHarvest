'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCollection } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const collectionFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  primary_author_profile_id: z.number().int().optional(),
});

type CollectionFormData = z.infer<typeof collectionFormSchema>;

interface Profile {
  profile_id: number;
  name: string;
  profile_type_id: number;
}

interface CollectionFormProps {
  collectionTypeId: number;
  collectionTypeName: string;
  collectionTypeLabel: string;
}

export function CollectionForm({ collectionTypeId, collectionTypeName, collectionTypeLabel }: CollectionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const selectedAuthorId = watch('primary_author_profile_id');

  // Fetch user's profiles for author selection
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch('/api/profiles');
        if (response.ok) {
          const data = await response.json();
          // Filter to only character, kinship, and organization profiles (types 1, 3, 4)
          const authorProfiles = data.filter(
            (p: Profile) => p.profile_type_id === 1 || p.profile_type_id === 3 || p.profile_type_id === 4
          );
          setProfiles(authorProfiles);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, []);

  const onSubmit = async (data: CollectionFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCollection({
        collection_type_id: collectionTypeId,
        title: data.title,
        description: data.description,
        content: {},
        primary_author_profile_id: data.primary_author_profile_id,
      });

      if (result.success && result.collection) {
        router.push(`/collections/${result.collection.collection_id}`);
      } else {
        setError(result.error || 'Failed to create collection');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Collection creation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link
          href="/collections/create"
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collection Types
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create {collectionTypeLabel}</h1>
          <p className="text-lg text-amber-700">Fill out the details for your new {collectionTypeName}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-amber-900 font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={`Enter ${collectionTypeName} title`}
              className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-amber-900 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={`Describe your ${collectionTypeName}`}
              rows={4}
              className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
          </div>

          {/* Primary Author */}
          <div className="space-y-2">
            <Label htmlFor="primary_author_profile_id" className="text-amber-900 font-medium">
              Primary Author
            </Label>
            <p className="text-sm text-amber-600 mb-2">
              Optionally attribute this collection to one of your characters or organizations
            </p>
            {loadingProfiles ? (
              <p className="text-amber-600">Loading profiles...</p>
            ) : profiles.length === 0 ? (
              <p className="text-amber-600 text-sm">
                No character profiles found.{' '}
                <Link href="/profiles/create" className="text-amber-700 underline">
                  Create one first
                </Link>{' '}
                to attribute this collection.
              </p>
            ) : (
              <select
                id="primary_author_profile_id"
                className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white"
                value={selectedAuthorId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setValue('primary_author_profile_id', value ? parseInt(value, 10) : undefined);
                }}
              >
                <option value="">No author (account-level collection)</option>
                {profiles.map((profile) => (
                  <option key={profile.profile_id} value={profile.profile_id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/collections/create')}
              className="border-amber-600 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
