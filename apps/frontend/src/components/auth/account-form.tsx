'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { accountUpdateSchema, type AccountUpdateInput } from '@/app/lib/validations';
import { useAuth } from './auth-provider';
import { AvatarUploader } from '@/components/avatar/AvatarUploader';
import { Avatar } from '@/hooks/useAvatarUpload';
import Link from 'next/link';

export function AccountForm() {
  const { username, email, avatarUrl, refreshAuth } = useAuth();
  const [formData, setFormData] = useState<AccountUpdateInput>({
    username: '',
  });
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountUpdateInput, string>> & { general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
    if (username) {
      setFormData({
        username,
      });
    }
    // Initialize avatar from auth context
    if (avatarUrl) {
      setAvatar({
        url: avatarUrl,
        filename: '',
        originalName: '',
      });
    }
  }, [username, avatarUrl]);

  const handleInputChange = (field: keyof AccountUpdateInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccess(false);

    try {
      // Validate form data
      const validatedData = accountUpdateSchema.parse(formData);

      // Build details object with avatar
      const details = {
        avatar: avatar || undefined,
      };

      const response = await fetch('/api/auth/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validatedData,
          details,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Account update failed');
      }

      setSuccess(true);
      // Refresh auth state to update avatar in header
      await refreshAuth();
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') {
        // Handle validation errors
        const zodError = err as any;
        const fieldErrors: Partial<Record<keyof AccountUpdateInput, string>> = {};
        zodError.errors?.forEach((error: any) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as keyof AccountUpdateInput] = error.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err instanceof Error ? err.message : 'Account update failed' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-amber-900">Account Settings</CardTitle>
        <CardDescription className="text-amber-700">Update your account information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-amber-900">
              Email
            </Label>
            <Input id="email" type="email" value={email || ''} disabled className="text-amber-900 bg-gray-100" />
            <p className="text-xs text-amber-600">Email cannot be changed</p>
          </div>

          {/* Avatar Upload */}
          <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} label="Profile Picture" disabled={isLoading} />

          <div className="space-y-2">
            <Label htmlFor="username" className="text-amber-900">
              Username
            </Label>
            <Input
              id="username"
              value={formData.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isLoading}
              className="text-amber-900"
              aria-invalid={!!errors.username}
            />
            {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
          </div>

          {errors.general && <div className="text-sm text-red-500 text-center">{errors.general}</div>}

          {success && <div className="text-sm text-green-600 text-center">Account updated successfully!</div>}

          <Button type="submit" className="w-full bg-amber-900 text-amber-50" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Account'}
          </Button>

          <div className="text-center text-sm text-amber-700">
            <Link href="/" className="text-amber-900 hover:underline font-medium">
              ← Back to Homepage
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
