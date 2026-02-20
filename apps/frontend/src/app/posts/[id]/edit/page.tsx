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

interface Post {
  post_id: number;
  account_id: number;
  post_type_id: number;
  title: string;
  content: {
    body?: string;
    description?: string;
    images?: Array<{ filename: string; url: string; originalName: string }>;
    embeds?: Array<{ type: string; url: string; title?: string }>;
    eventDate?: string;
    eventTime?: string;
    location?: string;
    maxAttendees?: number;
    contactProfileId?: number;
    headerImage?: { filename: string; url: string; originalName: string };
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
}

// Post type constants
const POST_TYPES = {
  WRITING: 1,
  ART: 2,
  MEDIA: 3,
  EVENT: 4,
} as const;

const POST_TYPE_NAMES: Record<number, string> = {
  1: 'Writing',
  2: 'Art',
  3: 'Media',
  4: 'Event',
};

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state - varies by post type
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // body for writing, description for art/media/event
  const [tagsInput, setTagsInput] = useState('');

  // Original values for dirty checking
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [originalTagsInput, setOriginalTagsInput] = useState('');

  // Check if form has unsaved changes
  const isDirty = title !== originalTitle || content !== originalContent || tagsInput !== originalTagsInput;

  // Use the unsaved changes hook for navigation warnings
  const { navigateWithWarning } = useUnsavedChanges(isDirty);

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

        const data: Post = await response.json();

        // Check if user can edit this post
        if (!data.can_edit) {
          setError('You do not have permission to edit this post');
          return;
        }

        setPost(data);

        // Set form values based on post type
        const initialTitle = data.title || '';
        let initialContent = '';
        
        if (data.post_type_id === POST_TYPES.WRITING) {
          initialContent = data.content?.body || '';
        } else {
          initialContent = data.content?.description || '';
        }

        const initialTags = data.content?.tags?.join(', ') || '';

        setTitle(initialTitle);
        setContent(initialContent);
        setTagsInput(initialTags);
        setOriginalTitle(initialTitle);
        setOriginalContent(initialContent);
        setOriginalTagsInput(initialTags);
      } catch (err) {
        setError('An error occurred while loading the post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      // Build the updated content object
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      let updatedContent = { ...post?.content };
      
      if (post?.post_type_id === POST_TYPES.WRITING) {
        updatedContent.body = content;
      } else {
        updatedContent.description = content;
      }
      updatedContent.tags = tags;

      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: updatedContent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message || data.error || 'Failed to save changes');
        return;
      }

      // Update original values to match saved state (prevents warning on redirect)
      setOriginalTitle(title.trim());
      setOriginalContent(content);
      setOriginalTagsInput(tagsInput);

      // Redirect back to post page on success
      router.push(`/posts/${id}`);
    } catch (err) {
      setSaveError('An error occurred while saving changes');
    } finally {
      setIsSaving(false);
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
            <p className="text-amber-700 mb-6">
              {error === 'You do not have permission to edit this post'
                ? 'You can only edit posts that you authored.'
                : "The post you're looking for could not be found."}
            </p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const postTypeName = POST_TYPE_NAMES[post.post_type_id] || 'Post';
  const isWriting = post.post_type_id === POST_TYPES.WRITING;
  const contentLabel = isWriting ? 'Content' : 'Description';
  const contentPlaceholder = isWriting ? 'Write your post content...' : 'Enter a description...';

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button - with unsaved changes warning */}
        <button
          onClick={() => navigateWithWarning(`/posts/${id}`)}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post
        </button>

        {/* Edit Form */}
        <Card className="p-8 bg-white border-amber-300">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full mb-3">
              {postTypeName}
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit {postTypeName}</h1>
            {/* Unsaved changes indicator */}
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-amber-900 font-semibold">
                Title
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title"
                maxLength={200}
                required
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              />
              <p className="text-sm text-amber-600">{title.length}/200 characters</p>
            </div>

            {/* Content/Description Field */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-amber-900 font-semibold">
                {contentLabel}
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={contentPlaceholder}
                rows={isWriting ? 12 : 6}
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Tags Field */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-amber-900 font-semibold">
                Tags
              </Label>
              <Input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Enter tags separated by commas"
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              />
              <p className="text-sm text-amber-600">Tags help others discover your content.</p>
            </div>

            {/* Note about non-editable fields */}
            {(post.post_type_id === POST_TYPES.ART || post.post_type_id === POST_TYPES.MEDIA) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  <strong>Note:</strong> Images and media embeds cannot be edited after creation. 
                  To change them, please create a new post.
                </p>
              </div>
            )}

            {post.post_type_id === POST_TYPES.EVENT && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  <strong>Note:</strong> Event date, time, location, and header image cannot be edited. 
                  To change these details, please create a new event.
                </p>
              </div>
            )}

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
                disabled={isSaving || !title.trim()}
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
              {/* Cancel button - with unsaved changes warning */}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigateWithWarning(`/posts/${id}`)}
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
