'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, CreateProfileInput } from '@/app/lib/validations';
import { createProfile } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AvatarUploader } from '@/components/avatar/AvatarUploader';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Avatar } from '@/hooks/useAvatarUpload';
import { RelationshipsPicker, PendingRelationship } from '@/components/profiles/RelationshipsPicker';
import NextImage from 'next/image';
import { User } from 'lucide-react';

interface ProfileFormProps {
  profileTypeId: number;
  onSuccess: (profileId: number) => void;
  onCancel: () => void;
}

interface Character {
  profile_id: number;
  name: string;
}

interface KinshipSearchResult {
  profile_id: number;
  name: string;
  details?: { avatar?: { url: string } } | null;
}

export function ProfileForm({ profileTypeId, onSuccess, onCancel }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // Character-specific fields (only used when profileTypeId === 1)
  const [race, setRace] = useState('');
  const [residence, setResidence] = useState('');
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState('');
  const [appearance, setAppearance] = useState('');
  const [background, setBackground] = useState('');
  const [pendingRelationships, setPendingRelationships] = useState<PendingRelationship[]>([]);

  // Kinship picker (replaces free-text kinship field on character form)
  const [kinshipQuery, setKinshipQuery] = useState('');
  const [kinshipResults, setKinshipResults] = useState<KinshipSearchResult[]>([]);
  const [isKinshipSearching, setIsKinshipSearching] = useState(false);
  const [isKinshipOpen, setIsKinshipOpen] = useState(false);
  const [selectedKinship, setSelectedKinship] = useState<KinshipSearchResult | null>(null);
  const kinshipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kinshipInputRef = useRef<HTMLInputElement>(null);
  const kinshipDropdownRef = useRef<HTMLDivElement>(null);

  // Kinship-specific fields (only used when profileTypeId === 3)
  const [foundingDate, setFoundingDate] = useState('');
  const [kinshipType, setKinshipType] = useState('Mixed');
  const [kinshipStatus, setKinshipStatus] = useState('Recruiting');
  const [kinshipDescription, setKinshipDescription] = useState('');
  const [kinshipPendingRelationships, setKinshipPendingRelationships] = useState<PendingRelationship[]>([]);

  // Profile types that need a parent character: Items (2), Kinships (3), Organizations (4)
  const needsParent = [2, 3, 4].includes(profileTypeId);
  const isCharacter = profileTypeId === 1;
  const isKinship = profileTypeId === 3;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      profile_type_id: profileTypeId,
    },
  });

  const selectedParentId = watch('parent_profile_id');
  const nameValue = watch('name') || '';
  const nameLength = nameValue.length;

  useEffect(() => {
    if (needsParent) {
      fetchCharacters();
    }
  }, [needsParent]);

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
    } catch {
      setError('Failed to load your characters. Please try again.');
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  // Kinship search
  const searchKinships = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setKinshipResults([]);
      setIsKinshipOpen(false);
      return;
    }
    setIsKinshipSearching(true);
    try {
      const params = new URLSearchParams({ search: term.trim(), limit: '10', profile_type_id: '3' });
      const res = await fetch(`/api/profiles/public?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setKinshipResults(data.profiles ?? []);
      setIsKinshipOpen(true);
    } catch {
      setKinshipResults([]);
    } finally {
      setIsKinshipSearching(false);
    }
  }, []);

  useEffect(() => {
    if (kinshipDebounceRef.current) clearTimeout(kinshipDebounceRef.current);
    kinshipDebounceRef.current = setTimeout(() => searchKinships(kinshipQuery), 300);
    return () => {
      if (kinshipDebounceRef.current) clearTimeout(kinshipDebounceRef.current);
    };
  }, [kinshipQuery, searchKinships]);

  // Close kinship dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        kinshipDropdownRef.current &&
        !kinshipDropdownRef.current.contains(e.target as Node) &&
        kinshipInputRef.current &&
        !kinshipInputRef.current.contains(e.target as Node)
      ) {
        setIsKinshipOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSubmit = async (data: CreateProfileInput) => {
    // Race is required for characters
    if (isCharacter && !race.trim()) {
      setError('Race is required for characters.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const details: Record<string, unknown> = {
        avatar: avatar || undefined,
      };

      if (isCharacter) {
        details.description = background || undefined;
        details.appearance = appearance.trim() || undefined;
        if (race.trim()) details.race = race.trim();
        if (residence.trim()) details.residence = residence.trim();
        if (occupation.trim()) details.occupation = occupation.trim();
        if (age.trim()) details.age = age.trim();
        // Store kinship_profile_id instead of free-text kinship
        if (selectedKinship) details.kinship_profile_id = selectedKinship.profile_id;
      } else if (isKinship) {
        details.description = kinshipDescription.trim() || undefined;
        details.kinship_type = kinshipType;
        details.status = kinshipStatus;
        if (foundingDate.trim()) details.founding_date = foundingDate.trim();
      } else {
        details.description = data.details || undefined;
      }

      const result = await createProfile({
        ...data,
        details: JSON.stringify(details),
        is_published: isPublished,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create profile');
        return;
      }
      if (result.profile?.profile_id) {
        const newProfileId = result.profile.profile_id;

        if (isCharacter) {
          // POST pending relationships (best-effort — failures are silent)
          if (pendingRelationships.length > 0) {
            await Promise.allSettled(
              pendingRelationships.map((rel) =>
                fetch(`/api/profiles/${newProfileId}/relationships`, {
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
          }

          // Join the selected kinship (best-effort)
          if (selectedKinship) {
            await fetch(`/api/profiles/${selectedKinship.profile_id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ character_id: newProfileId }),
            });
          }
        }

        if (isKinship) {
          // POST pending relationships for the new kinship (best-effort)
          if (kinshipPendingRelationships.length > 0) {
            await Promise.allSettled(
              kinshipPendingRelationships.map((rel) =>
                fetch(`/api/profiles/${newProfileId}/relationships`, {
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
          }

          // Auto-actions when a character creates a kinship:
          // The owner character is data.parent_profile_id
          const ownerCharacterId = data.parent_profile_id;
          if (ownerCharacterId) {
            // 1. Add owner as a member
            await fetch(`/api/profiles/${newProfileId}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ character_id: ownerCharacterId }),
            }).catch(() => {});

            // 2. Set owner as a recruiter (patch kinship details.recruiters)
            const currentDetails: Record<string, unknown> = {
              avatar: details.avatar,
              description: details.description,
              kinship_type: details.kinship_type,
              status: details.status,
              ...(details.founding_date ? { founding_date: details.founding_date } : {}),
              recruiters: [ownerCharacterId],
            };
            await fetch(`/api/profiles/${newProfileId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ details: currentDetails }),
            }).catch(() => {});

            // 3. Set kinship_profile_id on the owner character's details
            // Fetch existing character details first so we don't clobber other fields
            const charRes = await fetch(`/api/profiles/${ownerCharacterId}`).catch(() => null);
            if (charRes?.ok) {
              const charData = await charRes.json().catch(() => null);
              if (charData) {
                const mergedCharDetails = {
                  ...(charData.details ?? {}),
                  kinship_profile_id: newProfileId,
                };
                await fetch(`/api/profiles/${ownerCharacterId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ details: mergedCharDetails }),
                }).catch(() => {});
              }
            }
          }
        }

        onSuccess(newProfileId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProfileTypeLabel = () => {
    const labels: { [key: number]: string } = {
      1: 'Character',
      2: 'Item',
      3: 'Kinship',
      4: 'Organization',
      5: 'Location',
    };
    return labels[profileTypeId] || 'Profile';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Avatar Upload */}
      <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} label="Avatar" disabled={isSubmitting} />

      {/* ── Name field (always shown) ───────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="name" className="text-amber-900 font-semibold">
            {isCharacter ? 'Character Name' : `${getProfileTypeLabel()} Name`} *
          </Label>
          <span className={`text-xs ${nameLength > 100 ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
            {nameLength}/100 characters
          </span>
        </div>
        <Input
          id="name"
          {...register('name')}
          placeholder={`Enter a name for your ${getProfileTypeLabel().toLowerCase()}`}
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
          maxLength={100}
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      {/* Parent Character Selection - shown for Items, Kinships, Organizations */}
      {needsParent && (
        <div className="space-y-2">
          <Label htmlFor="parent_profile_id" className="text-amber-900 font-semibold">
            {isKinship ? 'Kinship Leader (Owner) *' : 'Belongs to Character *'}
          </Label>
          {isLoadingCharacters ? (
            <div className="text-sm text-amber-700">Loading your characters...</div>
          ) : characters.length === 0 ? (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800 mb-2">
                You need to create a character first before you can create {getProfileTypeLabel().toLowerCase()}s.
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
                value={selectedParentId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    setValue('parent_profile_id', parseInt(value), { shouldValidate: true });
                  } else {
                    setValue('parent_profile_id', undefined, { shouldValidate: true });
                  }
                }}
                disabled={isSubmitting}
                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              >
                <option value="">Select a character</option>
                {characters.map((character) => (
                  <option key={character.profile_id} value={character.profile_id}>
                    {character.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-amber-700">
                {isKinship
                  ? 'The character who leads and owns this kinship.'
                  : `This ${getProfileTypeLabel().toLowerCase()} will belong to the selected character.`}
              </p>
              {!selectedParentId && <p className="text-sm text-red-600">Please select a character to continue</p>}
            </>
          )}
          {errors.parent_profile_id && <p className="text-sm text-red-600">{errors.parent_profile_id.message}</p>}
        </div>
      )}

      {/* ── Character Info fields ───────────────────────────────────────────── */}
      {isCharacter && (
        <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Character Info</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="race" className="text-amber-900 font-medium">
                Race *
              </Label>
              <Input
                id="race"
                type="text"
                value={race}
                onChange={(e) => {
                  setRace(e.target.value);
                  if (error === 'Race is required for characters.') setError(null);
                }}
                placeholder="e.g. Human, Elf, Dwarf…"
                maxLength={100}
                disabled={isSubmitting}
                className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
              />
              {!race.trim() && error === 'Race is required for characters.' && (
                <p className="text-sm text-red-600">Race is required</p>
              )}
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
                disabled={isSubmitting}
                className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
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
                disabled={isSubmitting}
                className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
              />
            </div>

            {/* Kinship profile picker */}
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
                    onClick={() => { setSelectedKinship(null); setKinshipQuery(''); }}
                    disabled={isSubmitting}
                    className="text-amber-500 hover:text-red-600 transition-colors"
                    aria-label="Clear kinship"
                  >
                    ×
                  </button>
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
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-50"
                  />
                  {isKinshipSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">Searching…</span>
                  )}
                  {isKinshipOpen && kinshipResults.length > 0 && (
                    <div
                      ref={kinshipDropdownRef}
                      className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg max-h-48 overflow-y-auto"
                    >
                      {kinshipResults.map((k) => (
                        <button
                          key={k.profile_id}
                          type="button"
                          onClick={() => { setSelectedKinship(k); setKinshipQuery(''); setIsKinshipOpen(false); }}
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
                    <div
                      ref={kinshipDropdownRef}
                      className="absolute z-10 mt-1 w-full rounded-md border border-amber-200 bg-white shadow-lg px-3 py-2 text-sm text-amber-700"
                    >
                      No kinship profiles found
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-amber-600">Type to search existing kinship profiles.</p>
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
                disabled={isSubmitting}
                className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Appearance (character only, plain text) ─────────────────────────── */}
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
            className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white resize-none"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* ── Background (character) / Kinship Info (kinship) / Details (other) ── */}
      {isCharacter ? (
        <div className="space-y-2">
          <Label className="text-amber-900 font-semibold">Background</Label>
          <RichTextEditor
            value={background}
            onChange={setBackground}
            placeholder="Add your character's backstory, history, or any other background information…"
            disabled={isSubmitting}
          />
        </div>
      ) : isKinship ? (
        <>
          {/* Kinship Info panel */}
          <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h2 className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Kinship Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founding_date" className="text-amber-900 font-medium">Founding Date</Label>
                <Input
                  id="founding_date"
                  type="text"
                  value={foundingDate}
                  onChange={(e) => setFoundingDate(e.target.value)}
                  placeholder="e.g. Third Age 1200, Unknown…"
                  maxLength={100}
                  disabled={isSubmitting}
                  className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kinship_type" className="text-amber-900 font-medium">Type</Label>
                <select
                  id="kinship_type"
                  value={kinshipType}
                  onChange={(e) => setKinshipType(e.target.value)}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                >
                  {['Recruiting', 'Not Recruiting', 'Dormant'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Background / Description */}
          <div className="space-y-2">
            <Label className="text-amber-900 font-semibold">Background / Description</Label>
            <RichTextEditor
              value={kinshipDescription}
              onChange={setKinshipDescription}
              placeholder="Describe this kinship's history, culture, and lore…"
              disabled={isSubmitting}
            />
          </div>

          {/* Relationships */}
          <RelationshipsPicker
            value={kinshipPendingRelationships}
            onChange={setKinshipPendingRelationships}
            disabled={isSubmitting}
            allowedProfileTypes={[1, 3]}
          />

          {/* Recruiters — informational note */}
          <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Label className="text-amber-900 font-semibold text-sm uppercase tracking-wide">Recruiters</Label>
            <p className="text-sm text-amber-600 italic">
              The kinship leader will be added as the first member and recruiter automatically. Additional recruiters can be designated from the edit page.
            </p>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="details" className="text-amber-900 font-semibold">
            Details
          </Label>
          <Textarea
            id="details"
            {...register('details')}
            placeholder={`Add details about your ${getProfileTypeLabel().toLowerCase()}...`}
            rows={6}
            className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white resize-none"
            disabled={isSubmitting}
          />
          {errors.details && <p className="text-sm text-red-600">{errors.details.message}</p>}
        </div>
      )}

      {/* ── Relationships (character only) ──────────────────────────────────── */}
      {isCharacter && (
        <RelationshipsPicker
          value={pendingRelationships}
          onChange={setPendingRelationships}
          disabled={isSubmitting}
          allowedProfileTypes={[1, 3]}
        />
      )}

      {/* Publish Status */}
      <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div>
          <Label htmlFor="isPublished" className="text-amber-900 font-semibold">
            {isPublished ? 'Publish immediately' : 'Save as draft'}
          </Label>
          <p className="text-sm text-amber-600">
            {isPublished
              ? `This ${getProfileTypeLabel().toLowerCase()} will be visible to everyone.`
              : 'Only you can see drafts.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublished}
          onClick={() => setIsPublished(!isPublished)}
          disabled={isSubmitting}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isPublished ? 'bg-emerald-600' : 'bg-gray-300'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isPublished ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || (needsParent && (characters.length === 0 || !selectedParentId))}
          className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : isPublished ? `Create ${getProfileTypeLabel()}` : 'Save as Draft'}
        </Button>
      </div>
    </form>
  );
}

