'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import NextImage from 'next/image';
import { ArrowLeft, Save, Loader2, Upload, X, User } from 'lucide-react';
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
import { useImageUpload, UploadedImage } from '@/hooks/useImageUpload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RelationshipsPicker, PendingRelationship } from '@/components/profiles/RelationshipsPicker';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileDetails {
  description?: string;
  appearance?: string;
  avatar?: Avatar;
  banner?: BannerImage;
  images?: UploadedImage[];
  race?: string;
  occupation?: string;
  age?: string;
  kinship_profile_id?: number;
  residence?: string;
  // Kinship-specific
  founding_date?: string;
  kinship_type?: string;
  status?: string;
  recruiters?: number[];
  // Location-specific
  location_type?: string;
  region?: string;
  // Organization-specific
  org_type?: string;
  area_of_operation?: string;
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

interface KinshipMember {
  character_id: number;
  character_name: string;
  avatar_url: string | null;
  joined_at: string;
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
  is_owner?: boolean;
}

interface KinshipSearchResult {
  profile_id: number;
  name: string;
  details?: { avatar?: { url: string } } | null;
}

// ── Shared Banner Upload UI ────────────────────────────────────────────────────

function BannerUploadSection({
  banner,
  isBannerUploading,
  bannerUploadError,
  isBannerCropOpen,
  bannerPreviewSrc,
  bannerFileInputRef,
  handleBannerFileSelect,
  handleBannerCropComplete,
  handleBannerCropCancel,
  handleRemoveBanner,
  triggerBannerFileSelect,
  isSaving,
}: {
  banner: BannerImage | null;
  isBannerUploading: boolean;
  bannerUploadError: string | null;
  isBannerCropOpen: boolean;
  bannerPreviewSrc: string | null;
  bannerFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleBannerFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerCropComplete: (blob: Blob) => Promise<void>;
  handleBannerCropCancel: () => void;
  handleRemoveBanner: () => void;
  triggerBannerFileSelect: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-amber-900 font-semibold">Banner Image</Label>
      <p className="text-sm text-amber-600">Displayed at the top of your profile (3:1 ratio). JPG, PNG, GIF, or WEBP. Max 5MB.</p>

      {banner ? (
        <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
          <Image src={banner.url} alt="Banner preview" fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" />
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
        <input ref={bannerFileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleBannerFileSelect} className="hidden" />
        <Button
          type="button"
          variant="outline"
          onClick={triggerBannerFileSelect}
          disabled={isSaving || isBannerUploading}
          className="border-amber-300 text-amber-800 hover:bg-amber-50"
        >
          {isBannerUploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />{banner ? 'Change Banner' : 'Upload Banner'}</>
          )}
        </Button>
        {banner && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveBanner}
            disabled={isSaving || isBannerUploading}
            className="border-amber-300 text-amber-800 hover:bg-amber-50"
          >
            <X className="w-4 h-4 mr-2" />Remove
          </Button>
        )}
      </div>
      {bannerUploadError && <p className="text-sm text-red-600">{bannerUploadError}</p>}

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
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Shared form state ────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // ── Character-only fields ─────────────────────────────────────────────────
  const [race, setRace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState('');
  const [residence, setResidence] = useState('');
  const [appearance, setAppearance] = useState('');

  // Kinship profile picker (character edit form)
  const [kinshipProfileId, setKinshipProfileId] = useState<number | null>(null);
  const [kinshipQuery, setKinshipQuery] = useState('');
  const [kinshipResults, setKinshipResults] = useState<KinshipSearchResult[]>([]);
  const [isKinshipSearching, setIsKinshipSearching] = useState(false);
  const [isKinshipOpen, setIsKinshipOpen] = useState(false);
  const [selectedKinship, setSelectedKinship] = useState<KinshipSearchResult | null>(null);
  const kinshipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kinshipInputRef = useRef<HTMLInputElement>(null);
  const kinshipDropdownRef = useRef<HTMLDivElement>(null);

  // Live relationships (characters only)
  const [liveRelationships, setLiveRelationships] = useState<LiveRelationship[]>([]);
  const [pendingRelationships, setPendingRelationships] = useState<PendingRelationship[]>([]);
  const [isSavingRelationships, setIsSavingRelationships] = useState(false);
  const [removingRelId, setRemovingRelId] = useState<number | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  // ── Kinship-only fields ────────────────────────────────────────────────────
  const [foundingDate, setFoundingDate] = useState('');
  const [kinshipType, setKinshipType] = useState('Mixed');
  const [kinshipStatus, setKinshipStatus] = useState('Recruiting');
  const [recruiterIds, setRecruiterIds] = useState<number[]>([]);
  const [members, setMembers] = useState<KinshipMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Kinship relationships
  const [kinshipLiveRelationships, setKinshipLiveRelationships] = useState<LiveRelationship[]>([]);
  const [kinshipPendingRelationships, setKinshipPendingRelationships] = useState<PendingRelationship[]>([]);
  const [isSavingKinshipRelationships, setIsSavingKinshipRelationships] = useState(false);
  const [removingKinshipRelId, setRemovingKinshipRelId] = useState<number | null>(null);
  const [kinshipRelationshipError, setKinshipRelationshipError] = useState<string | null>(null);

  // ── Location-only fields ───────────────────────────────────────────────────
  const [locationType, setLocationType] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationStatus, setLocationStatus] = useState('');

  // ── Organization-only fields ───────────────────────────────────────────────
  const [orgFoundingDate, setOrgFoundingDate] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgStatus, setOrgStatus] = useState('');
  const [orgAreaOfOperation, setOrgAreaOfOperation] = useState('');

  // ── Originals for dirty checking ──────────────────────────────────────────
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalIsPublished, setOriginalIsPublished] = useState(true);
  const [originalAvatar, setOriginalAvatar] = useState<Avatar | null>(null);
  const [originalBanner, setOriginalBanner] = useState<BannerImage | null>(null);
  const [originalRace, setOriginalRace] = useState('');
  const [originalOccupation, setOriginalOccupation] = useState('');
  const [originalAge, setOriginalAge] = useState('');
  const [originalKinshipProfileId, setOriginalKinshipProfileId] = useState<number | null>(null);
  const [originalResidence, setOriginalResidence] = useState('');
  const [originalAppearance, setOriginalAppearance] = useState('');
  const [originalFoundingDate, setOriginalFoundingDate] = useState('');
  const [originalKinshipType, setOriginalKinshipType] = useState('Mixed');
  const [originalKinshipStatus, setOriginalKinshipStatus] = useState('Recruiting');
  const [originalRecruiterIds, setOriginalRecruiterIds] = useState<number[]>([]);

  // Location originals
  const [originalLocationType, setOriginalLocationType] = useState('');
  const [originalLocationRegion, setOriginalLocationRegion] = useState('');
  const [originalLocationStatus, setOriginalLocationStatus] = useState('');

  // Organization originals
  const [originalOrgFoundingDate, setOriginalOrgFoundingDate] = useState('');
  const [originalOrgType, setOriginalOrgType] = useState('');
  const [originalOrgStatus, setOriginalOrgStatus] = useState('');
  const [originalOrgAreaOfOperation, setOriginalOrgAreaOfOperation] = useState('');

  // Banner upload hook
  const {
    banner, setBanner, isUploading: isBannerUploading, uploadError: bannerUploadError,
    isCropDialogOpen: isBannerCropOpen, previewImageSrc: bannerPreviewSrc,
    fileInputRef: bannerFileInputRef, handleFileSelect: handleBannerFileSelect,
    handleCropComplete: handleBannerCropComplete, handleCropCancel: handleBannerCropCancel,
    handleRemoveBanner, triggerFileSelect: triggerBannerFileSelect,
  } = useBannerUpload({ initialBanner: null });

  // Image upload hook (item + location)
  const {
    uploadedImages, setUploadedImages, isUploading: isImageUploading,
    uploadError: imageUploadError, fileInputRef: imageFileInputRef,
    handleFileSelect: handleImageFileSelect, handleRemoveImage,
  } = useImageUpload({ maxImages: 1 });

  const isCharacter = profile?.profile_type_id === 1;
  const isKinship = profile?.profile_type_id === 3;
  const isItem = profile?.profile_type_id === 2;
  const isLocation = profile?.profile_type_id === 5;
  const isOrganization = profile?.profile_type_id === 4;

  // ── Dirty check ───────────────────────────────────────────────────────────
  const isDirty =
    name !== originalName ||
    description !== originalDescription ||
    isPublished !== originalIsPublished ||
    JSON.stringify(avatar) !== JSON.stringify(originalAvatar) ||
    JSON.stringify(banner) !== JSON.stringify(originalBanner) ||
    race !== originalRace ||
    occupation !== originalOccupation ||
    age !== originalAge ||
    kinshipProfileId !== originalKinshipProfileId ||
    residence !== originalResidence ||
    appearance !== originalAppearance ||
    foundingDate !== originalFoundingDate ||
    kinshipType !== originalKinshipType ||
    kinshipStatus !== originalKinshipStatus ||
    JSON.stringify(recruiterIds) !== JSON.stringify(originalRecruiterIds) ||
    locationType !== originalLocationType ||
    locationRegion !== originalLocationRegion ||
    locationStatus !== originalLocationStatus ||
    orgFoundingDate !== originalOrgFoundingDate ||
    orgType !== originalOrgType ||
    orgStatus !== originalOrgStatus ||
    orgAreaOfOperation !== originalOrgAreaOfOperation;

  const { navigateWithWarning } = useUnsavedChanges(isDirty);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${id}`);
        if (!response.ok) {
          setError(response.status === 404 ? 'Profile not found' : 'Failed to load profile');
          return;
        }
        const data: Profile = await response.json();
        if (!data.can_edit) {
          setError('You do not have permission to edit this profile');
          return;
        }
        setProfile(data);

        const d = data.details;
        const initialName = data.name;
        const initialDescription = d?.description || '';
        const initialIsPublished = data.is_published !== false;
        const initialAvatar = d?.avatar || null;
        const initialBanner = d?.banner || null;

        setName(initialName);
        setDescription(initialDescription);
        setIsPublished(initialIsPublished);
        setAvatar(initialAvatar);
        if (initialBanner) setBanner(initialBanner);
        if (d?.images?.length) setUploadedImages(d.images);

        setOriginalName(initialName);
        setOriginalDescription(initialDescription);
        setOriginalIsPublished(initialIsPublished);
        setOriginalAvatar(initialAvatar);
        setOriginalBanner(initialBanner);

        if (data.profile_type_id === 1) {
          const initialRace = d?.race || '';
          const initialOccupation = d?.occupation || '';
          const initialAge = d?.age || '';
          const initialKinshipProfileId = d?.kinship_profile_id ?? null;
          const initialResidence = d?.residence || '';
          const initialAppearance = d?.appearance || '';

          setRace(initialRace);
          setOccupation(initialOccupation);
          setAge(initialAge);
          setKinshipProfileId(initialKinshipProfileId);
          setResidence(initialResidence);
          setAppearance(initialAppearance);

          setOriginalRace(initialRace);
          setOriginalOccupation(initialOccupation);
          setOriginalAge(initialAge);
          setOriginalKinshipProfileId(initialKinshipProfileId);
          setOriginalResidence(initialResidence);
          setOriginalAppearance(initialAppearance);

          // If there's a linked kinship, fetch its name for display
          if (initialKinshipProfileId) {
            fetch(`/api/profiles/${initialKinshipProfileId}`)
              .then((r) => r.ok ? r.json() : null)
              .then((k) => { if (k) setSelectedKinship({ profile_id: k.profile_id, name: k.name, details: k.details }); })
              .catch(() => {});
          }
        }

        if (data.profile_type_id === 3) {
          const initialFoundingDate = d?.founding_date || '';
          const initialKinshipType = d?.kinship_type || 'Mixed';
          const initialKinshipStatus = d?.status || 'Recruiting';
          const initialRecruiterIds = d?.recruiters || [];

          setFoundingDate(initialFoundingDate);
          setKinshipType(initialKinshipType);
          setKinshipStatus(initialKinshipStatus);
          setRecruiterIds(initialRecruiterIds);

          setOriginalFoundingDate(initialFoundingDate);
          setOriginalKinshipType(initialKinshipType);
          setOriginalKinshipStatus(initialKinshipStatus);
          setOriginalRecruiterIds(initialRecruiterIds);
        }

        if (data.profile_type_id === 5) {
          const initialLocationType = d?.location_type || '';
          const initialLocationRegion = d?.region || '';
          const initialLocationStatus = d?.status || '';

          setLocationType(initialLocationType);
          setLocationRegion(initialLocationRegion);
          setLocationStatus(initialLocationStatus);

          setOriginalLocationType(initialLocationType);
          setOriginalLocationRegion(initialLocationRegion);
          setOriginalLocationStatus(initialLocationStatus);
        }

        if (data.profile_type_id === 4) {
          const initialOrgFoundingDate = d?.founding_date || '';
          const initialOrgType = d?.org_type || '';
          const initialOrgStatus = d?.status || '';
          const initialOrgAreaOfOperation = d?.area_of_operation || '';

          setOrgFoundingDate(initialOrgFoundingDate);
          setOrgType(initialOrgType);
          setOrgStatus(initialOrgStatus);
          setOrgAreaOfOperation(initialOrgAreaOfOperation);

          setOriginalOrgFoundingDate(initialOrgFoundingDate);
          setOriginalOrgType(initialOrgType);
          setOriginalOrgStatus(initialOrgStatus);
          setOriginalOrgAreaOfOperation(initialOrgAreaOfOperation);
        }
      } catch {
        setError('An error occurred while loading the profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [id, setBanner]);

  // ── Fetch live relationships ───────────────────────────────────────────────
  const fetchRelationships = useCallback(async () => {
    try {
      const res = await fetch(`/api/profiles/${id}/relationships`);
      if (res.ok) {
        const data = await res.json();
        if (isCharacter) setLiveRelationships(data.relationships || []);
        if (isKinship) setKinshipLiveRelationships(data.relationships || []);
      }
    } catch { /* non-fatal */ }
  }, [id, isCharacter, isKinship]);

  useEffect(() => {
    if (isCharacter || isKinship) fetchRelationships();
  }, [isCharacter, isKinship, fetchRelationships]);

  // ── Fetch kinship members ──────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch { /* non-fatal */ }
    finally { setMembersLoading(false); }
  }, [id]);

  useEffect(() => {
    if (isKinship) fetchMembers();
  }, [isKinship, fetchMembers]);

  // ── Kinship search (for character edit form) ───────────────────────────────
  const searchKinships = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setKinshipResults([]); setIsKinshipOpen(false); return; }
    setIsKinshipSearching(true);
    try {
      const params = new URLSearchParams({ search: term.trim(), limit: '10', profile_type_id: '3' });
      const res = await fetch(`/api/profiles/public?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setKinshipResults(data.profiles ?? []);
      setIsKinshipOpen(true);
    } catch { setKinshipResults([]); }
    finally { setIsKinshipSearching(false); }
  }, []);

  useEffect(() => {
    if (kinshipDebounceRef.current) clearTimeout(kinshipDebounceRef.current);
    kinshipDebounceRef.current = setTimeout(() => searchKinships(kinshipQuery), 300);
    return () => { if (kinshipDebounceRef.current) clearTimeout(kinshipDebounceRef.current); };
  }, [kinshipQuery, searchKinships]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        kinshipDropdownRef.current && !kinshipDropdownRef.current.contains(e.target as Node) &&
        kinshipInputRef.current && !kinshipInputRef.current.contains(e.target as Node)
      ) { setIsKinshipOpen(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Relationship helpers ───────────────────────────────────────────────────
  const handleSaveRelationships = async (form: 'character' | 'kinship') => {
    const pending = form === 'kinship' ? kinshipPendingRelationships : pendingRelationships;
    if (pending.length === 0) return;
    if (form === 'kinship') setIsSavingKinshipRelationships(true);
    else setIsSavingRelationships(true);
    if (form === 'kinship') setKinshipRelationshipError(null);
    else setRelationshipError(null);
    const results = await Promise.allSettled(
      pending.map((rel) =>
        fetch(`/api/profiles/${id}/relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id_2: rel.profile_id_2, type: rel.type, label: rel.label }),
        }),
      ),
    );
    const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
    if (failed.length > 0) {
      const msg = `${failed.length} relationship(s) failed to save.`;
      if (form === 'kinship') setKinshipRelationshipError(msg);
      else setRelationshipError(msg);
    }
    if (form === 'kinship') setKinshipPendingRelationships([]);
    else setPendingRelationships([]);
    await fetchRelationships();
    if (form === 'kinship') setIsSavingKinshipRelationships(false);
    else setIsSavingRelationships(false);
  };

  const handleRemoveRelationship = async (relId: number, form: 'character' | 'kinship') => {
    if (form === 'kinship') setRemovingKinshipRelId(relId);
    else setRemovingRelId(relId);
    try {
      const res = await fetch(`/api/profiles/${id}/relationships/${relId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        const msg = data.message || 'Failed to remove relationship';
        if (form === 'kinship') setKinshipRelationshipError(msg);
        else setRelationshipError(msg);
      } else {
        await fetchRelationships();
      }
    } catch {
      const msg = 'Failed to remove relationship';
      if (form === 'kinship') setKinshipRelationshipError(msg);
      else setRelationshipError(msg);
    } finally {
      if (form === 'kinship') setRemovingKinshipRelId(null);
      else setRemovingRelId(null);
    }
  };

  const handleRemoveMember = async (characterId: number) => {
    setRemovingMemberId(characterId);
    try {
      const res = await fetch(`/api/profiles/${id}/members/${characterId}`, { method: 'DELETE' });
      if (res.ok) await fetchMembers();
    } catch { /* non-fatal */ }
    finally { setRemovingMemberId(null); }
  };

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const details: ProfileDetails = {
        description: description.trim() || undefined,
        avatar: avatar || undefined,
        ...(!isLocation && { banner: banner || undefined }),
      };

      if (isCharacter) {
        if (race.trim()) details.race = race.trim();
        if (occupation.trim()) details.occupation = occupation.trim();
        if (age.trim()) details.age = age.trim();
        if (kinshipProfileId) details.kinship_profile_id = kinshipProfileId;
        if (residence.trim()) details.residence = residence.trim();
        if (appearance.trim()) details.appearance = appearance.trim();
      }

      if (isKinship) {
        if (foundingDate.trim()) details.founding_date = foundingDate.trim();
        details.kinship_type = kinshipType;
        details.status = kinshipStatus;
        if (recruiterIds.length > 0) details.recruiters = recruiterIds;
      }

      if (isLocation) {
        if (locationType.trim()) details.location_type = locationType.trim();
        if (locationRegion.trim()) details.region = locationRegion.trim();
        if (locationStatus.trim()) details.status = locationStatus.trim();
        if (uploadedImages.length > 0) details.images = uploadedImages;
      }

      if (isItem) {
        if (uploadedImages.length > 0) details.images = uploadedImages;
      }

      if (isOrganization) {
        if (orgFoundingDate.trim()) details.founding_date = orgFoundingDate.trim();
        if (orgType.trim()) details.org_type = orgType.trim();
        if (orgStatus.trim()) details.status = orgStatus.trim();
        if (orgAreaOfOperation.trim()) details.area_of_operation = orgAreaOfOperation.trim();
      }

      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), details, is_published: isPublished }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message || 'Failed to save changes');
        return;
      }

      // Handle kinship membership change when kinship_profile_id changes (character only)
      if (isCharacter) {
        const prevId = originalKinshipProfileId;
        const newId = kinshipProfileId;
        if (prevId !== newId) {
          // Remove from old kinship if changed
          if (prevId) {
            await fetch(`/api/profiles/${prevId}/members/${id}`, { method: 'DELETE' }).catch(() => {});
          }
          // Join new kinship
          if (newId) {
            await fetch(`/api/profiles/${newId}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ character_id: parseInt(id) }),
            }).catch(() => {});
          }
        }
      }

      // Update originals
      setOriginalName(name.trim());
      setOriginalDescription(description.trim());
      setOriginalIsPublished(isPublished);
      setOriginalAvatar(avatar);
      setOriginalBanner(banner);
      setOriginalRace(race.trim());
      setOriginalOccupation(occupation.trim());
      setOriginalAge(age.trim());
      setOriginalKinshipProfileId(kinshipProfileId);
      setOriginalResidence(residence.trim());
      setOriginalAppearance(appearance.trim());
      setOriginalFoundingDate(foundingDate.trim());
      setOriginalKinshipType(kinshipType);
      setOriginalKinshipStatus(kinshipStatus);
      setOriginalRecruiterIds(recruiterIds);
      setOriginalLocationType(locationType.trim());
      setOriginalLocationRegion(locationRegion.trim());
      setOriginalLocationStatus(locationStatus.trim());
      setOriginalOrgFoundingDate(orgFoundingDate.trim());
      setOriginalOrgType(orgType.trim());
      setOriginalOrgStatus(orgStatus.trim());
      setOriginalOrgAreaOfOperation(orgAreaOfOperation.trim());

      router.push(`/profiles/${id}`);
    } catch {
      setSaveError('An error occurred while saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
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
          <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Home
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

  // ── Shared page shell ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigateWithWarning(`/profiles/${id}`)}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Profile
        </button>

        <Card className="p-8 bg-white border-amber-300">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
              {profile.type_name.charAt(0).toUpperCase() + profile.type_name.slice(1)}
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Edit Profile</h1>
            {isDirty && <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>}
          </div>

          {/* ── CHARACTER FORM ─────────────────────────────────────────────── */}
          {isCharacter && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

              {/* Banner */}
              <BannerUploadSection
                banner={banner}
                isBannerUploading={isBannerUploading}
                bannerUploadError={bannerUploadError}
                isBannerCropOpen={isBannerCropOpen}
                bannerPreviewSrc={bannerPreviewSrc}
                bannerFileInputRef={bannerFileInputRef}
                handleBannerFileSelect={handleBannerFileSelect}
                handleBannerCropComplete={handleBannerCropComplete}
                handleBannerCropCancel={handleBannerCropCancel}
                handleRemoveBanner={handleRemoveBanner}
                triggerBannerFileSelect={triggerBannerFileSelect}
                isSaving={isSaving}
              />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900 font-semibold">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter profile name" maxLength={100} required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500" />
                <p className="text-sm text-amber-600">{name.length}/100 characters</p>
              </div>

              {/* Character Info */}
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Character Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="race" className="text-amber-900 font-medium">Race</Label>
                    <Input id="race" value={race} onChange={(e) => setRace(e.target.value)} placeholder="e.g. Human, Elf, Dwarf…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation" className="text-amber-900 font-medium">Occupation</Label>
                    <Input id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Blacksmith, Mage…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-amber-900 font-medium">Age</Label>
                    <Input id="age" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 32, Ancient, Unknown…" maxLength={50} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>

                  {/* Kinship picker */}
                  <div className="space-y-2">
                    <Label className="text-amber-900 font-medium">Kinship</Label>
                    {selectedKinship ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-300 rounded-md text-sm">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 border border-amber-200">
                          {selectedKinship.details?.avatar?.url ? (
                            <NextImage fill src={selectedKinship.details.avatar.url} alt={selectedKinship.name} sizes="24px" className="object-cover" />
                          ) : (
                            <User className="w-3 h-3 text-amber-400 m-auto mt-1.5" />
                          )}
                        </div>
                        <span className="flex-1 font-medium text-amber-900 truncate">{selectedKinship.name}</span>
                        <button
                          type="button"
                          onClick={() => { setSelectedKinship(null); setKinshipProfileId(null); setKinshipQuery(''); }}
                          disabled={isSaving}
                          className="text-amber-500 hover:text-red-600 transition-colors text-lg leading-none"
                          aria-label="Clear kinship"
                        >×</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          ref={kinshipInputRef}
                          type="text"
                          value={kinshipQuery}
                          onChange={(e) => setKinshipQuery(e.target.value)}
                          onFocus={() => kinshipQuery.trim().length >= 2 && kinshipResults.length > 0 && setIsKinshipOpen(true)}
                          placeholder="Search kinship profiles…"
                          disabled={isSaving}
                          className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-50"
                        />
                        {isKinshipSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">Searching…</span>}
                        {isKinshipOpen && kinshipResults.length > 0 && (
                          <div ref={kinshipDropdownRef} className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                            {kinshipResults.map((k) => (
                              <button
                                key={k.profile_id}
                                type="button"
                                onClick={() => { setSelectedKinship(k); setKinshipProfileId(k.profile_id); setKinshipQuery(''); setIsKinshipOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-amber-50 text-left"
                              >
                                <div className="relative w-6 h-6 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 border border-amber-200">
                                  {k.details?.avatar?.url ? (
                                    <NextImage fill src={k.details.avatar.url} alt={k.name} sizes="24px" className="object-cover" />
                                  ) : (
                                    <User className="w-3 h-3 text-amber-400 m-auto mt-1.5" />
                                  )}
                                </div>
                                <span className="font-medium text-amber-900 flex-1">{k.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {isKinshipOpen && !isKinshipSearching && kinshipQuery.trim().length >= 2 && kinshipResults.length === 0 && (
                          <div ref={kinshipDropdownRef} className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg px-3 py-2 text-sm text-amber-700">
                            No kinship profiles found
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-amber-600">Type to search existing kinship profiles.</p>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="residence" className="text-amber-900 font-medium">Residence</Label>
                    <Input id="residence" value={residence} onChange={(e) => setResidence(e.target.value)} placeholder="Where does this character live?" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="appearance" className="text-amber-900 font-medium">Appearance</Label>
                    <Textarea id="appearance" value={appearance} onChange={(e) => setAppearance(e.target.value)} placeholder="Describe your character's physical appearance…" rows={4} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none bg-white" disabled={isSaving} />
                  </div>
                </div>
              </div>

              {/* Relationships */}
              <div className="space-y-4">
                {liveRelationships.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-amber-900 font-semibold">Current Relationships</Label>
                    {liveRelationships.map((rel) => (
                      <div key={rel.relationship_id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <span className="font-medium text-amber-900 flex-1">{rel.other_profile_name}</span>
                        {rel.label && <span className="text-xs text-amber-600">· {rel.label}</span>}
                        <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium capitalize">{rel.type_name}</span>
                        <Button type="button" variant="ghost" size="sm" disabled={removingRelId === rel.relationship_id} onClick={() => handleRemoveRelationship(rel.relationship_id, 'character')} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0">
                          {removingRelId === rel.relationship_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <RelationshipsPicker
                  value={pendingRelationships}
                  onChange={setPendingRelationships}
                  disabled={isSaving || isSavingRelationships}
                  excludeProfileIds={liveRelationships.map((r) => r.other_profile_id)}
                  allowedProfileTypes={[1, 3]}
                />
                {pendingRelationships.length > 0 && (
                  <Button type="button" onClick={() => handleSaveRelationships('character')} disabled={isSavingRelationships} className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50">
                    {isSavingRelationships ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : `Save ${pendingRelationships.length} relationship${pendingRelationships.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
                {relationshipError && <p className="text-sm text-red-600">{relationshipError}</p>}
              </div>

              {/* Background */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Background</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Add your character's backstory, history, or any other background information…" disabled={isSaving} />
                <p className="text-sm text-amber-700">Supports rich formatting — headings, lists, links, and inline images.</p>
              </div>

              {/* Publish */}
              <PublishToggle isPublished={isPublished} setIsPublished={setIsPublished} isSaving={isSaving} />

              {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-red-700">{saveError}</p></div>}

              <FormActions isSaving={isSaving} name={name} onCancel={() => navigateWithWarning(`/profiles/${id}`)} />
            </form>
          )}

          {/* ── KINSHIP FORM ───────────────────────────────────────────────── */}
          {isKinship && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

              {/* Banner */}
              <BannerUploadSection
                banner={banner}
                isBannerUploading={isBannerUploading}
                bannerUploadError={bannerUploadError}
                isBannerCropOpen={isBannerCropOpen}
                bannerPreviewSrc={bannerPreviewSrc}
                bannerFileInputRef={bannerFileInputRef}
                handleBannerFileSelect={handleBannerFileSelect}
                handleBannerCropComplete={handleBannerCropComplete}
                handleBannerCropCancel={handleBannerCropCancel}
                handleRemoveBanner={handleRemoveBanner}
                triggerBannerFileSelect={triggerBannerFileSelect}
                isSaving={isSaving}
              />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900 font-semibold">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter kinship name" maxLength={100} required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500" />
                <p className="text-sm text-amber-600">{name.length}/100 characters</p>
              </div>

              {/* Kinship Info */}
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Kinship Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="founding_date" className="text-amber-900 font-medium">Founding Date</Label>
                    <Input id="founding_date" value={foundingDate} onChange={(e) => setFoundingDate(e.target.value)} placeholder="e.g. Third Age 1200, Unknown…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kinship_type" className="text-amber-900 font-medium">Type</Label>
                    <select
                      id="kinship_type"
                      value={kinshipType}
                      onChange={(e) => setKinshipType(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    >
                      {['Mixed', 'Elf', 'Man', 'Hobbit', 'Dwarf'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kinship_status" className="text-amber-900 font-medium">Status</Label>
                    <select
                      id="kinship_status"
                      value={kinshipStatus}
                      onChange={(e) => setKinshipStatus(e.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    >
                      {['Recruiting', 'Not Recruiting', 'Dormant'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Relationships */}
              <div className="space-y-4">
                <Label className="text-amber-900 font-semibold text-base">Friends &amp; Allies / Rivals &amp; Enemies</Label>
                {kinshipLiveRelationships.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-700 font-medium">Current Relationships</p>
                    {kinshipLiveRelationships.map((rel) => (
                      <div key={rel.relationship_id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <span className="font-medium text-amber-900 flex-1">{rel.other_profile_name}</span>
                        {rel.label && <span className="text-xs text-amber-600">· {rel.label}</span>}
                        <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium capitalize">{rel.type_name}</span>
                        <Button type="button" variant="ghost" size="sm" disabled={removingKinshipRelId === rel.relationship_id} onClick={() => handleRemoveRelationship(rel.relationship_id, 'kinship')} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0">
                          {removingKinshipRelId === rel.relationship_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <RelationshipsPicker
                  value={kinshipPendingRelationships}
                  onChange={setKinshipPendingRelationships}
                  disabled={isSaving || isSavingKinshipRelationships}
                  excludeProfileIds={kinshipLiveRelationships.map((r) => r.other_profile_id)}
                  allowedProfileTypes={[1, 3]}
                />
                {kinshipPendingRelationships.length > 0 && (
                  <Button type="button" onClick={() => handleSaveRelationships('kinship')} disabled={isSavingKinshipRelationships} className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50">
                    {isSavingKinshipRelationships ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : `Save ${kinshipPendingRelationships.length} relationship${kinshipPendingRelationships.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
                {kinshipRelationshipError && <p className="text-sm text-red-600">{kinshipRelationshipError}</p>}
              </div>

              {/* Description / Background */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Background / Description</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe this kinship's history, culture, and lore…" disabled={isSaving} />
                <p className="text-sm text-amber-700">Supports rich formatting — headings, lists, links, and inline images.</p>
              </div>

              {/* Recruiters (members only) */}
              <div className="space-y-3">
                <Label className="text-amber-900 font-semibold text-base">Recruiters</Label>
                <p className="text-sm text-amber-600">Select members who act as recruiters. Informational only.</p>
                {membersLoading ? (
                  <p className="text-sm text-amber-600">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-amber-600 italic">No members yet. Members can join via their character profile.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const isRecruiter = recruiterIds.includes(m.character_id);
                      return (
                        <button
                          key={m.character_id}
                          type="button"
                          onClick={() => setRecruiterIds((prev) =>
                            isRecruiter ? prev.filter((id) => id !== m.character_id) : [...prev, m.character_id]
                          )}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            isRecruiter
                              ? 'bg-amber-800 text-amber-50 border-amber-800'
                              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {m.character_name}
                          {isRecruiter && <span className="text-xs opacity-75">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Members (read-only list with remove) */}
              <div className="space-y-3">
                <Label className="text-amber-900 font-semibold text-base">Members</Label>
                {membersLoading ? (
                  <p className="text-sm text-amber-600">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-amber-600 italic">No members yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li key={m.character_id} className="flex items-center gap-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 border border-amber-200">
                          {m.avatar_url ? (
                            <NextImage fill src={m.avatar_url} alt={m.character_name} sizes="32px" className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <User className="w-4 h-4 text-amber-400" />
                            </div>
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium text-amber-900">{m.character_name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removingMemberId === m.character_id}
                          onClick={() => handleRemoveMember(m.character_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          {removingMemberId === m.character_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Publish */}
              <PublishToggle isPublished={isPublished} setIsPublished={setIsPublished} isSaving={isSaving} />

              {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-red-700">{saveError}</p></div>}

              <FormActions isSaving={isSaving} name={name} onCancel={() => navigateWithWarning(`/profiles/${id}`)} />
            </form>
          )}

          {/* ── ITEM FORM ──────────────────────────────────────────────────── */}
          {isItem && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900 font-semibold">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter item name" maxLength={100} required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500" />
                <p className="text-sm text-amber-600">{name.length}/100 characters</p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Image</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isImageUploading ? 'border-amber-400 bg-amber-50' : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'}`}
                  onClick={() => uploadedImages.length === 0 && imageFileInputRef.current?.click()}
                >
                  <input ref={imageFileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageFileSelect} className="hidden" disabled={isImageUploading || isSaving} />
                  {isImageUploading ? (
                    <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-2"></div><p className="text-amber-700">Uploading…</p></div>
                  ) : uploadedImages.length > 0 ? (
                    <div className="relative group w-full aspect-video rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                      <NextImage fill src={uploadedImages[0].url} alt={uploadedImages[0].originalName} sizes="(max-width: 768px) 100vw, 600px" className="object-contain" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(uploadedImages[0].filename); }} disabled={isSaving} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center"><Upload className="w-10 h-10 text-amber-600 mb-2" /><p className="text-amber-800 font-medium">Click to upload an image</p><p className="text-sm text-amber-600 mt-1">JPEG, PNG, GIF, or WebP · Max 10MB</p></div>
                  )}
                </div>
                {imageUploadError && <p className="text-sm text-red-600">{imageUploadError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Description</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe this item — its appearance, properties, history…" disabled={isSaving} />
                <p className="text-sm text-amber-700">Supports rich formatting — headings, lists, links, and inline images.</p>
              </div>

              <PublishToggle isPublished={isPublished} setIsPublished={setIsPublished} isSaving={isSaving} />
              {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-red-700">{saveError}</p></div>}
              <FormActions isSaving={isSaving} name={name} onCancel={() => navigateWithWarning(`/profiles/${id}`)} />
            </form>
          )}

          {/* ── LOCATION FORM ──────────────────────────────────────────────── */}
          {isLocation && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900 font-semibold">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter location name" maxLength={100} required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500" />
                <p className="text-sm text-amber-600">{name.length}/100 characters</p>
              </div>

              {/* Location Info */}
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Location Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_type" className="text-amber-900 font-medium">Type</Label>
                    <Input id="location_type" value={locationType} onChange={(e) => setLocationType(e.target.value)} placeholder="e.g. City, Dungeon, Region, Landmark…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_region" className="text-amber-900 font-medium">Region / Area</Label>
                    <Input id="location_region" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} placeholder="e.g. The Shire, Mirkwood…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="location_status" className="text-amber-900 font-medium">Status</Label>
                    <Input id="location_status" value={locationStatus} onChange={(e) => setLocationStatus(e.target.value)} placeholder="e.g. Thriving, Ruined, Abandoned, Unknown…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Image</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isImageUploading ? 'border-amber-400 bg-amber-50' : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'}`}
                  onClick={() => uploadedImages.length === 0 && imageFileInputRef.current?.click()}
                >
                  <input ref={imageFileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageFileSelect} className="hidden" disabled={isImageUploading || isSaving} />
                  {isImageUploading ? (
                    <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-2"></div><p className="text-amber-700">Uploading…</p></div>
                  ) : uploadedImages.length > 0 ? (
                    <div className="relative group w-full aspect-video rounded-lg overflow-hidden bg-amber-100 border border-amber-300">
                      <NextImage fill src={uploadedImages[0].url} alt={uploadedImages[0].originalName} sizes="(max-width: 768px) 100vw, 600px" className="object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(uploadedImages[0].filename); }} disabled={isSaving} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center"><Upload className="w-10 h-10 text-amber-600 mb-2" /><p className="text-amber-800 font-medium">Click to upload an image</p><p className="text-sm text-amber-600 mt-1">JPEG, PNG, GIF, or WebP · Max 10MB</p></div>
                  )}
                </div>
                {imageUploadError && <p className="text-sm text-red-600">{imageUploadError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Description</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe this location — its history, atmosphere, notable features…" disabled={isSaving} />
                <p className="text-sm text-amber-700">Supports rich formatting — headings, lists, links, and inline images.</p>
              </div>

              <PublishToggle isPublished={isPublished} setIsPublished={setIsPublished} isSaving={isSaving} />
              {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-red-700">{saveError}</p></div>}
              <FormActions isSaving={isSaving} name={name} onCancel={() => navigateWithWarning(`/profiles/${id}`)} />
            </form>
          )}

          {/* ── ORGANIZATION FORM ──────────────────────────────────────────── */}
          {isOrganization && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

              {/* Banner */}
              <BannerUploadSection
                banner={banner}
                isBannerUploading={isBannerUploading}
                bannerUploadError={bannerUploadError}
                isBannerCropOpen={isBannerCropOpen}
                bannerPreviewSrc={bannerPreviewSrc}
                bannerFileInputRef={bannerFileInputRef}
                handleBannerFileSelect={handleBannerFileSelect}
                handleBannerCropComplete={handleBannerCropComplete}
                handleBannerCropCancel={handleBannerCropCancel}
                handleRemoveBanner={handleRemoveBanner}
                triggerBannerFileSelect={triggerBannerFileSelect}
                isSaving={isSaving}
              />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900 font-semibold">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter organization name" maxLength={100} required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500" />
                <p className="text-sm text-amber-600">{name.length}/100 characters</p>
              </div>

              {/* Organization Info */}
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Organization Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org_founding_date" className="text-amber-900 font-medium">Founding Date</Label>
                    <Input id="org_founding_date" value={orgFoundingDate} onChange={(e) => setOrgFoundingDate(e.target.value)} placeholder="e.g. Third Age 1200, Unknown…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org_type" className="text-amber-900 font-medium">Organization Type</Label>
                    <Input id="org_type" value={orgType} onChange={(e) => setOrgType(e.target.value)} placeholder="e.g. Guild, Order, Council…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org_status" className="text-amber-900 font-medium">Status</Label>
                    <Input id="org_status" value={orgStatus} onChange={(e) => setOrgStatus(e.target.value)} placeholder="e.g. Active, Disbanded, Dormant…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org_area" className="text-amber-900 font-medium">Area of Operation</Label>
                    <Input id="org_area" value={orgAreaOfOperation} onChange={(e) => setOrgAreaOfOperation(e.target.value)} placeholder="e.g. Bree-land, Eriador, The Shire…" maxLength={100} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">Background / Description</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe this organization's history, purpose, and lore…" disabled={isSaving} />
                <p className="text-sm text-amber-700">Supports rich formatting — headings, lists, links, and inline images.</p>
              </div>

              {/* Publish */}
              <PublishToggle isPublished={isPublished} setIsPublished={setIsPublished} isSaving={isSaving} />

              {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-red-700">{saveError}</p></div>}

              <FormActions isSaving={isSaving} name={name} onCancel={() => navigateWithWarning(`/profiles/${id}`)} />
            </form>
          )}

          {/* ── GENERIC FORM (non-character, non-kinship, non-item, non-location) ── */}
          {!isCharacter && !isKinship && !isItem && !isLocation && !isOrganization && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} disabled={isSaving} />

              <div className="space-y-2">
                <Label htmlFor="name" className="text-amber-900 font-semibold">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter profile name" maxLength={100} required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500" />
                <p className="text-sm text-amber-600">{name.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-amber-900 font-semibold">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter a description for this profile..." rows={6} className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 resize-none" />
              </div>

              <PublishToggle isPublished={isPublished} setIsPublished={setIsPublished} isSaving={isSaving} />

              {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-red-700">{saveError}</p></div>}

              <FormActions isSaving={isSaving} name={name} onCancel={() => navigateWithWarning(`/profiles/${id}`)} />
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Small shared form sub-components ─────────────────────────────────────────

function PublishToggle({
  isPublished,
  setIsPublished,
  isSaving,
}: {
  isPublished: boolean;
  setIsPublished: (v: boolean) => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div>
        <Label className="text-amber-900 font-semibold">{isPublished ? 'Published' : 'Draft'}</Label>
        <p className="text-sm text-amber-600">{isPublished ? 'This profile is visible to everyone.' : 'Only you can see this draft.'}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublished}
        onClick={() => setIsPublished(!isPublished)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublished ? 'bg-emerald-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function FormActions({
  isSaving,
  name,
  onCancel,
}: {
  isSaving: boolean;
  name: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-4">
      <Button type="submit" disabled={isSaving || !name.trim()} className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50">
        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} className="border-amber-300 text-amber-800 hover:bg-amber-50">
        Cancel
      </Button>
    </div>
  );
}
