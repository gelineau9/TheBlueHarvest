'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Calendar,
  Pencil,
  Trash2,
  FolderOpen,
  BookOpen,
  Image,
  Palette,
  CalendarDays,
  FileText,
  Film,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Author {
  author_id: number;
  profile_id: number;
  profile_name: string;
  profile_type_id: number;
  type_name: string;
  is_primary: boolean;
}

interface CollectionPost {
  collection_post_id: number;
  post_id: number;
  title: string;
  post_type_id: number;
  post_type_name: string;
  sort_order: number;
  primary_author_name: string | null;
}

interface Collection {
  collection_id: number;
  account_id: number;
  collection_type_id: number;
  type_name: string;
  allowed_post_types: number[] | null;
  title: string;
  description: string | null;
  content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  username: string;
  authors: Author[];
  posts: CollectionPost[];
  can_edit: boolean;
  is_owner: boolean;
}

// Collection type icons
const collectionTypeIcons: { [key: number]: React.ComponentType<{ className?: string }> } = {
  1: FolderOpen, // collection
  2: BookOpen, // chronicle
  3: Image, // album
  4: Palette, // gallery
  5: CalendarDays, // event-series
};

// Post type icons
const postTypeIcons: { [key: number]: React.ComponentType<{ className?: string }> } = {
  1: FileText, // writing
  2: Palette, // art
  3: Film, // media
  4: CalendarDays, // event
};

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingPostId, setRemovingPostId] = useState<number | null>(null);

  const { id } = use(params);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch(`/api/collections/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Collection not found');
          } else {
            setError('Failed to load collection');
          }
          return;
        }

        const data = await response.json();
        setCollection(data);
      } catch {
        setError('An error occurred while loading the collection');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollection();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete collection');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemovePost = async (postId: number) => {
    setRemovingPostId(postId);
    try {
      const response = await fetch(`/api/collections/${id}/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove post from local state
        setCollection((prev) =>
          prev ? { ...prev, posts: prev.posts.filter((p) => p.post_id !== postId) } : null
        );
      }
    } catch (err) {
      console.error('Failed to remove post:', err);
    } finally {
      setRemovingPostId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading collection...</div>
      </div>
    );
  }

  if (error || !collection) {
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
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error || 'Collection not found'}</h1>
            <p className="text-amber-700 mb-6">The collection you're looking for could not be found.</p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const CollectionIcon = collectionTypeIcons[collection.collection_type_id] || FolderOpen;
  const primaryAuthor = collection.authors.find((a) => a.is_primary);
  const coAuthors = collection.authors.filter((a) => !a.is_primary);

  const formattedDate = new Date(collection.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Check if collection has been edited
  const createdTime = new Date(collection.created_at).getTime();
  const updatedTime = collection.updated_at ? new Date(collection.updated_at).getTime() : createdTime;
  const isEdited = updatedTime - createdTime > 60000;

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Collection Header */}
        <Card className="p-8 bg-white border-amber-300 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
                <CollectionIcon className="w-4 h-4" />
                {collection.type_name.charAt(0).toUpperCase() + collection.type_name.slice(1)}
              </div>
              <h1 className="text-4xl font-bold text-amber-900 mb-2">{collection.title}</h1>
            </div>
            {/* Edit/Delete Buttons */}
            {collection.can_edit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/collections/${collection.collection_id}/edit`)}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {collection.is_owner && (
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {collection.description && (
            <p className="text-amber-700 mb-4 whitespace-pre-wrap">{collection.description}</p>
          )}

          {/* Author and Date Info */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-amber-700">
            {primaryAuthor && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  By{' '}
                  <Link
                    href={`/profiles/${primaryAuthor.profile_id}`}
                    className="text-amber-900 hover:underline font-semibold"
                  >
                    {primaryAuthor.profile_name}
                  </Link>
                </span>
              </div>
            )}
            {coAuthors.length > 0 && (
              <div className="flex items-center gap-2">
                <span>
                  with{' '}
                  {coAuthors.map((author, index) => (
                    <span key={author.profile_id}>
                      <Link
                        href={`/profiles/${author.profile_id}`}
                        className="text-amber-900 hover:underline font-semibold"
                      >
                        {author.profile_name}
                      </Link>
                      {index < coAuthors.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
              {isEdited && <span className="text-amber-600 text-xs">(edited)</span>}
            </div>
          </div>

          {/* Account owner info */}
          <div className="mt-4 pt-4 border-t border-amber-200 text-xs text-amber-600">
            Created by account: {collection.username}
          </div>
        </Card>

        {/* Posts List */}
        <Card className="p-6 bg-white border-amber-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-amber-900">
              Posts ({collection.posts.length})
            </h2>
          </div>

          {collection.posts.length === 0 ? (
            <p className="text-amber-600 text-center py-8">
              No posts in this collection yet.
              {collection.can_edit && (
                <span>
                  {' '}
                  <Link href={`/collections/${collection.collection_id}/edit`} className="text-amber-700 underline">
                    Edit the collection
                  </Link>{' '}
                  to add posts.
                </span>
              )}
            </p>
          ) : (
            <div className="space-y-3">
              {collection.posts.map((post) => {
                const PostIcon = postTypeIcons[post.post_type_id] || FileText;

                return (
                  <div
                    key={post.post_id}
                    className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition-colors"
                  >
                    <Link
                      href={`/posts/${post.post_id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0">
                        <PostIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                            {post.post_type_name}
                          </span>
                        </div>
                        <h3 className="text-amber-900 font-semibold truncate">{post.title}</h3>
                        {post.primary_author_name && (
                          <p className="text-xs text-amber-600">by {post.primary_author_name}</p>
                        )}
                      </div>
                    </Link>

                    {/* Remove button for editors */}
                    {collection.can_edit && (
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemovePost(post.post_id);
                        }}
                        disabled={removingPostId === post.post_id}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                        title="Remove from collection"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Delete Collection</DialogTitle>
            <DialogDescription className="text-amber-700">
              Are you sure you want to delete this collection? This action cannot be undone.
              The posts in this collection will not be deleted.
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
