'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';

type Status = 'sending' | 'sent' | 'error';

export default function ChangePasswordPage() {
  const { isLoggedIn, isLoading: authLoading, email } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('sending');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Wait until auth state is resolved
    if (authLoading) return;

    // Redirect unauthenticated users to home
    if (!isLoggedIn) {
      router.replace('/');
      return;
    }

    if (!email) return;

    const sendResetEmail = async () => {
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          setStatus('sent');
        } else {
          const data = await response.json().catch(() => ({}));
          setErrorMessage(data.error || 'Something went wrong. Please try again.');
          setStatus('error');
        }
      } catch {
        setErrorMessage('Something went wrong. Please try again.');
        setStatus('error');
      }
    };

    sendResetEmail();
  }, [authLoading, isLoggedIn, email, router]);

  if (authLoading || status === 'sending') {
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-amber-900">Change Password</CardTitle>
            <CardDescription className="text-amber-700">
              Sending a reset link to your email…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-amber-900">Something Went Wrong</CardTitle>
            <CardDescription className="text-amber-700">{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full bg-amber-900 text-amber-50">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-amber-900">Check Your Email</CardTitle>
          <CardDescription className="text-amber-700">
            We&apos;ve sent a password reset link to your email address. The link expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-amber-700 text-center">
            Didn&apos;t receive it? Check your spam folder.
          </p>
          <Link href="/">
            <Button className="w-full bg-amber-900 text-amber-50">Go to Homepage</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
