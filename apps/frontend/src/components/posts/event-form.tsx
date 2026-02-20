'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPost } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X, Calendar, Clock, MapPin, Users } from 'lucide-react';

interface EventFormProps {
  onSuccess: (postId: number) => void;
  onCancel: () => void;
}

interface UploadedImage {
  filename: string;
  originalName: string;
  url: string;
  size: number;
}

interface Profile {
  profile_id: number;
  name: string;
  profile_type_id: number;
}

// Validation schema for event posts
const eventPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().min(1, 'Event time is required'),
  location: z.string().min(1, 'Location is required'),
  maxAttendees: z.string().optional(),
  contactProfileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type EventPostInput = z.infer<typeof eventPostSchema>;

export function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerImage, setHeaderImage] = useState<UploadedImage | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventPostInput>({
    resolver: zodResolver(eventPostSchema),
    defaultValues: {
      title: '',
      description: '',
      eventDate: '',
      eventTime: '',
      location: '',
      maxAttendees: '',
      contactProfileId: '',
      tags: [],
    },
  });

  const titleValue = watch('title') || '';
  const titleLength = titleValue.length;

  // Fetch user's character profiles for contact selection
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // Fetch only character profiles (type 1) for the current user
        const response = await fetch('/api/profiles?type=1');
        if (response.ok) {
          const data = await response.json();
          // Response is an array of profiles directly
          const characterProfiles = Array.isArray(data) ? data : data.profiles || [];
          setProfiles(characterProfiles);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('images', file);

      const response = await fetch('/api/uploads/images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to upload image');
        return;
      }

      if (data.files && data.files.length > 0) {
        setHeaderImage(data.files[0]);
      }
    } catch (err) {
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setHeaderImage(null);
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

  const onSubmit = async (data: EventPostInput) => {
    if (!headerImage) {
      setError('Please upload a header image for the event');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const postData = {
        post_type_id: 4, // Event
        title: data.title,
        content: {
          description: data.description,
          eventDate: data.eventDate,
          eventTime: data.eventTime,
          location: data.location,
          maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees, 10) : null,
          contactProfileId: data.contactProfileId ? parseInt(data.contactProfileId, 10) : null,
          headerImage: {
            filename: headerImage.filename,
            url: headerImage.url,
            originalName: headerImage.originalName,
          },
          tags: data.tags || [],
        },
      };

      const result = await createPost(postData);

      if (!result.success) {
        setError(result.error || 'Failed to create event');
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

      {/* Header Image Upload */}
      <div className="space-y-2">
        <Label className="text-amber-900 font-semibold">Header Image *</Label>

        {headerImage ? (
          <div className="relative">
            <div className="aspect-[3/1] rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
              <img
                src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}${headerImage.url}`}
                alt={headerImage.originalName}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
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
                <p className="text-amber-800 font-medium">Click to upload header image</p>
                <p className="text-sm text-amber-600 mt-1">JPEG, PNG, GIF, or WebP • Max 10MB • Recommended 1200x400</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-amber-900 font-semibold">
            Event Title *
          </Label>
          <span className={`text-xs ${titleLength > 200 ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
            {titleLength}/200 characters
          </span>
        </div>
        <Input
          id="title"
          {...register('title')}
          placeholder="Give your event a title"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
          maxLength={200}
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Date and Time Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="eventDate" className="text-amber-900 font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Event Date *
          </Label>
          <Input
            id="eventDate"
            type="date"
            {...register('eventDate')}
            className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
            disabled={isSubmitting}
          />
          {errors.eventDate && <p className="text-sm text-red-600">{errors.eventDate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventTime" className="text-amber-900 font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Event Time *
          </Label>
          <Input
            id="eventTime"
            type="time"
            {...register('eventTime')}
            className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
            disabled={isSubmitting}
          />
          {errors.eventTime && <p className="text-sm text-red-600">{errors.eventTime.message}</p>}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-amber-900 font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Location *
        </Label>
        <Input
          id="location"
          {...register('location')}
          placeholder="e.g., The Prancing Pony, Bree"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
        />
        {errors.location && <p className="text-sm text-red-600">{errors.location.message}</p>}
      </div>

      {/* Max Attendees */}
      <div className="space-y-2">
        <Label htmlFor="maxAttendees" className="text-amber-900 font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Max Attendees (Optional)
        </Label>
        <Input
          id="maxAttendees"
          type="number"
          min="1"
          {...register('maxAttendees')}
          placeholder="Leave blank for unlimited"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
        />
        <p className="text-sm text-amber-700">Set a limit if your event has capacity restrictions.</p>
      </div>

      {/* Character Contact */}
      <div className="space-y-2">
        <Label htmlFor="contactProfileId" className="text-amber-900 font-semibold">
          Character Contact (Optional)
        </Label>
        {loadingProfiles ? (
          <div className="text-amber-700 text-sm">Loading your characters...</div>
        ) : profiles.length === 0 ? (
          <div className="text-amber-700 text-sm">
            No characters found. Create a character profile to add a contact.
          </div>
        ) : (
          <select
            id="contactProfileId"
            {...register('contactProfileId')}
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:ring-amber-600"
            disabled={isSubmitting}
          >
            <option value="">No contact selected</option>
            {profiles.map((profile) => (
              <option key={profile.profile_id} value={profile.profile_id}>
                {profile.name}
              </option>
            ))}
          </select>
        )}
        <p className="text-sm text-amber-700">Select a character as the point of contact for this event.</p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-amber-900 font-semibold">
          Description *
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe your event - what will happen, who should attend, any requirements..."
          rows={6}
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white resize-none"
          disabled={isSubmitting}
        />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
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
          placeholder="Enter tags separated by commas (e.g., concert, festival, gathering)"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
        />
        <p className="text-sm text-amber-700">Tags help others discover your event.</p>
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
          disabled={isSubmitting || isUploading || !headerImage}
          className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Publishing...' : 'Publish Event'}
        </Button>
      </div>
    </form>
  );
}
