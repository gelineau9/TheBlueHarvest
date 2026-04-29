'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully.');
        } else {
          setStatus('error');
          setMessage(data.error || 'This verification link is invalid or has expired.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verify();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-amber-900">Verifying your email…</CardTitle>
            <CardDescription className="text-amber-700">Please wait a moment.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-amber-900">Email Verified!</CardTitle>
            <CardDescription className="text-amber-700">{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700 text-center">
              You are now logged in. Welcome to the Brandy Hall Archives.
            </p>
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
          <CardTitle className="text-2xl text-amber-900">Verification Failed</CardTitle>
          <CardDescription className="text-amber-700">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-amber-700 text-center">
            Verification links expire after 24 hours. If yours has expired, please register again.
          </p>
          <Link href="/register">
            <Button className="w-full bg-amber-900 text-amber-50">Back to Register</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full border-amber-900 text-amber-900">
              Go to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
