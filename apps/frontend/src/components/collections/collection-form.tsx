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
import { ArrowLeft, X} from 'lucide-react';
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

interface Post {
  post_id: number;
  title: string;
  post_type_id: number;
}

interface CollectionFormProps {
  collectionTypeId: number;
  collectionTypeName: string;
  collectionTypeLabel: string;
}

// Map collection types to allowed post types
// collection (1) = any, chronicle (2) = writing (1), album (3) = media (3), gallery (4) = art (2), event-series (5) = event (4)
const ALLOWED_POST_TYPES: { [key: number]: number[] | null } = {
  1: null, // collection - any type
  2: [1], // chronicle - writing only
  3: [3], // album - media only
  4: [2], // gallery - art only
  5: [4], // event-series - events only
};

const POST_TYPE_LABELS: { [key: number]: string } = {
  1: 'Writing',
  2: 'Art',
  3: 'Media',
  4: 'Events',
};

export function CollectionForm({ collectionTypeId, collectionTypeName, collectionTypeLabel }: CollectionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);

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
            (p: Profile) => p.profile_type_id === 1 || p.profile_type_id === 3 || p.profile_type_id === 4,
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

  // Fetch user's posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, []);

  // Filter posts by allowed types for this collection
  const allowedTypes = ALLOWED_POST_TYPES[collectionTypeId];
  const filteredPosts = allowedTypes ? posts.filter((p) => allowedTypes.includes(p.post_type_id)) : posts;

  // Get available posts (not already selected)
  const availablePosts = filteredPosts.filter((p) => !selectedPosts.some((sp) => sp.post_id === p.post_id));

  // Group posts by type for general collection
  const postsByType = availablePosts.reduce(
    (acc, post) => {
      if (!acc[post.post_type_id]) {
        acc[post.post_type_id] = [];
      }
      acc[post.post_type_id].push(post);
      return acc;
    },
    {} as { [key: number]: Post[] },
  );

  const handleAddPost = (postId: number) => {
    const post = posts.find((p) => p.post_id === postId);
    if (post && !selectedPosts.some((sp) => sp.post_id === postId)) {
      setSelectedPosts([...selectedPosts, post]);
    }
  };

  const handleRemovePost = (postId: number) => {
    setSelectedPosts(selectedPosts.filter((p) => p.post_id !== postId));
  };

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
        // Add selected posts to the collection
        for (const post of selectedPosts) {
          try {
            await fetch(`/api/collections/${result.collection.collection_id}/posts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ post_id: post.post_id }),
            });
          } catch (err) {
            console.error('Failed to add post to collection:', err);
          }
        }

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

  // Render post selector for type-specific collections (single dropdown)
  const renderSingleTypeSelector = () => {
    if (availablePosts.length === 0 && selectedPosts.length === 0) {
      return (
        <p className="text-amber-600 text-sm">
          No {collectionTypeName} posts found.{' '}
          <Link href="/posts/create" className="text-amber-700 underline">
            Create one first
          </Link>
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {availablePosts.length > 0 && (
          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddPost(parseInt(e.target.value, 10));
                  e.target.value = '';
                }
              }}
            >
              <option value="">Select a post to add...</option>
              {availablePosts.map((post) => (
                <option key={post.post_id} value={post.post_id}>
                  {post.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  // Render post selector for general collection (grouped by type)
  const renderMultiTypeSelector = () => {
    const typeOrder = [1, 2, 3, 4]; // writing, art, media, events

    if (filteredPosts.length === 0 && selectedPosts.length === 0) {
      return (
        <p className="text-amber-600 text-sm">
          No posts found.{' '}
          <Link href="/posts/create" className="text-amber-700 underline">
            Create one first
          </Link>
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {typeOrder.map((typeId) => {
          const typePosts = postsByType[typeId] || [];
          if (typePosts.length === 0) return null;

          return (
            <div key={typeId} className="space-y-2">
              <h4 className="text-sm font-medium text-amber-800">{POST_TYPE_LABELS[typeId]}</h4>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPost(parseInt(e.target.value, 10));
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Select a {POST_TYPE_LABELS[typeId].toLowerCase()} post...</option>
                  {typePosts.map((post) => (
                    <option key={post.post_id} value={post.post_id}>
                      {post.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    );
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
        {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}

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

          {/* Posts Selection */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-medium">Add Posts</Label>
            <p className="text-sm text-amber-600 mb-2">Select posts to include in this {collectionTypeName}</p>

            {loadingPosts ? (
              <p className="text-amber-600">Loading posts...</p>
            ) : collectionTypeId === 1 ? (
              renderMultiTypeSelector()
            ) : (
              renderSingleTypeSelector()
            )}

            {/* Selected Posts */}
            {selectedPosts.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-amber-800">Selected Posts ({selectedPosts.length})</h4>
                <div className="space-y-2">
                  {selectedPosts.map((post) => (
                    <div
                      key={post.post_id}
                      className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {POST_TYPE_LABELS[post.post_type_id]}
                        </span>
                        <span className="text-amber-900">{post.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePost(post.post_id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Remove from collection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
