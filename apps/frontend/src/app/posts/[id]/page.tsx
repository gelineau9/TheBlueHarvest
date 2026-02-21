'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Pencil, Trash2, FileText, Clock, MapPin, Users, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { CommentList } from '@/components/comments/comment-list';

interface Author {
  profile_id: number;
  profile_name: string;
  is_primary: boolean;
}

interface Editor {
  editor_id: number;
  account_id: number;
  username: string;
  is_owner: boolean;
}

interface Post {
  post_id: number;
  account_id: number;
  title: string;
  content: {
    body?: string;
    tags?: string[];
    images?: Array<{
      filename: string;
      url: string;
      originalName: string;
    }>;
    description?: string;
    // Event-specific fields
    eventDate?: string;
    eventTime?: string;
    location?: string;
    maxAttendees?: number;
    contactProfileId?: number;
    headerImage?: {
      filename: string;
      url: string;
      originalName: string;
    };
  };
  post_type_id: number;
  type_name: string;
  username: string;
  authors: Author[];
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
  is_owner?: boolean;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { username: currentUsername } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [contactName, setContactName] = useState<string | null>(null);

  // Editor management state
  const [editors, setEditors] = useState<Editor[]>([]);
  const [newEditorUsername, setNewEditorUsername] = useState('');
  const [showAddEditorDialog, setShowAddEditorDialog] = useState(false);
  const [isAddingEditor, setIsAddingEditor] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [removingEditorId, setRemovingEditorId] = useState<number | null>(null);

  const { id } = use(params);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }

        const data = await response.json();
        setPost(data);

        // Fetch contact profile name for events
        if (data.content?.contactProfileId) {
          try {
            const profileResponse = await fetch(`/api/profiles/${data.content.contactProfileId}`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              setContactName(profileData.name);
            }
          } catch {
            // Silently fail - will just show fallback text
          }
        }
      } catch {
        setError('An error occurred while loading the post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  // Fetch editors for this post
  const fetchEditors = async () => {
    try {
      const response = await fetch(`/api/posts/${id}/editors`);
      if (response.ok) {
        const data = await response.json();
        setEditors(data.editors || []);
      }
    } catch (err) {
      console.error('Failed to fetch editors:', err);
    }
  };

  // Fetch editors when post loads (visible to all viewers)
  useEffect(() => {
    if (post) {
      fetchEditors();
    }
  }, [post, id]);

  const handleAddEditor = async () => {
    if (!newEditorUsername.trim()) return;

    setIsAddingEditor(true);
    setEditorError(null);

    try {
      const response = await fetch(`/api/posts/${id}/editors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newEditorUsername.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditorError(data.message || 'Failed to add editor');
        return;
      }

      setNewEditorUsername('');
      setShowAddEditorDialog(false);
      fetchEditors();
    } catch {
      setEditorError('An error occurred while adding editor');
    } finally {
      setIsAddingEditor(false);
    }
  };

  const handleRemoveEditor = async (editorId: number) => {
    setRemovingEditorId(editorId);

    try {
      const response = await fetch(`/api/posts/${id}/editors/${editorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEditors();
      }
    } catch (err) {
      console.error('Failed to remove editor:', err);
    } finally {
      setRemovingEditorId(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete post');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
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
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error || 'Post not found'}</h1>
            <p className="text-amber-700 mb-6">The post you're looking for could not be found.</p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Check if post has been edited (updated_at is significantly after created_at)
  const createdTime = new Date(post.created_at).getTime();
  const updatedTime = new Date(post.updated_at).getTime();
  const isEdited = updatedTime - createdTime > 60000; // More than 1 minute difference

  const primaryAuthor = post.authors.find((a) => a.is_primary);
  const coAuthors = post.authors.filter((a) => !a.is_primary);

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Post Header */}
        <Card className="p-8 bg-white border-amber-300 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
                <FileText className="w-4 h-4" />
                {post.type_name.charAt(0).toUpperCase() + post.type_name.slice(1)}
              </div>
              <h1 className="text-4xl font-bold text-amber-900 mb-2">{post.title}</h1>
            </div>
            {/* Edit/Delete Buttons */}
            {post.can_edit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/posts/${post.post_id}/edit`)}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {post.is_owner && (
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

          {/* Account owner info (smaller, secondary) */}
          <div className="mt-4 pt-4 border-t border-amber-200 text-xs text-amber-600">
            Posted by account: {post.username}
          </div>
        </Card>

        {/* Post Content */}
        <Card className="p-8 bg-white border-amber-300 mb-6">
          {/* Art/Media Post - Show Images */}
          {(post.post_type_id === 2 || post.post_type_id === 3) &&
            post.content.images &&
            post.content.images.length > 0 && (
              <div className="mb-6">
                <div
                  className={`grid gap-4 ${post.content.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}
                >
                  {post.content.images.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-amber-100 border border-amber-300"
                    >
                      <img
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}${image.url}`}
                        alt={image.originalName || `Image ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setLightboxIndex(index);
                          setLightboxOpen(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
                {/* Art Description */}
                {post.content.description && (
                  <p className="mt-6 text-amber-800 whitespace-pre-wrap leading-relaxed">{post.content.description}</p>
                )}
              </div>
            )}

          {/* Writing Post - Show Body */}
          {post.post_type_id === 1 && (
            <div className="prose prose-amber max-w-none">
              <p className="text-amber-800 whitespace-pre-wrap leading-relaxed">{post.content.body || ''}</p>
            </div>
          )}

          {/* Event Post - Show Event Details */}
          {post.post_type_id === 4 && (
            <div className="space-y-6">
              {/* Header Image */}
              {post.content.headerImage && (
                <div className="aspect-[3/1] rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                  <img
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}${post.content.headerImage.url}`}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                {post.content.eventDate && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <Calendar className="w-5 h-5 text-amber-700 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Date</p>
                      <p className="text-amber-900">
                        {new Date(post.content.eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Time */}
                {post.content.eventTime && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <Clock className="w-5 h-5 text-amber-700 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Time</p>
                      <p className="text-amber-900">{post.content.eventTime}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {post.content.location && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <MapPin className="w-5 h-5 text-amber-700 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Location</p>
                      <p className="text-amber-900">{post.content.location}</p>
                    </div>
                  </div>
                )}

                {/* Max Attendees */}
                {post.content.maxAttendees && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <Users className="w-5 h-5 text-amber-700 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Max Attendees</p>
                      <p className="text-amber-900">{post.content.maxAttendees}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Character Contact */}
              {post.content.contactProfileId && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <User className="w-5 h-5 text-amber-700 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Contact</p>
                    <Link
                      href={`/profiles/${post.content.contactProfileId}`}
                      className="text-amber-900 hover:text-amber-700 underline"
                    >
                      {contactName || 'View Contact Character'}
                    </Link>
                  </div>
                </div>
              )}

              {/* Description */}
              {post.content.description && (
                <div className="prose prose-amber max-w-none">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">About This Event</h3>
                  <p className="text-amber-800 whitespace-pre-wrap leading-relaxed">{post.content.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Fallback for other post types */}
          {post.post_type_id !== 1 &&
            post.post_type_id !== 2 &&
            post.post_type_id !== 3 &&
            post.post_type_id !== 4 &&
            post.content.body && (
              <div className="prose prose-amber max-w-none">
                <p className="text-amber-800 whitespace-pre-wrap leading-relaxed">{post.content.body}</p>
              </div>
            )}
        </Card>

        {/* Tags */}
        {post.content.tags && post.content.tags.length > 0 && (
          <Card className="p-6 bg-white border-amber-300">
            <h2 className="text-lg font-semibold text-amber-900 mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {post.content.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full border border-amber-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Editors Section - Visible to all when editors exist, management controls for owner only */}
        {(editors.length > 0 || post.is_owner) && (
          <Card className="p-6 bg-white border-amber-300 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-900">Editors</h2>
              {post.is_owner && (
                <Button
                  onClick={() => setShowAddEditorDialog(true)}
                  size="sm"
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Editor
                </Button>
              )}
            </div>

            {editors.length === 0 ? (
              <p className="text-amber-600 text-sm">No editors yet. Add editors to allow others to edit this post.</p>
            ) : (
              <ul className="space-y-2">
                {editors.map((editor) => (
                  <li
                    key={editor.editor_id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-700" />
                      <span className="text-amber-900 font-medium">{editor.username}</span>
                      {editor.is_owner && (
                        <span className="text-xs bg-amber-700 text-amber-50 px-2 py-0.5 rounded-full font-medium">
                          Creator
                        </span>
                      )}
                    </div>
                    {/* Show remove button: owner can remove any non-owner, editors can remove themselves */}
                    {!editor.is_owner && (post.is_owner || editor.username === currentUsername) && (
                      <Button
                        onClick={() => handleRemoveEditor(editor.editor_id)}
                        disabled={removingEditorId === editor.editor_id}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Comments Section */}
        <CommentList postId={post.post_id} />
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Delete Post</DialogTitle>
            <DialogDescription className="text-amber-700">
              Are you sure you want to delete this post? This action cannot be undone.
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
            setNewEditorUsername('');
            setEditorError(null);
          }
        }}
      >
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Add Editor</DialogTitle>
            <DialogDescription className="text-amber-700">
              Enter the username of the person you want to add as an editor. They will be able to edit this post.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Username"
              value={newEditorUsername}
              onChange={(e) => setNewEditorUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddEditor();
                }
              }}
              className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
            />
            {editorError && <p className="text-red-600 text-sm mt-2">{editorError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddEditorDialog(false)}
              disabled={isAddingEditor}
              className="border-amber-600 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEditor}
              disabled={isAddingEditor || !newEditorUsername.trim()}
              className="bg-amber-800 text-amber-50 hover:bg-amber-700"
            >
              {isAddingEditor ? 'Adding...' : 'Add Editor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox for Art/Media Posts */}
      {(post.post_type_id === 2 || post.post_type_id === 3) &&
        post.content.images &&
        post.content.images.length > 0 && (
          <ImageLightbox
            images={post.content.images}
            currentIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onNavigate={setLightboxIndex}
            baseUrl={process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}
          />
        )}
    </div>
  );
}
