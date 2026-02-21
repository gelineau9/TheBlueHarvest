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

// Helper functions for date validation
const getMinDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getMaxDate = () => {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  return oneYearFromNow.toISOString().split('T')[0];
};

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const headerImageInputRef = useRef<HTMLInputElement>(null);

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
    characters,
    charactersLoaded,
  } = usePostEdit({ postId: id, expectedType: POST_TYPES.EVENT });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [headerImage, setHeaderImage] = useState<UploadedImage | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [contactProfileId, setContactProfileId] = useState('');

  // Original values for dirty checking
  const [originalValues, setOriginalValues] = useState({
    title: '',
    description: '',
    tagsInput: '',
    headerImage: null as UploadedImage | null,
    eventDate: '',
    eventTime: '',
    location: '',
    maxAttendees: '',
    contactProfileId: '',
  });

  // Initialize form when post and characters load
  useEffect(() => {
    if (post && charactersLoaded) {
      const initialTitle = post.title || '';
      const initialDescription = post.content?.description || '';
      const initialTags = post.content?.tags?.join(', ') || '';
      const initialHeaderImage = post.content?.headerImage || null;
      const initialEventDate = post.content?.eventDate || '';
      const initialEventTime = post.content?.eventTime || '';
      const initialLocation = post.content?.location || '';
      const initialMaxAttendees = post.content?.maxAttendees?.toString() || '';
      const initialContactProfileId = post.content?.contactProfileId?.toString() || '';

      setTitle(initialTitle);
      setDescription(initialDescription);
      setTagsInput(initialTags);
      setHeaderImage(initialHeaderImage);
      setEventDate(initialEventDate);
      setEventTime(initialEventTime);
      setLocation(initialLocation);
      setMaxAttendees(initialMaxAttendees);
      setContactProfileId(initialContactProfileId);

      setOriginalValues({
        title: initialTitle,
        description: initialDescription,
        tagsInput: initialTags,
        headerImage: initialHeaderImage,
        eventDate: initialEventDate,
        eventTime: initialEventTime,
        location: initialLocation,
        maxAttendees: initialMaxAttendees,
        contactProfileId: initialContactProfileId,
      });
    }
  }, [post, charactersLoaded]);

  const isDirty =
    title !== originalValues.title ||
    description !== originalValues.description ||
    tagsInput !== originalValues.tagsInput ||
    JSON.stringify(headerImage) !== JSON.stringify(originalValues.headerImage) ||
    eventDate !== originalValues.eventDate ||
    eventTime !== originalValues.eventTime ||
    location !== originalValues.location ||
    maxAttendees !== originalValues.maxAttendees ||
    contactProfileId !== originalValues.contactProfileId;

  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = await uploadImages(files, 1);
    if (newImages.length > 0) {
      setHeaderImage(newImages[0]);
    }

    if (headerImageInputRef.current) headerImageInputRef.current.value = '';
  };

  const handleRemoveHeaderImage = () => {
    setHeaderImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate event date
    if (eventDate) {
      const selectedDate = new Date(eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setSaveError('Event date cannot be in the past');
        return;
      }

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (selectedDate > oneYearFromNow) {
        setSaveError('Event date cannot be more than 1 year away');
        return;
      }
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const content = {
      description,
      tags,
      headerImage: headerImage || undefined,
      eventDate,
      eventTime,
      location,
      maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
      contactProfileId: contactProfileId ? parseInt(contactProfileId, 10) : undefined,
    };

    const success = await savePost(title, content);

    if (success) {
      setOriginalValues({
        title: title.trim(),
        description,
        tagsInput,
        headerImage,
        eventDate,
        eventTime,
        location,
        maxAttendees,
        contactProfileId,
      });
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
              Event
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit Event</h1>
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
                placeholder="Enter event title"
                maxLength={200}
                required
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              />
              <p className="text-sm text-amber-600">{title.length}/200 characters</p>
            </div>

            {/* Header Image */}
            <div className="space-y-2">
              <Label className="text-amber-900 font-semibold">Header Image (Optional)</Label>

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
                    onChange={handleHeaderImageUpload}
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

            {/* Date and Time */}
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
                  min={getMinDate()}
                  max={getMaxDate()}
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

            {/* Location and Max Attendees */}
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

            {/* Contact Character */}
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
                  <option key={char.profile_id} value={String(char.profile_id)}>
                    {char.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-amber-600">Select a character others can contact about this event.</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-amber-900 font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter event description..."
                rows={6}
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Tags */}
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
              <p className="text-sm text-amber-600">Tags help others discover your event.</p>
            </div>

            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{saveError}</p>
              </div>
            )}

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
