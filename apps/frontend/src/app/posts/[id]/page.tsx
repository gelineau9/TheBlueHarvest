'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, User, Pencil, Trash2, UserPlus, X, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UsernameInput } from '@/components/ui/username-input';
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
import { LikeButton } from '@/components/likes/LikeButton';
import { EventRsvp } from '@/components/events/EventRsvp';
import { useSidebarRefresh } from '@/contexts/SidebarRefreshContext';
import { focalStyle } from '@/lib/image-focus';

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
    /** Art/media only — who made the artwork */
    credit?: string;
    description?: string;
    // Event-specific fields
    eventDateTime?: string; // UTC ISO string
    location?: string;
    maxAttendees?: number;
    contactProfileId?: number;
    headerImage?: {
      filename: string;
      url: string;
      originalName: string;
      focalX?: number;
      focalY?: number;
    };
  };
  post_type_id: number;
  type_name: string;
  username: string;
  authors: Author[];
  featured_profiles?: Array<{
    featured_profile_id: number;
    profile_id: number;
    name: string;
    profile_type_id: number;
    type_name: string;
  }>;
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
  is_owner?: boolean;
  is_featured?: boolean;
  like_count: number;
  liked_by_me: boolean | null;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { username: currentUsername, isAdmin } = useAuth();
  const { triggerSidebarRefresh } = useSidebarRefresh();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [contactName, setContactName] = useState<string | null>(null);

  // Editor management state
  const [editors, setEditors] = useState<Editor[]>([]);
  const [newEditorUsername, setNewEditorUsername] = useState('');
  const [showEditorsDialog, setShowEditorsDialog] = useState(false);
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
      setShowEditorsDialog(false);
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

  const handlePin = async () => {
    if (!post) return;
    setIsPinning(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (post.is_featured) {
        await fetch(`/api/admin/featured-posts/${post.post_id}`, { method: 'DELETE', headers });
      } else {
        await fetch('/api/admin/featured-posts', {
          method: 'POST',
          headers,
          body: JSON.stringify({ post_id: post.post_id }),
        });
      }

      // Re-fetch the post to get updated is_featured state
      const response = await fetch(`/api/posts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (err) {
      console.error('Failed to pin/unpin post:', err);
    } finally {
      setIsPinning(false);
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

      triggerSidebarRefresh();
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
      <div className="flex items-center justify-center">
        <div className="text-amber-900">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="py-8 px-4">
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

  const isWriting = post.post_type_id === 1;
  const isArt = post.post_type_id === 2;
  const isMedia = post.post_type_id === 3;
  const isEvent = post.post_type_id === 4;
  const images = isArt || isMedia ? (post.content.images ?? []) : [];
  const featuredProfiles = post.featured_profiles ?? [];

  // Prose needs a real measure or it runs to ~110ch on a wide monitor; art and
  // media want the opposite, room for the image to breathe.
  const columnWidth = isWriting ? 'max-w-3xl' : isArt || isMedia ? 'max-w-5xl' : 'max-w-4xl';

  // Back goes to the listing this post belongs to, not the homepage.
  const backLink = isEvent
    ? { href: '/events', label: 'Back to Events' }
    : {
        href: `/archive?contentType=posts&postTypes=${post.post_type_id}`,
        label: `Back to ${post.type_name.charAt(0).toUpperCase() + post.type_name.slice(1)}`,
      };

  // The owner is already named as the poster, so the inline list is everyone else.
  const coEditors = editors.filter((editor) => !editor.is_owner);
  // Owners manage the list; an editor still needs a way to remove themselves.
  const canManageEditors = !!post.is_owner || coEditors.some((editor) => editor.username === currentUsername);

  const bodyContent = isWriting || !(isArt || isMedia || isEvent) ? post.content.body : undefined;
  const descriptionContent = isArt || isMedia || isEvent ? post.content.description : undefined;
  // Without this an art post with no description renders an empty white box.
  const hasCardContent = isEvent || !!bodyContent || !!descriptionContent || featuredProfiles.length > 0;

  // Event facts read as one row of chips, the same treatment a character profile
  // gives race and occupation. Date and time come from a single field, so they
  // share a single chip rather than sitting in two separate boxes.
  const eventChips: Array<{ key: string; label: string; qualifier: string; href?: string }> = [];
  const eventEnded =
    isEvent && !!post.content.eventDateTime && new Date(post.content.eventDateTime).getTime() < Date.now();
  if (isEvent) {
    if (post.content.eventDateTime) {
      const when = new Date(post.content.eventDateTime);
      eventChips.push({
        key: 'when',
        label: `${when.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}, ${when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
        qualifier: 'when',
      });
    }
    if (post.content.location) {
      eventChips.push({ key: 'location', label: post.content.location, qualifier: 'location' });
    }
    if (post.content.maxAttendees) {
      eventChips.push({ key: 'cap', label: String(post.content.maxAttendees), qualifier: 'max attendees' });
    }
    if (post.content.contactProfileId) {
      eventChips.push({
        key: 'contact',
        label: contactName || 'View contact',
        qualifier: 'contact',
        href: `/profiles/${post.content.contactProfileId}`,
      });
    }
  }

  return (
    <div className="py-8 px-4">
      <div className={`${columnWidth} mx-auto`}>
        {/* Back Button */}
        <Link
          href={backLink.href}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLink.label}
        </Link>

        {/* Post Header — no card; the title carries the page and the actions stay quiet */}
        <div className="flex items-start justify-between gap-6">
          <h1 className="text-4xl font-bold text-amber-900">{post.title}</h1>
          <div className="flex flex-none gap-0.5 pt-1">
            {post.can_edit && (
              <Button
                onClick={() => router.push(`/posts/${post.post_id}/edit`)}
                variant="ghost"
                size="icon"
                aria-label="Edit post"
                title="Edit post"
                className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                onClick={handlePin}
                disabled={isPinning}
                variant="ghost"
                size="icon"
                aria-label={post.is_featured ? 'Unpin post' : 'Pin post'}
                title={post.is_featured ? 'Unpin post' : 'Pin post'}
                className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
              >
                {post.is_featured ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </Button>
            )}
            {(post.is_owner || isAdmin) && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="ghost"
                size="icon"
                aria-label="Delete post"
                title="Delete post"
                className="text-amber-700 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Byline — the attributed character, then the date */}
        <div className="mt-2 text-sm text-amber-700">
          {primaryAuthor && (
            <>
              By{' '}
              <Link
                href={`/profiles/${primaryAuthor.profile_id}`}
                className="text-amber-900 hover:underline font-semibold"
              >
                {primaryAuthor.profile_name}
              </Link>
              <span className="mx-2 text-amber-800/40">·</span>
            </>
          )}
          <span>{formattedDate}</span>
          {isEdited && <span className="ml-1.5 text-amber-600 text-xs">(edited)</span>}
        </div>

        {/* Attribution — the account that posted, and who else can edit */}
        <div className="mt-1 text-xs text-amber-600">
          Posted by{' '}
          <Link href={`/users/${post.username}`} className="hover:underline font-medium text-amber-700">
            {post.username}
          </Link>
          {coEditors.length > 0 && (
            <>
              <span className="mx-2 text-amber-800/40">|</span>
              Editors:{' '}
              {coEditors.map((editor, index) => (
                <span key={editor.editor_id}>
                  <Link href={`/users/${editor.username}`} className="hover:underline text-amber-700">
                    {editor.username}
                  </Link>
                  {index < coEditors.length - 1 ? ', ' : ''}
                </span>
              ))}
            </>
          )}
          {canManageEditors && (
            <>
              <span className="mx-2 text-amber-800/40">·</span>
              <button
                type="button"
                onClick={() => setShowEditorsDialog(true)}
                className="underline hover:text-amber-800 cursor-pointer"
              >
                Manage
              </button>
            </>
          )}
        </div>

        {/* Event facts as chips — matches the identity chips on a profile */}
        {eventChips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {eventChips.map((chip) => {
              const body = (
                <>
                  {chip.label}
                  <span className="opacity-60"> · {chip.qualifier}</span>
                </>
              );
              return chip.href ? (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className="rounded-full border border-amber-200 bg-amber-100/70 px-3 py-1 text-xs font-medium text-amber-800 transition-colors hover:brightness-95"
                >
                  {body}
                </Link>
              ) : (
                <span
                  key={chip.key}
                  className="rounded-full border border-amber-200 bg-amber-100/70 px-3 py-1 text-xs font-medium text-amber-800"
                >
                  {body}
                </span>
              );
            })}
          </div>
        )}

        {/* Tags and likes ride directly above the main content */}
        <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {post.content.tags?.map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-0.5 bg-amber-100/70 text-amber-800 text-xs font-medium rounded-full border border-amber-200"
              >
                {tag}
              </span>
            ))}
          </div>
          <LikeButton
            type="post"
            id={post.post_id}
            initialLikeCount={post.like_count}
            initialLikedByMe={post.liked_by_me}
          />
        </div>

        {/* Artwork sits outside the content card — no surrounding box. It scales up to
            the full column width and is bounded by the viewport so it fits on screen,
            with the border on the image itself so the art is its own container. */}
        {images.length > 0 && (
          <div
            className={`mb-4 ${
              images.length === 1 ? 'flex justify-center' : 'grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2'
            }`}
          >
            {images.map((image, index) => {
              const isSingle = images.length === 1;
              return (
                <Image
                  key={index}
                  src={image.url}
                  alt={image.originalName || `Image ${index + 1}`}
                  width={2000}
                  height={1500}
                  sizes={isSingle ? '(max-width: 1024px) 100vw, 1024px' : '(max-width: 768px) 100vw, 50vw'}
                  // The art is the focus: it always fills the column width, and height
                  // follows the true ratio — a portrait piece gets taller rather than
                  // being shrunk to fit the viewport. Dimensions aren't stored, so the
                  // width/height props are placeholders; the real ratio is adopted on
                  // load, which also keeps the shadow hugging the artwork exactly.
                  className="h-auto w-full cursor-pointer rounded-md object-contain shadow-lg shadow-amber-950/25 ring-1 ring-amber-900/10 transition-shadow hover:shadow-xl hover:shadow-amber-950/30"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                    }
                  }}
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Artwork credit — art posts only; media is usually the poster's own screenshots */}
        {isArt && post.content.credit && (
          <p className="mb-6 text-center text-sm italic text-amber-700">{post.content.credit}</p>
        )}

        {/* Event header image gets the same outside-the-card treatment as artwork */}
        {isEvent && post.content.headerImage && (
          <div className="relative mb-6 aspect-[3/1] overflow-hidden rounded-md shadow-lg shadow-amber-950/25 ring-1 ring-amber-900/10">
            <Image
              src={post.content.headerImage.url}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              style={focalStyle(post.content.headerImage)}
              className="object-cover"
            />
          </div>
        )}

        {/* A past event stays viewable as a record of what happened */}
        {eventEnded && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100/80 px-4 py-2.5 text-sm font-medium text-amber-800">
            <CalendarDays className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            This event has ended.
          </div>
        )}

        {/* Post Content */}
        {hasCardContent && (
          <Card className="p-8 bg-white/80 border-amber-300 mb-6">
            {/* Art/Media description */}
            {descriptionContent && (
              <div
                className="prose prose-amber rte-content text-amber-800 [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-900 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-amber-700 [&_hr]:border-amber-200 [&_img]:rounded [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(descriptionContent) }}
              />
            )}

            {/* Writing body, and the fallback for any future post type */}
            {bodyContent && (
              <div
                className="prose prose-amber rte-content text-amber-800 [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-900 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-amber-700 [&_hr]:border-amber-200 [&_img]:rounded [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyContent) }}
              />
            )}

            {/* RSVP — count is public, the guest list is organiser-only */}
            {isEvent && <EventRsvp postId={post.post_id} />}

            {/* Featuring — small bubbles, closing out the content rather than the header */}
            {featuredProfiles.length > 0 && (
              <div className="mt-6 pt-4 border-t border-amber-200 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-700">Featuring</span>
                {featuredProfiles.map((fp) => (
                  <Link
                    key={fp.featured_profile_id}
                    href={`/profiles/${fp.profile_id}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 transition-colors text-xs font-medium"
                  >
                    {fp.name}
                    <span className="text-amber-600">· {fp.type_name}</span>
                  </Link>
                ))}
              </div>
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
        open={showEditorsDialog}
        onOpenChange={(open) => {
          setShowEditorsDialog(open);
          if (!open) {
            setNewEditorUsername('');
            setEditorError(null);
          }
        }}
      >
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Editors</DialogTitle>
            <DialogDescription className="text-amber-700">
              Editors can change this post. The creator cannot be removed.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2">
            {editors.map((editor) => (
              <li
                key={editor.editor_id}
                className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-700" />
                  <Link href={`/users/${editor.username}`} className="text-amber-900 font-medium hover:underline">
                    {editor.username}
                  </Link>
                  {editor.is_owner && (
                    <span className="text-xs bg-amber-700 text-amber-50 px-2 py-0.5 rounded-full font-medium">
                      Creator
                    </span>
                  )}
                </div>
                {/* Owner can remove any non-owner; editors can remove themselves */}
                {!editor.is_owner && (post.is_owner || editor.username === currentUsername) && (
                  <Button
                    onClick={() => handleRemoveEditor(editor.editor_id)}
                    disabled={removingEditorId === editor.editor_id}
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${editor.username}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {post.is_owner && (
            <div className="pt-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <UsernameInput
                    value={newEditorUsername}
                    onChange={setNewEditorUsername}
                    onSubmit={handleAddEditor}
                    disabled={isAddingEditor}
                    exclude={editors.map((editor) => editor.username)}
                  />
                </div>
                <Button
                  onClick={handleAddEditor}
                  disabled={isAddingEditor || !newEditorUsername.trim()}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isAddingEditor ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {editorError && <p className="text-red-600 text-sm mt-2">{editorError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditorsDialog(false)}
              className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox for Art/Media Posts */}
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
