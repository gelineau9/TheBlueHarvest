'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { AvatarUploader } from '@/components/avatar/AvatarUploader';
import { AvatarCropDialog } from '@/components/avatar/AvatarCropDialog';
import { Avatar } from '@/hooks/useAvatarUpload';
import { useBannerUpload, BannerImage } from '@/hooks/useBannerUpload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RelationshipsPicker, PendingRelationship } from '@/components/profiles/RelationshipsPicker';

interface ProfileDetails {
  description?: string;
  appearance?: string;
  avatar?: Avatar;
  banner?: BannerImage;
  race?: string;
  occupation?: string;
  age?: string;
  kinship?: string;
  residence?: string;
}

interface LiveRelationship {
  relationship_id: number;
  profile_id_1: number;
  profile_id_2: number;
  type_name: string;
  label: string | null;
  other_profile_id: number;
  other_profile_name: string;
  other_profile_avatar_url: string | null;
  created_at: string;
}

interface Profile {
  profile_id: number;
  account_id: number;
  profile_type_id: number;
  type_name: string;
  name: string;
  details: ProfileDetails | null;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  can_edit?: boolean;
}

export default function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // Character-only fields
  const [race, setRace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState('');
  const [kinship, setKinship] = useState('');
  const [residence, setResidence] = useState('');
  const [appearance, setAppearance] = useState('');

  // Live relationships (characters only) — managed separately from the form submit
  const [liveRelationships, setLiveRelationships] = useState<LiveRelationship[]>([]);
  const [pendingRelationships, setPendingRelationships] = useState<PendingRelationship[]>([]);
  const [isSavingRelationships, setIsSavingRelationships] = useState(false);
  const [removingRelId, setRemovingRelId] = useState<number | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  // Original values for dirty checking
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalIsPublished, setOriginalIsPublished] = useState(true);
  const [originalAvatar, setOriginalAvatar] = useState<Avatar | null>(null);
  const [originalBanner, setOriginalBanner] = useState<BannerImage | null>(null);
  const [originalRace, setOriginalRace] = useState('');
  const [originalOccupation, setOriginalOccupation] = useState('');
  const [originalAge, setOriginalAge] = useState('');
  const [originalKinship, setOriginalKinship] = useState('');
  const [originalResidence, setOriginalResidence] = useState('');
  const [originalAppearance, setOriginalAppearance] = useState('');

  // Banner upload hook (3:1 aspect, no circular crop)
  const {
    banner,
    setBanner,
    isUploading: isBannerUploading,
    uploadError: bannerUploadError,
    isCropDialogOpen: isBannerCropOpen,
    previewImageSrc: bannerPreviewSrc,
    fileInputRef: bannerFileInputRef,
    handleFileSelect: handleBannerFileSelect,
    handleCropComplete: handleBannerCropComplete,
    handleCropCancel: handleBannerCropCancel,
    handleRemoveBanner,
    triggerFileSelect: triggerBannerFileSelect,
  } = useBannerUpload({ initialBanner: null });

  // Check if form has unsaved changes
  const isDirty =
    name !== originalName ||
    description !== originalDescription ||
    isPublished !== originalIsPublished ||
    JSON.stringify(avatar) !== JSON.stringify(originalAvatar) ||
    JSON.stringify(banner) !== JSON.stringify(originalBanner) ||
    race !== originalRace ||
    occupation !== originalOccupation ||
    age !== originalAge ||
    kinship !== originalKinship ||
    residence !== originalResidence ||
    appearance !== originalAppearance;

  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  const isCharacter = profile?.profile_type_id === 1;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Profile not found');
          } else {
            setError('Failed to load profile');
          }
          return;
        }

        const data: Profile = await response.json();

        if (!data.can_edit) {
          setError('You do not have permission to edit this profile');
          return;
        }

        setProfile(data);

        const initialName = data.name;
        const initialDescription = data.details?.description || '';
        const initialIsPublished = data.is_published !== false;
        const initialAvatar = data.details?.avatar || null;
        const initialBanner = data.details?.banner || null;
        const initialRace = data.details?.race || '';
        const initialOccupation = data.details?.occupation || '';
        const initialAge = data.details?.age || '';
        const initialKinship = data.details?.kinship || '';
        const initialResidence = data.details?.residence || '';
        const initialAppearance = data.details?.appearance || '';

        setName(initialName);
        setDescription(initialDescription);
        setIsPublished(initialIsPublished);
        setAvatar(initialAvatar);
        if (initialBanner) setBanner(initialBanner);
        setRace(initialRace);
        setOccupation(initialOccupation);
        setAge(initialAge);
        setKinship(initialKinship);
        setResidence(initialResidence);
        setAppearance(initialAppearance);

        setOriginalName(initialName);
        setOriginalDescription(initialDescription);
        setOriginalIsPublished(initialIsPublished);
        setOriginalAvatar(initialAvatar);
        setOriginalBanner(initialBanner);
        setOriginalRace(initialRace);
        setOriginalOccupation(initialOccupation);
        setOriginalAge(initialAge);
        setOriginalKinship(initialKinship);
        setOriginalResidence(initialResidence);
        setOriginalAppearance(initialAppearance);
      } catch {
        setError('An error occurred while loading the profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [id, setBanner]);

  // ── Fetch live relationships (character only) ──────────────────────────────
  const fetchRelationships = async () => {
    try {
      const res = await fetch(`/api/profiles/${id}/relationships`);
      if (res.ok) {
        const data = await res.json();
        setLiveRelationships(data.relationships || []);
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    if (isCharacter) fetchRelationships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCharacter, id]);

  // ── Add pending relationships ──────────────────────────────────────────────
  const handleSaveRelationships = async () => {
    if (pendingRelationships.length === 0) return;
    setIsSavingRelationships(true);
    setRelationshipError(null);
    const results = await Promise.allSettled(
      pendingRelationships.map((rel) =>
        fetch(`/api/profiles/${id}/relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id_2: rel.profile_id_2,
            type: rel.type,
            label: rel.label,
          }),
        }),
      ),
    );
    const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
    if (failed.length > 0) {
      setRelationshipError(`${failed.length} relationship(s) failed to save.`);
    }
    setPendingRelationships([]);
    await fetchRelationships();
    setIsSavingRelationships(false);
  };

  // ── Remove a live relationship ─────────────────────────────────────────────
  const handleRemoveRelationship = async (relId: number) => {
    setRemovingRelId(relId);
    try {
      const res = await fetch(`/api/profiles/${id}/relationships/${relId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setRelationshipError(data.message || 'Failed to remove relationship');
      } else {
        await fetchRelationships();
      }
    } catch {
      setRelationshipError('Failed to remove relationship');
    } finally {
      setRemovingRelId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const details: ProfileDetails = {
        description: description.trim() || undefined,
        avatar: avatar || undefined,
        banner: banner || undefined,
      };

      // Only include character fields for character profiles
      if (isCharacter) {
        if (race.trim()) details.race = race.trim();
        if (occupation.trim()) details.occupation = occupation.trim();
        if (age.trim()) details.age = age.trim();
        if (kinship.trim()) details.kinship = kinship.trim();
        if (residence.trim()) details.residence = residence.trim();
        if (appearance.trim()) details.appearance = appearance.trim();
      }

      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          details,
          is_published: isPublished,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message || 'Failed to save changes');
        return;
      }

      // Update originals to prevent unsaved-changes warning on redirect
      setOriginalName(name.trim());
      setOriginalDescription(description.trim());
      setOriginalIsPublished(isPublished);
      setOriginalAvatar(avatar);
      setOriginalBanner(banner);
      setOriginalRace(race.trim());
      setOriginalOccupation(occupation.trim());
      setOriginalAge(age.trim());
      setOriginalKinship(kinship.trim());
      setOriginalResidence(residence.trim());
      setOriginalAppearance(appearance.trim());

      router.push(`/profiles/${id}`);
    } catch {
      setSaveError('An error occurred while saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
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
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error || 'Profile not found'}</h1>
            <p className="text-amber-700 mb-6">
              {error === 'You do not have permission to edit this profile'
                ? 'You can only edit profiles that you own.'
                : "The profile you're looking for could not be found."}
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
        {/* Back Button */}
        <button
          onClick={() => navigateWithWarning(`/profiles/${id}`)}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </button>

        {/* Edit Form */}
        <Card className="p-8 bg-white border-amber-300">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
              {profile.type_name.charAt(0).toUpperCase() + profile.type_name.slice(1)}
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit Profile</h1>
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

            {/* Banner Upload — characters only */}
            {isCharacter && (
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Banner Image</Label>
                <p className="text-sm text-amber-600">
                  Displayed at the top of your profile (3:1 ratio). JPG, PNG, GIF, or WEBP. Max 5MB.
                </p>

                {/* Banner Preview */}
                {banner ? (
                  <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                    <Image
                      src={banner.url}
                      alt="Banner preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 800px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      disabled={isSaving || isBannerUploading}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors disabled:opacity-50"
                      aria-label="Remove banner"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-[3/1] rounded-lg bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center text-amber-400">
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No banner uploaded</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleBannerFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerBannerFileSelect}
                    disabled={isSaving || isBannerUploading}
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    {isBannerUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {banner ? 'Change Banner' : 'Upload Banner'}
                      </>
                    )}
                  </Button>
                  {banner && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveBanner}
                      disabled={isSaving || isBannerUploading}
                      className="border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                {bannerUploadError && <p className="text-sm text-red-600">{bannerUploadError}</p>}

                {/* Banner crop dialog */}
                <AvatarCropDialog
                  isOpen={isBannerCropOpen}
                  imageSrc={bannerPreviewSrc}
                  onCropComplete={handleBannerCropComplete}
                  onCancel={handleBannerCropCancel}
                  isUploading={isBannerUploading}
                  aspect={3}
                  circularCrop={false}
                  title="Adjust Banner"
                />
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-amber-900 font-semibold">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter profile name"
                maxLength={100}
                required
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              />
              <p className="text-sm text-amber-600">{name.length}/100 characters</p>
            </div>

            {/* Character Info fields */}
            {isCharacter && (
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Character Info</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="race" className="text-amber-900 font-medium">
                      Race
                    </Label>
                    <Input
                      id="race"
                      type="text"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder="e.g. Human, Elf, Dwarf…"
                      maxLength={100}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occupation" className="text-amber-900 font-medium">
                      Occupation
                    </Label>
                    <Input
                      id="occupation"
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Blacksmith, Mage…"
                      maxLength={100}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-amber-900 font-medium">
                      Age
                    </Label>
                    <Input
                      id="age"
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 32, Ancient, Unknown…"
                      maxLength={50}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kinship" className="text-amber-900 font-medium">
                      Kinship
                    </Label>
                    <Input
                      id="kinship"
                      type="text"
                      value={kinship}
                      onChange={(e) => setKinship(e.target.value)}
                      placeholder="Family or clan name…"
                      maxLength={100}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="residence" className="text-amber-900 font-medium">
                      Residence
                    </Label>
                    <Input
                      id="residence"
                      type="text"
                      value={residence}
                      onChange={(e) => setResidence(e.target.value)}
                      placeholder="Where does this character live?"
                      maxLength={100}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Field — characters only */}
            {isCharacter && (
              <div className="space-y-2">
                <Label htmlFor="appearance" className="text-amber-900 font-semibold">
                  Appearance
                </Label>
                <Textarea
                  id="appearance"
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Describe your character's physical appearance…"
                  rows={4}
                  className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none"
                  disabled={isSaving}
                />
              </div>
            )}

            {/* Background / Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-amber-900 font-semibold">
                {isCharacter ? 'Background' : 'Description'}
              </Label>
              {isCharacter ? (
                <>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Add your character's backstory, history, or any other background information…"
                    disabled={isSaving}
                  />
                  <p className="text-sm text-amber-700">
                    Supports rich formatting — headings, lists, links, and inline images.
                  </p>
                </>
              ) : (
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for this profile..."
                  rows={6}
                  className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none"
                />
              )}
            </div>

            {/* ── Relationships (character only) ──────────────────────────── */}
            {isCharacter && (
              <div className="space-y-4">
                {/* Existing live relationships */}
                {liveRelationships.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-amber-900 font-semibold">Current Relationships</Label>
                    {liveRelationships.map((rel) => (
                      <div
                        key={rel.relationship_id}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm"
                      >
                        <span className="font-medium text-amber-900 flex-1">{rel.other_profile_name}</span>
                        {rel.label && <span className="text-xs text-amber-600">· {rel.label}</span>}
                        <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium capitalize">
                          {rel.type_name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removingRelId === rel.relationship_id}
                          onClick={() => handleRemoveRelationship(rel.relationship_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          {removingRelId === rel.relationship_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Picker to add new relationships */}
                <RelationshipsPicker
                  value={pendingRelationships}
                  onChange={setPendingRelationships}
                  disabled={isSaving || isSavingRelationships}
                  excludeProfileIds={liveRelationships.map((r) => r.other_profile_id)}
                />

                {pendingRelationships.length > 0 && (
                  <Button
                    type="button"
                    onClick={handleSaveRelationships}
                    disabled={isSavingRelationships}
                    className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
                  >
                    {isSavingRelationships ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      `Save ${pendingRelationships.length} relationship${pendingRelationships.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                )}

                {relationshipError && <p className="text-sm text-red-600">{relationshipError}</p>}
              </div>
            )}

            {/* Publish Status */}
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <Label htmlFor="isPublished" className="text-amber-900 font-semibold">
                  {isPublished ? 'Published' : 'Draft'}
                </Label>
                <p className="text-sm text-amber-600">
                  {isPublished ? 'This profile is visible to everyone.' : 'Only you can see this draft.'}
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
                disabled={isSaving || !name.trim()}
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
                onClick={() => navigateWithWarning(`/profiles/${id}`)}
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
