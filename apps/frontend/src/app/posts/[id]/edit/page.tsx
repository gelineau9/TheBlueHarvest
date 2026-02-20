'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface UploadedImage {
  filename: string;
  originalName: string;
  url: string;
  size?: number;
}

interface Post {
  post_id: number;
  account_id: number;
  post_type_id: number;
  title: string;
  content: {
    body?: string;
    description?: string;
    images?: UploadedImage[];
    embeds?: Array<{ type: string; url: string; title?: string }>;
    eventDate?: string;
    eventTime?: string;
    location?: string;
    maxAttendees?: number;
    contactProfileId?: number;
    headerImage?: UploadedImage;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
}

interface CharacterProfile {
  profile_id: number;
  name: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerImageInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Common form state
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Writing-specific
  const [body, setBody] = useState('');

  // Art/Media/Event-specific
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Event-specific
  const [headerImage, setHeaderImage] = useState<UploadedImage | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxAttendees, setMaxAttendees] = useState<string>('');
  const [contactProfileId, setContactProfileId] = useState<string>('');
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);

  // Original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    title: '',
    tagsInput: '',
    body: '',
    description: '',
    images: [] as UploadedImage[],
    headerImage: null as UploadedImage | null,
    eventDate: '',
    eventTime: '',
    location: '',
    maxAttendees: '',
    contactProfileId: '',
  });

  // Check if form has unsaved changes
  const isDirty =
    title !== originalValues.title ||
    tagsInput !== originalValues.tagsInput ||
    body !== originalValues.body ||
    description !== originalValues.description ||
    JSON.stringify(images) !== JSON.stringify(originalValues.images) ||
    JSON.stringify(headerImage) !== JSON.stringify(originalValues.headerImage) ||
    eventDate !== originalValues.eventDate ||
    eventTime !== originalValues.eventTime ||
    location !== originalValues.location ||
    maxAttendees !== originalValues.maxAttendees ||
    contactProfileId !== originalValues.contactProfileId;

  // Use the unsaved changes hook for navigation warnings
  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  // Fetch characters for event contact dropdown
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch('/api/profiles?type=1');
        if (response.ok) {
          const data = await response.json();
          setCharacters(data.profiles || []);
        }
      } catch (err) {
        console.error('Failed to fetch characters:', err);
      }
    };

    fetchCharacters();
  }, []);

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

        // Set common values
        const initialTitle = data.title || '';
        const initialTags = data.content?.tags?.join(', ') || '';

        setTitle(initialTitle);
        setTagsInput(initialTags);

        // Set type-specific values
        if (data.post_type_id === POST_TYPES.WRITING) {
          const initialBody = data.content?.body || '';
          setBody(initialBody);
          setOriginalValues((prev) => ({ ...prev, title: initialTitle, tagsInput: initialTags, body: initialBody }));
        } else {
          const initialDescription = data.content?.description || '';
          const initialImages = data.content?.images || [];
          setDescription(initialDescription);
          setImages(initialImages);

          if (data.post_type_id === POST_TYPES.EVENT) {
            const initialHeaderImage = data.content?.headerImage || null;
            const initialEventDate = data.content?.eventDate || '';
            const initialEventTime = data.content?.eventTime || '';
            const initialLocation = data.content?.location || '';
            const initialMaxAttendees = data.content?.maxAttendees?.toString() || '';
            const initialContactProfileId = data.content?.contactProfileId?.toString() || '';

            setHeaderImage(initialHeaderImage);
            setEventDate(initialEventDate);
            setEventTime(initialEventTime);
            setLocation(initialLocation);
            setMaxAttendees(initialMaxAttendees);
            setContactProfileId(initialContactProfileId);

            setOriginalValues({
              title: initialTitle,
              tagsInput: initialTags,
              body: '',
              description: initialDescription,
              images: [],
              headerImage: initialHeaderImage,
              eventDate: initialEventDate,
              eventTime: initialEventTime,
              location: initialLocation,
              maxAttendees: initialMaxAttendees,
              contactProfileId: initialContactProfileId,
            });
          } else {
            setOriginalValues({
              title: initialTitle,
              tagsInput: initialTags,
              body: '',
              description: initialDescription,
              images: initialImages,
              headerImage: null,
              eventDate: '',
              eventTime: '',
              location: '',
              maxAttendees: '',
              contactProfileId: '',
            });
          }
        }
      } catch (err) {
        setError('An error occurred while loading the post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isHeaderImage = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isHeaderImage && images.length + files.length > 10) {
      setSaveError('Maximum 10 images allowed per post');
      return;
    }

    setIsUploading(true);
    setSaveError(null);

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
        setSaveError(data.error || 'Failed to upload images');
        return;
      }

      if (isHeaderImage) {
        setHeaderImage(data.files[0]);
      } else {
        setImages((prev) => [...prev, ...data.files]);
      }
    } catch (err) {
      setSaveError('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (headerImageInputRef.current) headerImageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (filename: string) => {
    setImages((prev) => prev.filter((img) => img.filename !== filename));
  };

  const handleRemoveHeaderImage = () => {
    setHeaderImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      let updatedContent: Post['content'] = { tags };

      if (post?.post_type_id === POST_TYPES.WRITING) {
        updatedContent.body = body;
      } else if (post?.post_type_id === POST_TYPES.EVENT) {
        updatedContent.description = description;
        updatedContent.headerImage = headerImage || undefined;
        updatedContent.eventDate = eventDate;
        updatedContent.eventTime = eventTime;
        updatedContent.location = location;
        updatedContent.maxAttendees = maxAttendees ? parseInt(maxAttendees, 10) : undefined;
        updatedContent.contactProfileId = contactProfileId ? parseInt(contactProfileId, 10) : undefined;
      } else {
        // Art or Media
        updatedContent.description = description;
        updatedContent.images = images;
      }

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

      // Update original values to prevent warning on redirect
      setOriginalValues({
        title: title.trim(),
        tagsInput,
        body,
        description,
        images,
        headerImage,
        eventDate,
        eventTime,
        location,
        maxAttendees,
        contactProfileId,
      });

      router.push(`/posts/${id}`);
    } catch (err) {
      setSaveError('An error occurred while saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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
  const isArtOrMedia = post.post_type_id === POST_TYPES.ART || post.post_type_id === POST_TYPES.MEDIA;
  const isEvent = post.post_type_id === POST_TYPES.EVENT;

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
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
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field - All Types */}
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

            {/* Writing: Body Content */}
            {isWriting && (
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
            )}

            {/* Art/Media: Images */}
            {isArtOrMedia && (
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Images</Label>

                {/* Upload Area */}
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
                    onChange={(e) => handleImageUpload(e, false)}
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

                {/* Images Preview */}
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
            )}

            {/* Event: Header Image */}
            {isEvent && (
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Header Image</Label>

                {headerImage ? (
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                      <img
                        src={`${backendUrl}${headerImage.url}`}
                        alt={headerImage.originalName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveHeaderImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isUploading
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
                    }`}
                    onClick={() => headerImageInputRef.current?.click()}
                  >
                    <input
                      ref={headerImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => handleImageUpload(e, true)}
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
                        <p className="text-amber-800 font-medium">Click to upload header image</p>
                        <p className="text-sm text-amber-600 mt-1">JPEG, PNG, GIF, or WebP - Max 10MB</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Event: Date and Time */}
            {isEvent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="text-amber-900 font-semibold">
                    Event Date
                  </Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventTime" className="text-amber-900 font-semibold">
                    Event Time
                  </Label>
                  <Input
                    id="eventTime"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Event: Location and Max Attendees */}
            {isEvent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-amber-900 font-semibold">
                    Location
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., The Prancing Pony, Bree"
                    className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAttendees" className="text-amber-900 font-semibold">
                    Max Attendees (Optional)
                  </Label>
                  <Input
                    id="maxAttendees"
                    type="number"
                    min="1"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(e.target.value)}
                    placeholder="Leave empty for unlimited"
                    className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Event: Contact Character */}
            {isEvent && (
              <div className="space-y-2">
                <Label htmlFor="contactProfileId" className="text-amber-900 font-semibold">
                  Contact Character (Optional)
                </Label>
                <select
                  id="contactProfileId"
                  value={contactProfileId}
                  onChange={(e) => setContactProfileId(e.target.value)}
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
                >
                  <option value="">Select a character...</option>
                  {characters.map((char) => (
                    <option key={char.profile_id} value={char.profile_id}>
                      {char.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-amber-600">
                  Select a character others can contact about this event.
                </p>
              </div>
            )}

            {/* Description - Art/Media/Event */}
            {!isWriting && (
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
            )}

            {/* Tags - All Types */}
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

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{saveError}</p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSaving || isUploading || !title.trim()}
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
