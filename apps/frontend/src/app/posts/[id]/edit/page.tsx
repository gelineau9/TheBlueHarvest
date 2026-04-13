'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePostEdit, POST_TYPES, POST_TYPE_NAMES, UploadedImage } from '@/hooks/usePostEdit';
import { FeaturedProfilesPicker, FeaturedProfile } from '@/components/posts/FeaturedProfilesPicker';
import { useSidebarRefresh } from '@/contexts/SidebarRefreshContext';

const getMinDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const getMaxDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    router,
    characters,
    charactersLoaded,
    authorableProfiles,
    authorableProfilesLoaded,
  } = usePostEdit({ postId: id });
  const { triggerSidebarRefresh } = useSidebarRefresh();

  // ── Shared fields ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // ── Writing ────────────────────────────────────────────────────────────────
  const [body, setBody] = useState('');
  const [authorId, setAuthorId] = useState('');

  // ── Art / Media ────────────────────────────────────────────────────────────
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState('');

  // ── Event ──────────────────────────────────────────────────────────────────
  const [headerImage, setHeaderImage] = useState<UploadedImage | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [contactProfileId, setContactProfileId] = useState('');

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [tagsInput, setTagsInput] = useState('');

  // ── Featured Profiles ──────────────────────────────────────────────────────
  const [featuredProfiles, setFeaturedProfiles] = useState<FeaturedProfile[]>([]);

  // ── Original values for dirty-check ───────────────────────────────────────
  const [originalValues, setOriginalValues] = useState({
    title: '',
    isPublished: true,
    body: '',
    authorId: '',
    images: [] as UploadedImage[],
    description: '',
    headerImage: null as UploadedImage | null,
    eventDate: '',
    eventTime: '',
    location: '',
    maxAttendees: '',
    contactProfileId: '',
    tagsInput: '',
    featuredProfiles: [] as FeaturedProfile[],
  });

  // ── Populate form when post loads ─────────────────────────────────────────
  useEffect(() => {
    if (!post || !charactersLoaded || !authorableProfilesLoaded) return;

    const t = post.title || '';
    const pub = post.is_published !== false;
    const tags = post.content?.tags?.join(', ') || '';
    const primaryAuthor = post.authors?.find((a) => a.is_primary);

    let initialBody = '';
    let initialAuthorId = '';
    let initialImages: UploadedImage[] = [];
    let initialDescription = '';
    let initialHeaderImage: UploadedImage | null = null;
    let initialEventDate = '';
    let initialEventTime = '';
    let initialLocation = '';
    let initialMaxAttendees = '';
    let initialContactProfileId = '';

    const type = Number(post.post_type_id);

    if (type === POST_TYPES.WRITING) {
      initialBody = post.content?.body || '';
      initialAuthorId = primaryAuthor?.profile_id?.toString() || '';
    } else if (type === POST_TYPES.ART || type === POST_TYPES.MEDIA) {
      initialImages = (post.content?.images as UploadedImage[]) || [];
      initialDescription = post.content?.description || '';
      initialAuthorId = primaryAuthor?.profile_id?.toString() || '';
    } else if (type === POST_TYPES.EVENT) {
      initialHeaderImage = (post.content?.headerImage as UploadedImage) || null;
      initialDescription = post.content?.description || '';
      initialLocation = post.content?.location || '';
      initialMaxAttendees = post.content?.maxAttendees?.toString() || '';
      initialContactProfileId = post.content?.contactProfileId?.toString() || '';
      initialAuthorId = primaryAuthor?.profile_id?.toString() || '';
      if (post.content?.eventDateTime) {
        const utc = new Date(post.content.eventDateTime);
        initialEventDate = utc.toLocaleDateString('en-CA');
        initialEventTime = utc.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
    }

    // Load featured profiles (only for writing/art/media, not events)
    const initialFeatured: FeaturedProfile[] =
      type !== POST_TYPES.EVENT
        ? (post.featured_profiles || []).map((fp) => ({
            profile_id: fp.profile_id,
            name: fp.name,
            profile_type_id: fp.profile_type_id,
            type_name: fp.type_name,
          }))
        : [];

    setTitle(t);
    setIsPublished(pub);
    setTagsInput(tags);
    setBody(initialBody);
    setAuthorId(initialAuthorId);
    setImages(initialImages);
    setDescription(initialDescription);
    setHeaderImage(initialHeaderImage);
    setEventDate(initialEventDate);
    setEventTime(initialEventTime);
    setLocation(initialLocation);
    setMaxAttendees(initialMaxAttendees);
    setContactProfileId(initialContactProfileId);
    setFeaturedProfiles(initialFeatured);

    setOriginalValues({
      title: t,
      isPublished: pub,
      tagsInput: tags,
      body: initialBody,
      authorId: initialAuthorId,
      images: initialImages,
      description: initialDescription,
      headerImage: initialHeaderImage,
      eventDate: initialEventDate,
      eventTime: initialEventTime,
      location: initialLocation,
      maxAttendees: initialMaxAttendees,
      contactProfileId: initialContactProfileId,
      featuredProfiles: initialFeatured,
    });
  }, [post, charactersLoaded, authorableProfilesLoaded]);

  const isDirty =
    title !== originalValues.title ||
    isPublished !== originalValues.isPublished ||
    tagsInput !== originalValues.tagsInput ||
    body !== originalValues.body ||
    authorId !== originalValues.authorId ||
    JSON.stringify(images) !== JSON.stringify(originalValues.images) ||
    description !== originalValues.description ||
    JSON.stringify(headerImage) !== JSON.stringify(originalValues.headerImage) ||
    eventDate !== originalValues.eventDate ||
    eventTime !== originalValues.eventTime ||
    location !== originalValues.location ||
    maxAttendees !== originalValues.maxAttendees ||
    contactProfileId !== originalValues.contactProfileId ||
    JSON.stringify(featuredProfiles.map((p) => p.profile_id).sort()) !==
      JSON.stringify(originalValues.featuredProfiles.map((p) => p.profile_id).sort());

  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  // ── Image upload helpers ───────────────────────────────────────────────────
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 10) {
      setSaveError('Maximum 10 images allowed');
      return;
    }
    const newImages = await uploadImages(files, 10);
    if (newImages.length > 0) setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImages = await uploadImages(files, 1);
    if (newImages.length > 0) setHeaderImage(newImages[0]);
    if (headerImageInputRef.current) headerImageInputRef.current.value = '';
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = Number(post!.post_type_id);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    let content: Parameters<typeof savePost>[1] = {};
    let authorProfileId: number | null | undefined = undefined;

    if (type === POST_TYPES.WRITING) {
      content = { body, tags };
      authorProfileId = authorId ? parseInt(authorId, 10) : null;
    } else if (type === POST_TYPES.ART || type === POST_TYPES.MEDIA) {
      if (images.length === 0) {
        setSaveError('Please upload at least one image');
        return;
      }
      content = { description, images, tags };
      authorProfileId = authorId ? parseInt(authorId, 10) : null;
    } else if (type === POST_TYPES.EVENT) {
      if (eventDate && eventTime) {
        // Validate combined datetime in local timezone against right now
        const eventDateTime = new Date(`${eventDate}T${eventTime}`);
        if (eventDateTime <= new Date()) {
          setSaveError('Event date and time must be in the future');
          return;
        }
        const oneYear = new Date();
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        if (eventDateTime > oneYear) {
          setSaveError('Event date cannot be more than 1 year away');
          return;
        }
      } else if (eventDate) {
        // Date provided but no time yet — only check 1-year bound
        const oneYear = new Date();
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        if (new Date(eventDate) > oneYear) {
          setSaveError('Event date cannot be more than 1 year away');
          return;
        }
      }
      let eventDateTime: string | undefined;
      if (eventDate && eventTime) eventDateTime = new Date(`${eventDate}T${eventTime}`).toISOString();
      content = {
        description,
        tags,
        headerImage: headerImage || undefined,
        eventDateTime,
        location,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        contactProfileId: contactProfileId ? parseInt(contactProfileId, 10) : undefined,
      };
      authorProfileId = authorId ? parseInt(authorId, 10) : null;
    }

    const success = await savePost(title, content, authorProfileId, isPublished);
    if (success) {
      // Apply featured profiles diff (only for writing/art/media)
      const type2 = Number(post!.post_type_id);
      if (type2 !== POST_TYPES.EVENT) {
        const originalIds = new Set(originalValues.featuredProfiles.map((p) => p.profile_id));
        const currentIds = new Set(featuredProfiles.map((p) => p.profile_id));

        const toAdd = featuredProfiles.filter((p) => !originalIds.has(p.profile_id));
        const toRemove = (post!.featured_profiles || []).filter((fp) => !currentIds.has(fp.profile_id));

        await Promise.all([
          ...toAdd.map((p) =>
            fetch(`/api/posts/${id}/featured`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile_id: p.profile_id }),
            }),
          ),
          ...toRemove.map((fp) => fetch(`/api/posts/${id}/featured/${fp.featured_profile_id}`, { method: 'DELETE' })),
        ]);
      }

      setOriginalValues({
        title: title.trim(),
        isPublished,
        tagsInput,
        body,
        authorId,
        images,
        description,
        headerImage,
        eventDate,
        eventTime,
        location,
        maxAttendees,
        contactProfileId,
        featuredProfiles,
      });
      triggerSidebarRefresh();
      navigateBack();
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-amber-900">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="px-4 py-8">
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
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
    );
  }

  const type = Number(post.post_type_id);
  const typeName = POST_TYPE_NAMES[type] ?? 'Post';

  // ── Shared UI helpers ──────────────────────────────────────────────────────
  const PublishToggle = (
    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div>
        <Label className="text-amber-900 font-semibold">{isPublished ? 'Published' : 'Draft'}</Label>
        <p className="text-sm text-amber-600">
          {isPublished ? 'This post is visible to everyone.' : 'Only you can see this draft.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublished}
        onClick={() => setIsPublished(!isPublished)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublished ? 'bg-emerald-600' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );

  const TitleField = (
    <div className="space-y-2">
      <Label htmlFor="title" className="text-amber-900 font-semibold">
        Title
      </Label>
      <Input
        id="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter post title"
        maxLength={200}
        required
        className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
      />
      <p className="text-sm text-amber-600">{title.length}/200 characters</p>
    </div>
  );

  const TagsField = (
    <div className="space-y-2">
      <Label htmlFor="tags" className="text-amber-900 font-semibold">
        Tags
      </Label>
      <Input
        id="tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Enter tags separated by commas"
        className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
      />
      <p className="text-sm text-amber-600">Tags help others discover your content.</p>
    </div>
  );

  const SaveButtons = (
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
  );

  return (
    <div className="px-4 py-8">
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
              {typeName}
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit {typeName}</h1>
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {TitleField}

            {/* ── Writing fields ── */}
            {type === POST_TYPES.WRITING && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="authorId" className="text-amber-900 font-semibold">
                    Author (Optional)
                  </Label>
                  <select
                    id="authorId"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
                  >
                    <option value="">No author</option>
                    {authorableProfiles.map((p) => (
                      <option key={p.profile_id} value={String(p.profile_id)}>
                        {p.name} ({p.type_label})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-amber-600">
                    Optionally attribute this writing to one of your characters or kinships.
                  </p>
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
              </>
            )}

            {/* ── Art / Media fields ── */}
            {(type === POST_TYPES.ART || type === POST_TYPES.MEDIA) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="artMediaAuthorId" className="text-amber-900 font-semibold">
                    Author (Optional)
                  </Label>
                  <select
                    id="artMediaAuthorId"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
                  >
                    <option value="">No author</option>
                    {authorableProfiles.map((p) => (
                      <option key={p.profile_id} value={String(p.profile_id)}>
                        {p.name} ({p.type_label})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-amber-600">
                    Optionally attribute this post to one of your characters or kinships.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-900 font-semibold">Images</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isUploading ? 'border-amber-400 bg-amber-50' : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      onChange={handleImagesUpload}
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
                          JPEG, PNG, GIF, or WebP · Max 10MB each · Up to 10 images
                        </p>
                      </div>
                    )}
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                      {images.map((img) => (
                        <div key={img.filename} className="relative group">
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                            <Image
                              src={img.url}
                              alt={img.originalName}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((i) => i.filename !== img.filename))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isSaving}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-amber-700 truncate mt-1">{img.originalName}</p>
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
              </>
            )}

            {/* ── Event fields ── */}
            {type === POST_TYPES.EVENT && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="eventAuthorId" className="text-amber-900 font-semibold">
                    Author (Optional)
                  </Label>
                  <select
                    id="eventAuthorId"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
                  >
                    <option value="">No author</option>
                    {authorableProfiles.map((p) => (
                      <option key={p.profile_id} value={String(p.profile_id)}>
                        {p.name} ({p.type_label})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-amber-600">
                    Optionally attribute this event to one of your characters or kinships.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-900 font-semibold">Header Image (Optional)</Label>
                  {headerImage ? (
                    <div className="relative">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                        <Image
                          fill
                          src={headerImage.url}
                          alt={headerImage.originalName}
                          sizes="(max-width: 768px) 100vw, 800px"
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeaderImage(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isUploading ? 'border-amber-400 bg-amber-50' : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'}`}
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
                          <p className="text-sm text-amber-600 mt-1">JPEG, PNG, GIF, or WebP · Max 10MB</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-amber-900 font-semibold">
                      Location
                    </Label>
                    <Input
                      id="location"
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
                    {characters.map((c) => (
                      <option key={c.profile_id} value={String(c.profile_id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-amber-600">Select a character others can contact about this event.</p>
                </div>
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
              </>
            )}

            {TagsField}

            {/* Featured Profiles — writing, art, media only */}
            {type !== POST_TYPES.EVENT && (
              <FeaturedProfilesPicker value={featuredProfiles} onChange={setFeaturedProfiles} disabled={isSaving} />
            )}

            {PublishToggle}

            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{saveError}</p>
              </div>
            )}

            {SaveButtons}
          </form>
        </Card>
      </div>
    </div>
  );
}
