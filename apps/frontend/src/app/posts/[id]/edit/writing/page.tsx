'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePostEdit, POST_TYPES } from '@/hooks/usePostEdit';

export default function EditWritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { post, isLoading, error, isSaving, saveError, savePost, navigateBack, router, characters, charactersLoaded } =
    usePostEdit({ postId: id, expectedType: POST_TYPES.WRITING });

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [authorId, setAuthorId] = useState<string>('');

  // Original values for dirty checking
  const [originalValues, setOriginalValues] = useState({ title: '', body: '', tagsInput: '', authorId: '' });

  // Initialize form when post and characters load
  useEffect(() => {
    if (post && charactersLoaded) {
      const initialTitle = post.title || '';
      const initialBody = post.content?.body || '';
      const initialTags = post.content?.tags?.join(', ') || '';
      const primaryAuthor = post.authors?.find((a) => a.is_primary);
      const initialAuthorId = primaryAuthor?.profile_id?.toString() || '';

      setTitle(initialTitle);
      setBody(initialBody);
      setTagsInput(initialTags);
      setAuthorId(initialAuthorId);
      setOriginalValues({ title: initialTitle, body: initialBody, tagsInput: initialTags, authorId: initialAuthorId });
    }
  }, [post, charactersLoaded]);

  const isDirty =
    title !== originalValues.title ||
    body !== originalValues.body ||
    tagsInput !== originalValues.tagsInput ||
    authorId !== originalValues.authorId;

  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Pass author ID (null to clear, number to set, undefined to leave unchanged)
    const authorProfileId = authorId ? parseInt(authorId, 10) : null;
    const success = await savePost(title, { body, tags }, authorProfileId);

    if (success) {
      setOriginalValues({ title: title.trim(), body, tagsInput, authorId });
      navigateBack();
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

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigateWithWarning(`/posts/${id}`)}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post
        </button>

        <Card className="p-8 bg-white border-amber-300">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full mb-3">
              Writing
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit Writing</h1>
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Author Character (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="authorId" className="text-amber-900 font-semibold">
                Author Character (Optional)
              </Label>
              <select
                id="authorId"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
              >
                <option value="">No character author</option>
                {characters.map((char) => (
                  <option key={char.profile_id} value={String(char.profile_id)}>
                    {char.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-amber-600">Optionally attribute this writing to one of your characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body" className="text-amber-900 font-semibold">
                Content
              </Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your post content..."
                rows={12}
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none"
              />
            </div>

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

            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{saveError}</p>
              </div>
            )}

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
