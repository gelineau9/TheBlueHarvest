'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPost } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';

interface ArtFormProps {
  onSuccess: (postId: number) => void;
  onCancel: () => void;
}

interface UploadedImage {
  filename: string;
  originalName: string;
  url: string;
  size: number;
}

// Validation schema for art posts
const artPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type ArtPostInput = z.infer<typeof artPostSchema>;

export function ArtForm({ onSuccess, onCancel }: ArtFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArtPostInput>({
    resolver: zodResolver(artPostSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: [],
    },
  });

  const titleValue = watch('title') || '';
  const titleLength = titleValue.length;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total image count
    if (uploadedImages.length + files.length > 10) {
      setError('Maximum 10 images allowed per post');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch('/api/uploads/images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to upload images');
        return;
      }

      setUploadedImages((prev) => [...prev, ...data.files]);
    } catch {
      setError('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (filename: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.filename !== filename));
    // Optionally delete from server - for now we just remove from UI
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagsInput(value);

    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    setValue('tags', tags, { shouldValidate: true });
  };

  const onSubmit = async (data: ArtPostInput) => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const postData = {
        post_type_id: 2, // Art
        title: data.title,
        content: {
          images: uploadedImages.map((img) => ({
            filename: img.filename,
            url: img.url,
            originalName: img.originalName,
          })),
          description: data.description || '',
          tags: data.tags || [],
        },
      };

      console.log('Submitting art post:', JSON.stringify(postData, null, 2));
      const result = await createPost(postData);
      console.log('createPost result:', result);

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

      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="text-amber-900 font-semibold">Images *</Label>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isUploading ? 'border-amber-400 bg-amber-50' : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading || isSubmitting}
          />

          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-2"></div>
              <p className="text-amber-700">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-amber-600 mb-2" />
              <p className="text-amber-800 font-medium">Click to upload images</p>
              <p className="text-sm text-amber-600 mt-1">JPEG, PNG, GIF, or WebP • Max 10MB each • Up to 10 images</p>
            </div>
          )}
        </div>

        {/* Uploaded Images Preview */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {uploadedImages.map((image) => (
              <div key={image.filename} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                  <img
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}${image.url}`}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(image.filename)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs text-amber-700 truncate mt-1">{image.originalName}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-amber-700">{uploadedImages.length}/10 images uploaded</p>
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
          placeholder="Give your artwork a title"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
          maxLength={200}
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-amber-900 font-semibold">
          Description (Optional)
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Tell us about your artwork..."
          rows={4}
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white resize-none"
          disabled={isSubmitting}
        />
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
          placeholder="Enter tags separated by commas (e.g., portrait, landscape, fanart)"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
        />
        <p className="text-sm text-amber-700">Tags help others discover your artwork.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isUploading}
          className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isUploading || uploadedImages.length === 0}
          className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Publishing...' : 'Publish Art'}
        </Button>
      </div>
    </form>
  );
}
