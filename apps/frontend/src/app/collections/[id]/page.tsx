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
  UserPlus,
  Users,
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

interface Editor {
  editor_id: number;
  account_id: number;
  username: string;
  added_at: string;
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
  const [editors, setEditors] = useState<Editor[]>([]);
  const [removingEditorId, setRemovingEditorId] = useState<number | null>(null);
  const [showAddEditorDialog, setShowAddEditorDialog] = useState(false);
  const [editorUsername, setEditorUsername] = useState('');
  const [addingEditor, setAddingEditor] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

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

  // Fetch editors when collection is loaded and user is owner
  useEffect(() => {
    const fetchEditors = async () => {
      if (!collection?.is_owner) return;

      try {
        const response = await fetch(`/api/collections/${id}/editors`);
        if (response.ok) {
          const data = await response.json();
          setEditors(data.editors || []);
        }
      } catch (err) {
        console.error('Failed to fetch editors:', err);
      }
    };

    fetchEditors();
  }, [id, collection?.is_owner]);

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
        setCollection((prev) => (prev ? { ...prev, posts: prev.posts.filter((p) => p.post_id !== postId) } : null));
      }
    } catch (err) {
      console.error('Failed to remove post:', err);
    } finally {
      setRemovingPostId(null);
    }
  };

  const handleAddEditor = async () => {
    if (!editorUsername.trim()) return;

    setAddingEditor(true);
    setEditorError(null);

    try {
      const response = await fetch(`/api/collections/${id}/editors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editorUsername.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setEditors((prev) => [...prev, data]);
        setEditorUsername('');
        setShowAddEditorDialog(false);
      } else {
        setEditorError(data.message || 'Failed to add editor');
      }
    } catch (err) {
      console.error('Failed to add editor:', err);
      setEditorError('An error occurred while adding the editor');
    } finally {
      setAddingEditor(false);
    }
  };

  const handleRemoveEditor = async (editorId: number) => {
    setRemovingEditorId(editorId);
    try {
      const response = await fetch(`/api/collections/${id}/editors/${editorId}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        setEditors((prev) => prev.filter((e) => e.editor_id !== editorId));
      }
    } catch (err) {
      console.error('Failed to remove editor:', err);
    } finally {
      setRemovingEditorId(null);
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
            <h2 className="text-xl font-semibold text-amber-900">Posts ({collection.posts.length})</h2>
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
          ) : collection.collection_type_id === 1 ? (
            // Regular collection: group posts by type with subheadings
            <div className="space-y-6">
              {/* Group posts by type */}
              {[
                { typeId: 1, label: 'Writings related to this collection' },
                { typeId: 2, label: 'Art related to this collection' },
                { typeId: 3, label: 'Media related to this collection' },
                { typeId: 4, label: 'Events related to this collection' },
              ].map(({ typeId, label }) => {
                const postsOfType = collection.posts.filter((p) => p.post_type_id === typeId);
                if (postsOfType.length === 0) return null;

                return (
                  <div key={typeId}>
                    <h3 className="text-lg font-semibold text-amber-800 mb-3">{label}</h3>
                    <div className="space-y-3">
                      {postsOfType.map((post) => {
                        const PostIcon = postTypeIcons[post.post_type_id] || FileText;

                        return (
                          <div
                            key={post.post_id}
                            className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition-colors"
                          >
                            <Link href={`/posts/${post.post_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0">
                                <PostIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-amber-900 font-semibold truncate">{post.title}</h4>
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
                  </div>
                );
              })}
            </div>
          ) : (
            // Other collection types: flat list with type badges
            <div className="space-y-3">
              {collection.posts.map((post) => {
                const PostIcon = postTypeIcons[post.post_type_id] || FileText;

                return (
                  <div
                    key={post.post_id}
                    className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition-colors"
                  >
                    <Link href={`/posts/${post.post_id}`} className="flex items-center gap-3 flex-1 min-w-0">
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

        {/* Editors Section (Owner only) */}
        {collection.is_owner && (
          <Card className="p-6 bg-white border-amber-300 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-700" />
                <h2 className="text-xl font-semibold text-amber-900">Editors ({editors.length})</h2>
              </div>
              <Button
                onClick={() => setShowAddEditorDialog(true)}
                className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Editor
              </Button>
            </div>

            {editors.length === 0 ? (
              <p className="text-amber-600 text-center py-4">
                No editors yet. Add editors to allow others to manage this collection.
              </p>
            ) : (
              <div className="space-y-2">
                {editors.map((editor) => (
                  <div
                    key={editor.editor_id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-medium text-amber-900">{editor.username}</span>
                        <p className="text-xs text-amber-600">Added {new Date(editor.added_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveEditor(editor.editor_id)}
                      disabled={removingEditorId === editor.editor_id}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Remove editor"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Delete Collection</DialogTitle>
            <DialogDescription className="text-amber-700">
              Are you sure you want to delete this collection? This action cannot be undone. The posts in this
              collection will not be deleted.
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

      {/* Add Editor Dialog */}
      <Dialog
        open={showAddEditorDialog}
        onOpenChange={(open) => {
          setShowAddEditorDialog(open);
          if (!open) {
            setEditorUsername('');
            setEditorError(null);
          }
        }}
      >
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Add Editor</DialogTitle>
            <DialogDescription className="text-amber-700">
              Enter the username of the person you want to add as an editor. Editors can manage posts in this
              collection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="editor-username" className="block text-sm font-medium text-amber-800 mb-2">
              Username
            </label>
            <input
              id="editor-username"
              type="text"
              value={editorUsername}
              onChange={(e) => setEditorUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editorUsername.trim()) {
                  handleAddEditor();
                }
              }}
            />
            {editorError && <p className="mt-2 text-sm text-red-600">{editorError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddEditorDialog(false)}
              disabled={addingEditor}
              className="border-amber-600 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEditor}
              disabled={addingEditor || !editorUsername.trim()}
              className="bg-amber-800 text-amber-50 hover:bg-amber-700"
            >
              {addingEditor ? 'Adding...' : 'Add Editor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
