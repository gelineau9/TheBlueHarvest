'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, CreateProfileInput } from '@/app/lib/validations';
import { createProfile } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ProfileFormProps {
  profileTypeId: number;
  onSuccess: (profileId: number) => void;
  onCancel: () => void;
}

interface Character {
  profile_id: number;
  name: string;
}

export function ProfileForm({ profileTypeId, onSuccess, onCancel }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);

  // Profile types that need a parent: Items (2), Kinships (3), Organizations (4)
  const needsParent = [2, 3, 4].includes(profileTypeId);

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

  // Fetch user's characters if this profile type needs a parent
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
    } catch (err) {
      setError('Failed to load your characters. Please try again.');
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  const onSubmit = async (data: CreateProfileInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createProfile(data);
      if (!result.success) {
        setError(result.error || 'Failed to create profile');
        return;
      }
      if (result.profile?.profile_id) {
        onSuccess(result.profile.profile_id);
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

      {/* Parent Character Selection - Only shown for Items, Kinships, Organizations */}
      {needsParent && (
        <div className="space-y-2">
          <Label htmlFor="parent_profile_id" className="text-amber-900 font-semibold">
            Belongs to Character *
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
                This {getProfileTypeLabel().toLowerCase()} will belong to the selected character.
              </p>
              {!selectedParentId && <p className="text-sm text-red-600">Please select a character to continue</p>}
            </>
          )}
          {errors.parent_profile_id && <p className="text-sm text-red-600">{errors.parent_profile_id.message}</p>}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="name" className="text-amber-900 font-semibold">
            {getProfileTypeLabel()} Name *
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

      <div className="space-y-2">
        <Label htmlFor="details" className="text-amber-900 font-semibold">
          Details (Optional)
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
        <p className="text-sm text-amber-700">
          You can add a description, backstory, or any other relevant information here.
        </p>
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
          {isSubmitting ? 'Creating...' : `Create ${getProfileTypeLabel()}`}
        </Button>
      </div>
    </form>
  );
}
