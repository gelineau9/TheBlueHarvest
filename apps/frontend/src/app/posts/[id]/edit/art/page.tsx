'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePostEdit, POST_TYPES, UploadedImage } from '@/hooks/usePostEdit';

export default function EditArtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    post,
    isLoading,
    error,
    isSaving,
    saveError,
    setSaveError,
    isUploading,
    uploadImages,
    savePost,
    navigateBack,
    backendUrl,
    router,
  } = usePostEdit({ postId: id, expectedType: POST_TYPES.ART });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isPublished, setIsPublished] = useState(true);

  // Original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    title: '',
    description: '',
    tagsInput: '',
    images: [] as UploadedImage[],
    isPublished: true,
  });

  // Initialize form when post loads
  useEffect(() => {
    if (post) {
      const initialTitle = post.title || '';
      const initialDescription = post.content?.description || '';
      const initialTags = post.content?.tags?.join(', ') || '';
      const initialImages = post.content?.images || [];
      const initialIsPublished = post.is_published !== false;

      setTitle(initialTitle);
      setDescription(initialDescription);
      setTagsInput(initialTags);
      setImages(initialImages);
      setIsPublished(initialIsPublished);
      setOriginalValues({
        title: initialTitle,
        description: initialDescription,
        tagsInput: initialTags,
        images: initialImages,
        isPublished: initialIsPublished,
      });
    }
  }, [post]);

  const isDirty =
    title !== originalValues.title ||
    description !== originalValues.description ||
    tagsInput !== originalValues.tagsInput ||
    JSON.stringify(images) !== JSON.stringify(originalValues.images) ||
    isPublished !== originalValues.isPublished;

  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 10) {
      setSaveError('Maximum 10 images allowed per post');
      return;
    }

    const newImages = await uploadImages(files, 10);
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (filename: string) => {
    setImages((prev) => prev.filter((img) => img.filename !== filename));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length === 0) {
      setSaveError('Please upload at least one image');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const success = await savePost(title, { description, images, tags }, undefined, isPublished);

    if (success) {
      setOriginalValues({ title: title.trim(), description, tagsInput, images, isPublished });
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
              Art
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit Art</h1>
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

            {/* Images Section */}
            <div className="space-y-2">
              <Label className="text-amber-900 font-semibold">Images</Label>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isUploading
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading || isSaving}
                />

                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-amber-600 mb-2 animate-spin" />
                    <p className="text-amber-700">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-10 h-10 text-amber-600 mb-2" />
                    <p className="text-amber-800 font-medium">Click to upload images</p>
                    <p className="text-sm text-amber-600 mt-1">
                      JPEG, PNG, GIF, or WebP - Max 10MB each - Up to 10 images
                    </p>
                  </div>
                )}
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {images.map((image) => (
                    <div key={image.filename} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                        <img
                          src={`${backendUrl}${image.url}`}
                          alt={image.originalName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.filename)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-amber-700 truncate mt-1">{image.originalName}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-amber-700">{images.length}/10 images</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-amber-900 font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description..."
                rows={6}
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

            {/* Publish Status */}
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <Label htmlFor="isPublished" className="text-amber-900 font-semibold">
                  {isPublished ? 'Published' : 'Draft'}
                </Label>
                <p className="text-sm text-amber-600">
                  {isPublished ? 'This post is visible to everyone.' : 'Only you can see this draft.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublished}
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublished ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublished ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{saveError}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSaving || isUploading || !title.trim() || images.length === 0}
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
