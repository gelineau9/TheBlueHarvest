'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSchema, CreatePostInput } from '@/app/lib/validations';
import { createPost } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WritingFormProps {
  onSuccess: (postId: number) => void;
  onCancel: () => void;
}

interface Character {
  profile_id: number;
  name: string;
}

export function WritingForm({ onSuccess, onCancel }: WritingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [tagsInput, setTagsInput] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      post_type_id: 1, // Writing
      content: { body: '', tags: [] },
    },
  });

  const selectedAuthorId = watch('primary_author_profile_id');
  const titleValue = watch('title') || '';
  const titleLength = titleValue.length;

  // Fetch user's characters (only characters can author)
  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    setIsLoadingCharacters(true);
    try {
      const response = await fetch('/api/profiles?type=1');
      if (response.ok) {
        const data = await response.json();
        setCharacters(data);
      } else {
        setError('Failed to load your characters. Please try again.');
      }
    } catch (err) {
      setError('Failed to load your characters. Please try again.');
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagsInput(value);

    // Parse tags from comma-separated input
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    setValue('content.tags', tags, { shouldValidate: true });
  };

  const onSubmit = async (data: CreatePostInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createPost(data);
      if (!result.success) {
        setError(result.error || 'Failed to create post');
        return;
      }
      if (result.post?.post_id) {
        onSuccess(result.post.post_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Author Selection */}
      <div className="space-y-2">
        <Label htmlFor="primary_author_profile_id" className="text-amber-900 font-semibold">
          Author *
        </Label>
        {isLoadingCharacters ? (
          <div className="text-sm text-amber-700">Loading your characters...</div>
        ) : characters.length === 0 ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800 mb-2">
              You need to create a character first before you can write a story.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = '/profiles/create/character')}
              className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
            >
              Create a Character
            </Button>
          </div>
        ) : (
          <>
            <select
              value={selectedAuthorId || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setValue('primary_author_profile_id', parseInt(value), { shouldValidate: true });
                }
              }}
              disabled={isSubmitting}
              className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="">Select an author</option>
              {characters.map((character) => (
                <option key={character.profile_id} value={character.profile_id}>
                  {character.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-amber-700">This writing will be attributed to the selected character.</p>
            {errors.primary_author_profile_id && (
              <p className="text-sm text-red-600">{errors.primary_author_profile_id.message}</p>
            )}
          </>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-amber-900 font-semibold">
            Title *
          </Label>
          <span className={`text-xs ${titleLength > 200 ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
            {titleLength}/200 characters
          </span>
        </div>
        <Input
          id="title"
          {...register('title')}
          placeholder="Enter a title for your writing"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
          maxLength={200}
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="body" className="text-amber-900 font-semibold">
          Content *
        </Label>
        <Textarea
          id="body"
          {...register('content.body')}
          placeholder="Write your story here..."
          rows={12}
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white resize-none"
          disabled={isSubmitting}
        />
        {errors.content?.body && <p className="text-sm text-red-600">{errors.content.body.message}</p>}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="text-amber-900 font-semibold">
          Tags (Optional)
        </Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={handleTagsChange}
          placeholder="Enter tags separated by commas (e.g., adventure, drama, romance)"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
        />
        <p className="text-sm text-amber-700">Tags help others discover your writing.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || characters.length === 0 || !selectedAuthorId}
          className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Publishing...' : 'Publish Writing'}
        </Button>
      </div>
    </form>
  );
}
