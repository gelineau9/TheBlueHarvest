'use client';

import { useState } from 'react';
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

export function ProfileForm({ profileTypeId, onSuccess, onCancel }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      profile_type_id: profileTypeId,
    },
  });

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-amber-900 font-semibold">
          Profile Name *
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter a name for your profile"
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
          disabled={isSubmitting}
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
          placeholder="Add details about your profile..."
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
          disabled={isSubmitting}
          className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Profile'}
        </Button>
      </div>
    </form>
  );
}
