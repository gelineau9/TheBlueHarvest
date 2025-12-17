'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { profileUpdateSchema, type ProfileUpdateInput } from '@/app/lib/validations';
import { useAuth } from './auth-provider';
import Link from 'next/link';

export function ProfileForm() {
  const { username, firstName, lastName, email } = useAuth();
  const [formData, setFormData] = useState<ProfileUpdateInput>({
    username: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileUpdateInput, string>> & { general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
    if (username && firstName && lastName) {
      setFormData({
        username,
        firstName,
        lastName,
      });
    }
  }, [username, firstName, lastName]);

  const handleInputChange = (field: keyof ProfileUpdateInput, value: string) => {
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
      const validatedData = profileUpdateSchema.parse(formData);

      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Profile update failed');
      }

      setSuccess(true);
      // Refresh the page to update auth state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') {
        // Handle validation errors
        const zodError = err as any;
        const fieldErrors: Partial<Record<keyof ProfileUpdateInput, string>> = {};
        zodError.errors?.forEach((error: any) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as keyof ProfileUpdateInput] = error.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err instanceof Error ? err.message : 'Profile update failed' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-amber-900">Profile Settings</CardTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-amber-900">
                First Name
              </Label>
              <Input
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={isLoading}
                className="text-amber-900"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-amber-900">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={isLoading}
                className="text-amber-900"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          {errors.general && <div className="text-sm text-red-500 text-center">{errors.general}</div>}

          {success && <div className="text-sm text-green-600 text-center">Profile updated successfully!</div>}

          <Button type="submit" className="w-full bg-amber-900 text-amber-50" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Profile'}
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
